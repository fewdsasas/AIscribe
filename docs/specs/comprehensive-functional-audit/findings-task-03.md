# Task 3 Findings

## 执行摘要

本次检查聚焦 AIscribe 的「项目（Project）」与「小说（Novel）」模块，覆盖 IPC 处理器与底层 Repository 实现。共审查 5 个源文件、运行 3 个测试文件（50 个用例全部通过）。数据库层面已正确配置 `ON DELETE CASCADE` 外键约束，且 `chapter:update` 的 `sortOrder` 能够正确持久化。但 IPC 层对关联 ID 的校验存在明显缺口，`novel:create` 与 `chapter:create` 均允许传入无效/缺失的父级 ID；同时 `project:update` 与 `chapter:update` 未复用创建时的非空校验，导致可将名称/标题更新为空字符串。此外，级联删除未同步清理子仓库缓存，存在脏读风险。

## 测试结果

| 功能点 | 结果 | 备注 |
|--------|------|------|
| `project:create` 必填字段校验 | 通过 | `name` 非空、去空白、超长（>100000）均在 `requireNonEmptyString` 中校验 |
| `project:delete` 级联删除（DB 层） | 通过 | `novels.project_id` 与 `chapters.novel_id` 均配置 `ON DELETE CASCADE`，`PRAGMA foreign_keys = ON` 已启用 |
| `novel:create` 与项目关联 | 不通过 | 未校验 `projectId` 必填及 UUID 格式，可写入无效/空 project_id（详见 ISSUE-003-001） |
| `chapter:update` 的 `sortOrder` 持久化 | 通过 | `ChapterRepository.update` 的 `fieldMap` 包含 `sortOrder→sort_order`，且 `0` 值可正确保存 |
| 空名称/标题边界（创建） | 通过 | `project:create` 与 `novel:create`、`chapter:create` 均调用 `requireNonEmptyString` |
| 超长名称边界 | 通过 | `MAX_STRING_LENGTH = 100000` 统一限制 |
| 特殊字符边界 | 通过 | 名称未做无意义字符过滤，符合业务预期 |
| 无效 UUID 边界（直接 ID） | 通过 | `project:get/update/delete`、`novel:get`、`chapter:get/update/list` 均调用 `requireId` |
| 测试执行 `handlers.test.ts` | 通过 | 27 个用例通过 |
| 测试执行 `extended-handlers.test.ts` | 通过 | 14 个用例通过 |
| 测试执行 `base-repository.test.ts` | 通过 | 9 个用例通过 |
| 测试执行 `project-repository.test.ts` | 未运行 | 文件不存在，以 `base-repository.test.ts` 作为最接近的 Repository 测试 |

## 问题清单

| 问题编号 | 模块 | 功能点 | 严重度 | 复现步骤 | 实际结果 | 预期结果 | 修复建议 | 关联代码 |
|----------|------|--------|--------|------------|------------|------------|----------|----------|
| ISSUE-003-001 | Novel IPC | `novel:create` 父项目 ID 校验 | 高 | 1. 调用 `novel:create` handler，传入 `{ projectId: 'invalid-id', title: 'Test' }` 或 `{ title: 'Test' }`（无 projectId）<br>2. 观察返回与数据库记录 | 返回成功创建的小说对象，`project_id` 被写入无效值或空字符串 | `projectId` 必填且必须为有效 UUID；缺失或无效时应抛出错误 | 在 `novel:create` handler 中补充 `requireId(data.projectId, '项目ID')` | `src/main/ipc/novel.ipc.ts:11-16` |
| ISSUE-003-002 | Chapter IPC | `chapter:create` 父小说 ID 校验 | 高 | 1. 调用 `chapter:create` handler，传入 `{ novelId: 'invalid-id', title: 'Ch1' }` 或 `{ title: 'Ch1' }`（无 novelId）<br>2. 观察返回与数据库记录 | 返回成功创建的章节对象，`novel_id` 被写入无效值或空字符串 | `novelId` 必填且必须为有效 UUID；缺失或无效时应抛出错误 | 在 `chapter:create` handler 中补充 `requireId(data.novelId, '小说ID')` | `src/main/ipc/novel.ipc.ts:37-42` |
| ISSUE-003-003 | Project IPC | `project:update` 名称非空校验 | 高 | 1. 创建一个项目<br>2. 调用 `project:update` handler，传入 `{ name: '' }` 或 `{ name: '   ' }` | 更新成功，项目名称在数据库中被置为 `NULL` 或保留空值 | 更新名称时应保持与 `project:create` 一致的非空约束，空/纯空白名称应报错 | 在 `project:update` handler 中，当 `data.name` 存在时调用 `requireNonEmptyString(data.name, '项目名称')` | `src/main/ipc/project.ipc.ts:42-48`、`src/main/memory/repositories/project-repository.ts:78-96` |
| ISSUE-003-004 | Chapter IPC | `chapter:update` 标题非空校验 | 高 | 1. 创建一个章节<br>2. 调用 `chapter:update` handler，传入 `{ title: '' }` 或 `{ title: '   ' }` | 更新成功，章节标题被置为空字符串 | 更新标题时应保持与 `chapter:create` 一致的非空约束，空/纯空白标题应报错 | 在 `chapter:update` handler 中，当 `data.title` 存在时调用 `requireNonEmptyString(data.title, '章节标题')` | `src/main/ipc/novel.ipc.ts:78-85`、`src/main/memory/repositories/chapter-repository.ts:92-120` |
| ISSUE-003-005 | Project Repository / Memory | `project:delete` 级联删除后的缓存一致性 | 中 | 1. 创建项目→小说→章节<br>2. 先通过 `chapter:get` 加载章节（使其进入 `ChapterRepository.cache`）<br>3. 删除所属项目<br>4. 再次调用 `chapter:get` | 由于数据库级联删除，章节已不存在，但 `ChapterRepository` 缓存未被失效，仍返回旧数据 | 级联删除应同步使子实体（novel/chapter）缓存失效，避免脏读 | 在 `ProjectRepository.delete` 执行后，调用 `novelRepo.clearCache()` 与 `chapterRepo.clearCache()`；或在 `Database.deleteProject` 中统一清理相关仓库缓存 | `src/main/memory/repositories/project-repository.ts:98-101`、`src/main/memory/repositories/chapter-repository.ts:80-90`、`src/main/memory/repositories/base-repository.ts:31-33` |
