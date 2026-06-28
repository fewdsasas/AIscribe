# Task 5 — 大纲、情节结构与编辑器模块功能检查

## 检查范围

- `src/main/ipc/novel.ipc.ts`
- `src/main/ipc/world.ipc.ts`（含 `outline:*` 与 `plot-structure:*` 处理器）
- `src/main/memory/repositories/outline-repository.ts`
- `src/main/memory/repositories/plot-structure-repository.ts`
- `src/main/memory/repositories/base-repository.ts`、`src/main/memory/operation-log.ts`
- `src/renderer/components/editor/extensions/NovelStructure.ts`
- `src/renderer/components/editor/NovelEditor.tsx`
- `src/renderer/components/editor/menus/Toolbar.tsx`、`BubbleMenu.tsx`
- `src/renderer/components/editor/extensions/CharacterMention.ts`
- 相关测试文件

## 测试执行结果

```bash
npx vitest run tests/main/memory/repositories/plot-structure-repository.test.ts tests/renderer/components/novel-structure.test.ts tests/renderer/components/character-mention.test.ts
```

结果：**3 个测试文件，16 个测试全部通过**。

扩展验证：

```bash
npm run typecheck
```

结果：`tsc --noEmit` 无类型错误。

## 验证项结论

| 验证项 | 结论 | 说明 |
|---|---|---|
| `outline:save` / `outline:get` 结构一致性 | ⚠️ 部分一致 | 保存/读取字段映射正确，但更新会覆盖 `createdAt`，`version` 始终为 1，且允许部分字段导致默认值覆盖。 |
| `plot-structure:save` / `plot-structure:get-by-novel` beats 与 `chapterIds` 关联 | ⚠️ 未校验关联 | `chapterIds` 随 JSON 直接存储，未校验对应章节是否存在。 |
| `NovelStructure.ts` 中 `sceneBlock` 是否使用 `{ type: 'paragraph' }` 创建空段落 | ✅ 符合规范 | `insertSceneBlock` 命令与 `addInputRules` 均通过无 `content` 数组的 paragraph 创建空段落。 |
| 撤销/重做边界 | ✅ 基础可用 | 依赖 StarterKit history，未发现自定义节点破坏 undo/redo。 |
| 大量文本/emoji 粘贴 | ⚠️ 缺少上限 | 编辑器未限制内容大小，超大粘贴会带来性能与 IPC 负载风险。 |
| XSS 脚本粘贴 | ✅ 未发现可复现漏洞 | TipTap/ProseMirror schema 会过滤未知标签与脚本属性，相关组件未使用 `dangerouslySetInnerHTML`。 |

## 审查发现

| 编号 | 标题 | 严重程度 | 状态 |
|---|---|---|---|
| ISSUE-005-001 | `outline:save` 使用 `INSERT OR REPLACE` 导致更新时 `createdAt` 被覆盖且 `version` 未递增 | 中 | 待修复 |
| ISSUE-005-002 | `plot-structure:save` 对 `beats.*.chapterIds` 未做存在性/外键校验 | 中 | 待修复 |
| ISSUE-005-003 | `outline` 与 `plot-structure` 仓库绕过 `BaseRepository.run` 和 `OperationLog` | 中 | 待修复 |
| ISSUE-005-004 | `NovelStructure.ts` 场景分隔输入规则缺少真实触发测试，且插入位置存在偏移风险 | 低 | 待修复 |
| ISSUE-005-005 | `NovelEditor` 对超大内容、高频自动保存缺少显式防护 | 低 | 待修复 |
| ISSUE-005-006 | `world.ipc.ts` 对 `outline` / `plot-structure` 保存数据的内容校验不足 | 低 | 待修复 |

---

### ISSUE-005-001：`outline:save` 使用 `INSERT OR REPLACE` 导致更新时 `createdAt` 被覆盖且 `version` 未递增

**位置**：

- `src/main/memory/repositories/outline-repository.ts:24-53`
- `src/main/ipc/world.ipc.ts:54-61`

**问题描述**：

`OutlineRepository.save` 无论新建还是更新，都使用 `INSERT OR REPLACE`，并把 `created_at` 与 `updated_at` 同时设为当前时间 `now()`。这导致更新操作时原始的 `createdAt` 丢失。同时 `Outline` 类型中的 `version` 字段在 `SaveOutlineData` 中不存在，仓库里永远使用默认值 `1`，没有版本递增语义。

此外，`SaveOutlineData` 中的 `content` 与 `structure` 是可选的，缺失时会由仓库静默回退为空字符串/空数组，可能意外覆盖用户已有的内容或结构。

**影响**：

- 大纲更新后无法保留首次创建时间。
- `version` 字段形同虚设，后续若引入版本管理、冲突解决等功能会缺少基础数据。
- 部分保存可能误清空前次数据。

**证据**：

```ts
// outline-repository.ts
const outline: Outline = {
  id,
  novelId: data.novelId ?? '',
  type: data.type ?? 'brief',
  content: data.content ?? '',
  structure: data.structure ?? [],
  version: data.version ?? 1,
  createdAt: nowStr,
  updatedAt: nowStr
}
this.sqlDb.run(
  `INSERT OR REPLACE INTO outlines (id, novel_id, type, content, structure, version, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [id, outline.novelId, outline.type, outline.content, JSON.stringify(outline.structure),
   outline.version, nowStr, nowStr]
)
```

**修复建议**：

- 区分 insert 与 update：update 时先从数据库读取现有记录，保留 `createdAt` 并只更新 `updatedAt`。
- 实现 `version` 自增逻辑（`existing.version + 1`），或将 `version` 从类型中移除。
- 在 IPC 层要求 `SaveOutlineData` 为全量数据，或实现字段级部分更新。

---

### ISSUE-005-002：`plot-structure:save` 对 `beats.*.chapterIds` 未做存在性/外键校验

**位置**：

- `src/main/memory/repositories/plot-structure-repository.ts:24-40`
- `src/main/ipc/world.ipc.ts:17-25`

**问题描述**：

`PlotBeat.chapterIds` 是一个字符串数组，表示该 beat 关联的章节 ID。`PlotStructureRepository.save` 直接将其与整个 `beats` 数组一起 `JSON.stringify` 后存入 SQLite `TEXT` 列，读取时 `JSON.parse` 还原。整个流程中没有任何校验确认这些 `chapterIds` 是否真实存在于 `chapters` 表中。

**影响**：

- 可以保存指向不存在章节的 `chapterIds`，导致情节结构与章节之间的关联关系不可靠。
- 下游功能（如按 beat 汇总章节、情节进度统计）可能因引用失效而报错或展示脏数据。

**证据**：

```ts
// plot-structure-repository.ts
const plot: PlotStructure = {
  id,
  novelId: data.novelId ?? '',
  framework: data.framework ?? 'three_act',
  beats: data.beats ?? [],
  notes: data.notes ?? ''
}
this.sqlDb.run(
  `INSERT OR REPLACE INTO plot_structures (id, novel_id, framework, beats, notes)
   VALUES (?, ?, ?, ?, ?)`,
  [id, plot.novelId, plot.framework, JSON.stringify(plot.beats), plot.notes]
)
```

```ts
// world.ipc.ts
wrap(async (data: SavePlotStructureData) => {
  requireObject(data, '情节结构数据')
  requireId(data.novelId, '小说ID')
  const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
  return d.savePlotStructure(data)
})
```

**修复建议**：

- 在 `savePlotStructure` 中查询 `chapters` 表，校验每个 `beat.chapterIds` 元素均存在且属于当前 novel；不存在时抛出明确业务错误。
- 或者在读取时做引用完整性检查，将无效 `chapterIds` 标记为缺失并返回给调用方。

---

### ISSUE-005-003：`outline` 与 `plot-structure` 仓库绕过 `BaseRepository.run` 和 `OperationLog`

**位置**：

- `src/main/memory/repositories/outline-repository.ts:37-51`
- `src/main/memory/repositories/plot-structure-repository.ts:33-39`
- `src/main/memory/repositories/base-repository.ts:53-58`
- `src/main/memory/operation-log.ts:24-35`

**问题描述**：

`BaseRepository.run` 被设计为统一写入入口：调用 `this.db.run(sql, params)` 的同时，将操作追加到 `OperationLog` 并清空仓库缓存。`ChapterRepository` 等仓库因需要自定义 SQL 而直接调用 `this.sqlDb.run`，但 `OutlineRepository` 与 `PlotStructureRepository` 也直接调用 `this.sqlDb.run`，仅手动调用 `this.scheduleSave()`。

由于绕过了 `OperationLog.append()`，这些写入不会被记录到 `.log` 预写日志中。`Database.scheduleSave()` 以 300ms 防抖写入磁盘，若应用在此期间崩溃，最近的 `outline` / `plot-structure` 修改将无法通过 operation log 回放恢复。

**影响**：

- 存在数据丢失风险（崩溃前 300ms 窗口内的修改）。
- operation log 与持久化语义不一致，破坏 `Database` 为写入操作提供的 durability 保证。

**证据**：

```ts
// outline-repository.ts
this.sqlDb.run(
  `INSERT OR REPLACE INTO outlines ...`,
  [...]
)
this.scheduleSave()
// 未调用 this.run()，未记录 operation log
```

```ts
// base-repository.ts
protected run(sql: string, params?: unknown[]): void {
  this._operationLog?.append(sql, params)
  this.db.run(sql, params)
  this.clearCache()
}
```

**修复建议**：

- 将 `this.sqlDb.run(...)` 改为 `this.run(sql, params)`；手动维护缓存和保存调用的逻辑可以保留或合并到 `BaseRepository.run` 中。
- 若因参数形式特殊无法直接替换，应在执行 SQL 后显式调用 `this._operationLog.append(sql, params)` 并清空缓存。

---

### ISSUE-005-004：`NovelStructure.ts` 场景分隔输入规则缺少真实触发测试，且插入位置存在偏移风险

**位置**：

- `src/renderer/components/editor/extensions/NovelStructure.ts:144-167`
- `tests/renderer/components/novel-structure.test.ts:89-107`

**问题描述**：

`addInputRules` 注册了匹配 `^(?:---|___|\*\*\*)\s$` 的规则，期望用户输入 `--- ` 后自动插入 `sceneBlock`。但测试文件中的 “Scene separator input rule” 用例实际只调用了 `editor.commands.insertSceneBlock()`，并未模拟输入 `--- `，因此该规则是否真正生效未经验证。

另外，handler 中在删除匹配文本后使用 `tr.insert(start - 1, node)`。`start` 是匹配文本的起始位置，`start - 1` 会指向匹配文本前一个位置。当用户在段落中间或末尾输入分隔符时，scene block 可能被插入到段落内部或段落开头，而非替换分隔符所在位置。

**影响**：

- 核心交互（输入分隔线自动创建场景）缺乏回归保护。
- 实际使用时可能出现 scene block 位置异常，影响编辑体验。

**证据**：

```ts
// NovelStructure.ts
handler: ({ state, range }) => {
  const { tr } = state
  const start = range.from
  const end = range.to
  tr.delete(start, end)
  this.storage.sceneCounter++
  const node = this.type.create(
    { sceneNumber: this.storage.sceneCounter },
    state.schema.nodes.paragraph.create()
  )
  tr.insert(start - 1, node)
}
```

```ts
// novel-structure.test.ts（标题与内容不符）
it('should insert a scene block via insertSceneBlock command', () => {
  // ...
  editor.commands.insertSceneBlock()
  // ...
})
```

**修复建议**：

- 补充真实输入规则测试：直接操作编辑器输入 `--- ` 并断言生成 `sceneBlock`。
- 将 `tr.insert(start - 1, node)` 改为 `tr.insert(start, node)`，并通过测试覆盖段落开头、中间、末尾三种场景。

---

### ISSUE-005-005：`NovelEditor` 对超大内容、高频自动保存缺少显式防护

**位置**：

- `src/renderer/components/editor/NovelEditor.tsx:112-120`
- `src/main/ipc/index.ts:36-40`

**问题描述**：

`NovelEditor` 在每次 `onUpdate` 时都会重新计算整个文档的中文数字数，并通过 `triggerAutoSave` 触发 IPC 自动保存。`wrap()` 中对 IPC payload 超过 1MB 仅打印 warn 日志，不会拒绝或截断。编辑器自身没有设置章节最大字数、历史栈深度或粘贴大小限制。

**影响**：

- 超大文本粘贴/导入时，会导致频繁的 `textContent` 计算、JSON 序列化和 IPC 传输，造成卡顿或内存峰值。
- 极端情况下可能触发 sql.js 内存限制或 IPC 传输瓶颈。

**证据**：

```ts
// NovelEditor.tsx
onUpdate: ({ editor: ed }) => {
  const json = ed.getJSON()
  const text = ed.state.doc.textContent
  const chars = countChineseChars(text)
  if (onContentChange) { onContentChange(json, text, chars) }
  triggerAutoSave()
}
```

```ts
// src/main/ipc/index.ts
const payloadSize = JSON.stringify(args || []).length
if (payloadSize > 1_000_000) {
  logger.warn(`[IPC] Large payload on channel: ${payloadSize} bytes`)
}
```

**修复建议**：

- 为单章内容设置合理上限（如 50 万字），超过上限时阻止继续输入/粘贴并提示用户拆分章节。
- 对 `onUpdate` 中的统计与自动保存增加防抖或按文档大小分级处理。
- 将 IPC payload warn 阈值提升为可配置的 hard limit，避免超大 payload 进入主进程。

---

### ISSUE-005-006：`world.ipc.ts` 对 `outline` / `plot-structure` 保存数据的内容校验不足

**位置**：

- `src/main/ipc/world.ipc.ts:17-25`、`54-61`
- `src/shared/types/ipc.ts:147-160`、`178-191`

**问题描述**：

`PLOT_STRUCTURE_SAVE` 与 `OUTLINE_SAVE` 处理器仅校验 `data` 为对象以及 `data.novelId` 为合法 UUID，未对以下类型契约做运行时校验：

- `framework` 是否属于 `NarrativeFramework` 枚举。
- `type` 是否属于 `'brief' | 'detailed'`。
- `beats` 数组元素是否包含必填字段，且 `status` 是否属于 `'planned' | 'drafted' | 'revised'`。
- `structure` 数组元素是否包含必填字段，且 `phase` 是否属于 `'beginning' | 'middle' | 'ending'`。

仓库读取时仅使用 TypeScript 类型断言 `as`，非法值会被静默接受。

**影响**：

- 类型契约与运行时行为不一致，错误数据可在 DB 中持久化。
- 下游组件按接口约定访问字段时可能遇到非预期值。

**证据**：

```ts
// world.ipc.ts
wrap(async (data: SavePlotStructureData) => {
  requireObject(data, '情节结构数据')
  requireId(data.novelId, '小说ID')
  // 未校验 framework / beats 结构
  const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
  return d.savePlotStructure(data)
})
```

```ts
// plot-structure-repository.ts
framework: asString(map.framework) as PlotStructure['framework'],
beats: safeJsonParse<PlotBeat[]>(map.beats, [])
```

**修复建议**：

- 在 IPC 处理器中增加枚举与数组结构校验（可复用已有 `requireNonEmptyString` 并补充枚举校验工具）。
- 或在仓库反序列化时不再使用 `as` 断言，而是对解析结果做运行时 shape 校验并返回 fallback。

---

## 总体评估

大纲、情节结构与编辑器模块的核心读写流程在当前测试覆盖下可正常工作，`NovelStructure.ts` 也遵循了 `{ type: 'paragraph' }` 创建空段落的约定。主要风险集中在 **持久化层语义不完整**（`createdAt` 覆盖、OperationLog 绕过）、**关联数据无校验**（`chapterIds`）、以及 **编辑器边界防护不足**（超大内容、输入规则未测试）三个方面。建议优先修复 ISSUE-005-001、ISSUE-005-002、ISSUE-005-003，以避免数据一致性与 durability 问题。
