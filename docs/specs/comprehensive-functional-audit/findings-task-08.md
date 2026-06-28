# Task 8 — 数据库、持久化与 IPC 模块功能检查

## 检查范围

- `src/main/memory/database.ts`
- `src/main/memory/repositories/base-repository.ts`
- `src/main/ipc/index.ts`（wrap / wrapEvent / sanitizeError / requireId / requireObject / requireNonEmptyString）
- `src/main/ipc/*.ipc.ts`（全部 14 个 handler 注册文件）
- `src/preload/index.ts`
- `src/shared/types/ipc.ts`
- 关联 Repository：`novel-repository.ts`、`chapter-repository.ts`、`character-repository.ts`、`checkpoint-repository.ts`、`session-memory-repository.ts`、`outline-repository.ts`、`world-repository.ts`

## 测试执行结果

执行命令：

```bash
npx vitest run tests/main/memory/database.test.ts tests/main/memory/repositories/base-repository.test.ts tests/main/ipc/permission.test.ts tests/main/ipc/di-handlers.test.ts tests/main/ipc/ipc-channels.test.ts tests/main/ipc/validation.test.ts tests/main/ipc/storage-handlers.test.ts tests/main/ipc/checkpoint-handlers.test.ts tests/main/ipc/db-export-handlers.test.ts tests/main/secure-store.test.ts
```

结果：**10 个测试文件全部通过，126 个测试用例全部通过**。

| 验证项 | 结果 | 备注 |
|--------|------|------|
| `Database.create` 初始化 schema_version | 通过 | `SCHEMA_VERSION = 3`，新库通过 `INSERT OR IGNORE INTO schema_version (version) VALUES (3)` 写入 |
| MIGRATIONS[2] 执行（trajectories 表 + 索引 + FTS5） | 通过 | 升级路径 `v0/v1 → v2` 会创建 `trajectories` 表与三个索引，FTS5 在缺失时静默忽略 |
| MIGRATIONS[3] 执行（ novels/chapters/characters/worlds/plot_structures/outlines/checkpoints/session_memories 索引） | 通过 | `v2 → v3` 创建 8 个索引 |
| `scheduleSave` 300ms 防抖 | 通过 | 每次调用 `clearTimeout` 后重新设置 `setTimeout(..., 300)` |
| `close()` 取消待保存任务并 flush | 通过 | 先 `clearTimeout` 清空 `saveTimeout`，再调用 `save()` 同步落盘 |
| 所有 IPC handler 使用 `wrap()` / `wrapEvent()` | 通过 | 14 个 handler 文件全部使用 `wrap` 或 `wrapEvent`，无 `wrap(async (event, data) => ...)` 错误用法 |
| Preload 通道名与 `IPC_CHANNELS` 一致 | 通过 | `src/preload/index.ts` 全部使用 `IPC_CHANNELS` 常量，与 handler 注册一致 |
| `sanitizeError` 脱敏规则 | 通过 | 覆盖 `api_key_*`、`openai-key-*`、`sk-*`、`key_*` 等模式 |
| 权限中间件 `withPermission` 覆盖全部 invoke 通道 | 通过 | `registerIpcHandlers` 对所有 `ipcMain.handle` 包装 `withPermission` |

## 审查发现

本次审查共发现 **8 个问题**，全部集中在 IPC handler 对必填字段 / 非法 UUID 的校验缺失。数据库初始化、迁移、持久化防抖与 IPC 包装机制均符合预期。

| 问题编号 | 模块 | 功能点 | 严重度 | 复现步骤 | 实际结果 | 预期结果 | 修复建议 | 关联代码 |
|----------|------|--------|--------|------------|------------|------------|----------|----------|
| ISSUE-008-001 | Novel IPC | `novel:create` 父项目 ID 校验 | 高 | 调用 handler 传入 `{ title: 'Test' }` 或 `{ projectId: 'invalid', title: 'Test' }` | 创建成功，`project_id` 被写入空字符串或无效值 | `projectId` 必填且为有效 UUID | 补充 `requireId(data.projectId, '项目ID')` | `src/main/ipc/novel.ipc.ts:11-16` |
| ISSUE-008-002 | Chapter IPC | `chapter:create` 父小说 ID 校验 | 高 | 调用 handler 传入 `{ title: 'Ch1' }` 或 `{ novelId: 'invalid', title: 'Ch1' }` | 创建成功，`novel_id` 被写入空字符串或无效值 | `novelId` 必填且为有效 UUID | 补充 `requireId(data.novelId, '小说ID')` | `src/main/ipc/novel.ipc.ts:37-42` |
| ISSUE-008-003 | Character IPC | `character:create` novelId 与 role 校验 | 高 | 传入 `{ name: 'Alice' }` 或 `{ novelId: 'invalid', name: 'Alice' }` | 创建成功，`novel_id` 为空字符串或无效值；`role` 可能缺失 | `novelId` 必填 UUID，`role` 必填 | 补充 `requireId(data.novelId, '小说ID')` 与 `requireNonEmptyString(data.role, '角色类型')` | `src/main/ipc/character.ipc.ts:11-16` |
| ISSUE-008-004 | Checkpoint IPC | `checkpoint:create` 项目 ID 校验 | 高 | 传入 `{ label: 'v1' }` 或 `{ projectId: 'invalid', label: 'v1' }` | 创建成功，`project_id` 为空字符串或无效值 | `projectId` 必填且为有效 UUID | 补充 `requireId(data.projectId, '项目ID')` | `src/main/ipc/checkpoint.ipc.ts:11-16` |
| ISSUE-008-005 | Session IPC | `session:create` 项目 ID 校验 | 高 | 传入 `{}` 或 `{ projectId: 'invalid' }` | 创建成功，`project_id` 为空字符串或无效值 | `projectId` 必填且为有效 UUID | 补充 `requireId(data.projectId, '项目ID')` | `src/main/ipc/checkpoint.ipc.ts:37-42` |
| ISSUE-008-006 | Learning IPC | `learning:record` 必填字段校验 | 中 | 传入 `{ projectId: '<uuid>', query: 'q' }`（无 sessionId/response/duration） | 记录成功，缺失字段被写入默认值（空字符串/0） | `sessionId`、`response`、`duration` 应按类型校验 | 补充 `requireNonEmptyString(data.sessionId, '会话ID')`、`requireNonEmptyString(data.response, '响应')`、数值/非负校验 | `src/main/ipc/learning.ipc.ts:11-19` |
| ISSUE-008-007 | Project / Chapter IPC | `project:update` 与 `chapter:update` 名称非空校验 | 中 | 更新时传入 `{ name: '' }` / `{ title: '   ' }` | 更新成功，名称/标题被置为空或空白 | 更新操作应保持创建时的非空约束 | 存在 `data.name`/`data.title` 时调用 `requireNonEmptyString` | `src/main/ipc/project.ipc.ts:42-48`、`src/main/ipc/novel.ipc.ts:78-85` |
| ISSUE-008-008 | World / Outline IPC | `world:save` 与 `outline:save` type 枚举校验 | 低 | 传入 `{ novelId: '<uuid>', name: 'W' }`（无 type）或 `{ novelId: '<uuid>', type: 'invalid' }` | 保存成功，type 被写入默认值或非法字符串 | `type` 必填且应为 `'brief' \| 'detailed'`（outline）或合法 `WorldType` | 补充枚举校验，非法值抛错 | `src/main/ipc/world.ipc.ts:37-43`、`src/main/ipc/world.ipc.ts:56-61` |

## 详细说明

### ISSUE-008-001：`novel:create` 缺失 `projectId` 校验

**位置**：`src/main/ipc/novel.ipc.ts:11-16`

```ts
wrap(async (data: CreateNovelData) => {
  requireObject(data, '小说数据')
  requireNonEmptyString(data.title, '小说标题')
  const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
  return d.createNovel(data)
})
```

`CreateNovelData` 中 `projectId` 为必填字段，但 handler 未调用 `requireId`。`NovelRepository.create` 对缺失的 `projectId` 回退为空字符串并直接插入，导致产生游离小说记录。

---

### ISSUE-008-002：`chapter:create` 缺失 `novelId` 校验

**位置**：`src/main/ipc/novel.ipc.ts:37-42`

与 ISSUE-008-001 类似，`chapter:create` 仅校验 `data.title`，未校验 `novelId`。`ChapterRepository.create` 对缺失的 `novelId` 回退为空字符串。

---

### ISSUE-008-003：`character:create` 缺失 `novelId` 与 `role` 校验

**位置**：`src/main/ipc/character.ipc.ts:11-16`

`CreateCharacterData` 要求 `novelId` 与 `role` 必填，但 handler 仅校验 `name`。`CharacterRepository` 对缺失字段使用默认值，可能写入无效数据。该问题在 Task 4 中亦被记录为 ISSUE-004-005，当前仍未修复。

---

### ISSUE-008-004：`checkpoint:create` 缺失 `projectId` 校验

**位置**：`src/main/ipc/checkpoint.ipc.ts:11-16`

`CreateCheckpointData` 要求 `projectId` 必填，handler 仅校验 `label`。`CheckpointRepository.create` 对缺失 `projectId` 回退为空字符串。

---

### ISSUE-008-005：`session:create` 缺失 `projectId` 校验

**位置**：`src/main/ipc/checkpoint.ipc.ts:37-42`

`CreateSessionData` 要求 `projectId` 必填，handler 仅调用 `requireObject`。`SessionMemoryRepository.create` 对缺失 `projectId` 回退为空字符串。

---

### ISSUE-008-006：`learning:record` 缺失 `sessionId` / `response` / `duration` 校验

**位置**：`src/main/ipc/learning.ipc.ts:11-19`

```ts
wrap(async (data: RecordLearningData) => {
  requireObject(data, '学习记录数据')
  requireId(data.projectId, '项目ID')
  requireNonEmptyString(data.query, '查询内容')
  // sessionId / response / duration 未校验
})
```

`RecordLearningData` 中 `sessionId`、`response`、`duration` 均为必填字段，handler 未做校验，可能写入不完整的学习记录。

---

### ISSUE-008-007：`project:update` / `chapter:update` 未校验名称非空

**位置**：`src/main/ipc/project.ipc.ts:42-48`、`src/main/ipc/novel.ipc.ts:78-85`

更新 handler 对 `data` 仅调用 `requireObject`，未对 `name` / `title` 做非空校验，允许将名称更新为空字符串或纯空白。该问题在 Task 3 中已记录为 ISSUE-003-003 / ISSUE-003-004，当前仍未修复。

---

### ISSUE-008-008：`world:save` / `outline:save` 未校验 `type` 枚举

**位置**：`src/main/ipc/world.ipc.ts:37-43`、`src/main/ipc/world.ipc.ts:56-61`

`SaveWorldData` 与 `SaveOutlineData` 中 `type` 为必填枚举字段，handler 未校验。虽然 Repository 会回退到默认值（`fantasy` / `brief`），但非法值仍会被写入，导致后续读取时类型断言失败或 UI 展示异常。

## 正面结论

- 数据库初始化与迁移机制正确，`schema_version` 在新库中写入 3，迁移 2/3 会按序执行。
- `scheduleSave` 实现 300ms 防抖，`close()` 会取消待保存任务并强制 flush。
- IPC 包装规范：`wrap` / `wrapEvent` 使用正确，无 `wrap(async (event, data) => ...)` 反模式；`llm:chat-stream` 正确获取 `event.sender` 推送流式事件。
- Preload 与 Main 进程通道名通过 `IPC_CHANNELS` 常量保持一致。
- `sanitizeError` 与权限中间件 `withPermission` 工作正常。
