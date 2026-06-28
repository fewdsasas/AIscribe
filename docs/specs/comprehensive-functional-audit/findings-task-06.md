# Task 06 — AI 对话与 LLM 配置模块功能检查

## 检查范围
- `src/main/ipc/chat.ipc.ts`
- `src/main/ipc/llm-config.ipc.ts`
- `src/main/engine/llm-provider.ts`
- `src/main/secure-config.ts`
- `src/renderer/store/chatSlice.ts`
- `src/renderer/services/llmService.ts`

## 测试执行结果
```bash
npx vitest run tests/main/engine/llm-provider.test.ts tests/main/ipc/chat-handlers.test.ts tests/main/ipc/llm-config-handlers.test.ts tests/renderer/store/chatSlice.test.ts tests/renderer/store/chatSlice-streaming.test.ts tests/renderer/services/llmService.test.ts
```

**结果：6 个测试文件全部通过，共 98 个用例通过。**

## 代码审查核对项

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 策略注册表包含 openai/claude/mimo/wenxin/tongyi/custom/custom-anthropic/custom-openai | 通过 | `llm-provider.ts` 的 `strategies` 注册表包含全部 8 个策略。 |
| Claude 策略使用 x-api-key 与 /messages endpoint，system 消息单独提取 | 通过 | `claudeStrategy.buildAuthHeader` 返回 `{'x-api-key': ...}`；endpoint 默认或自定义后追加 `/messages`；`buildRequestBody` 将 `role='system'` 提取为顶层 `system` 字段。 |
| Custom provider 根据 customProtocol 动态选择策略 | 通过 | `getStrategy` 在 `provider === 'custom' && config.customProtocol` 时命中 `custom-openai` 或 `custom-anthropic`。 |
| SecureLLMConfig 加密存储，llm:config-meta 不返回 apiKey | 通过 | `SecureLLMConfig` 使用 `SecureStore`（AES-256-GCM）；`llm:config-meta` 通过解构 `const { apiKey, ...meta }` 排除密钥，仅返回 `hasKey`。 |
| 错误信息不暴露 sk- 前缀或 apiKey | 通过 | IPC `wrap`/`wrapEvent` 统一经 `handleIPCError` 调用 `sanitizeError`；`chat.ipc.ts` 的 stream `onError` 再次调用 `sanitizeError`；正则覆盖 `sk-...` 与 `*key-_*...` 形式。 |
| testConnection 超时为 15 秒 | 通过 | `TEST_CONNECTION_TIMEOUT_MS = 15_000`，并传入 `executeChatRequest`。 |

## 发现的问题

### ISSUE-006-001：非流式 API 错误前缀与放行守卫不一致
**文件**：`src/main/engine/llm-provider.ts`  
**位置**：`executeChatRequest` 第 338、345 行  
**问题描述**：
- 当 HTTP 响应非 2xx 时，代码抛出 `new Error(\`API 错误 (${response.status}): ${errorMsg}\`)`（中文前缀）。
- 同一函数捕获异常后，第 345 行的放行守卫检查 `error.message.startsWith('API Error')`（英文前缀）。
- 由于前缀不匹配，所有由 LLMProvider 自身生成的 API 错误都会被二次包装为 `LLM 请求失败: API 错误 (...)`，导致：
  1. 与流式路径 `chatStream` 使用的英文 `API Error (...)` 不一致；
  2. 第 345 行的“放行 API 错误不再包装”意图在非流式场景下实际失效。

**建议修复**：统一错误前缀。例如将第 338 行改为英文 `API Error (${response.status}): ${errorMsg}`，或在第 345 行同时兼容 `API 错误` 前缀。

### ISSUE-006-002：IPC handler 文件使用 IPC_CHANNELS 常量，违反项目 IPC 约定
**文件**：`src/main/ipc/chat.ipc.ts`、`src/main/ipc/llm-config.ipc.ts`  
**位置**：文件顶部 import 与所有 `ipcMain.handle` 调用  
**问题描述**：
- 项目约定（`AGENTS.md` / `CLAUDE.md`）明确指出 **No `IPC_CHANNELS` constant — channels are defined inline in preload and handler files**。
- 但 `chat.ipc.ts` 与 `llm-config.ipc.ts` 均从 `../../shared/types/ipc` 导入 `IPC_CHANNELS`，并用于 `llm:chat`、`llm:chat-stream`、`llm:cancel-stream`、`llm:config`、`llm:is-configured`、`llm:config-meta`、`llm:test-connection` 等通道注册。
- 该问题在项目中普遍存在（15 个 handler 文件均使用 `IPC_CHANNELS`），但在本次模块审查范围内确实出现在这两个核心文件里。

**建议修复**：在 `chat.ipc.ts` 与 `llm-config.ipc.ts` 中内联定义通道字符串，移除对 `IPC_CHANNELS` 的依赖。若需全局整改，建议单独提一次重构任务统一处理所有 handler。

## 结论
- 本次审查的核心功能点（策略注册、Claude 协议、Custom 协议路由、安全配置、错误脱敏、testConnection 超时）均符合预期。
- 测试套件全部通过。
- 发现 2 个问题：1 个为 LLMProvider 内部错误前缀不一致（功能性/可维护性），1 个为 IPC 约定违反（架构/代码规范）。
