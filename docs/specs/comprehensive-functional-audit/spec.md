# 全模块功能正常性检查 Spec

## Why

AIscribe 作为 Electron + React + sql.js WASM 的复杂桌面应用，各模块（项目/小说/章节、角色/世界观、大纲/编辑器、AI 对话、LLM 配置、学习系统、技能系统、导入导出、数据库、IPC）在持续迭代中存在功能回归、边界条件遗漏、跨模块状态不一致、安全信息泄露等风险。本次检查旨在以代码级可执行的深度，对每个模块的核心功能、边界条件、异常处理、用户交互流程及模块间协同进行系统化验证，输出可直接指导修复的测试矩阵、问题清单与迭代任务。

## What Changes

- 建立覆盖 13 大模块、含具体测试步骤与输入数据的功能测试矩阵
- 执行自动化测试回归（typecheck / test:run / lint / coverage）、代码级审查与运行时验证三层检查
- 对每个模块覆盖核心功能、边界条件、异常处理、用户交互流程四类场景
- 针对 LLM 配置、API Key 安全、IPC 规范、数据库迁移等关键风险点进行专项审查
- 验证跨模块协同的数据一致性与状态同步
- 按 P0-P3 分级输出结构化问题清单、修复任务列表与检查报告

## Impact

- Affected capabilities: 项目/小说/章节管理、角色管理、世界观构建、大纲与情节结构、TipTap 编辑器、AI 对话、LLM 配置与连接测试、写作学习系统、技能系统、导入导出、数据库持久化、IPC 通信
- Affected code: `src/main/`, `src/renderer/`, `src/preload/`, `src/shared/`, `skills/`, `tests/`
- Key files:
  - IPC handlers: `src/main/ipc/*.ipc.ts`
  - LLM engine: `src/main/engine/llm-provider.ts`, `llm-provider-factory.ts`, `url-validator.ts`
  - Database: `src/main/memory/database.ts`, `src/main/memory/repositories/*.ts`
  - Secure config: `src/main/secure-config.ts`, `src/main/secure-store.ts`
  - Skill system: `src/main/engine/skill-loader.ts`, `skills/*/SKILL.md`
  - Renderer services/stores: `src/renderer/services/*.ts`, `src/renderer/store/*.ts`
  - Preload bridge: `src/preload/index.ts`
- Affected deliverables: 功能测试矩阵表、问题清单、功能正常性检查报告、修复任务列表

## ADDED Requirements

### Requirement: 全模块功能测试覆盖

系统 SHALL 对以下 13 大模块逐一执行功能正常性检查，每个模块至少覆盖核心功能、边界条件、异常处理、用户交互流程四类场景：

| 模块 | 核心功能点 | 关键代码文件 |
|---|---|---|
| 项目管理 | 创建、打开、重命名、删除、最近项目列表、项目统计 | `src/main/ipc/project.ipc.ts`, `src/main/memory/repositories/project-repository.ts` |
| 小说/章节管理 | 小说创建/删除/元数据编辑、章节新建/删除/重排序、内容保存与重新加载 | `src/main/ipc/novel.ipc.ts`, `src/main/memory/repositories/novel-repository.ts`, `chapter-repository.ts` |
| 角色管理 | 角色创建/编辑/删除、traits/arcs/relationships 维护、属性校验 | `src/main/ipc/character.ipc.ts`, `src/main/memory/repositories/character-repository.ts` |
| 世界观管理 | 地理、历史、社会、力量体系等子模块的 CRUD 及关联 | `src/main/ipc/world.ipc.ts`, `src/main/memory/repositories/world-repository.ts` |
| 大纲/情节结构 | 大纲 sections/phases 增删改、PlotStructure 框架与 beats、与章节关联 | `src/main/ipc/novel.ipc.ts`, `src/main/memory/repositories/outline-repository.ts`, `plot-structure-repository.ts` |
| TipTap 编辑器 | 基础输入、场景块 sceneBlock、撤销/重做、格式工具、粘贴、大量内容 | `src/renderer/components/editor/NovelStructure.ts`, 编辑器相关组件 |
| AI 对话 | 普通对话、流式输出、上下文保持、停止生成、消息历史 | `src/main/ipc/chat.ipc.ts`, `src/main/engine/llm-provider.ts`, `src/renderer/store/chatSlice.ts` |
| LLM 配置 | OpenAI/Claude/MiMo/Wenxin/Tongyi/Custom 配置增删改、Custom 协议切换、连接测试 | `src/main/ipc/llm-config.ipc.ts`, `src/main/engine/llm-provider.ts`, `src/main/secure-config.ts` |
| 学习系统 | 轨迹记录、模式识别、作者模型、技能进化 | `src/main/ipc/learning.ipc.ts`, `src/main/learning/*.ts`, `src/renderer/store/learningSlice.ts` |
| 技能系统 | Markdown 技能加载、运行时调用、结果返回、错误处理 | `src/main/engine/skill-loader.ts`, `src/main/ipc/skill.ipc.ts`, `skills/*/SKILL.md` |
| 导入导出 | 项目/小说导出、格式兼容性、异常文件处理 | `src/main/ipc/export.ipc.ts`, `src/main/export/export-engine.ts`, `src/renderer/services/exportService.ts` |
| 数据库 | sql.js WASM 初始化、版本迁移、写操作防抖、WASM 文件持久化 | `src/main/memory/database.ts`, `src/main/memory/repositories/base-repository.ts` |
| IPC 通信 | 所有 handler 注册、参数传递、异常返回、wrap/wrapEvent 规范 | `src/main/ipc/*.ipc.ts`, `src/preload/index.ts` |

#### Scenario: 正常流程

- **WHEN** 用户执行任一功能的标准操作
- **THEN** 系统返回预期结果，无未捕获异常，UI 状态正确更新，数据持久化成功，相关模块状态一致

#### Scenario: 边界条件

- **WHEN** 用户输入空值、超长文本（≥10,000 字）、特殊字符（`<>"'&\n\t`、emoji、中英文混排）、最大数量限制、重复名称、极小/极大数值、非法 UUID、缺失必填字段等边界数据
- **THEN** 系统给出合理提示或按设计约束处理，不崩溃、不丢失数据、不破坏关联数据

#### Scenario: 异常情况

- **WHEN** 出现网络异常、LLM API 返回非 200/超时/流中断、文件读写失败、数据库损坏/锁定、无效 UUID、缺失必填字段、技能文件缺失/YAML 错误等异常
- **THEN** 系统捕获异常并返回友好错误信息，错误信息中不泄露敏感信息（如 API Key、sk- 前缀），不破坏现有数据，不影响其他模块运行

#### Scenario: 模块协同

- **WHEN** 用户在跨模块流程中操作（如创建项目 → 创建小说 → 创建章节 → 编辑器输入 → AI 生成 → 保存 → 重新打开）
- **THEN** 各模块数据一致、状态同步、流程可顺利完成，无中间状态丢失

### Requirement: 测试方法与分层验证

系统 SHALL 采用以下三层方法执行检查，并在测试矩阵中标注每条的验证方式：

1. **自动化测试回归**：运行 `npm run typecheck`、`npm run test:run`、`npm run lint`、`npm run test:coverage`，识别失败用例、类型错误、规范问题与未覆盖模块
2. **代码级审查**：逐模块检查 handler 注册、数据流、状态管理、错误处理、IPC 规范、安全敏感点，具体包括：
   - 所有 `src/main/ipc/*.ipc.ts` 是否正确使用 `wrap()` 或 `wrapEvent()`
   - `llm-provider.ts` 中各 provider 策略的 endpoint、auth header、request body、response extraction 是否正确
   - `database.ts` 中 `SCHEMA_VERSION`、`MIGRATIONS`、`scheduleSave()` 防抖逻辑是否正确
   - `secure-config.ts` / `secure-store.ts` 中 API Key 是否加密存储、是否从错误信息中剥离
   - `skill-loader.ts` 中 SKILL.md 解析、异常处理、运行时调用是否正确
3. **运行时验证**：通过 Electron 应用或 Playwright 自动化，验证 UI 交互、数据持久化、跨模块流程

### Requirement: 问题严重度分级

所有发现的问题 SHALL 按以下标准分级：

| 级别 | 定义 | 示例 |
|---|---|---|
| P0（致命） | 导致应用崩溃、数据丢失、主流程完全阻塞、敏感信息泄露 | 保存章节后数据丢失、API Key 出现在错误日志 |
| P1（严重） | 核心功能不可用、跨模块数据不一致、频繁异常 | 无法创建项目、AI 对话无法停止、章节排序未持久化 |
| P2（一般） | 非核心功能异常、边界条件处理不完善、提示不清晰 | 超长名称截断无提示、错误信息未本地化 |
| P3（轻微） | UI 细节、性能波动、文案问题 | 按钮未对齐、加载动画缺失 |

### Requirement: 关键风险点专项测试

#### 风险点 1: API Key 安全

- 验证 `SecureLLMConfig.save()` 将 LLM 配置写入 `aiscribe-llm.enc` 加密文件
- 验证 `LLM_CONFIG_META` 返回的元数据中不包含 `apiKey` 字段，仅返回 `hasKey: true/false`
- 验证所有 LLM 错误信息（`chat`, `chatStream`, `testConnection`）中不暴露 `apiKey` 或 `sk-` 前缀
- 验证 `sanitizeError` 在 `chat.ipc.ts` 中对流式错误进行了脱敏

#### 风险点 2: IPC 规范

- 验证除 `llm:chat-stream` 外，所有 handler 均使用 `wrap()`，第一个参数为用户数据
- 验证 `llm:chat-stream` 使用 `wrapEvent()` 以获取 `event.sender`
- 验证无 `wrap(async (event, data) => ...)` 的错误用法
- 验证 `IPC_CHANNELS` 常量与 `src/main/ipc/*.ipc.ts`、`src/preload/index.ts` 中的通道名一致

#### 风险点 3: 数据库迁移与持久化

- 验证 `SCHEMA_VERSION = 3` 与 `MIGRATIONS` 中 2、3 号迁移正确执行
- 验证低版本 DB 文件打开时自动迁移到最新版本
- 验证写操作通过 `scheduleSave()` 防抖 300ms 后持久化到 `userData` 目录
- 验证 `close()` 时取消待保存任务并 flush

#### 风险点 4: LLM Provider 策略

- 验证 OpenAI/MiMo/Wenxin/Tongyi 使用 OpenAI-like endpoint + `Authorization: Bearer` 或对应 header
- 验证 Claude 使用 `https://api.anthropic.com/v1/messages` + `x-api-key` header，且请求体中 system 消息单独提取
- 验证 Custom provider 根据 `customProtocol` 动态选择 `openaiStrategy` 或 `claudeStrategy`
- 验证 `testConnection` 超时为 15 秒

#### 风险点 5: 技能系统健壮性

- 验证 `skills/` 下每个子目录的 `SKILL.md` 能被正确解析
- 验证缺失 frontmatter、缺失 `name` 字段、错误 YAML 不会导致加载崩溃
- 验证调用不存在技能时返回友好错误

### Requirement: 可交付物

检查完成后 SHALL 产出：

1. **功能测试矩阵表**（Markdown 大表格）：模块、功能点、子功能点、验证方式、前置条件、测试步骤、输入数据、预期结果、实际结果、测试结果（Pass/Fail/Blocked）、问题编号、备注
2. **问题清单**（Markdown）：问题编号、模块、功能点、严重度、复现步骤、实际结果、预期结果、截图/日志、修复建议、关联代码位置
3. **功能正常性检查报告**（Markdown）：测试范围、测试环境、测试方法、执行摘要、问题统计、详细结果、修复迭代建议
4. **修复任务列表**（Markdown）：按 P0/P1/P2/P3 排序的修复项，包含模块、问题描述、建议修改文件、验证方式

### Requirement: 退出标准

本次检查 SHALL 在以下条件下视为完成：

- 所有 13 大模块的核心功能点均已完成验证并记录于测试矩阵
- 边界条件与异常处理场景已覆盖每个模块的关键风险点
- 至少完成 4 条跨模块端到端流程验证
- 问题清单与检查报告已产出并评审通过
- 修复任务已按 P0/P1/P2/P3 分级并排序

## MODIFIED Requirements

无

## REMOVED Requirements

无
