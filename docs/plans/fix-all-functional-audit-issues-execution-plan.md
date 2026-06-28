# 修复全部 41 个功能审计问题实施计划

## 1. Summary

本次计划针对 `comprehensive-functional-audit` 发现的 **41 个问题**（P1=18，P2=23）制定可执行的修复方案。修复工作按模块聚合、分 10 个阶段推进：先消除数据完整性与核心校验风险（P1），再处理健壮性、规范性与性能问题（P2）。所有修改均基于现有代码结构，遵循项目 IPC/Repository 约定，并通过新增/补充单元测试与集成测试验证。

## 2. Current State Analysis

### 2.1 基线状态（基于当前代码实际状态）

- `npm run typecheck`：上一次完整运行为通过，但 [src/main/learning/writer-model.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/writer-model.ts) 中 `buildModel` 仍未使用注入的 `writerId`，需在后续阶段收尾。
- `npm run test:run`：历史基线 93 files / 773 tests passed；当前新增/补充测试尚未写入。
- `npm run lint`：无错误。

### 2.2 已完成的准备工作

- **IPC 校验辅助函数已落地**：[src/main/ipc/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/index.ts) 已新增 `requireEnum`（第 28 行）、`requireNumber`（第 34 行）、`requireNonNegativeNumber`（第 38 行），与既有 `requireId`、`requireObject`、`requireNonEmptyString` 形成完整校验工具集。
- **部分 IPC handler 已写入必填校验**：
  - [src/main/ipc/novel.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/novel.ipc.ts)：`NOVEL_CREATE`/`CHAPTER_CREATE`/`CHAPTER_UPDATE` 已补齐 `requireId` / `requireNonEmptyString`
  - [src/main/ipc/character.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/character.ipc.ts)：`CHARACTER_CREATE` 已补齐 `novelId` / `role` 枚举校验
  - [src/main/ipc/learning.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/learning.ipc.ts)：`LEARNING_RECORD` 已补齐 `sessionId`/`response`/`duration`/`context` 校验
  - [src/main/ipc/world.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/world.ipc.ts)：`WORLD_SAVE`/`OUTLINE_SAVE`/`PLOT_STRUCTURE_SAVE` 已补齐枚举校验
  - [src/main/ipc/checkpoint.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/checkpoint.ipc.ts)：`CHECKPOINT_CREATE`/`SESSION_CREATE` 已补齐 `projectId` 校验
  - [src/main/ipc/project.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/project.ipc.ts)：`PROJECT_UPDATE` 已补齐 `name` 非空校验
- **Repository shape 修复已落地**：
  - [src/main/memory/repositories/row-mapper.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/row-mapper.ts) 新增 `safeJsonParseWithShape`
  - [src/main/memory/repositories/character-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/character-repository.ts) 的 `personality`/`arc` 已改用 `safeJsonParseWithShape`
  - [src/main/memory/repositories/world-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/world-repository.ts) 的 `powerSystem` 已改用 `safeJsonParseWithShape`
- **数据库缓存一致性已落地**：
  - [src/main/memory/repositories/repository-interfaces.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/repository-interfaces.ts) 的 `IChapterRepository` 与 `INovelRepository` 已声明 `clearCache(): void`
  - [src/main/memory/database.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/database.ts) 的 `deleteProject` 已显式删除子记录并清理缓存
- **大纲/情节结构修复已落地**：
  - [src/main/memory/repositories/outline-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/outline-repository.ts) 的 `save` 已区分 insert/update，保留 `createdAt` 并递增 `version`
  - [src/main/memory/repositories/plot-structure-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/plot-structure-repository.ts) 的 `save` 已校验 `chapterIds` 存在性
- **导出修复已落地**：
  - [src/main/export/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/export/index.ts) 已增加损坏 JSON 回退与 HTML 段落结构处理
- **学习系统部分落地**：
  - [src/main/learning/engine.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/engine.ts) 已注入 `writerId` 并调用精确统计方法
  - [src/main/memory/repositories/trajectory-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/trajectory-repository.ts) 已新增 `countByProject` 与 `getLastActiveByProject`
  - [src/main/di/service-registry.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/di/service-registry.ts) 已生成稳定 `writerId` 并注入 `LearningEngine`

### 2.3 当前阻塞点/未收尾项

- [src/main/learning/writer-model.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/writer-model.ts) 第 6 行 `buildModel` 仍使用 `entries[0].projectId` 作为 `writerId`，未使用 `WriterModelUpdater` 构造函数注入的 `writerId`。这会导致 `LearningEngine` 传入的 `writerId` 失效，需在 Stage 6 收尾。
- [src/main/memory/repositories/character-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/character-repository.ts) 第 37 行、第 71 行与 [src/main/memory/repositories/world-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/world-repository.ts) 第 27 行、第 49 行仍直接调用 `this.sqlDb.run` / `this.sqlDb.exec`，绕过 `BaseRepository.run` 的 OperationLog 记录与缓存失效，需纳入 Stage 3 统一修复。
- [src/main/ipc/skill.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/skill.ipc.ts)、[src/main/ipc/learning.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/learning.ipc.ts)、[src/main/ipc/export.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/export.ipc.ts) 与 [src/preload/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/preload/index.ts) 仍使用 `IPC_CHANNELS` 常量，需按用户确认的范围**完全删除**该常量。

### 2.4 主要问题分布

| 模块 | P1 | P2 | 核心问题 |
|---|---|---|---|
| 项目与小说 | 3 | 2 | `novel:create`/`chapter:create` 父级 ID 未校验；`project:delete` 级联删除后子仓库缓存未失效 |
| 角色与世界观 | 3 | 3 | `personality`/`arc`/`powerSystem` 反序列化缺少必填字段；`character:create` 未校验 `novelId`/`role`；`world:save` 未校验 `type` |
| 大纲、情节结构与编辑器 | 3 | 3 | `outline:save` 覆盖 `createdAt` 且 `version` 不递增；`plot-structure:save` 未校验 `chapterIds`；`outline`/`plot-structure` 绕过 `OperationLog` |
| AI 对话与 LLM 配置 | 0 | 1 | 非流式 API 错误前缀中英文不一致导致二次包装 |
| 学习系统、技能系统与导入导出 | 4 | 8 | `learning:record` 必填字段/`context` 大小未校验；`learning:summary` 统计语义错误；`writerId` 误用 `projectId`；skill-loader 使用正则解析 YAML、硬编码路径、加载失败静默、重复 name 覆盖 |
| 数据库、持久化与 IPC | 5 | 3 | `checkpoint:create`/`session:create`/`learning:record` 必填字段未校验；`project:update`/`chapter:update` 空名称/标题；`world:save`/`outline:save` type 枚举未校验；`IPC_CHANNELS` 常量使用（P2） |
| 环境基线 | 0 | 1 | `test:coverage` 因 `stress-ipc.test.ts` scenario 3 超时失败；核心覆盖率低于 80% |

## 3. Proposed Changes

### Stage 1：IPC handler 必填字段校验（P1 + 部分 P2）

目标：在所有创建/更新 handler 中补齐 `requireId` / `requireNonEmptyString` / 枚举校验，防止脏数据进入数据库。

状态：**辅助函数与大部分 handler 校验已落地**，需补充对应单元测试并验证所有枚举值与类型定义同步。

#### 1.1 校验辅助函数

- 文件：[src/main/ipc/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/index.ts)
- 内容：确认 `requireEnum` / `requireNumber` / `requireNonNegativeNumber` 已存在（第 28-41 行）。
- 验证：`npm run typecheck` 通过；新增测试覆盖非法枚举、NaN、负数场景。

#### 1.2 Novel handler

- 文件：[src/main/ipc/novel.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/novel.ipc.ts)
- What：
  - `NOVEL_CREATE`：`requireId(data.projectId, '项目ID')`
  - `CHAPTER_CREATE`：`requireId(data.novelId, '小说ID')`
  - `CHAPTER_UPDATE`：当 `'title' in data` 时 `requireNonEmptyString(data.title, '章节标题')`
- Why：`projectId`/`novelId` 缺失会产生游离记录；章节标题可被更新为空/空白。
- 验证：更新 [tests/main/ipc/novel-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/novel-handlers.test.ts)，覆盖缺失/非法父级 ID、空标题更新。

#### 1.3 Character handler

- 文件：[src/main/ipc/character.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/character.ipc.ts)
- What：`CHARACTER_CREATE` 中 `requireId(data.novelId, '小说ID')` 与 `requireEnum(data.role, [...], '角色类型')`
- 枚举值来源：[src/shared/types/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/shared/types/index.ts) 第 93-103 行
- 验证：[tests/main/ipc/character-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/character-handlers.test.ts) 已调整，需确认 role 枚举非法值测试存在。

#### 1.4 Checkpoint handler

- 文件：[src/main/ipc/checkpoint.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/checkpoint.ipc.ts)
- What：`CHECKPOINT_CREATE` / `SESSION_CREATE` 中 `requireId(data.projectId, '项目ID')`
- Note：`sessionId` 保持可选，由仓库生成。

#### 1.5 Learning handler

- 文件：[src/main/ipc/learning.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/learning.ipc.ts)
- What：
  - `requireId(data.sessionId, '会话ID')`
  - `requireNonEmptyString(data.response, '响应内容')`
  - `requireNonNegativeNumber(data.duration, '持续时间')`
  - `context` 序列化后超过 64KB 时截断并记录 warn
- 验证：[tests/main/ipc/learning-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/learning-handlers.test.ts) 已调整，需补充 context 截断测试。

#### 1.6 Project handler

- 文件：[src/main/ipc/project.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/project.ipc.ts)
- What：`PROJECT_UPDATE` 中当 `'name' in data` 时 `requireNonEmptyString(data.name, '项目名称')`

#### 1.7 World handler

- 文件：[src/main/ipc/world.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/world.ipc.ts)
- What：
  - `WORLD_SAVE`：`requireEnum(data.type, ['fantasy','sci_fi','historical','modern','alternate_history','hybrid'], '世界观类型')`
  - `OUTLINE_SAVE`：`requireEnum(data.type, ['brief','detailed'], '大纲类型')`
  - `PLOT_STRUCTURE_SAVE`：`requireEnum(data.framework, ['three_act','hero_journey','save_cat','seven_point','snowflake','story_circle','story_grid','dramatica'], '情节框架')`
- 验证：新增/更新 [tests/main/ipc/world-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/world-handlers.test.ts) 覆盖非法枚举与缺失字段。

---

### Stage 2：Repository 反序列化 shape 修复（P1）

目标：确保数据库中 JSON 字段即使为默认空对象，反序列化后仍包含接口所有必填字段。

状态：**核心修改已落地**，需补充单元测试。

#### 2.1 Row mapper

- 文件：[src/main/memory/repositories/row-mapper.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/row-mapper.ts)
- What：新增 `safeJsonParseWithShape<T>(value, shape)`，解析对象后与 shape 做浅层合并。
- 实现要点：generic 约束使用 `object` 而非 `Record<string, unknown>`，以兼容 `PowerSystem` 等接口。

#### 2.2 Character repository

- 文件：[src/main/memory/repositories/character-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/character-repository.ts)
- What：
  - `personality` 使用 `safeJsonParseWithShape(map.personality, { traits: [], virtues: [], flaws: [], motivations: [], coreBelief: '' })`
  - `arc` 使用 `safeJsonParseWithShape<Character['arc']>(map.arc, { type: 'static', startingState: '', endingState: '', catalyst: '', keyMoments: [] })`
- 验证：新增测试，构造数据库中 `personality='{}'` / `arc='{}'` 的行，断言返回对象包含所有必填字段。

#### 2.3 World repository

- 文件：[src/main/memory/repositories/world-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/world-repository.ts)
- What：`powerSystem` 使用 `safeJsonParseWithShape<PowerSystem>(map.power_system, { name: '', rules: [], limitations: [], costs: [], source: '' })`
- 验证：新增测试，构造 `power_system='{}'` 的行，断言返回对象包含所有必填字段。

---

### Stage 3：数据库持久化与缓存一致性（P1 + P2）

目标：保证所有写入记录 OperationLog；级联删除后失效相关缓存；消除直接调用 `sqlDb.run` 的遗留入口。

#### 3.1 Repository 接口补充 clearCache（已完成）

- 文件：[src/main/memory/repositories/repository-interfaces.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/repository-interfaces.ts)
- 状态：已完成。`IChapterRepository` 与 `INovelRepository` 已声明 `clearCache(): void`。

#### 3.2 BaseRepository.clearCache 可见性（已完成）

- 文件：[src/main/memory/repositories/base-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/base-repository.ts)
- 状态：已完成。`clearCache()` 为 public。

#### 3.3 Repository 统一写入入口

- 文件：
  - [src/main/memory/repositories/outline-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/outline-repository.ts)
  - [src/main/memory/repositories/plot-structure-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/plot-structure-repository.ts)
  - [src/main/memory/repositories/character-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/character-repository.ts)
  - [src/main/memory/repositories/world-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/world-repository.ts)
- What：将所有直接调用 `this.sqlDb.run(...)` / `this.sqlDb.exec(...)` 的写入操作替换为 `this.run(sql, params)`，以统一记录 OperationLog 并失效缓存；查询操作（`getByNovel`、`listByNovel` 等）保留 `this.query`/`this.queryOne`。
- Why：当前直接调用 `sqlDb.run` 绕过 [BaseRepository.run](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/base-repository.ts#L53-L58)，导致 operation log 缺失与缓存未失效。本次按用户确认范围扩展至 character/world repository。
- 注意：`this.scheduleSave()` 保留（[BaseRepository.run](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/base-repository.ts#L53-L58) 不自动调用 scheduleSave）。
- 验证：新增/补充测试断言写入后缓存已失效或 OperationLog 已记录。

#### 3.4 Database.deleteProject 缓存失效（已完成）

- 文件：[src/main/memory/database.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/database.ts)
- 状态：已完成。`deleteProject(id)` 已显式删除 chapters/novels 记录并调用 `this.novels.clearCache()` / `this.chapters.clearCache()`。

---

### Stage 4：大纲/情节结构修复（P1 + P2）

#### 4.1 Outline save 区分 insert/update

- 文件：[src/main/memory/repositories/outline-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/outline-repository.ts)
- What：将 `save` 方法从 `INSERT OR REPLACE` 改为区分 insert/update：
  - 先查询是否已存在 `novelId` 对应的大纲记录（`getByNovel(novelId)`）。
  - 若不存在：执行 INSERT，`createdAt` 与 `updatedAt` 均为当前时间，`version = 1`。
  - 若存在：执行 UPDATE，保留原 `createdAt`，`updatedAt` 为当前时间，`version = existing.version + 1`。
- Why：修复 ISSUE-005-001 中 `createdAt` 被覆盖与 `version` 不递增问题。
- How：使用 `getByNovel(novelId)` 检查存在性；UPDATE SQL 只更新 `type/content/structure/version/updated_at`。
- 验证：新增测试，连续保存两次同一 novel 的大纲，断言 `createdAt` 不变、`version` 从 1 变为 2。

#### 4.2 PlotStructure chapterIds 存在性校验

- 文件：[src/main/memory/repositories/plot-structure-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/plot-structure-repository.ts)
- What：在 `save` 中校验每个 `beat.chapterIds` 是否存在于 `chapters` 表且属于当前 novel。
- Why：修复 ISSUE-005-002，避免保存指向不存在章节的 chapterIds。
- How：
  1. 收集所有 `beats` 中的 `chapterIds` 去重。
  2. 查询 `SELECT id FROM chapters WHERE id IN (...) AND novel_id = ?`。
  3. 对比结果，缺失的 ID 抛出 `Error('情节 beat 引用了不存在的章节: ${missingIds.join(', ')}')`。
  4. 将 `this.sqlDb.run` 替换为 `this.run`（同 Stage 3.3）。
- 验证：新增测试，构造不存在的 chapterId，断言保存抛出业务错误。

---

### Stage 5：导出修复（P1）

#### 5.1 ExportEngine 损坏 JSON 回退

- 文件：[src/main/export/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/export/index.ts)
- What 1（损坏 JSON 回退）：修改 `extractTextFromContent`，在 `JSON.parse` 失败时尝试清理内容中的 JSON 元数据，而非直接返回原始字符串；若仍无法提取文本，返回空字符串并记录 warn。
- Why：修复 ISSUE-007-009，防止 `"type":"doc"` 等元数据泄漏到正文。
- How：优先使用正则提取 `"text":"([^"]*)"` 并 join；若内容不含 `"text"` 字段，再退化到字符清理。
  ```ts
  function tryExtractTextFromCorrupted(content: string): string {
    const texts: string[] = []
    const regex = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g
    let match
    while ((match = regex.exec(content)) !== null) {
      texts.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'))
    }
    return texts.join('')
  }
  ```
- What 2（HTML 段落结构）：修改 `extractTipTapText`，在遇到 paragraph 节点时在段落之间插入 `\n`。
- Why：修复 ISSUE-007-010，确保 HTML 导出每个段落独立 `<p>`。
- How：
  ```ts
  function extractTipTapText(node: Record<string, unknown>): string {
    if (node.text && typeof node.text === 'string') return node.text
    const children = node.content
    if (Array.isArray(children)) {
      const isParagraph = node.type === 'paragraph'
      const texts = children.map(child => extractTipTapText(child as Record<string, unknown>))
      return isParagraph ? texts.join('') + '\n' : texts.join('')
    }
    return ''
  }
  ```
  并在 `generateHtml` 中按 `\n` split 时已自然分段（第 142 行）。
- 验证：新增 [tests/main/export/index.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/export/index.test.ts) 测试，覆盖损坏 JSON 内容与多段落 HTML 导出。

---

### Stage 6：学习系统修复（P1 + P2）

#### 6.1 Learning IPC handler

- 文件：[src/main/ipc/learning.ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/learning.ipc.ts)
- 已在 Stage 1.5 中说明 `sessionId`/`response`/`duration`/`context` 校验，此处不再重复。

#### 6.2 LearningEngine 统计与 writerId

- 文件：
  - [src/main/learning/engine.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/engine.ts)
  - [src/main/learning/writer-model.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/writer-model.ts)
- What 1：`getProjectSummary` 中 `totalInteractions` 使用独立 `COUNT(*)` 查询返回精确值；`lastActive` 使用 `ORDER BY timestamp DESC LIMIT 1`。
- Why：修复 ISSUE-007-007（当前第 84-91 行将 `entries.length` 作为总计数且取最早记录作为 `lastActive`）。
- How：在 [TrajectoryRepository](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/trajectory-repository.ts) 中新增 `countByProject(projectId)` 与 `getLastActiveByProject(projectId)` 方法，`LearningEngine` 调用这两个方法替代在内存数组中统计。
- What 2：注入真实的 `writerId`（machine id 或用户账号），替代 `entries[0].projectId`。
- Why：修复 ISSUE-007-008（[writer-model.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/writer-model.ts) 第 6 行将 `projectId` 误作 writerId）。
- How：方案 A：在 `LearningEngine` 构造函数中接收 `writerId: string`（来自 `app.getPath('userData')` 派生或 `machine-id`），并传给 `WriterModelUpdater`。本计划采用方案 A，向后兼容且语义正确。

#### 6.3 TrajectoryRepository 新增方法

- 文件：[src/main/memory/repositories/trajectory-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/trajectory-repository.ts)
- What：新增 `countByProject(projectId)` 与 `getLastActiveByProject(projectId)`。
- Why：为 `getProjectSummary` 提供精确计数与最近时间。
- How：
  ```ts
  countByProject(projectId: string): number {
    const result = this.queryOne('SELECT COUNT(*) AS cnt FROM trajectories WHERE project_id = ?', [projectId])
    return result ? asNumber(result.values[0][0]) : 0
  }

  getLastActiveByProject(projectId: string): string | null {
    const result = this.queryOne(
      'SELECT timestamp FROM trajectories WHERE project_id = ? ORDER BY timestamp DESC LIMIT 1',
      [projectId]
    )
    return result ? asString(result.values[0][0]) : null
  }
  ```
- 注意：接口 [ITrajectoryRepository](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/repository-interfaces.ts#L79-L86) 需同步增加这两个方法签名。

#### 6.4 WriterModelUpdater（收尾）

- 文件：[src/main/learning/writer-model.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/learning/writer-model.ts)
- What：`buildModel` 使用注入的 `writerId` 替代 `entries[0].projectId`。
- Why：当前代码第 6 行仍使用 `entries.length > 0 ? entries[0].projectId : 'unknown'`，导致 [service-registry.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/di/service-registry.ts) 注入的稳定 `writerId` 被覆盖，违背 ISSUE-007-008 修复目标。
- How：
  1. 在 `WriterModelUpdater` 构造函数中接收 `writerId: string` 并保存为 `this.writerId`。
  2. `buildModel` 中直接返回 `{ writerId: this.writerId, ... }`，不再从 `entries` 推断。
  3. 同步更新 [tests/main/learning/writer-model.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/learning/writer-model.test.ts)：`const updater = new WriterModelUpdater('test-writer-id')`，并断言 `model.writerId === 'test-writer-id'`。

---

### Stage 7：技能系统修复（P2）

#### 7.1 package.json 新增 yaml 依赖

- 文件：`package.json`
- What：新增依赖 `yaml`。
- Why：修复 ISSUE-007-002，使用 YAML 解析器替代正则。
- How：`npm install yaml`；本计划推荐 `yaml`（零依赖、TypeScript 类型友好）。

#### 7.2 SkillLoader

- 文件：[src/main/engine/skill-loader.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/engine/skill-loader.ts)
- What 1：`parseSkillMd` 使用 YAML 解析器。
- Why：修复 ISSUE-007-002（当前第 144-149 行使用正则解析 frontmatter）。
- How：
  ```ts
  import YAML from 'yaml'

  private parseSkillMd(content: string, directory: string, filePath: string): SkillRecord | null {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!frontmatterMatch) return null
    try {
      const frontmatter = YAML.parse(frontmatterMatch[1])
      if (!frontmatter || typeof frontmatter !== 'object') return null
      const name = String(frontmatter.name ?? '').trim()
      if (!name) return null
      return {
        name,
        description: String(frontmatter.description ?? ''),
        directory,
        filePath,
        rawContent: content,
        category: this.inferCategory(name)
      }
    } catch (err) {
      logger.warn(`Failed to parse skill YAML from ${filePath}:`, err)
      return null
    }
  }
  ```
- What 2：`ensureLoaded` 仅在成功加载至少一个目录后设置 `loaded = true`；若所有候选目录均不存在则记录 error 级别日志。
- Why：修复 ISSUE-007-003 / ISSUE-007-004（当前第 36-37 行无条件设置 `loaded = true`）。
- How：调整 `ensureLoaded` 逻辑，遍历所有候选路径，记录加载结果，无路径成功时 `logger.error`。
- What 3：检测重复 skill name 并记录 warn。
- Why：修复 ISSUE-007-005。
- How：在 `this.skills.set(skill.name, skill)` 前检查 `if (this.skills.has(skill.name)) logger.warn(...)`。
- What 4：统一 `skill:get` 与 `skill:invoke` 对不存在技能的处理。
- Why：修复 ISSUE-007-006。
- How：在 `executeSkill` 中先调用 `this.getSkill(name)` 检查，若不存在抛出相同错误。
- 验证：新增 [tests/main/engine/skill-loader.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/engine/skill-loader.test.ts) 测试，覆盖 YAML 多行 description、目录不存在、重复 name、不存在的技能调用。

#### 7.3 IPC_CHANNELS 常量移除（完全删除）

- 文件：
  - Main handlers：所有 `src/main/ipc/*.ipc.ts`（project、novel、character、world、checkpoint、writer、skill、chat、llm-config、learning、export、db、storage、monitor）
  - Preload：[src/preload/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/preload/index.ts)
  - Type definitions：[src/shared/types/ipc.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/shared/types/ipc.ts)
- What：移除对 `IPC_CHANNELS` 常量的依赖，内联定义通道字符串；最终从 `src/shared/types/ipc.ts` 中删除 `IPC_CHANNELS` 对象与 `IpcChannel` 类型（若其他模块仍引用 `IpcChannel`，可保留为字符串字面量联合类型）。
- Why：修复 ISSUE-007-011，遵循项目 IPC 约定（不使用 IPC_CHANNELS 常量）。
- How：
  1. 将所有 `ipcMain.handle(IPC_CHANNELS.XXX, ...)` 替换为 `ipcMain.handle('xxx:yyy', ...)`。
  2. 将 `preload/index.ts` 中所有 `ipcRenderer.invoke(IPC_CHANNELS.XXX, ...)`、`ipcRenderer.on(IPC_CHANNELS.XXX, ...)`、`ipcRenderer.removeListener(IPC_CHANNELS.XXX, ...)` 替换为对应字符串字面量。
  3. 删除 `src/shared/types/ipc.ts` 中的 `IPC_CHANNELS` 常量定义，并移除所有 handler/preload 文件中的 `import { IPC_CHANNELS } from ...`。
  4. 检查 `src/main/ipc/index.ts` 的 `guardedIpcMain.handle` 类型是否需要调整（当前为 `(channel: string, ...)`，通常无需改动）。
- 注意：保持与现有通道名完全一致，避免运行时通道不匹配。
- 验证：运行所有 IPC handler 测试与集成测试，确保通道未变更。

---

### Stage 8：LLM 配置修复（P2）

#### 8.1 LLM 错误前缀统一

- 文件：[src/main/engine/llm-provider.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/engine/llm-provider.ts)
- What：将 `executeChatRequest` 第 338 行的中文错误前缀 `API 错误 (...)` 改为英文 `API Error (...)`。
- Why：修复 ISSUE-006-001，统一错误前缀，避免非流式 API 错误被二次包装（第 345 行 `error.message.startsWith('API Error')` 只放行英文前缀）。
- How：统一为英文 `API Error (${response.status}): ${errorMsg}`，与流式路径一致。
- 验证：
  - 更新 [tests/main/engine/llm-provider.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/engine/llm-provider.test.ts) 第 132 行的断言，从 `toThrow('API 错误')` 改为 `toThrow('API Error')`。
  - 新增/更新测试，断言非 2xx 响应抛出的错误前缀为 `API Error`。

---

### Stage 9：覆盖率与测试修复（P2）

#### 9.1 stress-ipc 超时

- 文件：[tests/integration/stress-ipc.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/integration/stress-ipc.test.ts)
- What：修复 `test:coverage` 因 scenario 3 超时而失败的问题。
- Why：修复 ISSUE-001。
- How：在 scenario 3 的 `it(...)` 上显式增加超时时间：`it('scenario 3: ...', { timeout: 30000 }, async () => {...})`。此为最小改动方案。
- 替代方案：若仍不稳定，可在 coverage 命令中排除压力测试，但优先保留测试并增加超时。

#### 9.2 补充 Stage 1-2 回归测试

- **IPC 校验回归测试**：
  - [tests/main/ipc/novel-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/novel-handlers.test.ts)：覆盖缺失/非法 `projectId`/`novelId`、空标题更新。
  - [tests/main/ipc/character-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/character-handlers.test.ts)：覆盖缺失 `novelId`、非法 `role` 枚举。
  - [tests/main/ipc/world-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/world-handlers.test.ts)（新建）：覆盖非法 `type`、`outline type`、`framework` 枚举。
  - [tests/main/ipc/learning-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/learning-handlers.test.ts)：覆盖缺失 `sessionId`/`response`/`duration`、context 超过 64KB 截断。
  - [tests/main/ipc/checkpoint-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/checkpoint-handlers.test.ts)：覆盖缺失 `projectId`。
  - [tests/main/ipc/project-handlers.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/ipc/project-handlers.test.ts)：覆盖空 `name` 更新。
- **Repository shape 回归测试**：
  - [tests/main/memory/repositories/character-repository.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/memory/repositories/character-repository.test.ts)（新建）：构造数据库中 `personality='{}'` / `arc='{}'` 的行，断言返回对象包含所有必填字段。
  - [tests/main/memory/repositories/world-repository.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/main/memory/repositories/world-repository.test.ts)（新建）：构造 `power_system='{}'` 的行，断言返回对象包含所有必填字段。

#### 9.3 各阶段新增测试汇总

- Stage 1：IPC 校验回归测试（见 9.2）。
- Stage 2：Repository shape 回归测试（见 9.2）。
- Stage 3：为缓存一致性新增测试（project 删除后 novel/chapter 缓存失效，以及 character/world 写入后缓存失效）。
- Stage 4：为大纲 version/createdAt 与 plot-structure chapterIds 校验新增测试。
- Stage 5：为导出损坏 JSON 与 HTML 段落新增测试。
- Stage 6：为学习统计精确计数、lastActive、writerId 注入新增测试。
- Stage 7：为 skill-loader YAML 解析、重复 name、目录不存在、IPC_CHANNELS 移除新增测试。
- Stage 8：为 LLM 错误前缀新增测试。
- Stage 10：为 NovelEditor 内容上限与 NovelStructure 输入规则新增测试。

---

### Stage 10：编辑器与大型内容边界（P2）

#### 10.1 NovelEditor 内容上限

- 文件：[src/renderer/components/editor/NovelEditor.tsx](file:///d:/ZhuoMian/Claw/AIscribe/src/renderer/components/editor/NovelEditor.tsx)
- What：增加章节字数上限校验与粘贴大小限制。
- Why：修复 ISSUE-005-005，防止超大内容导致性能下降或 IPC payload 过大。
- How：
  1. 定义常量 `MAX_CHAPTER_CHARS = 500_000`。
  2. 在 `onUpdate` 中计算 `chars`，当 `chars > MAX_CHAPTER_CHARS` 时：
     - 调用 `editor.commands.undo()` 回退最后一次输入；
     - 通过 `logger.warn` 或可选的 `onContentLimitReached` 回调通知父组件。
  3. 添加 `handlePaste` 处理函数：监听编辑器 DOM 的 `paste` 事件，预估粘贴文本长度，超过阈值时 `event.preventDefault()` 并记录 warn。
  4. 在 `useEffect` 中绑定/解绑 paste 事件监听器。
- 验证：
  - 新建 [tests/renderer/components/novel-editor.test.tsx](file:///d:/ZhuoMian/Claw/AIscribe/tests/renderer/components/novel-editor.test.tsx)，使用 `@testing-library/react` + TipTap Editor 渲染 `NovelEditor`，模拟输入超过 50 万字，断言内容未超过上限或回调被调用。

#### 10.2 NovelStructure 输入规则

- 文件：[src/renderer/components/editor/extensions/NovelStructure.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/renderer/components/editor/extensions/NovelStructure.ts)
- What：修复场景分隔输入规则的插入位置，将 `tr.insert(start - 1, node)` 改为 `tr.insert(start, node)`；补充真实输入规则测试。
- Why：修复 ISSUE-005-004。当前 `start - 1` 在段落起始位置可能将 sceneBlock 插入到错误位置，导致输入规则无法正确触发或破坏文档结构。
- How：
  1. 在 `addInputRules` 的 handler 中，将 `tr.insert(start - 1, node)` 改为 `tr.insert(start, node)`。
  2. 同步检查 `tr.delete(start, end)` 后的位置是否仍然正确（删除匹配文本后 `start` 即目标插入位置）。
  3. 在 [tests/renderer/components/novel-structure.test.ts](file:///d:/ZhuoMian/Claw/AIscribe/tests/renderer/components/novel-structure.test.ts) 中新增测试：创建 Editor，调用 `editor.commands.insertContent('--- ')` 或模拟输入规则触发，断言文档中出现 `sceneBlock` 节点且位置正确。
- 验证：输入 `--- ` 后，原段落被替换为 sceneBlock，sceneBlock 内包含一个空 paragraph。

---

## 4. Assumptions & Decisions

1. **范围**：修复全部 41 个 P1/P2 问题；同时按用户确认纳入两项扩展：
   - 将 [character-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/character-repository.ts) 与 [world-repository.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/world-repository.ts) 的直接 `sqlDb.run` 调用统一改为 `this.run`。
   - **完全删除** `src/shared/types/ipc.ts` 中的 `IPC_CHANNELS` 常量，所有 handler 与 preload 内联通道字符串。
2. **辅助函数**：在 [src/main/ipc/index.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/ipc/index.ts) 新增 `requireEnum`/`requireNumber`/`requireNonNegativeNumber`，供多个 handler 复用（已落地）。
3. **缓存清理**：将 [BaseRepository.clearCache()](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/base-repository.ts#L31-L33) 设为 public，并在 [repository-interfaces.ts](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/repository-interfaces.ts) 的 `INovelRepository`/`IChapterRepository` 中显式声明，供 `Database.deleteProject` 调用。
4. **OperationLog**：[outline](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/outline-repository.ts)、[plot-structure](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/plot-structure-repository.ts)、[character](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/character-repository.ts)、[world](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/world-repository.ts) 仓库改用 [BaseRepository.run](file:///d:/ZhuoMian/Claw/AIscribe/src/main/memory/repositories/base-repository.ts#L53-L58) 统一记录 operation log 并失效缓存。
5. **WriterId**：采用注入方式，在 `LearningEngine` 构造时传入稳定的 `writerId`（machine-derived），并确保 `WriterModelUpdater.buildModel` 使用注入值而非 `entries[0].projectId`。
6. **Skill YAML**：引入 `yaml` 依赖替换正则解析。
7. **IPC_CHANNELS**：完全删除常量定义与所有引用，内联字符串字面量；保持通道名与现有运行时完全一致。
8. **测试**：每个修复点至少新增一个自动化测试，确保回归；特别补齐 renderer 组件 0% 覆盖区域的核心边界测试。
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
4. **端到端验证（代码级 + 可选 UI）**：
   - 重新运行 `comprehensive-functional-audit` 的测试矩阵，确认 41 个问题状态转为 Fixed
   - 可选：启动 Electron 应用验证 4 条跨模块流程
5. **文档更新**：
   - 更新 [issues.md](file:///d:/ZhuoMian/Claw/AIscribe/.trae/specs/comprehensive-functional-audit/issues.md) 中对应问题状态为 `Fixed`
   - 更新 [test-matrix.md](file:///d:/ZhuoMian/Claw/AIscribe/.trae/specs/comprehensive-functional-audit/test-matrix.md) 实际结果与测试结果
   - 更新 [checklist.md](file:///d:/ZhuoMian/Claw/AIscribe/.trae/specs/comprehensive-functional-audit/checklist.md) 已修复项为 Pass

## 6. Implementation Order

| 阶段 | 任务 | 优先级 | 依赖 | 当前状态 |
|---|---|---|---|---|
| 1 | IPC handler 必填字段校验 + 回归测试 | P1 | 无（辅助函数已落地） | 校验已落地，待补测试 |
| 2 | Repository 反序列化 shape 修复 + 回归测试 | P1 | 无 | shape 修复已落地，待补测试 |
| 3 | Repository 统一写入入口（outline/plot-structure/character/world）+ 缓存一致性测试 | P1 | Stage 2 | 待执行 |
| 4 | 大纲/情节结构修复 + 测试 | P1 | Stage 3 | 代码已修复，待补测试 |
| 5 | 导出修复 + 测试 | P1 | 无 | 代码已修复，待补测试 |
| 6 | 学习系统修复（writerId 收尾、统计精确化）+ 测试 | P1/P2 | Stage 3 | writerId 待收尾，测试待补 |
| 7 | 技能系统修复（YAML、skill-loader 健壮性、完全删除 IPC_CHANNELS）+ 测试 | P2 | 无 | 待执行 |
| 8 | LLM 错误前缀统一 + 测试 | P2 | 无 | 待执行 |
| 9 | 覆盖率与测试修复（stress-ipc 超时 + 全阶段回归测试） | P2 | Stage 1-8 | 待执行 |
| 10 | 编辑器边界修复（内容上限、NovelStructure 输入规则）+ 测试 | P2 | Stage 1-5 | 待执行 |
| 最终 | typecheck + lint + test:run + test:coverage | - | Stage 1-10 | 待执行 |

每个 Stage 完成后执行 `npm run typecheck` 与 `npm run test:run` 确保不破坏现有测试。建议按上表顺序执行，其中 Stage 1-2 的测试补充可与 Stage 3-8 并行规划，但需在 Stage 9 前全部完成。
