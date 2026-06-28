# 修复 IPC 测试文件 UTF-8 编码损坏并验证 ESLint 警告清零

## Summary

上一轮工作中,9 个 IPC handler 测试文件已成功完成 `mockHandlers.get('channel')!` → `getRegisteredHandler('channel')` 的替换(通过 Edit 工具),并添加了 `getRegisteredHandler` 辅助函数。但随后使用 PowerShell `Set-Content` 命令(未指定 `-Encoding UTF8`)进行批量替换时,导致 4 个文件中的 UTF-8 中文字符损坏。

目前所有 `no-non-null-assertion` 的 `!` 断言已全部移除(Grep 搜索 `!\.` 和 `!\[` 在 tests 目录均无匹配),只剩 4 个文件的 UTF-8 编码损坏需要修复,然后运行最终验证。

## Current State Analysis

### 已完成的工作
- 所有 25 个测试文件中的 `!` 非空断言(共约 139 处)已全部移除
- 9 个 IPC handler 测试文件均已添加 `getRegisteredHandler` 辅助函数
- 所有 `mockHandlers.get('channel')!` 调用已替换为 `getRegisteredHandler('channel')`
- 5 个文件编码正常:`character-handlers.test.ts`、`checkpoint-handlers.test.ts`、`db-export-handlers.test.ts`、`extended-handlers.test.ts`、`llm-config-handlers.test.ts`

### 待修复的 4 个文件(共 8 处损坏字符串)

#### 1. `tests/main/ipc/chat-handlers.test.ts` (1 处,导致 typecheck 错误)
- **第 106 行**:损坏字符串缺少闭合引号,导致 "Unterminated string literal"
- 当前(损坏):`'每条消息必须包含 role ?content 字符?`  (实际字节为替换字符 + 缺失引号)
- 正确(来自 `src/main/ipc/chat.ipc.ts:25`):`'每条消息必须包含 role 和 content 字符串'`

#### 2. `tests/main/ipc/storage-handlers.test.ts` (3 处,导致 typecheck 错误)
- **第 72 行**:当前(损坏)`'不允许通过通用存储设置 LLM 配置?` → 正确 `'不允许通过通用存储设置 LLM 配置键'` (来源 `src/main/ipc/storage.ipc.ts:14`)
- **第 113 行**:当前(损坏)`'不允许通过通用存储读取 LLM 配置?` → 正确 `'不允许通过通用存储读取 LLM 配置键'` (来源 `src/main/ipc/storage.ipc.ts:30`)
- **第 137 行**:当前(损坏)`'不允许通过通用存储删除 LLM 配置?` → 正确 `'不允许通过通用存储删除 LLM 配置键'` (来源 `src/main/ipc/storage.ipc.ts:44`)
- 注:这 3 处均缺少闭合单引号,导致 "Unterminated string literal"

#### 3. `tests/main/ipc/skill-handlers.test.ts` (3 处,语法有效但内容错误)
- **第 83 行**:当前(损坏)`'技能名?不能为空'` → 正确 `'技能名称 不能为空'`
  - 来源:`requireNonEmptyString(name, '技能名称')` (`src/main/ipc/skill.ipc.ts:16`),错误格式 `${label} 不能为空` (`src/main/ipc/index.ts:93`)
- **第 98 行**:同上 → `'技能名称 不能为空'` (来源 `src/main/ipc/skill.ipc.ts:25`)
- **第 103 行**:当前(损坏)`'提示?不能为空'` → 正确 `'提示词 不能为空'`
  - 来源:`requireNonEmptyString(input?.prompt, '提示词')` (`src/main/ipc/skill.ipc.ts:26`)

#### 4. `tests/main/ipc/learning-handlers.test.ts` (1 处,语法有效但内容错误)
- **第 133 行**:当前(损坏)`'搜索关键?不能为空'` → 正确 `'搜索关键词 不能为空'`
  - 来源:`requireNonEmptyString(query, '搜索关键词')` (`src/main/ipc/learning.ipc.ts:38`),错误格式 `${label} 不能为空` (`src/main/ipc/index.ts:93`)

### 错误格式验证
从 `src/main/ipc/index.ts:92-94` 确认 `requireNonEmptyString` 的错误格式为:
```typescript
throw new Error(`${label} 不能为空`)  // 注意:label 与 "不能为空" 之间有空格
```
已通过 `character-handlers.test.ts:67` (`'角色名称 不能为空'`) 和 `checkpoint-handlers.test.ts:66` (`'检查点标签 不能为空'`) 等未损坏文件交叉验证此格式。

## Proposed Changes

### 步骤 1:修复 `tests/main/ipc/chat-handlers.test.ts` 第 106 行
使用 Edit 工具将损坏的字符串替换为正确字符串。
- old_string: `'每条消息必须包含 role ?content 字符?`  (注意:实际文件中 `?` 是 UTF-8 替换字符,需要用 Read 工具确认确切字节)
- new_string: `'每条消息必须包含 role 和 content 字符串'`
- 由于文件含无效 UTF-8 字节,可能需要先用 Read 工具读取确切内容,再使用 Edit 工具的完整行替换

### 步骤 2:修复 `tests/main/ipc/storage-handlers.test.ts` 第 72、113、137 行
3 处替换:
1. `'不允许通过通用存储设置 LLM 配置?` → `'不允许通过通用存储设置 LLM 配置键'`
2. `'不允许通过通用存储读取 LLM 配置?` → `'不允许通过通用存储读取 LLM 配置键'`
3. `'不允许通过通用存储删除 LLM 配置?` → `'不允许通过通用存储删除 LLM 配置键'`

### 步骤 3:修复 `tests/main/ipc/skill-handlers.test.ts` 第 83、98、103 行
3 处替换:
1. `'技能名?不能为空'` → `'技能名称 不能为空'`
2. `'技能名?不能为空'` → `'技能名称 不能为空'` (第 83、98 行内容相同,需用 replace_all 或带上下文区分)
3. `'提示?不能为空'` → `'提示词 不能为空'`

### 步骤 4:修复 `tests/main/ipc/learning-handlers.test.ts` 第 133 行
1 处替换:
- `'搜索关键?不能为空'` → `'搜索关键词 不能为空'`

### 步骤 5:运行 typecheck 验证
```bash
npm run typecheck
```
预期:0 错误(当前有 8 个错误,全在 chat-handlers.test.ts 和 storage-handlers.test.ts)

### 步骤 6:运行 vitest 验证
```bash
npx vitest run
```
预期:全部测试通过(此前 578 个测试在编码损坏前已全部通过)

### 步骤 7:运行 ESLint 验证
```bash
npx eslint tests/ --rule '@typescript-eslint/no-non-null-assertion: warn'
```
预期:`no-non-null-assertion` 警告为 0(从原来的 144 降至 0)

## 实现注意事项

1. **使用 Edit 工具而非 PowerShell**:Edit 工具以 UTF-8 编码写入文件,PowerShell 的 `Set-Content` 默认编码非 UTF-8(这正是导致当前问题的根因)

2. **处理无效 UTF-8 字节**:由于 4 个文件含无效 UTF-8 字节,Edit 工具的 `old_string` 可能无法精确匹配。策略:
   - 先用 Read 工具读取文件(Read 能处理替换字符)
   - 使用包含损坏字符的完整行作为 `old_string`
   - 如果 Edit 失败,则使用 Write 工具重写整个文件(用 Read 获取内容后,手动修正损坏字符串,再 Write)

3. **replace_all 的使用**:`skill-handlers.test.ts` 中第 83 行和第 98 行的损坏字符串相同(`'技能名?不能为空'`),需使用 `replace_all: true` 一次替换两处

4. **不修改测试逻辑**:只修复损坏的中文字符串,不改变任何测试断言语义

## Assumptions & Decisions

1. **假设**:所有 `!` 非空断言已移除完毕(基于 Grep `!\.` 和 `!\[` 在 tests 目录均无匹配)
2. **假设**:5 个未列出的 IPC 测试文件(character、checkpoint、db-export、extended、llm-config)编码正常(基于 Read 工具读取内容显示中文字符正确)
3. **决策**:优先使用 Edit 工具修复(UTF-8 安全),仅在 Edit 因无效字节失败时才使用 Write 重写整个文件
4. **决策**:不重新执行 `mockHandlers.get(...)!` → `getRegisteredHandler(...)` 替换,因为该替换已完成(通过 Read 验证 9 个文件均使用 `getRegisteredHandler`)

## Verification

| 验证项 | 命令 | 预期结果 |
|---|---|---|
| TypeScript 类型检查 | `npm run typecheck` | 0 错误 |
| 单元测试 | `npx vitest run` | 全部通过 |
| ESLint 警告 | `npx eslint tests/` | `no-non-null-assertion` 警告为 0 |
