# Task 9 — 跨模块协同与端到端验证

## 验证方法

由于完整 Electron UI 端到端自动化需要启动应用并模拟用户操作，本次 Task 9 采用 **代码级跨模块数据流追踪** 为主、**集成测试回归** 为辅的方式进行验证。对 4 条核心端到端流程逐层检查模块间接口契约、数据持久化位置、状态同步机制及潜在不一致风险。完整 UI 自动化端到端验证标记为 **Pending**，建议在修复 P1 问题后补充 Playwright/Electron 自动化回归。

## 流程 A：项目 → 小说 → 章节 → 编辑器 → 保存 → 关闭 → 重新打开

### 数据流追踪

| 步骤 | 调用方 | 处理方 | 持久化位置 | 关键检查点 |
|---|---|---|---|---|
| 创建项目 | Renderer / Store | `project:create` IPC → `ProjectRepository.create` | SQLite `projects` 表 | `requireNonEmptyString(data.name)` 校验通过 |
| 创建小说 | Renderer / Store | `novel:create` IPC → `NovelRepository.create` | SQLite `novels` 表 | **未校验 `projectId`**（ISSUE-003-001 / ISSUE-008-001） |
| 创建章节 | Renderer / Store | `chapter:create` IPC → `ChapterRepository.create` | SQLite `chapters` 表 | **未校验 `novelId`**（ISSUE-003-002 / ISSUE-008-002） |
| 编辑器加载 | `ChapterEditor` 组件 | `chapter:get` / `chapter:list-with-content` | 从 SQLite 读取 TipTap JSON | 内容通过 `initialContent` 传入 `NovelEditor` |
| 编辑器输入 | `NovelEditor` | `onUpdate` 回调 | 通过 `onContentChange` 提升状态，`onSave` 触发 IPC 保存 | 自动保存防抖 2s（`autoSaveInterval`） |
| 保存章节 | `onSave` 回调 | `chapter:update` IPC → `ChapterRepository.update` | SQLite `chapters.content` / `text_content` | `sortOrder` 持久化正确 |
| 关闭应用 | `window.beforeunload` | `Database.close()` flush + 编辑器 unmount flush | SQLite 文件 + `aiscribe-llm.enc` 等 | `close()` 取消 `saveTimeout` 并同步落盘 |
| 重新打开 | 应用启动 | `Database.create(dbPath)` 加载 | SQLite 文件 | 迁移到 `SCHEMA_VERSION = 3` |

### 发现的风险点

1. **小说/章节父级 ID 缺失校验（P1）**：在跨模块流程中，若前端状态管理异常导致 `projectId`/`novelId` 丢失，`novel:create`/`chapter:create` 仍可能成功创建游离记录，破坏项目-小说-章节的层级关系。
2. **级联删除缓存脏读（P1）**：流程 A 中删除项目后，若子实体（小说、章节）此前已被加载到缓存，再次读取会返回旧数据（ISSUE-003-005），导致用户看到已删除项目下仍有章节。
3. **编辑器无字数上限（P2）**：超大章节内容会导致频繁 IPC 与数据库写入，存在性能与稳定性风险（ISSUE-005-005）。

### 验证结论

- 正常路径下数据可持久化并重新加载。
- **因 P1 校验缺失与缓存一致性问题，流程 A 在当前代码下存在数据完整性风险，不能视为完全通过。**

---

## 流程 B：编辑器选中内容 → AI 对话 → 流式生成 → 插入编辑器 → 保存章节

### 数据流追踪

| 步骤 | 调用方 | 处理方 | 数据位置 | 关键检查点 |
|---|---|---|---|---|
| 选中内容 | `NovelEditor` | TipTap `editor.state.selection` | 内存 | `BubbleMenu` 提供 AI 操作入口 |
| 发起对话 | `ChatPanel` / Store | `chatSlice.addMessage` | `localStorage` (`aiscribe-chat-history`) | 消息独立存储，不与章节 DB 关联 |
| 流式生成 | `llmService.startStream` | `llm:chat-stream` → `LLMProvider.chatStream` | 内存流 | `event.sender` 推送 `llm:chunk`/`llm:done` |
| 停止生成 | `chatSlice.setStreaming(false)` | `llm:cancel-stream` | 内存 | 可中断 |
| 插入编辑器 | `NovelEditorHandle.insertContent(text)` | TipTap `insertContent` 命令 | 编辑器内存 → 触发 `onUpdate` → `onSave` → SQLite | 通过 ref 暴露给父组件 |
| 保存章节 | `onSave` | `chapter:update` | SQLite `chapters.content` | 300ms 防抖后落盘 |

### 发现的风险点

1. **聊天历史与章节内容分离**：`chatSlice` 将消息保存在 `localStorage` 的 `aiscribe-chat-history`，不与具体 `chapterId`/`projectId` 关联。关闭并重新打开后，聊天上下文可能仍保留上次会话的消息，导致“插入编辑器”操作使用的上下文与当前章节不匹配。
2. **流式中断后的内容合并**：`chatSlice` 在 `beforeunload` 时调用 `flushSave`，会将 `streamingContent` 合并到对应消息。但在正常流结束前的崩溃场景下，已生成但未合并的内容会丢失。
3. **AI 生成内容直接插入无二次确认**：`insertContent` 直接调用 TipTap 命令插入文本，无撤销栈隔离或格式清洗，可能插入意外内容。

### 验证结论

- 功能路径存在且接口契约清晰。
- **聊天上下文与章节未绑定，跨会话一致性存在隐患；建议在 renderer 层将聊天记录与 `chapterId` 关联或提供清空机制。**

---

## 流程 C：OpenAI provider → 测试连接 → 普通对话 → 切换 Claude provider → 测试连接 → 继续对话

### 数据流追踪

| 步骤 | 调用方 | 处理方 | 关键检查点 |
|---|---|---|---|
| 配置 OpenAI | `LLMConfig.tsx` | `llm:config` → `SecureLLMConfig.save()` | 写入 `aiscribe-llm.enc`（ISSUE-006 验证通过） |
| 测试连接 | `LLMConfig.tsx` | `llm:test-connection` → `LLMProvider.testConnection` | 15s 超时 |
| 普通对话 | `chatSlice` / `llmService.chat` | `llm:chat` → 非流式请求 | 返回 `LLMResponse` |
| 切换 Claude | `LLMConfig.tsx` | `llm:config` 写入新 provider | `llm:config-meta` 不返回 apiKey |
| 测试连接 | `LLMConfig.tsx` | `llm:test-connection` | Claude endpoint `/messages`，header `x-api-key` |
| 继续对话 | `chatSlice` / `llmService.startStream` | `llm:chat-stream` | 消息数组从 `chatSlice.messages` 读取，provider 从 secure config 读取 |

### 发现的风险点

1. **上下文保持依赖 chatSlice 本地存储**：切换 provider 后，`chatSlice.messages` 不变，因此消息历史会随新 provider 一起发送。这在预期内，但聊天记录未与具体 provider/model 绑定，可能导致用户混淆。
2. **API Key 安全**：错误信息经 `sanitizeError` 处理，未暴露 key（已验证通过）。
3. **非流式错误前缀不一致（P2）**：切换 provider 后若触发 API 错误，`executeChatRequest` 中英文前缀不匹配会导致错误被二次包装（ISSUE-006-001）。

### 验证结论

- 切换 provider 后对话可继续，消息上下文保持。
- **核心功能通过，但错误前缀问题影响错误信息质量。**

---

## 流程 D：创建角色/世界观 → 大纲引用 → 编辑器 @ 提及 → AI 对话引用

### 数据流追踪

| 步骤 | 调用方 | 处理方 | 数据位置 | 关键检查点 |
|---|---|---|---|---|
| 创建角色 | `CharacterForm` | `character:create` | SQLite `characters` | `novelId`/`role` 校验缺失（ISSUE-004-005 / ISSUE-008-003） |
| 创建世界观 | `WorldBuilder` | `world:save` | SQLite `worlds` | `type` 校验缺失（ISSUE-004-004 / ISSUE-008-008） |
| 大纲引用 | `OutlinePanel` | `outline:save` | SQLite `outlines` | `version` 不递增、`createdAt` 被覆盖（ISSUE-005-001） |
| 编辑器 @ 提及 | `NovelEditor` | `CharacterMentionExtension` | TipTap doc JSON | 将角色名/ID 以 mention 节点嵌入内容 |
| AI 对话引用 | `ChatPanel` | 前端将角色/世界观文本拼入 prompt | 内存 | 依赖前端组装，无统一上下文注入机制 |

### 发现的风险点

1. **角色/世界观必填字段校验缺失（P1）**：跨模块引用依赖 `novelId` 与 `type` 等字段，若这些字段无效，下游引用可能读取到脏数据。
2. **大纲版本语义错误（P1）**：`outline:save` 使用 `INSERT OR REPLACE` 覆盖 `createdAt` 且 `version` 不递增，若后续引入大纲历史/回滚功能，将缺少可靠版本基础。
3. **@ 提及与 AI 对话引用无统一上下文机制**：角色/世界观信息在编辑器中以 mention 节点存在，在 AI 对话中依赖前端手动组装 prompt，可能导致不同模块引用的信息不一致。
4. **角色关系 targetId 无校验（P1）**：关系图数据可能引用已删除角色，影响跨模块关系分析功能。

### 验证结论

- 各模块可独立写入数据，基础引用链路存在。
- **因校验缺失与版本语义问题，跨模块引用一致性存在风险；需建立统一的实体引用校验与上下文注入机制。**

---

## 总体结论

| 流程 | 代码级验证结果 | 主要风险 | 是否建议补充 UI 自动化 |
|---|---|---|---|
| A 项目→小说→章节→保存→重开 | 部分通过 | 父级 ID 校验缺失、缓存脏读、超大内容无上限 | 是 |
| B 编辑器→AI→插入→保存 | 部分通过 | 聊天记录与章节未绑定、流中断内容丢失风险 | 是 |
| C 切换 provider 保持上下文 | 基本通过 | 错误前缀不一致 | 是 |
| D 角色/世界观→大纲→编辑器→AI | 部分通过 | 必填字段校验缺失、大纲版本语义错误、引用无统一机制 | 是 |

本次 Task 9 共识别 **4 条跨模块协同风险**，均已在 Task 3-8 中以独立问题记录。建议在下一次迭代中：

1. 优先修复 P1 级校验缺失问题（ISSUE-003-001/002、ISSUE-004-004/005、ISSUE-008-001~008-006）。
2. 修复项目级联删除缓存失效问题（ISSUE-003-005）。
3. 建立 `chatSlice` 与当前 `chapterId`/`projectId` 的绑定机制，避免跨会话上下文混乱。
4. 修复大纲版本语义（ISSUE-005-001）后再引入大纲历史功能。
5. 补充 Playwright + Electron 的端到端自动化，覆盖上述 4 条流程。
