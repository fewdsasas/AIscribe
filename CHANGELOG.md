# Changelog

All notable changes to AIscribe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] — 2026-07-02

### Added — 新功能

- **小说导入管线**: 支持 TXT/DOCX/EPUB/PDF 多格式解析，自动章节拆分与 AI 结构修复。新增导入策略模式 (`TxtStrategy`, `DocxStrategy`, `EpubStrategy`, `PdfStrategy`)，通过 `StrategyRegistry` 动态路由。用户可选择纯净导入或 AI 辅助修复，修复进度实时推送到 UI。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **WriteQueue 批量写入队列**: 新增 `src/main/memory/write-queue.ts`，对数据库写操作进行 300ms/100 条合并批量 flush，大幅减少高频写入时的 I/O 压力。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **LRU 缓存层**: 新增 `src/main/memory/lru-cache.ts`，支持基于条目数 (`max`) 和总大小 (`maxSize`) 双重淘汰策略，提升热点数据访问性能。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **IPC 类型定义**: 新增 `src/shared/types/ipc.ts`，集中定义 IPC 通道的请求/响应类型，消除 preload 与 handler 之间的类型不一致风险。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **Open Source 合规**: 添加 MIT `LICENSE` 文件与 `.gitattributes` 行尾规范化。([`3cee0c0`](https://github.com/user/aiscribe/commit/3cee0c0), [`7f4daed`](https://github.com/user/aiscribe/commit/7f4daed))

### Changed — 基础设施升级

- **ESLint v8→v9 flat config**: 升级至 ESLint v9.39.4，迁移至 `eslint.config.mjs` flat config 格式。配套升级 `@typescript-eslint/*` v6→v8、`eslint-config-prettier` v9→v10、新增 `globals` v17 显式依赖。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **日志系统重写**: 引入分级日志 (`[INFO]`, `[WARN]`, `[ERROR]`, `[DEBUG]`)，生产环境自动持久化到 `{userData}/aiscribe.log`，每条日志含 ISO 时间戳。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **导入路径别名规范化**: 25 个 renderer 源码文件的 38 处 `../../` 相对路径导入替换为 `@renderer/*` / `@shared/*` 别名。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **ViewType 命名统一**: `'ai-chat'` 统一为 camelCase 风格 `'aiChat'`，跨 7 个源码 + 4 个测试文件。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **electron-vite 配置清理**: 移除 `manualChunks` 中指向已删除文件的死代码 `src/renderer/views/AIChatView`。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))

### Fixed — 修复

- **preload 修复监听器泄漏**: `ImportNovelDialog` 和 `ReaderView` 组件卸载时通过新的 `removeRepairListeners()` API 彻底清理 `import:repair-progress` / `import:repair-done` 监听器，防止多次修复操作累积监听器导致内存泄漏。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **export:project:chunk 权限误分类**: [`permission.ts`](file:///d:/ZhuoMian/Code/Code/ITEM/Claw/AIscribe/src/main/ipc/permission.ts) 中导出分块读取通道被误标为 `write`，修正为 `read`。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **LRU 类型安全性**: 将三处 `as V` 类型断言替换为显式的 `undefined` 检查，消除 `@typescript-eslint/no-non-null-assertion` 违规。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **guardedIpcMain 冗余 try-catch**: 移除 `guardedIpcMain.handle` 中的外层 try-catch，所有 handler 已通过 `wrap()` / `wrapEvent()` 统一异常处理。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **initLoggerAsync 误导性语义**: 移除伪装成可等待异步操作的 `initLoggerAsync`（内部使用 `setImmediate` 立即 resolve，未等文件写入完成）。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))
- **数据库关闭时日志 flush 保护**: `Database.close()` 中为 `operationLog.flush()` 添加 try-catch，确保日志落盘失败不阻塞数据库关闭。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))

### Documentation — 文档

- **README 版本修正**: React `19` → `18`，TypeScript `5.8` → `5.9`，匹配项目实际依赖。([`21565a9`](https://github.com/user/aiscribe/commit/21565a9))

### Test Suite — 测试

- 新增 38 个测试文件覆盖导入管线 (TXT/DOCX/EPUB/PDF 解析、策略注册、路径校验、AI 修复)、WriteQueue、LRU Cache、IPC 通道 (novel handlers, import) 以及相关 UI 组件。
- IPC 权限测试用例同步更新 (`permission.test.ts`)。

### Verification

```
typecheck ✅ | lint ✅ | format ✅ | unit (125 files / 1117 tests) ✅ | integration (7 files / 35 tests) ✅
```

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
