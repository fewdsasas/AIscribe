# Changelog

All notable changes to AIscribe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-07-02

### Security — 安全加固

- **API Key 脱敏增强**: 扩展 `sanitizeError()` 错误消息脱敏覆盖，新增 Anthropic key (`sk-ant-*`)、Bearer token 增强匹配、Authorization header、API key header 及长 hex/base64 token 串的识别与脱敏处理，防止 LLM API 密钥通过错误消息泄露到渲染进程。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **IPC 通道错误日志**: `guardedIpcMain.handle` 捕获所有 IPC handler 抛出异常时，自动注入 channel 名称到日志，便于快速定位故障源。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))

### Fixed — 架构修复

- **代码去重 — AI 修复逻辑**: 新增 `src/main/ipc/repair-utils.ts`，提取 `buildParsedNovelFromDB()` 与 `executeRepairWithWriteBack()` 公共函数。消除 `novel.ipc.ts` 与 `repair.ipc.ts` 约 80 行重复的 AI 结构修复与 DB 写回逻辑。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **流式并发控制**: `chatStream()` 新增 `MAX_STREAM_CONCURRENCY=3` 并发限制，超限请求直接返回 `onError` 提示，防止 LLM API 限流 (429) 与多流并行导致的内存溢出。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **异步修复生命周期保护**: `novel:import` 的 `setTimeout` 异步后台修复添加 `sender.isDestroyed()` 守卫，所有 `sender.send()` 调用包裹 `safeSend()` try/catch 防止 TOCTOU 竞态，避免应用关闭时操作已销毁的 sender 或已关闭的数据库。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **before-quit 超时保护**: `app.on('before-quit')` 服务关闭添加 5 秒超时保护，避免因数据库关闭挂起导致应用无限期无法退出。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))

### Added — 新增文件

- `src/main/ipc/repair-utils.ts` — AI 修复公共工具模块
- `src/main/ipc/error-utils.ts` — IPC 错误工具模块
- `src/main/ipc/repair.ipc.ts` — AI 修复 IPC 处理器

### Changed — 优化改进

- **Skill token 优化**: `SkillLoader.executeSkill()` 新增 `stripFrontmatter()` 方法，在构造 LLM system prompt 前剥离 YAML frontmatter 元数据，每次调用节省约 20-50 token。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **inferCategory 精度修复**: 将 `name.includes('ai')` 替换为 `/\bai\b/i` 词边界匹配，避免 "main"、"detail" 等含 "ai" 子串的技能名被误分类。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **monitor 定时器清理**: `monitor.ipc.ts` 中的 `setInterval` 定时器在 `app.on('before-quit')` 中清理，防止长时间运行时的资源泄漏。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))

### Test Suite — 测试

- **压力测试适配**: `stress-llm.test.ts` 的 scenario 2/3 从 10 并发调整为 3 并发，匹配新增的 `MAX_STREAM_CONCURRENCY` 限制。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))
- **IPC 验证测试更新**: `validation.test.ts` 日志格式断言适配新的 payload 警告消息格式。([`9222cf2`](https://github.com/user/aiscribe/commit/9222cf2))

### Technical Debt Index

| 严重度 | 修复项 | 状态 |
|--------|--------|------|
| 🔴 严重 | TD-004 API Key 脱敏 | ✅ |
| 🔴 严重 | TD-005 novel/repair 代码重复 | ✅ |
| 🔴 严重 | TD-006 chatStream 并发控制 | ✅ |
| 🔴 严重 | TD-007 novel:import 生命周期保护 | ✅ |
| 🟡 中等 | TD-008 Skill YAML 剥离 | ✅ |
| 🟡 中等 | TD-009 wrap() channel 日志 | ✅ |
| 🟡 中等 | TD-010 sender 销毁竞态 | ✅ |
| 🟡 中等 | TD-011 sanitizeError 正则覆盖 | ✅ |
| 🟡 中等 | TD-014 before-quit 超时 | ✅ |
| 🔵 低 | TD-025 monitor setInterval 清理 | ✅ |
| 🔵 低 | TD-026 inferCategory 匹配精度 | ✅ |

**验证通过**: typecheck ✅ | lint ✅ | format ✅ | unit (125 files / 1117 tests) ✅ | integration ✅ | stress ✅
