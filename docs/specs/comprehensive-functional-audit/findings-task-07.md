# Task 07 — 学习系统、技能系统与导入导出模块功能检查

## 检查范围
- `src/main/ipc/learning.ipc.ts`
- `src/main/ipc/skill.ipc.ts`
- `src/main/ipc/export.ipc.ts`
- `src/main/engine/skill-loader.ts`
- `src/main/learning/*.ts`
- `src/main/export/index.ts`（注：任务要求阅读的 `src/main/export/export-engine.ts` 不存在，导出引擎实现在 `src/main/export/index.ts` 中）
- `src/renderer/services/learningService.ts`
- `src/renderer/services/skillService.ts`
- `src/renderer/services/exportService.ts`
- `skills/` 目录下的 `SKILL.md`

## 测试执行结果

```bash
npx vitest run tests/main/engine/skill-loader.test.ts tests/main/ipc/skill-handlers.test.ts tests/main/ipc/learning-handlers.test.ts tests/main/learning/*.test.ts tests/main/export/export-engine.test.ts tests/renderer/services/learningService.test.ts tests/renderer/services/skillService.test.ts tests/renderer/services/exportService.test.ts
```

**结果：7 个测试文件全部通过，共 64 个用例通过。**

额外执行：

```bash
npm run typecheck
```

**结果：TypeScript 类型检查通过。**

## 代码审查核对项

| 检查项 | 状态 | 说明 |
|--------|------|------|
| `learning:record` 数据完整性 | 不通过 | IPC handler 仅校验 `projectId` 与 `query`，但底层 `LearningEngine.recordInteraction` 与数据库写入要求 `sessionId`、`response`、`duration` 必填，缺少校验会导致不完整记录入库。 |
| `learning:analyze` 数据完整性 | 通过 | 按 `projectId` 聚合轨迹，返回 patterns/suggestions/profile/nextActions/shortcuts，结构完整。 |
| `learning:summary` 数据完整性 | 不通过 | `totalInteractions` 被限制为 500 条且字段名暗示精确值；`lastActive` 使用最早一条记录时间（SQL 为 `ASC`），而非最近活跃时间。 |
| skill-loader 解析 SKILL.md 健壮性 | 不通过 | 使用正则而非 YAML 解析器，无法处理合法 YAML 变体（引号、列表、多行）；缺少对错误 YAML、损坏文件的显式测试覆盖。 |
| `skill:invoke` 将 SKILL.md 作为 system prompt | 通过 | `executeSkill` 把 `skill.rawContent` 完整拼入 system 字段，并附加角色设定与中文要求。 |
| 调用不存在技能的错误处理 | 部分通过 | `executeSkill` 抛出 `技能不存在: ${name}`，但 `skill:get` 对不存在技能返回 `null`，二者行为不一致。 |
| `export:project` 导出格式 | 通过 | 支持 txt/markdown/html，内容、文件名、章节过滤、HTML 转义均处理正确。 |
| 异常/损坏内容导出处理 | 不通过 | `extractTextFromContent` 在 JSON 解析失败时直接回退原字符串，可能把损坏的 JSON 元数据导出到正文；HTML 导出未按段落拆分，可能将多段文本拼接。 |

## 发现的问题

### ISSUE-007-001：`learning:record` IPC handler 未校验必填字段

**文件**：`src/main/ipc/learning.ipc.ts`  
**位置**：第 10-18 行  
**问题描述**：
- Handler 只调用 `requireId(data.projectId, '项目ID')` 与 `requireNonEmptyString(data.query, '查询内容')`。
- 但 `RecordLearningData` 类型（`src/shared/types/ipc.ts` 第 205-213 行）与 `LearningEngine.recordInteraction`（`src/main/learning/engine.ts` 第 38-56 行）均要求 `sessionId`、`response`、`duration` 为必填。
- 当 renderer 仅传入 `{ projectId, query }` 时，handler 会放行并将 `undefined` 写入数据库（`trajectory-repository.ts` 第 38-51 行），形成数据不完整的轨迹记录。
- 现有测试使用 mock engine，未触发真实写入路径，因此未能发现该缺陷。

**建议修复**：在 handler 中补充 `requireId(data.sessionId, '会话ID')`、`requireNonEmptyString(data.response, '回复内容')` 及数值/非负校验 `data.duration`；或像 engine 一样提供合理的默认值并在类型上标明可空。

---

### ISSUE-007-002：skill-loader 使用正则解析 YAML frontmatter，健壮性不足

**文件**：`src/main/engine/skill-loader.ts`  
**位置**：第 141-165 行  
**问题描述**：
- `parseSkillMd` 没有使用 YAML 解析器，而是手写正则：`/^---\r?\n([\s\S]*?)\r?\n---/`、`/^name:\s*(.+)$/m`、`/^description:\s*(.+)$/m`。
- 项目依赖中未引入 `yaml` / `js-yaml`（`package.json` 中无相关依赖），导致无法正确解析：
  - 带引号的 name（`name: 'novel-master'`）
  - 多行 description
  - YAML 列表或嵌套元数据
  - `name:` 在正文前再次出现时被误匹配
- 当前测试只覆盖“无 frontmatter”、“无 name”、“无 description”，未覆盖 malformed YAML、引号、特殊字符等边界。

**建议修复**：引入 `yaml` 或 `js-yaml` 作为依赖，使用 `YAML.parse(frontmatter)` 解析；在 `parseSkillMd` 中显式捕获 YAML 语法错误并记录日志。

---

### ISSUE-007-003：skill-loader 初次加载失败后不会重试，且失败静默

**文件**：`src/main/engine/skill-loader.ts`  
**位置**：第 35-47 行、第 50-77 行  
**问题描述**：
- `ensureLoaded` 在入口即设置 `this.loaded = true`。
- 若 `loadFromDirectorySync` 因目录不存在、读取失败或全部 SKILL.md 解析失败而返回空数组，后续调用仍会认为“已加载”，不再尝试扫描目录。
- 单个 SKILL.md 损坏时仅被 `catch` 后 `logger.warn`，不会阻止其余技能加载，但也不会给调用方任何反馈。

**建议修复**：将 `this.loaded = true` 移到成功读取并解析至少一个目录之后；或在加载完成后记录加载结果摘要（成功/失败数量），便于诊断。

---

### ISSUE-007-004：skill-loader 硬编码 skills 目录路径，缺少兜底告警

**文件**：`src/main/engine/skill-loader.ts`  
**位置**：第 40-46 行  
**问题描述**：
- `ensureLoaded` 只检查两个硬编码路径：`path.join(__dirname, '../../skills')` 与 `path.join(__dirname, '../skills')`。
- 若应用被打包到非标准结构，或测试环境路径不符，两个路径都不存在时函数直接返回，技能列表为空，且没有抛出错误或日志告警。
- 用户调用 `skill:invoke` 时才会发现“技能不存在”，但根本原因是目录未找到。

**建议修复**：当所有候选目录都不存在时，抛出带路径信息的错误或在日志中记录 error 级别告警。

---

### ISSUE-007-005：重复 name 的技能会静默覆盖

**文件**：`src/main/engine/skill-loader.ts`  
**位置**：第 69 行、第 110 行、第 132 行  
**问题描述**：
- `this.skills.set(skill.name, skill)` 以技能 name 作为 Map key。
- 若多个子目录中的 SKILL.md 拥有相同的 `name`，后加载的技能会静默覆盖先加载的技能，没有日志提示。
- 这在用户自定义技能目录与内置技能目录合并时尤其危险。

**建议修复**：在 `set` 之前检查 `this.skills.has(skill.name)`，若存在则记录 warn 日志，或采用“目录+name”作为唯一键。

---

### ISSUE-007-006：`skill:get` 与 `skill:invoke` 对不存在技能的处理不一致

**文件**：`src/main/ipc/skill.ipc.ts`、`src/main/engine/skill-loader.ts`  
**位置**：`skill.ipc.ts` 第 15-23 行、`skill-loader.ts` 第 211-215 行  
**问题描述**：
- `skill:get` 在技能不存在时返回 `null`。
- `skill:invoke` 通过 `executeSkill` 直接抛出 `Error('技能不存在: ${name}')`。
- 同一领域（技能查找）出现两种错误契约，调用方需要分别处理 `null` 与异常，增加了前端复杂度。

**建议修复**：统一行为。推荐 `skill:get` 保持 `null`，`skill:invoke` 在 handler 层先调用 `getSkill` 检查，不存在时返回一致的带错误码结果；或两者都抛出可识别的异常。

---

### ISSUE-007-007：`learning:summary` 的 `totalInteractions` 与 `lastActive` 语义错误

**文件**：`src/main/learning/engine.ts`、`src/main/learning/trajectory.ts`、`src/main/memory/repositories/trajectory-repository.ts`  
**位置**：`engine.ts` 第 73-92 行；`trajectory-repository.ts` 第 65-72 行  
**问题描述**：
- `getProjectSummary` 注释承认 `totalInteractions` 是“lower bound（下限）”，因为最多只取 500 条；但字段名与类型 `ProjectSummary.totalInteractions` 暗示精确计数，数据语义不完整。
- `lastActive` 取 `entries[0]?.timestamp`，而 `getByProject` 的 SQL 使用 `ORDER BY timestamp ASC`，因此 `entries[0]` 是最早一次交互，不是最近活跃时间。

**建议修复**：
- 对 `totalInteractions` 使用独立的 `COUNT(*)` 查询返回精确值；
- 对 `lastActive` 改为 `ORDER BY timestamp DESC LIMIT 1`，或从 detectPatterns 的结果中推导最近时间。

---

### ISSUE-007-008：`WriterModelUpdater` 将 `projectId` 误作 `writerId`

**文件**：`src/main/learning/writer-model.ts`  
**位置**：第 5-7 行  
**问题描述**：
- `buildModel` 使用 `entries[0].projectId` 作为 `writerId`。
- 这意味着每个项目都会生成一个不同的 writer profile，无法跨项目建立“作者”画像，与“writer model”的语义不符。

**建议修复**：writerId 应来自真实的用户/作者标识（如固定 machine id 或用户账号），或在 `LearningEngine` 初始化时注入；若当前阶段只能按项目分析，应将字段重命名为 `projectId` 并调整相关业务命名。

---

### ISSUE-007-009：ExportEngine 对损坏章节内容的回退策略会导致元数据泄漏到正文

**文件**：`src/main/export/index.ts`  
**位置**：第 34-43 行  
**问题描述**：
- `extractTextFromContent` 在 `JSON.parse` 失败时直接返回原始字符串。
- 如果章节内容在存储过程中损坏（例如只剩半截 TipTap JSON），导出结果会包含 `"type":"doc"` 等元数据，影响阅读。
- 当前测试仅验证正常 JSON 能被正确提取，未覆盖损坏 JSON 场景。

**建议修复**：回退时尝试剥离明显的 JSON 标记（如 `"type"`、`"content"`），或记录 warn 日志提示内容损坏；并补充损坏内容的导出测试。

---

### ISSUE-007-010：HTML 导出未按段落拆分，可能合并多段文本

**文件**：`src/main/export/index.ts`  
**位置**：第 139-145 行  
**问题描述**：
- `generateHtml` 先将 TipTap 文本展平为纯文本，再按 `\n` 拆分生成 `<p>`。
- `extractTipTapText` 将多个 paragraph 节点的文本直接 `join('')`（第 49 行），不保留段落分隔符，导致相邻段落被合并成一段。
- 例如两段文字会输出为 `<p>第一段第二段</p>`，而非 `<p>第一段</p><p>第二段</p>`。

**建议修复**：在 `extractTipTapText` 遇到 paragraph 节点时，在段落之间插入 `\n`，确保 HTML 导出保留段落结构。

---

### ISSUE-007-011：skill/learning/export IPC handler 使用 `IPC_CHANNELS` 常量，违反项目约定

**文件**：`src/main/ipc/skill.ipc.ts`、`src/main/ipc/learning.ipc.ts`、`src/main/ipc/export.ipc.ts`、`src/preload/index.ts`  
**位置**：各文件顶部 import 与 `ipcMain.handle` / `ipcRenderer.invoke` 调用  
**问题描述**：
- `AGENTS.md` / `CLAUDE.md` 明确约定：**No `IPC_CHANNELS` constant — channels are defined inline in preload and handler files**。
- 本次审查范围内的三个 handler 文件与 preload 均从 `../../shared/types/ipc` 导入 `IPC_CHANNELS`，并使用其注册/调用 `skill:*`、`learning:*`、`export:project` 通道。
- 该问题在项目中普遍存在，但在本次模块审查范围内确实出现在这些核心文件里。

**建议修复**：在本次审查的 handler 与 preload 相关代码中内联定义通道字符串，移除对 `IPC_CHANNELS` 的依赖；若需全局整改，建议单独提一次重构任务统一处理所有 handler 与 preload。

---

### ISSUE-007-012：`learning:record` 未对 `context` 对象大小做限制

**文件**：`src/main/ipc/learning.ipc.ts`  
**位置**：第 10-18 行  
**问题描述**：
- `context` 为可选字段，类型是 `Record<string, unknown>`，可包含任意大小的对象。
- Handler 未限制其大小，可能将极大 payload（如整章内容、完整 novel JSON）存入 `trajectories.context` 字段，导致数据库膨胀、IPC payload 过大。

**建议修复**：增加 `context` 大小/深度限制（例如序列化后不超过 64KB），或限制可包含的键白名单，超限时截断并记录 warn。

## 结论

- 本次指定测试套件 64 个用例全部通过，TypeScript 类型检查通过。
- `skill:invoke` 正确将 `SKILL.md` 的 `rawContent` 作为 system prompt 传入 LLM，符合预期。
- 共发现 **12 个问题**，其中与本次核心核查项强相关的问题包括：
  - 学习记录数据完整性：`learning:record` 必填字段校验缺失（ISSUE-007-001）、`learning:summary` 统计语义错误（ISSUE-007-007）、writerId 与 projectId 混淆（ISSUE-007-008）。
  - 技能解析健壮性：YAML 解析不健壮（ISSUE-007-002）、加载失败静默且不重试（ISSUE-007-003）、目录路径硬编码（ISSUE-007-004）、重复 name 静默覆盖（ISSUE-007-005）。
  - 技能调用错误处理：`skill:get` 与 `skill:invoke` 不一致（ISSUE-007-006）。
  - 导出异常内容处理：损坏 JSON 回退导致元数据泄漏（ISSUE-007-009）、HTML 段落结构丢失（ISSUE-007-010）。
- 另有 1 个架构/规范类问题（IPC_CHANNELS 常量使用，ISSUE-007-011）和 1 个潜在性能/数据风险问题（`context` 无大小限制，ISSUE-007-012）。
