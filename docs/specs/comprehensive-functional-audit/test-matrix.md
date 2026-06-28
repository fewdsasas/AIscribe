# 功能测试矩阵表

## 说明

- **验证方式**: 自动化 / 代码审查 / 运行时
- **测试结果**: Pass / Fail / Blocked / N/A
- **问题编号**: 关联到 `issues.md` 中的问题编号，无问题留空
- **关联代码文件**: 涉及的主要源码文件路径

## 测试矩阵

| 模块 | 功能点 | 子功能点 | 验证方式 | 前置条件 | 测试步骤 | 输入数据 | 预期结果 | 实际结果 | 测试结果 | 问题编号 | 关联代码文件 | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 环境基线 | typecheck | 全项目类型检查 | 自动化 | 依赖已安装 | 运行 `npm run typecheck` | - | 无类型错误 | tsc --noEmit 正常退出 | Pass | | - | |
| 环境基线 | test:run | 全项目测试运行 | 自动化 | 依赖已安装 | 运行 `npm run test:run` | - | 全部通过 | 93 files, 773 tests passed | Pass | | - | |
| 环境基线 | lint | ESLint 检查 | 自动化 | 依赖已安装 | 运行 `npm run lint` | - | 无错误 | 正常退出，有模块类型/TS 版本警告 | Pass | | - | 警告非错误，不影响功能 |
| 环境基线 | coverage | 覆盖率检查 | 自动化 | 依赖已安装 | 运行 `npm run test:coverage` | - | 核心模块 ≥80% | 因 stress-ipc scenario 3 超时而失败 | Fail | ISSUE-001 | `vitest.config.ts` | 排除压力测试后覆盖率 73.88% statements |
| 项目管理 | project:create | 创建项目 | 运行时/自动化 | 数据库已初始化 | 调用 IPC `project:create` | `{ name: '测试项目', description: '描述', genre: '玄幻', targetWordCount: 100000 }` | 返回含 id/createdAt/updatedAt 的项目对象 | 返回项目对象，字段完整 | Pass | | `src/main/ipc/project.ipc.ts` | |
| 项目管理 | project:create | 空名称边界 | 运行时/自动化 | 数据库已初始化 | 调用 IPC `project:create` 传入空 name | `{ name: '' }` | 返回友好错误 | 抛出 `项目名称不能为空` 错误 | Pass | | `src/main/ipc/project.ipc.ts` | |
| 项目管理 | project:update | 重命名超长名称 | 运行时/自动化 | 存在项目 | 调用 IPC `project:update` | 200 字符中文名称 | 处理符合预期 | 通过 `MAX_STRING_LENGTH = 100000` 校验，200 字符可通过 | Pass | | `src/main/memory/repositories/project-repository.ts` | |
| 项目管理 | project:update | 重命名为空/空白 | 运行时/自动化 | 存在项目 | 调用 IPC `project:update` 传入 `{ name: '' }` 或 `{ name: '   ' }` | 空字符串 / 纯空白 | 返回友好错误 | 更新成功，名称被置为空/空白 | Fail | ISSUE-003-003 | `src/main/ipc/project.ipc.ts` | 更新操作未复用非空校验 |
| 项目管理 | project:delete | 级联删除 | 运行时/自动化 | 项目下含小说/章节/角色/世界观 | 调用 IPC `project:delete` | 项目 id | 级联删除成功 | `novels.project_id` 与 `chapters.novel_id` 均配置 `ON DELETE CASCADE`，级联删除成功 | Pass | | `src/main/memory/database.ts` | |
| 项目管理 | project:delete | 级联删除后缓存一致性 | 运行时/自动化 | 子实体已加载到缓存 | 删除项目后再次 `chapter:get` | 项目 id | 缓存失效，返回不存在 | 缓存未失效，仍返回旧数据 | Fail | ISSUE-003-005 | `src/main/memory/repositories/project-repository.ts` | 脏读风险 |
| 小说/章节 | novel:create | 创建小说 | 运行时/自动化 | 存在项目 | 调用 IPC `novel:create` | 完整 CreateNovelData | 返回小说对象 | 返回小说对象 | Pass | | `src/main/ipc/novel.ipc.ts` | |
| 小说/章节 | novel:create | 缺失/无效 projectId | 运行时/自动化 | - | 调用 IPC `novel:create` 传入 `{ title: 'Test' }` 或 `{ projectId: 'invalid', title: 'Test' }` | 缺失/无效 projectId | 返回友好错误 | 创建成功，`project_id` 为空字符串或无效值 | Fail | ISSUE-003-001 / ISSUE-008-001 | `src/main/ipc/novel.ipc.ts` | |
| 小说/章节 | novel:get-by-project | 关联查询 | 运行时/自动化 | 项目下存在小说 | 调用 IPC `novel:get-by-project` | projectId | 返回项目下小说列表 | 返回正确列表 | Pass | | `src/main/ipc/novel.ipc.ts` | |
| 小说/章节 | chapter:create | 创建章节 | 运行时/自动化 | 存在小说 | 调用 IPC `chapter:create` | `{ novelId, title, content, sortOrder }` | 返回章节对象 | 返回章节对象 | Pass | | `src/main/ipc/novel.ipc.ts` | |
| 小说/章节 | chapter:create | 缺失/无效 novelId | 运行时/自动化 | - | 调用 IPC `chapter:create` 传入 `{ title: 'Ch1' }` 或 `{ novelId: 'invalid', title: 'Ch1' }` | 缺失/无效 novelId | 返回友好错误 | 创建成功，`novel_id` 为空字符串或无效值 | Fail | ISSUE-003-002 / ISSUE-008-002 | `src/main/ipc/novel.ipc.ts` | |
| 小说/章节 | chapter:update | 重排序 | 运行时/自动化 | 存在多个章节 | 调用 IPC `chapter:update` 修改 sortOrder | `{ sortOrder: 新值 }` | 持久化后顺序正确 | `sortOrder` 正确持久化，0 值也可保存 | Pass | | `src/main/memory/repositories/chapter-repository.ts` | |
| 小说/章节 | chapter:update | 空标题边界 | 运行时/自动化 | 存在章节 | 调用 IPC `chapter:update` 传入 `{ title: '' }` 或 `{ title: '   ' }` | 空字符串 / 纯空白 | 返回友好错误 | 更新成功，标题被置为空/空白 | Fail | ISSUE-003-004 / ISSUE-008-007 | `src/main/ipc/novel.ipc.ts` | |
| 小说/章节 | chapter:list-with-content | 读取完整内容 | 运行时/自动化 | 已保存章节 | 调用 IPC `chapter:list-with-content` | novelId | 返回完整章节内容 | 返回内容与保存一致 | Pass | | `src/main/memory/repositories/chapter-repository.ts` | |
| 角色管理 | character:create | 创建角色 | 运行时/自动化 | 存在小说 | 调用 IPC `character:create` | 完整 CreateCharacterData | 返回角色对象 | 返回角色对象 | Pass | | `src/main/ipc/character.ipc.ts` | |
| 角色管理 | character:create | 缺失 novelId/role | 运行时/自动化 | - | 调用 IPC `character:create` 传入 `{ name: 'Alice' }` 或 `{ novelId: 'invalid', name: 'Alice' }` | 缺失/无效 novelId，缺失 role | 返回友好错误 | 创建成功，`novel_id` 为空字符串或无效值；`role` 回退为 `'minor'` | Fail | ISSUE-004-005 / ISSUE-008-003 | `src/main/ipc/character.ipc.ts` | |
| 角色管理 | character:get | JSON 字段反序列化 | 运行时/自动化 | 数据库中 personality/arc 为默认空对象 | 调用 IPC `character:get` | characterId | 返回包含完整必填字段的对象 | `personality` / `arc` 为 `{}`，缺少必填字段 | Fail | ISSUE-004-001 | `src/main/memory/repositories/character-repository.ts` | |
| 角色管理 | character:create | 关系指向不存在 target | 运行时/自动化 | 存在小说 | 调用 IPC `character:create` 传入无效 targetId | relationships 含无效 targetId | 返回友好错误 | 创建成功，保存了无效关系 | Fail | ISSUE-004-002 | `src/main/ipc/character.ipc.ts` | |
| 世界观 | world:save | 保存完整世界观 | 运行时/自动化 | 存在小说 | 调用 IPC `world:save` | 完整 SaveWorldData | 保存成功 | 保存成功 | Pass | | `src/main/ipc/world.ipc.ts` | |
| 世界观 | world:save | 缺失/无效 type | 运行时/自动化 | - | 调用 IPC `world:save` 传入无 type 或非法 type | 无 type / `type: 'invalid'` | 返回友好错误 | 保存成功，写入默认值或非法字符串 | Fail | ISSUE-004-004 / ISSUE-008-008 | `src/main/ipc/world.ipc.ts` | |
| 世界观 | world:get-by-novel | powerSystem 反序列化 | 运行时/自动化 | powerSystem 存储为默认空对象 | 调用 IPC `world:get-by-novel` | novelId | 返回完整 PowerSystem 字段 | `powerSystem` 为 `{}`，缺少必填字段 | Fail | ISSUE-004-003 | `src/main/memory/repositories/world-repository.ts` | |
| 世界观 | world:save / world:get-by-novel | keyLocations/history/society 增删改 | 运行时/自动化 | 存在小说 | 多次保存后读取 | 变更后的数组/对象 | 保存/加载一致 | 一致 | Pass | | `src/main/memory/repositories/world-repository.ts` | |
| 世界观 | world:save | 超大 JSON 字段 | 运行时/自动化 | 存在小说 | 调用 IPC `world:save` 传入 ≥50KB JSON | 大字段数据 | 拒绝或截断并提示 | 保存成功，无上限校验 | Fail | ISSUE-004-006 | `src/main/ipc/world.ipc.ts` | |
| 大纲 | outline:save | 保存详细大纲 | 运行时/自动化 | 存在小说 | 调用 IPC `outline:save` | type='detailed', 3 sections | 保存成功 | 保存成功 | Pass | | `src/main/ipc/world.ipc.ts` | |
| 大纲 | outline:save / outline:get | 更新时 createdAt/version 语义 | 运行时/自动化 | 已存在大纲 | 更新后读取 | 更新内容 | 保留原 createdAt，version 递增 | createdAt 被覆盖为当前时间，version 始终为 1 | Fail | ISSUE-005-001 | `src/main/memory/repositories/outline-repository.ts` | |
| 情节结构 | plot-structure:save | 保存情节结构 | 运行时/自动化 | 存在小说 | 调用 IPC `plot-structure:save` | framework='three-act', 5 beats | 保存成功 | 保存成功 | Pass | | `src/main/ipc/world.ipc.ts` | |
| 情节结构 | plot-structure:save / plot-structure:get-by-novel | beats.chapterIds 外键校验 | 运行时/自动化 | 存在小说 | 保存含不存在 chapterId 的 beats | `beats: [{ chapterIds: ['<不存在ID>'] }]` | 返回友好错误 | 保存成功，无效 chapterIds 被持久化 | Fail | ISSUE-005-002 | `src/main/memory/repositories/plot-structure-repository.ts` | |
| 编辑器 | sceneBlock | 空段落创建 | 代码审查 | - | 检查 NovelStructure.ts | - | 使用 `{ type: 'paragraph' }` | `insertSceneBlock` 与 `addInputRules` 均使用无 content 数组的 paragraph | Pass | | `src/renderer/components/editor/extensions/NovelStructure.ts` | |
| 编辑器 | 输入规则 | `--- ` 触发 sceneBlock | 运行时/自动化 | 打开章节 | 输入 `--- ` | `--- ` | 自动插入 sceneBlock | 测试未真实触发；handler 中 `tr.insert(start - 1, node)` 存在位置偏移风险 | Fail | ISSUE-005-004 | `src/renderer/components/editor/extensions/NovelStructure.ts` | |
| 编辑器 | 基础输入 | 文本输入与保存 | 运行时 | 打开章节 | 输入文本并保存 | 普通文本 | 重新加载一致 | 一致 | Pass | | `src/renderer/components/editor/NovelEditor.tsx` | |
| 编辑器 | 基础输入 | XSS 脚本粘贴 | 运行时 | 打开章节 | 粘贴 `<script>` | `<script>alert('xss')</script>` | 不执行脚本 | TipTap/ProseMirror 过滤未知标签，未执行脚本 | Pass | | `src/renderer/components/editor/NovelEditor.tsx` | |
| 编辑器 | 基础输入 | 输入 10,000 字文本 | 运行时 | 打开章节 | 粘贴大文本并保存 | 10,000 字文本 | 保存/加载一致 | 一致，但无上限防护，存在性能风险 | Partial | ISSUE-005-005 | `src/renderer/components/editor/NovelEditor.tsx` | |
| 编辑器 | 基础输入 | 插入 emoji | 运行时 | 打开章节 | 插入 emoji 并保存 | `👍🎉🀄` | 重新加载一致 | 一致 | Pass | | `src/renderer/components/editor/NovelEditor.tsx` | |
| 编辑器 | 基础输入 | 空 sceneBlock 保存 | 运行时 | 打开章节 | 插入空 sceneBlock 并保存 | 空 sceneBlock | 重新加载不报错 | 不报错 | Pass | | `src/renderer/components/editor/extensions/NovelStructure.ts` | |
| 持久化 | outline/plot-structure 写入 | OperationLog 记录 | 代码审查 | - | 检查仓库实现 | - | 写入记录 operation log | 直接调用 `sqlDb.run`，绕过 OperationLog | Fail | ISSUE-005-003 | `src/main/memory/repositories/outline-repository.ts`、`src/main/memory/repositories/plot-structure-repository.ts` | |
| AI 对话 | llm:chat | 普通对话 | 运行时/自动化 | LLM 已配置 | 调用 IPC `llm:chat` | `{ messages: [...] }` | 返回 content 与 usage | 返回 LLMResponse 含 content 与 usage | Pass | | `src/main/ipc/chat.ipc.ts` | |
| AI 对话 | llm:chat-stream | 流式输出 | 运行时/自动化 | LLM 已配置 | 调用 IPC `llm:chat-stream` | `{ messages: [...] }` | 收到 chunk/done 事件 | 按顺序收到 `llm:chunk` 与 `llm:done` | Pass | | `src/main/ipc/chat.ipc.ts` | |
| AI 对话 | llm:cancel-stream | 停止生成 | 运行时/自动化 | 流式生成中 | 调用 IPC `llm:cancel-stream` | requestId | 生成中断 | 可中断 | Pass | | `src/main/engine/llm-provider.ts` | |
| AI 对话 | 错误处理 | API 错误前缀一致 | 运行时/自动化 | 触发非 2xx 响应 | 调用 `llm:chat` 并观察错误 | 401/403/404/500 | 错误信息友好且不二次包装 | 中文前缀 `API 错误` 与英文放行守卫 `API Error` 不匹配，导致二次包装 | Fail | ISSUE-006-001 | `src/main/engine/llm-provider.ts` | |
| AI 对话 | 错误处理 | API Key 不泄露 | 运行时/自动化 | 触发 LLM 错误 | 查看错误信息 | 含 apiKey / sk- 的请求 | 错误信息中不包含 apiKey 或 sk- | 错误信息经 sanitizeError 处理，未暴露 key | Pass | | `src/main/ipc/chat.ipc.ts`、`src/main/ipc/index.ts` | |
| LLM 配置 | llm-provider.ts | 策略注册表 | 代码审查 | - | 检查策略注册表 | - | 包含全部 8 个策略 | 包含 openai/claude/mimo/wenxin/tongyi/custom/custom-anthropic/custom-openai | Pass | | `src/main/engine/llm-provider.ts` | |
| LLM 配置 | openai 策略 | endpoint 与 auth | 代码审查 | - | 检查 openaiStrategy | - | Bearer auth, /chat/completions | `Authorization: Bearer <apiKey>`，endpoint 默认 OpenAI | Pass | | `src/main/engine/llm-provider.ts` | |
| LLM 配置 | claude 策略 | endpoint 与 auth | 代码审查 | - | 检查 claudeStrategy | - | x-api-key, /messages, system 单独提取 | `x-api-key: <apiKey>`，endpoint `/messages`，system 单独字段 | Pass | | `src/main/engine/llm-provider.ts` | |
| LLM 配置 | custom 策略 | 协议切换 | 代码审查/运行时 | - | 配置 customProtocol | 'anthropic'/'openai' | 使用对应策略 | `customProtocol='anthropic'` 使用 claudeStrategy；`'openai'` 使用 openaiStrategy | Pass | | `src/main/engine/llm-provider.ts` | |
| LLM 配置 | llm:config | 配置保存 | 运行时/自动化 | - | 调用 IPC `llm:config` | 完整 LLMConfig | 保存成功 | 写入 `aiscribe-llm.enc` | Pass | | `src/main/ipc/llm-config.ipc.ts` | |
| LLM 配置 | llm:config-meta | 元数据不泄露 key | 运行时/自动化 | 已保存配置 | 调用 IPC `llm:config-meta` | - | 返回不含 apiKey | 返回 `{ ..., hasKey: true/false }`，无 apiKey | Pass | | `src/main/ipc/llm-config.ipc.ts` | |
| LLM 配置 | llm:test-connection | 连接测试超时 | 运行时/自动化 | - | 调用 IPC `llm:test-connection` 到不可达 endpoint | 不可达 endpoint | 15s 内超时 | `TEST_CONNECTION_TIMEOUT_MS = 15_000`，15s 超时 | Pass | | `src/main/engine/llm-provider.ts` | |
| 学习系统 | learning:record | 记录轨迹 | 运行时/自动化 | 存在项目/会话 | 调用 IPC `learning:record` | 完整 RecordLearningData | 写入成功 | 完整数据可写入 | Pass | | `src/main/ipc/learning.ipc.ts` | |
| 学习系统 | learning:record | 缺失必填字段 | 运行时/自动化 | 存在项目 | 调用 IPC `learning:record` 传入 `{ projectId, query }` | 缺失 sessionId/response/duration | 返回友好错误 | 记录成功，缺失字段写入默认值 | Fail | ISSUE-007-001 / ISSUE-008-006 | `src/main/ipc/learning.ipc.ts` | |
| 学习系统 | learning:record | context 大小限制 | 运行时/自动化 | 存在项目 | 调用 IPC `learning:record` 传入超大 context | 大对象 | 拒绝或截断 | 成功写入，无限制 | Fail | ISSUE-007-012 | `src/main/ipc/learning.ipc.ts` | |
| 学习系统 | learning:analyze | 模式分析 | 运行时/自动化 | 已记录轨迹 | 调用 IPC `learning:analyze` | projectId | 返回分析结果 | 返回 patterns/suggestions/profile/nextActions/shortcuts | Pass | | `src/main/ipc/learning.ipc.ts` | |
| 学习系统 | learning:summary | 项目摘要 | 运行时/自动化 | 已记录轨迹 | 调用 IPC `learning:summary` | projectId | 返回语义正确的摘要 | `totalInteractions` 最多 500（下限），`lastActive` 取最早时间 | Fail | ISSUE-007-007 | `src/main/learning/engine.ts` | |
| 作者模型 | writer-model:save / writer-model:get | 作者模型持久化 | 运行时/自动化 | - | 保存后读取 | WriterProfile | 可读取 | 可读取 | Pass | | `src/main/ipc/writer.ipc.ts` | |
| 作者模型 | writer-model:get | writerId 语义 | 代码审查 | - | 检查 writer-model.ts | - | writerId 应代表作者 | 使用 `entries[0].projectId` 作为 writerId，每个项目不同 | Fail | ISSUE-007-008 | `src/main/learning/writer-model.ts` | |
| 技能系统 | skill:list | 列出技能 | 运行时/自动化 | skills/ 目录存在 | 调用 IPC `skill:list` | - | 返回技能列表 | 返回 skills/ 下解析成功的技能 | Pass | | `src/main/engine/skill-loader.ts` | |
| 技能系统 | skill:get | 获取单个技能 | 运行时/自动化 | 技能存在 | 调用 IPC `skill:get` | skillName | 返回技能详情 | 返回 name/description/category/rawContent | Pass | | `src/main/ipc/skill.ipc.ts` | |
| 技能系统 | skill:get / skill:invoke | 不存在技能错误契约 | 运行时/自动化 | - | 分别调用 `skill:get` 与 `skill:invoke` 传入不存在技能 | 不存在 skillName | 统一错误处理 | `skill:get` 返回 null，`skill:invoke` 抛异常 | Fail | ISSUE-007-006 | `src/main/ipc/skill.ipc.ts`、`src/main/engine/skill-loader.ts` | |
| 技能系统 | skill-loader | YAML frontmatter 解析 | 代码审查 | - | 检查 parseSkillMd | - | 使用 YAML 解析器 | 使用正则解析，无法处理引号/多行/列表 | Fail | ISSUE-007-002 | `src/main/engine/skill-loader.ts` | |
| 技能系统 | skill-loader | 加载失败重试与告警 | 代码审查 | - | 检查 ensureLoaded | - | 失败后允许重试并记录摘要 | `loaded = true` 设置过早，失败后不重试；目录不存在无告警 | Fail | ISSUE-007-003 / ISSUE-007-004 | `src/main/engine/skill-loader.ts` | |
| 技能系统 | skill-loader | 重复 name 处理 | 代码审查 | - | 检查 skills Map 写入 | - | 检测重复并提示 | 后加载静默覆盖先加载 | Fail | ISSUE-007-005 | `src/main/engine/skill-loader.ts` | |
| 技能系统 | skill:invoke | 调用技能 | 运行时/自动化 | 技能存在 | 调用 IPC `skill:invoke` | skillName, prompt | 返回结果 | `rawContent` 作为 system prompt 传入 LLM | Pass | | `src/main/engine/skill-loader.ts` | |
| 导入导出 | export:project | 导出项目 | 运行时/自动化 | 存在项目 | 调用 IPC `export:project` | projectId, format | 返回文件内容 | txt/markdown/html 格式均正确 | Pass | | `src/main/export/index.ts` | |
| 导入导出 | export:project | 损坏章节内容导出 | 运行时/自动化 | 章节内容 JSON 损坏 | 调用 IPC `export:project` | projectId | 不泄露 JSON 元数据 | 损坏时直接返回原字符串，可能泄露 `"type":"doc"` 等元数据 | Fail | ISSUE-007-009 | `src/main/export/index.ts` | |
| 导入导出 | export:project | HTML 段落结构 | 运行时/自动化 | 章节含多个段落 | 以 HTML 格式导出 | projectId, format='html' | 每段落独立 `<p>` | 相邻段落被合并为单个 `<p>` | Fail | ISSUE-007-010 | `src/main/export/index.ts` | |
| 导入导出 | import | 非 JSON/缺失字段/超大文件处理 | 运行时/自动化 | - | 调用导入接口 | 异常文件 | 处理符合预期 | 导入模块未实现或本次未覆盖 | N/A | | `src/main/ipc/export.ipc.ts` | |
| 数据库 | Database.create | 初始化 schema_version | 运行时/自动化 | - | 创建 Database 实例 | dbPath | schema_version=3 | 新库写入 version = 3 | Pass | | `src/main/memory/database.ts` | |
| 数据库 | 迁移 | 低版本升级 | 运行时/自动化 | 存在低版本 DB | 打开旧 DB | 旧 DB 文件 | 自动执行 migrations | `v0/v1 → v2` 创建 trajectories 表与索引；`v2 → v3` 创建 8 个索引 | Pass | | `src/main/memory/database.ts` | |
| 数据库 | 防抖 | 写操作防抖 | 运行时/自动化 | DB 已初始化 | 连续 updateChapter 5 次 | - | 300ms 内合并保存 | 每次调用 `clearTimeout` 后重新 `setTimeout(..., 300)` | Pass | | `src/main/memory/database.ts` | |
| 数据库 | close | 取消待保存任务并 flush | 运行时/自动化 | 有待保存任务 | 调用 `Database.close()` | - | 数据落盘 | 先 `clearTimeout` 再调用 `save()` | Pass | | `src/main/memory/database.ts` | |
| IPC | wrap 规范 | 所有 handler 审查 | 代码审查 | - | 检查 src/main/ipc/*.ipc.ts | - | 无 event 误捕获 | 14 个 handler 文件均使用 `wrap` 或 `wrapEvent` | Pass | | `src/main/ipc/*.ipc.ts` | |
| IPC | wrapEvent | `llm:chat-stream` | 代码审查 | - | 检查 chat.ipc.ts | - | 使用 wrapEvent 获取 event.sender | 正确获取 `event.sender` 推送流式事件 | Pass | | `src/main/ipc/chat.ipc.ts` | |
| IPC | preload 一致性 | 通道名一致 | 代码审查 | - | 对比 preload 与 IPC_CHANNELS | - | 通道一致 | `src/preload/index.ts` 全部使用 `IPC_CHANNELS` 常量，与 handler 注册一致 | Pass | | `src/preload/index.ts` | |
| IPC | 参数校验 | `project:create` 空对象 | 运行时/自动化 | - | 调用 `project:create` 传入 `{}` | `{}` | 返回友好错误 | 返回友好错误 | Pass | | `src/main/ipc/project.ipc.ts` | |
| IPC | 参数校验 | `project:get` 非法 UUID | 运行时/自动化 | - | 调用 `project:get` 传入非法 ID | `'invalid-uuid'` | 返回友好错误 | 返回友好错误 | Pass | | `src/main/ipc/project.ipc.ts` | |
| IPC | 参数校验 | `novel:create` 缺失 projectId | 运行时/自动化 | - | 调用 `novel:create` 传入 `{ title: 'Test' }` | 无 projectId | 返回友好错误 | 创建成功，写入空 project_id | Fail | ISSUE-008-001 | `src/main/ipc/novel.ipc.ts` | |
| IPC | 参数校验 | `chapter:create` 缺失 novelId | 运行时/自动化 | - | 调用 `chapter:create` 传入 `{ title: 'Ch1' }` | 无 novelId | 返回友好错误 | 创建成功，写入空 novel_id | Fail | ISSUE-008-002 | `src/main/ipc/novel.ipc.ts` | |
| IPC | 参数校验 | `character:create` 缺失 novelId/role | 运行时/自动化 | - | 调用 `character:create` 传入 `{ name: 'Alice' }` | 无 novelId/role | 返回友好错误 | 创建成功，写入空 novel_id，role 回退 minor | Fail | ISSUE-008-003 | `src/main/ipc/character.ipc.ts` | |
| IPC | 参数校验 | `checkpoint:create` 缺失 projectId | 运行时/自动化 | - | 调用 `checkpoint:create` 传入 `{ label: 'v1' }` | 无 projectId | 返回友好错误 | 创建成功，写入空 project_id | Fail | ISSUE-008-004 | `src/main/ipc/checkpoint.ipc.ts` | |
| IPC | 参数校验 | `session:create` 缺失 projectId | 运行时/自动化 | - | 调用 `session:create` 传入 `{}` | 无 projectId | 返回友好错误 | 创建成功，写入空 project_id | Fail | ISSUE-008-005 | `src/main/ipc/checkpoint.ipc.ts` | |
| IPC | 参数校验 | `learning:record` 缺失必填字段 | 运行时/自动化 | - | 调用 `learning:record` 传入 `{ projectId, query }` | 无 sessionId/response/duration | 返回友好错误 | 记录成功，缺失字段写入默认值 | Fail | ISSUE-008-006 | `src/main/ipc/learning.ipc.ts` | |
| IPC | 参数校验 | `project:update` / `chapter:update` 空名称 | 运行时/自动化 | - | 更新时传入空 name/title | `{ name: '' }` / `{ title: '   ' }` | 返回友好错误 | 更新成功，置为空/空白 | Fail | ISSUE-008-007 | `src/main/ipc/project.ipc.ts`、`src/main/ipc/novel.ipc.ts` | |
| IPC | 参数校验 | `world:save` / `outline:save` 无效 type | 运行时/自动化 | - | 保存时传入无/非法 type | 无 type / `type: 'invalid'` | 返回友好错误 | 保存成功，写入默认值或非法字符串 | Fail | ISSUE-008-008 | `src/main/ipc/world.ipc.ts` | |
| IPC | 参数校验 | `llm:chat` 空 messages | 运行时/自动化 | - | 调用 `llm:chat` 传入 `{ messages: [] }` | 空数组 | 返回友好错误 | 返回友好错误 | Pass | | `src/main/ipc/chat.ipc.ts` | |
| IPC | 参数校验 | `llm:chat-stream` 非数组 messages | 运行时/自动化 | - | 调用 `llm:chat-stream` 传入 `{ messages: 'not-array' }` | 非数组 | 返回友好错误 | 返回友好错误 | Pass | | `src/main/ipc/chat.ipc.ts` | |
| 端到端 | 流程 A | 项目→小说→章节→保存→重开 | 运行时 | 应用可启动 | 完整 UI 操作 | - | 数据一致 | 待验证 | Pending | | - | |
| 端到端 | 流程 B | 编辑器→AI→插入→保存 | 运行时 | 应用可启动 | 完整 UI 操作 | - | 内容一致 | 待验证 | Pending | | - | |
| 端到端 | 流程 C | 切换 provider 保持上下文 | 运行时 | 应用可启动 | 完整 UI 操作 | - | 上下文保持 | 待验证 | Pending | | - | |
| 端到端 | 流程 D | 角色/世界观跨模块引用 | 运行时 | 应用可启动 | 完整 UI 操作 | - | 引用一致 | 待验证 | Pending | | - | |
