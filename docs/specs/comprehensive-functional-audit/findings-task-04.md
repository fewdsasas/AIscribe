# Task 4 — 角色与世界观模块功能检查

## 检查范围

- `src/main/ipc/character.ipc.ts`
- `src/main/ipc/world.ipc.ts`
- `src/main/memory/repositories/character-repository.ts`
- `src/main/memory/repositories/world-repository.ts`
- `src/shared/types/ipc.ts` 中的 `CreateCharacterData` / `SaveWorldData`
- 相关支撑文件：`src/main/memory/repositories/row-mapper.ts`、`src/main/memory/database.ts`、`src/shared/types/index.ts`

## 测试执行结果

```bash
npx vitest run tests/main/ipc/character-handlers.test.ts tests/main/memory/repositories/row-mapper.test.ts
```

结果：2 个测试文件，27 个测试全部通过。

扩展验证：

```bash
npx vitest run tests/main/
npm run typecheck
```

结果：`tests/main/` 30 个测试文件、389 个测试全部通过；`tsc --noEmit` 无类型错误。

## 审查发现

| 编号 | 标题 | 严重程度 | 状态 |
|---|---|---|---|
| ISSUE-004-001 | 角色 personality/arc 反序列化会返回缺少必填字段的对象 | 中 | 待修复 |
| ISSUE-004-002 | 角色关系 targetId 不存在时无任何校验或保护 | 中 | 待修复 |
| ISSUE-004-003 | 世界观 powerSystem 反序列化会返回缺少必填字段的对象 | 中 | 待修复 |
| ISSUE-004-004 | world:save 在 IPC 层未校验必填字段 type | 低 | 待修复 |
| ISSUE-004-005 | character:create 在 IPC 层未校验必填字段 role 与 novelId | 低 | 待修复 |
| ISSUE-004-006 | JSON 大字段（personality / arc / relationships / geography 等）缺乏长度上限校验 | 低 | 待修复 |

---

### ISSUE-004-001：角色 personality/arc 反序列化会返回缺少必填字段的对象

**位置**：`src/main/memory/repositories/character-repository.ts:87-100`

**问题描述**：
`rowToCharacter` 使用 `safeJsonParse(map.personality, { traits: [], virtues: [], flaws: [], motivations: [], coreBelief: '' })` 解析 personality。当数据库中存储的是默认空对象 `'{}'` 或任何合法对象时，`safeJsonParse` 仅判断其为对象即直接返回，不会与 fallback 合并必填字段。结果会导致返回的 `Character.personality` 缺少 `traits`、`virtues`、`flaws`、`motivations`、`coreBelief` 等接口必填字段。

`arc` 字段同理：数据库默认 `'{}'` 会被解析为 `{}`，缺少 `type`、`startingState`、`endingState`、`catalyst`、`keyMoments`。

**影响**：下游代码按照 `PersonalityProfile` / `CharacterArc` 访问字段时可能得到 `undefined`，引发运行时异常或界面渲染错误。

**证据**：

```ts
// character-repository.ts
personality: safeJsonParse(map.personality, {
  traits: [],
  virtues: [],
  flaws: [],
  motivations: [],
  coreBelief: ''
}),
```

```ts
// row-mapper.ts
if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback
}
return parsed
```

**修复建议**：反序列化时对对象进行 shape 校验，或使用 zod 等模式校验工具，确保返回对象包含所有必填字段；或在解析后与 fallback 做深度合并。

---

### ISSUE-004-002：角色关系 targetId 不存在时无任何校验或保护

**位置**：`src/main/ipc/character.ipc.ts:10-17`、`src/main/memory/repositories/character-repository.ts:37-67`

**问题描述**：
`CreateCharacterData.relationships` 中每项包含 `targetId`，但 IPC 处理器与 Repository 均不对 `targetId` 是否存在对应角色进行校验。`relationships` 以 JSON 数组形式整体存入 `characters` 表，数据库无法在 JSON 内部元素上建立外键约束。

**影响**：可以创建指向不存在的角色的关系，导致后续基于关系图的功能（如关系网络、冲突分析）出现脏数据或崩溃。

**证据**：

```ts
// character.ipc.ts
wrap(async (data: CreateCharacterData) => {
  requireObject(data, '角色数据')
  requireNonEmptyString(data.name, '角色名称')
  const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
  return d.createCharacter(data)
})
```

```ts
// character-repository.ts
relationships: data.relationships ?? [],
// ...
JSON.stringify(character.relationships),
```

**修复建议**：在 `CharacterRepository.create` 中遍历 `relationships`，对每个 `targetId` 查询 `characters` 表确认存在性；或在 IPC 层增加校验逻辑。不存在的 targetId 应抛出明确错误。

---

### ISSUE-004-003：世界观 powerSystem 反序列化会返回缺少必填字段的对象

**位置**：`src/main/memory/repositories/world-repository.ts:88-90`

**问题描述**：
`rowToWorld` 对 `powerSystem` 使用 `safeJsonParse<PowerSystem>(map.power_system, { name: '', rules: [], limitations: [], costs: [], source: '' })`。当数据库中 `power_system` 为 `'{}'` 或任何合法对象时，同样会直接返回 `{}`，缺少 `name`、`rules`、`limitations`、`costs`、`source` 等必填字段。

**影响**：下游按 `PowerSystem` 接口访问字段时会得到 `undefined`，可能导致功能异常。

**证据**：

```ts
// world-repository.ts
powerSystem: map.power_system
  ? safeJsonParse<PowerSystem>(map.power_system, { name: '', rules: [], limitations: [], costs: [], source: '' })
  : undefined,
```

**修复建议**：与 ISSUE-004-001 一致，对解析结果进行 shape 校验或与 fallback 合并必填字段。

---

### ISSUE-004-004：world:save 在 IPC 层未校验必填字段 type

**位置**：`src/main/ipc/world.ipc.ts:35-44`、`src/shared/types/ipc.ts:162-176`

**问题描述**：
`SaveWorldData` 将 `type: WorldType` 定义为必填字段，但 `registerWorldHandlers` 的 `WORLD_SAVE` 处理器仅校验 `name`，未调用 `requireNonEmptyString(data.type, '世界观类型')` 或枚举校验。缺失时由 `WorldRepository` 静默回退为 `'fantasy'`。

**影响**：类型契约与运行时行为不一致，调用方传入错误类型时可能无法及时发现。

**证据**：

```ts
// world.ipc.ts
wrap(async (data: SaveWorldData) => {
  requireObject(data, '世界观数据')
  requireId(data.novelId, '小说ID')
  requireNonEmptyString(data.name, '世界观名称')
  // 未校验 data.type
  const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
  return d.saveWorld(data)
})
```

```ts
// world-repository.ts
type: data.type ?? 'fantasy',
```

**修复建议**：在 IPC 处理器中校验 `data.type` 为非空字符串，并进一步校验其属于 `WorldType` 枚举值。

---

### ISSUE-004-005：character:create 在 IPC 层未校验必填字段 role 与 novelId

**位置**：`src/main/ipc/character.ipc.ts:9-17`、`src/shared/types/ipc.ts:116-145`

**问题描述**：
`CreateCharacterData` 将 `role: CharacterRole` 与 `novelId: string` 定义为必填字段，但处理器仅校验 `name`。`role` 缺失时由 Repository 静默回退为 `'minor'`；`novelId` 缺失时回退为空字符串，最终会在数据库层触发外键约束错误，但错误信息对用户不友好。

**影响**：
- 角色角色默认值与 DTO 必填声明不符。
- 调用方传入无效 `novelId` 时得到底层 SQLite 错误而非清晰的业务错误。

**证据**：

```ts
// character.ipc.ts
wrap(async (data: CreateCharacterData) => {
  requireObject(data, '角色数据')
  requireNonEmptyString(data.name, '角色名称')
  // 未校验 data.novelId / data.role
  const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
  return d.createCharacter(data)
})
```

```ts
// character-repository.ts
novelId: data.novelId ?? '',
name: data.name ?? '',
role: data.role ?? 'minor',
```

**修复建议**：在 IPC 处理器中增加 `requireId(data.novelId, '小说ID')` 与 `role` 枚举值校验。

---

### ISSUE-004-006：JSON 大字段缺乏长度上限校验

**位置**：`src/main/ipc/character.ipc.ts`、`src/main/ipc/world.ipc.ts`、`src/main/ipc/index.ts:36-40`

**问题描述**：
`personality`、`arc`、`relationships`、`geography`、`history`、`society`、`powerSystem`、`economy` 等字段在保存前被整体 `JSON.stringify` 后写入 SQLite `TEXT` 列。IPC 层的 `wrap()` 仅在 payload 超过 1MB 时打印 warn 日志，不会拒绝请求；Repository 层也没有针对单个 JSON 字段的长度限制。`requireNonEmptyString` 使用的 `MAX_STRING_LENGTH`（100,000）仅作用于 `name` 等少量字段，不覆盖这些 JSON 大字段。

**影响**：超大 JSON 字段会导致内存占用、IPC 序列化/反序列化开销增加，极端情况下可能影响应用稳定性。

**证据**：

```ts
// src/main/ipc/index.ts
const payloadSize = JSON.stringify(args || []).length
if (payloadSize > 1_000_000) {
  logger.warn(`[IPC] Large payload on channel: ${payloadSize} bytes`)
}
```

```ts
// character-repository.ts
JSON.stringify(character.personality),
JSON.stringify(character.arc),
JSON.stringify(character.relationships),
```

**修复建议**：
- 为 JSON 字段设置合理的长度上限（如 100,000 字符），超过上限时拒绝保存并返回明确错误。
- 或将 warn 阈值提升为硬性限制，避免超大 payload 进入业务逻辑。

---

## 总体评估

角色与世界观模块的基础增删改查流程可正常工作，当前测试全部通过。主要风险集中在 **JSON 字段反序列化后的 shape 完整性** 与 **关系/必填字段校验缺失** 两个方面。建议优先修复 ISSUE-004-001、ISSUE-004-002、ISSUE-004-003，以避免下游代码因字段缺失或脏关系数据而出现运行时错误。
