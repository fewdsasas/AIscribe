# 修复任务列表

本列表按 **P0 → P1 → P2 → P3** 排序，同一级别按模块依赖与修复成本排列。每条包含：问题编号、模块、问题描述、建议修改文件、验证方式、是否可自动化回归。

## P1（严重）— 建议本次迭代完成

| 序号 | 问题编号 | 模块 | 问题描述 | 建议修改文件 | 验证方式 | 可自动化回归 |
|---|---|---|---|---|---|---|
| 1 | ISSUE-003-001 / ISSUE-008-001 | 项目与小说 / IPC | `novel:create` 未校验 `projectId`，可写入空/无效 UUID | `src/main/ipc/novel.ipc.ts` | 单元测试：传入缺失/非法 projectId 应抛错 | 是 |
| 2 | ISSUE-003-002 / ISSUE-008-002 | 项目与小说 / IPC | `chapter:create` 未校验 `novelId`，可写入空/无效 UUID | `src/main/ipc/novel.ipc.ts` | 单元测试：传入缺失/非法 novelId 应抛错 | 是 |
| 3 | ISSUE-003-005 | 项目与小说 | `project:delete` 级联删除后子仓库缓存未失效，存在脏读 | `src/main/memory/repositories/project-repository.ts`、`src/main/memory/database.ts` | 单元测试：删除项目后 `chapter:get` 应返回 undefined | 是 |
| 4 | ISSUE-004-001 | 角色与世界观 | `character.personality` / `arc` 反序列化缺少必填字段 | `src/main/memory/repositories/character-repository.ts` | 单元测试：读取默认空对象应返回完整 shape | 是 |
| 5 | ISSUE-004-002 | 角色与世界观 | 角色关系 `targetId` 不存在时无校验 | `src/main/ipc/character.ipc.ts` 或 `src/main/memory/repositories/character-repository.ts` | 单元测试：传入无效 targetId 应抛错 | 是 |
| 6 | ISSUE-004-003 | 角色与世界观 | `world.powerSystem` 反序列化缺少必填字段 | `src/main/memory/repositories/world-repository.ts` | 单元测试：读取默认空对象应返回完整 shape | 是 |
| 7 | ISSUE-004-005 / ISSUE-008-003 | 角色与世界观 / IPC | `character:create` 未校验 `novelId`/`role` | `src/main/ipc/character.ipc.ts` | 单元测试：传入缺失/非法 novelId 或 role 应抛错 | 是 |
| 8 | ISSUE-005-001 | 大纲、情节结构与编辑器 | `outline:save` 使用 `INSERT OR REPLACE` 覆盖 `createdAt` 且 `version` 不递增 | `src/main/memory/repositories/outline-repository.ts` | 单元测试：更新后 createdAt 不变、version +1 | 是 |
| 9 | ISSUE-005-002 | 大纲、情节结构与编辑器 | `plot-structure:save` 对 `beats.chapterIds` 未做外键校验 | `src/main/memory/repositories/plot-structure-repository.ts` | 单元测试：传入无效 chapterId 应抛错 | 是 |
| 10 | ISSUE-005-003 | 大纲、情节结构与编辑器 | `outline`/`plot-structure` 写入绕过 `BaseRepository.run` 和 `OperationLog` | `src/main/memory/repositories/outline-repository.ts`、`src/main/memory/repositories/plot-structure-repository.ts` | 单元测试：mock operationLog.append 应被调用 | 是 |
| 11 | ISSUE-007-001 / ISSUE-008-006 | 学习系统 / IPC | `learning:record` 未校验 `sessionId`/`response`/`duration` | `src/main/ipc/learning.ipc.ts` | 单元测试：传入缺失必填字段应抛错 | 是 |
| 12 | ISSUE-007-007 | 学习系统 | `learning:summary` 的 `totalInteractions` 为下限、`lastActive` 取最早时间 | `src/main/learning/engine.ts`、`src/main/memory/repositories/trajectory-repository.ts` | 单元测试：精确计数与最近时间 | 是 |
| 13 | ISSUE-007-008 | 学习系统 | `WriterModelUpdater` 将 `projectId` 误作 `writerId` | `src/main/learning/writer-model.ts` | 单元测试：跨项目应返回相同 writerId 或按项目字段重命名 | 是 |
| 14 | ISSUE-007-009 | 导入导出 | 损坏章节内容导出时元数据泄漏到正文 | `src/main/export/index.ts` | 单元测试：损坏 JSON 导出不应含 `"type":"doc"` | 是 |
| 15 | ISSUE-007-010 | 导入导出 | HTML 导出未按段落拆分，合并多段文本 | `src/main/export/index.ts` | 单元测试：多段落应生成多个 `<p>` | 是 |
| 16 | ISSUE-008-004 | 数据库、持久化与 IPC | `checkpoint:create` 未校验 `projectId` | `src/main/ipc/checkpoint.ipc.ts` | 单元测试：传入缺失/非法 projectId 应抛错 | 是 |
| 17 | ISSUE-008-005 | 数据库、持久化与 IPC | `session:create` 未校验 `projectId` | `src/main/ipc/checkpoint.ipc.ts` | 单元测试：传入缺失/非法 projectId 应抛错 | 是 |
| 18 | ISSUE-004-004 / ISSUE-008-008 | 角色与世界观 / IPC | `world:save` / `outline:save` 未校验 `type` 枚举 | `src/main/ipc/world.ipc.ts` | 单元测试：传入无/非法 type 应抛错 | 是 |

## P2（一般）— 建议下次迭代完成

| 序号 | 问题编号 | 模块 | 问题描述 | 建议修改文件 | 验证方式 | 可自动化回归 |
|---|---|---|---|---|---|---|
| 19 | ISSUE-001 | 环境基线 | `test:coverage` 因 `stress-ipc.test.ts` scenario 3 超时而失败 | `package.json` scripts / `vitest.config.ts` / `tests/integration/stress-ipc.test.ts` | 运行 `npm run test:coverage` 成功 | 是 |
| 20 | ISSUE-003-003 / ISSUE-008-007 | 项目与小说 / IPC | `project:update` / `chapter:update` 未校验空名称/标题 | `src/main/ipc/project.ipc.ts`、`src/main/ipc/novel.ipc.ts` | 单元测试：传入空/空白 name/title 应抛错 | 是 |
| 21 | ISSUE-004-006 | 角色与世界观 | JSON 大字段缺乏长度上限校验 | `src/main/ipc/character.ipc.ts`、`src/main/ipc/world.ipc.ts` | 单元测试：≥64KB 字段应抛错或被截断 | 是 |
| 22 | ISSUE-005-004 | 大纲、情节结构与编辑器 | 场景分隔输入规则测试不足且插入位置偏移 | `src/renderer/components/editor/extensions/NovelStructure.ts`、`tests/renderer/components/novel-structure.test.ts` | 单元测试：输入 `--- ` 触发 sceneBlock；段落开头/中间/末尾位置正确 | 是 |
| 23 | ISSUE-005-005 | 大纲、情节结构与编辑器 | 编辑器对超大内容、高频自动保存缺少显式防护 | `src/renderer/components/editor/NovelEditor.tsx`、`src/main/ipc/index.ts` | 运行时：粘贴 5 万字以上应提示；IPC payload 超限应拒绝 | 否（需 UI） |
| 24 | ISSUE-005-006 | 大纲、情节结构与编辑器 | `world.ipc.ts` 对 `outline`/`plot-structure` 内容校验不足 | `src/main/ipc/world.ipc.ts` | 单元测试：传入非法 framework/type/beats 结构应抛错 | 是 |
| 25 | ISSUE-006-001 | AI 对话与 LLM 配置 | 非流式 API 错误前缀与放行守卫不一致 | `src/main/engine/llm-provider.ts` | 单元测试：401 错误不应被二次包装 | 是 |
| 26 | ISSUE-007-002 | 学习系统、技能系统与导入导出 | skill-loader 使用正则解析 YAML frontmatter | `src/main/engine/skill-loader.ts`、`package.json` | 单元测试：引号、多行 description、列表可正确解析 | 是 |
| 27 | ISSUE-007-003 | 学习系统、技能系统与导入导出 | skill-loader 初次加载失败后不会重试且失败静默 | `src/main/engine/skill-loader.ts` | 单元测试：临时移除 skills 目录后恢复应重新加载 | 是 |
| 28 | ISSUE-007-004 | 学习系统、技能系统与导入导出 | skill-loader 硬编码 skills 目录路径，缺少兜底告警 | `src/main/engine/skill-loader.ts` | 单元测试：候选目录均不存在时应抛错或记录 error | 是 |
| 29 | ISSUE-007-005 | 学习系统、技能系统与导入导出 | 重复 name 的技能会静默覆盖 | `src/main/engine/skill-loader.ts` | 单元测试：重复 name 应记录 warn 或抛错 | 是 |
| 30 | ISSUE-007-006 | 学习系统、技能系统与导入导出 | `skill:get` 与 `skill:invoke` 对不存在技能的处理不一致 | `src/main/ipc/skill.ipc.ts`、`src/main/engine/skill-loader.ts` | 单元测试：统一错误契约 | 是 |
| 31 | ISSUE-007-011 | 学习系统、技能系统与导入导出 | skill/learning/export handler 使用 `IPC_CHANNELS` 常量 | `src/main/ipc/skill.ipc.ts`、`src/main/ipc/learning.ipc.ts`、`src/main/ipc/export.ipc.ts`、`src/preload/index.ts` | 代码审查 + 回归测试 | 是 |
| 32 | ISSUE-007-012 | 学习系统、技能系统与导入导出 | `learning:record` 未对 `context` 对象大小做限制 | `src/main/ipc/learning.ipc.ts` | 单元测试：超大 context 应截断或抛错 | 是 |
| 33 | ISSUE-003-004 | 项目与小说 | `chapter:update` 标题非空校验（已在 P1 合并处理，此处补充为独立 P2） | `src/main/ipc/novel.ipc.ts` | 单元测试：空标题应抛错 | 是 |

## P0 / P3

无。

## 修复迭代计划

### Iteration 1（当前迭代）

目标：消除数据完整性与核心校验风险。

- 完成全部 P1 修复任务（序号 1-18）。
- 为每个修复补充单元测试。
- 回归 `npm run test:run` 与 `npm run typecheck`。

### Iteration 2（下次迭代）

目标：提升健壮性、规范性与用户体验。

- 完成 P2 修复任务（序号 19-33）。
- 修复 `test:coverage` 超时问题。
- 补充 renderer/components/editor 与 ChatInput.tsx 测试，推动覆盖率至 80% 以上。
- 引入 Playwright + Electron 端到端自动化，覆盖 4 条跨模块流程。

### 验证标准

- 所有新增/修改代码通过 `npm run typecheck`、`npm run lint`、`npm run test:run`。
- 每个 P1 问题有对应的自动化单元/集成测试。
- 修复后 `issues.md` 中对应问题状态更新为 `Fixed`，并在 `test-matrix.md` 中更新测试结果。
