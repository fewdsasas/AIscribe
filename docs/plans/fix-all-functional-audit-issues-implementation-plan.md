# 修复全部 41 个功能审计问题实施计划

## 1. Summary

针对 `comprehensive-functional-audit` 发现的 **41 个问题**（P1=18，P2=23），制定本可执行修复计划。修复按模块聚合、分 10 个阶段推进：先消除数据完整性与核心校验风险（P1），再处理健壮性、规范性与性能问题（P2）。所有修改基于现有代码结构，遵循项目 IPC/Repository 约定，并通过新增/补充自动化测试验证。

## 2. Current State Analysis

### 2.1 基线状态

- `npm run typecheck`：当前可通过，但 `src/main/learning/writer-model.ts` 第 6 行仍未使用注入的 `writerId`。
- `npm run test:run`：历史基线 93 files / 773 tests passed；新增回归测试尚未写入。
- `npm run lint`：当前无错误。

### 2.2 已落地的准备

- **IPC 校验辅助函数**：`src/main/ipc/index.ts` 已提供 `requireId`、`requireObject`、`requireNonEmptyString`、`requireEnum`、`requireNumber`、`requireNonNegativeNumber`。
- **部分 IPC handler 校验**：`novel.ipc.ts`、`character.ipc.ts`、`learning.ipc.ts`、`world.ipc.ts`、`checkpoint.ipc.ts`、`project.ipc.ts` 已补齐必填/枚举校验。
- **Repository shape 修复**：`row-mapper.ts` 新增 `safeJsonParseWithShape`；`character-repository.ts` 的 `personality`/`arc` 与 `world-repository.ts` 的 `powerSystem` 已改用 shape 合并。
- **缓存一致性接口**：`repository-interfaces.ts` 的 `IChapterRepository`/`INovelRepository` 已声明 `clearCache()`；`database.ts` 的 `deleteProject` 已显式清理子记录缓存。
- **大纲/情节结构修复**：`outline-repository.ts` 已区分 insert/update 并递增 `version`；`plot-structure-repository.ts` 已校验 `chapterIds` 存在性。
- **导出修复**：`src/main/export/index.ts` 已增加损坏 JSON 回退与 HTML 段落换行处理。
- **学习系统部分修复**：`learning/engine.ts` 已注入 `writerId` 并调用精确统计方法；`trajectory-repository.ts` 已新增 `countByProject` / `getLastActiveByProject`。

### 2.3 当前阻塞点 / 未收尾项

- `src/main/learning/writer-model.ts` 第 6 行 `buildModel` 仍使用 `entries[0].projectId` 作为 `writerId`，未使用构造函数注入的 `writerId`。
- `src/main/memory/repositories/character-repository.ts` 第 37 行 `create` 与 `world-repository.ts` 第 49 行 `save` 仍直接调用 `this.sqlDb.run`，绕过 `BaseRepository.run` 的 OperationLog 记录与缓存失效（查询方法可保留原入口）。
- `IPC_CHANNELS` 常量仍在 `src/preload/index.ts`、所有 `src/main/ipc/*.ipc.ts` handler 文件及部分测试文件中使用，需完全删除并内联字符串。
- `src/main/engine/skill-loader.ts` 仍使用正则解析 YAML frontmatter、无条件设置 `loaded = true`、未检测重复 skill name；`package.json` 尚未添加 `yaml` 依赖。
- `src/main/engine/llm-provider.ts` 第 338 行非流式错误前缀为中文 `API 错误 (...)`，与流式路径的 `API Error` 不一致，导致被二次包装。
- `tests/integration/stress-ipc.test.ts` scenario 3 在 `test:coverage` 下易超时。
- Renderer 编辑器 (`NovelEditor.tsx`) 无内容上限，`NovelStructure.ts` 输入规则插入位置为 `start - 1`。

### 2.4 问题分布

| 模块 | P1 | P2 | 核心问题 |
|---|---|---|---|
| 项目与小说 | 3 | 2 | 父级 ID 校验、`project:delete` 子仓库缓存失效 |
| 角色与世界观 | 3 | 3 | JSON shape 缺失、`character:create`/`world:save` 校验、写入绕过 OperationLog |
| 大纲、情节结构与编辑器 | 3 | 3 | `createdAt`/`version`、chapterIds 校验、NovelStructure 插入位置、NovelEditor 内容上限 |
| AI 对话与 LLM 配置 | 0 | 1 | 非流式错误前缀中英文不一致 |
| 学习、技能与导入导出 | 4 | 8 | writerId 误用、skill-loader 健壮性、损坏 JSON/HTML 导出、IPC_CHANNELS 移除 |
| 数据库、持久化与 IPC | 5 | 3 | 必填字段校验、OperationLog 绕过、IPC_CHANNELS 常量 |
| 环境基线 | 0 | 1 | `test:coverage` stress 超时、核心覆盖率 < 80% |

## 3. Proposed Changes

### Stage 1：IPC handler 必填字段校验 + 回归测试

目标：在所有创建/更新 handler 中补齐 `requireId` / `requireNonEmptyString` / 枚举校验，防止脏数据进入数据库。

状态：辅助函数与大部分 handler 校验已落地，需补充对应单元测试。

#### 1.1 校验辅助函数

- 文件：`src/main/ipc/index.ts` 第 28-41 行
- 确认 `requireEnum` / `requireNumber` / `requireNonNegativeNumber` 存在。
- 新增/补充 `tests/main/ipc/validation.test.ts` 覆盖非法枚举、NaN、负数场景。

#### 1.2 Novel handler

- 文件：`src/main/ipc/novel.ipc.ts`
- 已落地：`NOVEL_CREATE` 校验 `projectId`；`CHAPTER_CREATE` 校验 `novelId`；`CHAPTER_UPDATE` 空标题校验。
- 验证：`tests/main/ipc/novel-handlers.test.ts` 覆盖缺失/非法父级 ID、空标题更新。

#### 1.3 Character handler

- 文件：`src/main/ipc/character.ipc.ts`
- 已落地：`CHARACTER_CREATE` 校验 `novelId` 与 `role` 枚举。
- 枚举来源：`src/shared/types/index.ts` 中 `CharacterRole`。
- 验证：`tests/main/ipc/character-handlers.test.ts` 覆盖非法 `role` 枚举。

#### 1.4 Checkpoint handler

- 文件：`src/main/ipc/checkpoint.ipc.ts`
- 已落地：`CHECKPOINT_CREATE` / `SESSION_CREATE` 校验 `projectId`。
- 验证：`tests/main/ipc/checkpoint-handlers.test.ts` 覆盖缺失 `projectId`。

#### 1.5 Learning handler

- 文件：`src/main/ipc/learning.ipc.ts`
- 已落地：`sessionId`/`query`/`response`/`duration` 校验；`context` > 64KB 截断。
- 验证：`tests/main/ipc/learning-handlers.test.ts` 补充 context 截断测试。

#### 1.6 Project handler

- 文件：`src/main/ipc/project.ipc.ts`
- 已落地：`PROJECT_UPDATE` `name` 非空校验。
- 验证：`tests/main/ipc/project-handlers.test.ts` 覆盖空 `name` 更新。

#### 1.7 World handler

- 文件：`src/main/ipc/world.ipc.ts`
- 已落地：`WORLD_SAVE` 校验 `WorldType`；`OUTLINE_SAVE` 校验 `brief|detailed`；`PLOT_STRUCTURE_SAVE` 校验 `NarrativeFramework`。
- 验证：新建/更新 `tests/main/ipc/world-handlers.test.ts` 覆盖非法枚举与缺失字段。

---

### Stage 2：Repository 反序列化 shape 修复 + 回归测试

目标：确保数据库中 JSON 字段即使为默认空对象，反序列化后仍包含接口所有必填字段。

状态：核心修改已落地，需补充单元测试。

#### 2.1 Row mapper

- 文件：`src/main/memory/repositories/row-mapper.ts`
- 已提供 `safeJsonParseWithShape<T>(value, shape)`，解析对象后与 shape 浅层合并。

#### 2.2 Character repository

- 文件：`src/main/memory/repositories/character-repository.ts`
- `personality` 与 `arc` 已改用 `safeJsonParseWithShape`。
- 验证：新建 `tests/main/memory/repositories/character-repository.test.ts`，直接插入 `personality='{}'` / `arc='{}'` 的行，断言返回对象包含所有必填字段。

#### 2.3 World repository

- 文件：`src/main/memory/repositories/world-repository.ts`
- `powerSystem` 已改用 `safeJsonParseWithShape<PowerSystem>`。
- 验证：新建 `tests/main/memory/repositories/world-repository.test.ts`，构造 `power_system='{}'` 的行，断言返回对象包含所有必填字段。

---

### Stage 3：Repository 统一写入入口 + 缓存一致性测试

目标：消除直接调用 `sqlDb.run` 的遗留写入入口，确保 OperationLog 记录与缓存失效。`outline-repository.ts` 与 `plot-structure-repository.ts` 写入入口已统一，本阶段聚焦 `character` / `world`。

#### 3.1 Character repository

- 文件：`src/main/memory/repositories/character-repository.ts`
- 当前问题：第 37 行 `create` 使用 `this.sqlDb.run`；查询方法可保留原入口。
- What：将 `create` 中的 `this.sqlDb.run(...)` 替换为 `this.run(...)`。
- Why：统一走 `BaseRepository.run`，自动追加 OperationLog 并 `clearCache()`。
- 注意：保留 `this.scheduleSave()` 调用（`BaseRepository.run` 不自动触发磁盘保存调度）。

#### 3.2 World repository

- 文件：`src/main/memory/repositories/world-repository.ts`
- 当前问题：第 49 行 `save` 使用 `this.sqlDb.run`；查询方法可保留原入口。
- What：将 `save` 中的 `this.sqlDb.run(...)` 替换为 `this.run(...)`。

#### 3.3 PlotStructure repository（可选对齐）

- 文件：`src/main/memory/repositories/plot-structure-repository.ts`
- 当前 `save` 已使用 `this.run`，但校验 chapterIds 的 SELECT 仍使用 `this.sqlDb.exec`。可替换为 `this.queryOne`/`this.query` 以统一只读查询入口，不影响 OperationLog。

#### 3.4 缓存一致性测试

- 文件：`tests/main/memory/database.test.ts` / 各 repository 测试
- 新增：
  - `project:delete` 后 `novels.listByProject` / `chapters.listByNovel` 返回空。
  - `character.create` 后再次 `listByNovel` 可见新记录（验证缓存已失效）。
  - `world.save` 更新后再次 `getByNovel` 返回新值。

---

### Stage 4：大纲/情节结构修复 + 回归测试

状态：代码已修复，待补测试。

#### 4.1 Outline save 区分 insert/update

- 文件：`src/main/memory/repositories/outline-repository.ts`
- 已落地：`save` 区分 insert/update，保留 `createdAt`，递增 `version`。
- 验证：新增测试，连续保存两次同一 novel 的大纲，断言 `createdAt` 不变、`version` 从 1 变为 2。

#### 4.2 PlotStructure chapterIds 存在性校验

- 文件：`src/main/memory/repositories/plot-structure-repository.ts`
- 已落地：收集 beats 中的 chapterIds，查询 `chapters` 表校验归属，缺失时抛出业务错误。
- 验证：新增测试，构造不存在的 chapterId，断言保存抛出 `情节 beat 引用了不存在的章节`。

---

### Stage 5：导出修复 + 回归测试

状态：代码已修复，待补测试。

#### 5.1 损坏 JSON 回退

- 文件：`src/main/export/index.ts`
- 已落地：`extractTextFromContent` 在 JSON.parse 失败后先正则提取 `"text"` 字段，仍失败则返回空字符串并 `logger.warn`。
- 验证：新建/补充 `tests/main/export/index.test.ts`，覆盖：
  - 损坏但仍含 `text` 字段的 JSON → 提取纯文本。
  - 完全损坏且不含 `text` → 返回空字符串且不泄漏元数据。

#### 5.2 HTML 段落结构

- 文件：`src/main/export/index.ts`
- 已落地：`extractTipTapText` 在 paragraph 节点后追加 `\n`，`generateHtml` 按换行拆分 `<p>`。
- 验证：多段落内容导出 HTML 后产生多个 `<p>` 标签。

---

### Stage 6：学习系统修复 + 测试

#### 6.1 Learning IPC handler

- 文件：`src/main/ipc/learning.ipc.ts`
- 已在 Stage 1 覆盖必填校验与 context 截断。

#### 6.2 TrajectoryRepository 方法

- 文件：`src/main/memory/repositories/trajectory-repository.ts`
- 已新增 `countByProject` / `getLastActiveByProject`；接口 `ITrajectoryRepository` 已声明。

#### 6.3 WriterModelUpdater 收尾

- 文件：`src/main/learning/writer-model.ts`
- 当前问题：第 6 行 `buildModel` 使用 `entries[0].projectId` 作为 `writerId`。
- What：
  1. 构造函数接收并保存 `writerId: string`。
  2. `buildModel` 返回 `{ writerId: this.writerId, ... }`，不再从 `entries` 推断。
- Why：修复 ISSUE-007-008，确保 `service-registry.ts` 注入的稳定 writerId 生效。
- 验证：更新 `tests/main/learning/writer-model.test.ts`，使用 `new WriterModelUpdater('test-writer-id')` 并断言 `model.writerId === 'test-writer-id'`。

#### 6.4 LearningEngine 统计验证

- 文件：`src/main/learning/engine.ts`
- 已使用精确计数与最近时间。
- 验证：新增测试，向同一 project 写入多条 trajectory，断言 `getProjectSummary` 的 `totalInteractions` 与 `lastActive` 准确。

---

### Stage 7：技能系统修复 + 完全删除 IPC_CHANNELS

#### 7.1 新增 yaml 依赖

- 文件：`package.json`
- What：新增依赖 `yaml`（零依赖、TypeScript 友好）。
- How：`npm install yaml`。

#### 7.2 SkillLoader 健壮性

- 文件：`src/main/engine/skill-loader.ts`
- What 1：第 141-165 行 `parseSkillMd` 改用 `YAML.parse` 解析 frontmatter，保留对非对象/缺 name 的防御并记录 warn。
- What 2：第 35-47 行 `ensureLoaded` 仅当至少一个候选目录成功加载后才设置 `loaded = true`；所有目录均不存在时记录 `logger.error`。
- What 3：在 `this.skills.set(skill.name, skill)` 前检查重复 name，发现重复时 `logger.warn`。
- What 4：`executeSkill` 改用 `this.getSkill(name)` 获取技能（可触发 `ensureLoaded`），若不存在抛出 `技能不存在: ${name}`，与 `skill:get` 行为一致。
- 验证：新建 `tests/main/engine/skill-loader.test.ts`，覆盖：
  - 多行 description YAML 解析。
  - 目录不存在时错误日志。
  - 重复 skill name 警告。
  - 调用不存在技能时抛出统一错误。

#### 7.3 完全删除 IPC_CHANNELS 常量

- 涉及文件：
  - Main handlers：`src/main/ipc/*.ipc.ts`（共 15 个）
  - 权限中间件：`src/main/ipc/permission.ts`
  - Preload：`src/preload/index.ts`
  - 类型定义：`src/shared/types/ipc.ts`
  - 测试：`tests/main/ipc/di-handlers.test.ts`、`tests/main/ipc/chat-handlers.test.ts`、`tests/main/ipc/ipc-channels.test.ts`
- What：
  1. 所有 `ipcMain.handle(IPC_CHANNELS.XXX, ...)` 替换为内联字符串字面量（如 `'project:create'`）。
  2. `preload/index.ts` 中所有 `invoke` / `on` / `removeListener` 的 `IPC_CHANNELS.XXX` 替换为对应字符串字面量。
  3. `permission.ts` 中 `PERMISSION_RULES` 的 `channel` 改为字符串字面量。
  4. 从 `src/shared/types/ipc.ts` 删除 `IPC_CHANNELS` 对象与 `IpcChannel` 类型（若其他模块仍引用 `IpcChannel`，可保留为字符串字面量联合类型，但本次无引用需求，直接删除）。
  5. 删除 `tests/main/ipc/ipc-channels.test.ts`（该测试验证常量本身，常量移除后无意义）。
  6. 更新 `di-handlers.test.ts` 与 `chat-handlers.test.ts` 中依赖 `IPC_CHANNELS` 的调用，改为字符串字面量。
- Why：修复 ISSUE-007-011，遵循项目 IPC 约定（不使用 IPC_CHANNELS 常量）。
- 注意：保持通道名与当前运行时完全一致，避免通道不匹配。
- 验证：运行所有 IPC handler 测试与集成测试，确保通道未变更。

---

### Stage 8：LLM 错误前缀统一 + 测试

#### 8.1 错误前缀统一

- 文件：`src/main/engine/llm-provider.ts` 第 338 行
- What：将中文 `API 错误 (${response.status}): ${errorMsg}` 改为英文 `API Error (${response.status}): ${errorMsg}`。
- Why：修复 ISSUE-006-001，使非流式错误与流式路径一致，避免被 `error.message.startsWith('API Error')`（第 345 行）二次包装。
- 验证：
  - 更新 `tests/main/engine/llm-provider.test.ts` 中对应断言。
  - 新增测试断言非 2xx 响应抛出 `API Error` 前缀错误。

---

### Stage 9：覆盖率与测试修复

#### 9.1 stress-ipc 超时

- 文件：`tests/integration/stress-ipc.test.ts` 第 181 行 scenario 3
- What：在该 `it(...)` 上显式增加超时：`it('scenario 3: ...', { timeout: 30000 }, async () => {...})`。
- 替代：若仍不稳定，可在 coverage 命令中排除压力测试，但优先保留测试并增加超时。

#### 9.2 各阶段回归测试汇总

- Stage 1：IPC 校验回归测试（novel / character / world / learning / checkpoint / project handlers）。
- Stage 2：Repository shape 回归测试（character / world repository）。
- Stage 3：缓存一致性测试（project 删除后 novel/chapter 缓存失效；character/world 写入后缓存失效）。
- Stage 4：大纲 version/createdAt 与 plot-structure chapterIds 校验测试。
- Stage 5：导出损坏 JSON 与 HTML 段落测试。
- Stage 6：学习统计精确计数、lastActive、writerId 注入测试。
- Stage 7：skill-loader YAML 解析、重复 name、目录不存在、IPC_CHANNELS 移除后通道测试。
- Stage 8：LLM 错误前缀测试。
- Stage 10：NovelEditor 内容上限与 NovelStructure 输入规则测试。

---

### Stage 10：编辑器边界修复 + 测试

#### 10.1 NovelEditor 内容上限

- 文件：`src/renderer/components/editor/NovelEditor.tsx`
- What：
  1. 定义常量 `MAX_CHAPTER_CHARS = 500_000`。
  2. 在 `onUpdate` 中计算 `chars`，当超过上限时：
     - 调用 `editor.commands.undo()` 回退最后一次输入。
     - 通过 `logger.warn`（从 preload 注入或控制台）记录，或调用可选的 `onContentLimitReached` 回调通知父组件。
  3. 添加 `handlePaste`：监听编辑器 DOM 的 `paste` 事件，预估粘贴文本长度，超过阈值时 `event.preventDefault()` 并记录 warn。
  4. 在 `useEffect` 中绑定/解绑 paste 事件监听器。
- Why：修复 ISSUE-005-005，防止超大内容导致性能下降或 IPC payload 过大。
- 验证：新建 `tests/renderer/components/novel-editor.test.tsx`，渲染 `NovelEditor` 并模拟输入超过 50 万字，断言内容未超过上限或回调被调用。

#### 10.2 NovelStructure 输入规则

- 文件：`src/renderer/components/editor/extensions/NovelStructure.ts` 第 163 行
- What：将 `tr.insert(start - 1, node)` 改为 `tr.insert(start, node)`。
- Why：修复 ISSUE-005-004，`start - 1` 在段落起始位置可能将 sceneBlock 插入到错误位置。
- 验证：新建/补充 `tests/renderer/components/novel-structure.test.ts`，创建 Editor 并触发 `--- ` 输入规则，断言文档中出现 `sceneBlock` 节点且内部包含空 paragraph。

## 4. Assumptions & Decisions

1. **范围**：修复全部 41 个 P1/P2 问题；同时按用户确认纳入两项扩展：
   - `character-repository.ts` 与 `world-repository.ts` 的直接 `sqlDb.run` 调用统一改为 `this.run`。
   - **完全删除** `src/shared/types/ipc.ts` 中的 `IPC_CHANNELS` 常量，所有 handler、preload、permission 内联通道字符串。
2. **辅助函数**：复用 `src/main/ipc/index.ts` 的校验辅助函数，不引入新依赖。
3. **缓存清理**：`BaseRepository.clearCache()` 已 public；跨仓库级联删除的缓存清理在 `database.ts` 中显式调用。
4. **OperationLog**：`character`、`world`、`outline`、`plot-structure` 仓库写入统一走 `BaseRepository.run`。
5. **WriterId**：采用注入方式，`LearningEngine` 构造时传入稳定的 `writerId`（来自 `app.getPath('userData')` 派生），`WriterModelUpdater.buildModel` 强制使用该值。
6. **Skill YAML**：引入 `yaml` 依赖替换正则解析。
7. **IPC_CHANNELS**：完全删除常量定义与所有引用；`tests/main/ipc/ipc-channels.test.ts` 一并删除；`IpcChannel` 类型如无其他引用一并删除。
8. **测试**：每个修复点至少新增一个自动化测试；优先补齐 renderer 组件 0% 覆盖区域的核心边界测试。
9. **顺序**：先 P1 后 P2，先数据层后 UI 层，先校验后功能增强；每个 Stage 完成后执行 `npm run typecheck` 与 `npm run test:run`。

## 5. Verification Steps

1. **静态检查**：
   - `npm run typecheck` 无类型错误
   - `npm run lint` 无错误
   - `npm run format:check` 无格式错误
2. **单元/集成测试**：
   - `npm run test:run` 全部通过
   - 新增测试覆盖所有修改点
3. **覆盖率**：
   - `npm run test:coverage` 成功执行不再超时
   - 核心模块覆盖率逐步提升至 ≥80%
4. **端到端验证**：
   - 重新运行 `comprehensive-functional-audit` 测试矩阵，确认 41 个问题状态转为 Fixed
   - 可选：启动 Electron 验证跨模块流程
5. **文档更新**：
   - 更新 `.trae/specs/comprehensive-functional-audit/issues.md` 对应问题状态为 `Fixed`
   - 更新 `.trae/specs/comprehensive-functional-audit/test-matrix.md` 实际结果与测试结果
   - 更新 `.trae/specs/comprehensive-functional-audit/checklist.md` 已修复项为 Pass

## 6. Implementation Order

| 阶段 | 任务 | 优先级 | 依赖 | 当前状态 |
|---|---|---|---|---|
| 1 | IPC handler 必填字段校验 + 回归测试 | P1 | 无 | 校验已落地，待补测试 |
| 2 | Repository 反序列化 shape 修复 + 回归测试 | P1 | 无 | shape 修复已落地，待补测试 |
| 3 | Repository 统一写入入口（character/world）+ 缓存一致性测试 | P1 | Stage 2 | 待执行 |
| 4 | 大纲/情节结构修复 + 回归测试 | P1 | Stage 3 | 代码已修复，待补测试 |
| 5 | 导出修复 + 回归测试 | P1 | 无 | 代码已修复，待补测试 |
| 6 | 学习系统修复（writerId 收尾、统计精确化）+ 测试 | P1/P2 | Stage 3 | writerId 待收尾，测试待补 |
| 7 | 技能系统修复（YAML、skill-loader 健壮性、完全删除 IPC_CHANNELS）+ 测试 | P2 | 无 | 待执行 |
| 8 | LLM 错误前缀统一 + 测试 | P2 | 无 | 待执行 |
| 9 | 覆盖率与测试修复（stress-ipc 超时 + 全阶段回归测试） | P2 | Stage 1-8 | 待执行 |
| 10 | 编辑器边界修复（内容上限、NovelStructure 输入规则）+ 测试 | P2 | Stage 1-5 | 待执行 |
| 最终 | typecheck + lint + test:run + test:coverage | - | Stage 1-10 | 待执行 |

每个 Stage 完成后执行 `npm run typecheck` 与 `npm run test:run` 确保不破坏现有测试。Stage 1-2 的测试补充可与 Stage 3-8 并行开发，但必须在 Stage 9 前全部完成。
