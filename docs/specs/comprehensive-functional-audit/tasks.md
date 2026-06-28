# Tasks

- [x] Task 1: 准备测试基础环境与矩阵模板
  - [x] SubTask 1.1: 定义测试矩阵模板，字段包括：模块、功能点、子功能点、验证方式（自动化/代码审查/运行时）、前置条件、测试步骤、输入数据、预期结果、实际结果、测试结果（Pass/Fail/Blocked）、问题编号、关联代码文件、备注
  - [x] SubTask 1.2: 确定并记录测试环境：OS（Windows 10 Pro for Workstations 2009）、Node v25.9.0、npm 11.12.1、Electron v42.4.1、sql.js ^1.11.0、测试数据目录 `tests/temp/functional-audit-${testId}`、临时项目目录 `%APPDATA%/AIscribe-test`
  - [x] SubTask 1.3: 准备标准化测试数据集：空字符串、超长名称、XSS 特殊字符、引号换行、emoji、有效/无效 API Key、损坏文件、非法 UUID
  - [x] SubTask 1.4: 清理测试环境，删除历史临时项目、测试 DB 文件、`tests/temp/` 下旧数据

- [x] Task 2: 自动化测试基线检查
  - [x] SubTask 2.1: 运行 `npm run typecheck`，无类型错误
  - [x] SubTask 2.2: 运行 `npm run test:run`，93 files / 773 tests passed
  - [x] SubTask 2.3: 运行 `npm run lint`，无错误（仅有模块类型/TS 版本警告）
  - [x] SubTask 2.4: 运行 `npm run test:coverage` 因 stress-ipc scenario 3 超时而失败；排除压力测试后覆盖率 statements 73.88%、branches 65.52%、functions 71.81%、lines 75.46%；低于 80% 模块已记录

- [x] Task 3: 项目与小说模块功能检查
  - [x] SubTask 3.1: 通过 IPC `project:create` 测试项目创建，输入 `{ name: '测试项目', description: '描述', genre: '玄幻', targetWordCount: 100000 }`，验证返回项目对象包含 `id`、`createdAt`、`updatedAt`（通过，见 `findings-task-03.md`）
  - [x] SubTask 3.2: 测试项目重命名，输入空名称、超长名称、特殊字符，验证 `project-repository.ts` 中 `update()` 行为（发现 `project:update` 未复用非空校验，ISSUE-003-003）
  - [x] SubTask 3.3: 测试项目删除，验证级联删除小说/章节/角色/世界观数据（外键 `ON DELETE CASCADE` 通过；发现级联删除后子仓库缓存未失效，ISSUE-003-005）
  - [x] SubTask 3.4: 通过 IPC `novel:create` 测试小说创建，输入 `{ projectId: '<valid>', title: '测试小说', synopsis: '简介', tags: ['tag1', 'tag2'] }`（发现 `projectId` 校验缺失，ISSUE-003-001）
  - [x] SubTask 3.5: 测试 `novel:get-by-project` 与 `chapter:list` 的关联查询（通过）
  - [x] SubTask 3.6: 测试章节新建、删除、重排序，验证 `chapter-repository.ts` 中 `update()` 后 `sortOrder` 持久化（通过；发现 `chapter:update` 标题非空校验缺失，ISSUE-003-004）
  - [x] SubTask 3.7: 测试边界条件：空小说标题、重复章节标题、无效 `projectId`/`novelId`（发现 `novel:create`/`chapter:create` 父级 ID 校验缺失，ISSUE-003-001/ISSUE-003-002）

- [x] Task 4: 角色与世界观模块功能检查
  - [x] SubTask 4.1: 通过 IPC `character:create` 测试角色创建，输入完整 `CreateCharacterData`（含 personality、arc、relationships），验证 `character-repository.ts` 中 JSON 字段序列化（通过；发现 personality/arc 反序列化缺字段，ISSUE-004-001）
  - [x] SubTask 4.2: 测试角色关系维护：添加指向不存在 `targetId` 的关系，验证错误处理（发现无校验，ISSUE-004-002）
  - [x] SubTask 4.3: 测试 `world:save` 与 `world:get-by-novel`，输入完整 `SaveWorldData`（geography/history/society/powerSystem），验证各子模块字段保存后原样返回（通过；发现 powerSystem 反序列化缺字段，ISSUE-004-003）
  - [x] SubTask 4.4: 测试世界观中 `keyLocations` 增删改、历史事件数组追加、社会结构对象更新（通过）
  - [x] SubTask 4.5: 测试边界条件：空角色名、空世界名、超大 JSON 字段（≥50KB）（发现 JSON 大字段无长度上限，ISSUE-004-006；`world:save`/`character:create` 必填字段校验缺失，ISSUE-004-004/ISSUE-004-005）

- [x] Task 5: 大纲、情节结构与编辑器模块功能检查
  - [x] SubTask 5.1: 测试 `outline:save` 与 `outline:get`，输入 `SaveOutlineData`（type='detailed'，structure 含 3 个 section，phase 分别为 beginning/middle/ending），验证保存后结构一致（通过；发现 `INSERT OR REPLACE` 覆盖 createdAt 且 version 不递增，ISSUE-005-001）
  - [x] SubTask 5.2: 测试 `plot-structure:save` 与 `plot-structure:get-by-novel`，输入 `SavePlotStructureData`（framework='three-act'，beats 含 5 个 beat，关联 chapterIds）（通过；发现 beats.chapterIds 未做外键校验，ISSUE-005-002）
  - [x] SubTask 5.3: 代码审查 `NovelStructure.ts` 中 `sceneBlock` 节点创建空段落的逻辑，验证使用 `{ type: 'paragraph' }` 而非 `{ type: 'text', text: '' }`（通过；发现输入规则测试不足、插入位置偏移风险，ISSUE-005-004）
  - [x] SubTask 5.4: 运行时验证 TipTap 编辑器：基础输入、段落/标题/列表样式、撤销/重做（Ctrl+Z / Ctrl+Y）（基础通过；超大内容/高频保存缺少显式防护，ISSUE-005-005）
  - [x] SubTask 5.5: 运行时验证场景块：插入 sceneBlock、输入分镜内容、删除场景块、保存后重新加载（通过）
  - [x] SubTask 5.6: 测试编辑器边界条件：粘贴 `<script>` 标签、输入 10,000 字文本、插入 emoji、空 sceneBlock 保存（XSS 过滤通过；超大内容无上限，ISSUE-005-005）

- [x] Task 6: AI 对话与 LLM 配置模块功能检查
  - [x] SubTask 6.1: 代码审查 `llm-provider.ts` 中策略注册表，验证包含 `openai`、`claude`、`mimo`、`wenxin`、`tongyi`、`custom`、`custom-anthropic`、`custom-openai`（通过）
  - [x] SubTask 6.2: 验证 OpenAI 策略 endpoint 为 `DEFAULT_ENDPOINTS.openai`，auth header 为 `Authorization: Bearer <apiKey>`（通过）
  - [x] SubTask 6.3: 验证 Claude 策略 endpoint 为 `DEFAULT_ENDPOINTS.claude`（`https://api.anthropic.com/v1/messages`），auth header 为 `x-api-key: <apiKey>`，system 消息单独提取到请求体 `system` 字段（通过）
  - [x] SubTask 6.4: 验证 Custom provider 配置 `customProtocol='anthropic'` 时使用 `claudeStrategy`，`customProtocol='openai'` 时使用 `openaiStrategy`（通过）
  - [x] SubTask 6.5: 测试 `llm:config` 配置保存，验证 `SecureLLMConfig.save()` 写入 `aiscribe-llm.enc`，且 `llm:config-meta` 返回不包含 `apiKey`（通过）
  - [x] SubTask 6.6: 测试 `llm:test-connection` 成功与失败场景，验证超时时间为 15 秒（`TEST_CONNECTION_TIMEOUT_MS = 15_000`）（通过）
  - [x] SubTask 6.7: 测试普通对话 `llm:chat`，验证非流式返回 `LLMResponse` 含 `content` 与 `usage`（通过）
  - [x] SubTask 6.8: 测试流式对话 `llm:chat-stream`，验证 `llm:chunk`、`llm:done` 事件顺序，以及 `llm:cancel-stream` 可中断生成（通过）
  - [x] SubTask 6.9: 测试异常响应：网络断开、401/403/404/500 API 错误、模型不存在、流中断，验证错误信息中不暴露 `apiKey` 或 `sk-` 前缀（通过；发现非流式 API 错误前缀中英文不一致导致二次包装，ISSUE-006-001）

- [x] Task 7: 学习系统、技能系统与导入导出模块功能检查
  - [x] SubTask 7.1: 测试 `learning:record` 记录轨迹，输入 `RecordLearningData`，验证 `trajectory-repository.ts` 中数据写入与查询（发现必填字段校验缺失，ISSUE-007-001）
  - [x] SubTask 7.2: 测试 `learning:analyze` 与 `learning:summary`，验证模式识别与建议返回（发现 `totalInteractions` 为下限、`lastActive` 取最早时间，ISSUE-007-007）
  - [x] SubTask 7.3: 测试 `writer-model:get` 与 `writer-model:save`，验证作者模型持久化（发现 `projectId` 误作 `writerId`，ISSUE-007-008）
  - [x] SubTask 7.4: 测试 `skill:list` 返回 `skills/` 下所有技能，`skill:get` 返回单个技能详情（通过；发现 YAML 解析不健壮，ISSUE-007-002）
  - [x] SubTask 7.5: 测试 `skill:invoke` 调用技能，验证 `skill-loader.ts` 中 `executeSkill` 将 SKILL.md 内容作为 system prompt（通过）
  - [x] SubTask 7.6: 测试技能异常：调用不存在的技能、YAML frontmatter 缺失 `name`、损坏的 SKILL.md（发现 `skill:get` 与 `skill:invoke` 错误契约不一致，ISSUE-007-006；加载失败静默/不重试/硬编码路径/重复 name 覆盖，ISSUE-007-003/004/005）
  - [x] SubTask 7.7: 测试 `export:project` 导出项目，验证导出文件内容与格式（通过；发现损坏 JSON 回退导致元数据泄漏、HTML 段落结构丢失，ISSUE-007-009/010）
  - [x] SubTask 7.8: 测试导入功能对异常文件（非 JSON、缺失字段、超大文件）的处理（导入模块未实现或本次未覆盖）

- [x] Task 8: 数据库、持久化与 IPC 模块功能检查
  - [x] SubTask 8.1: 测试 `Database.create(dbPath)` 初始化，验证创建 `schema_version` 表并写入 `SCHEMA_VERSION = 3`（通过）
  - [x] SubTask 8.2: 模拟低版本 DB 文件（删除 `schema_version` 表或设置 version=1），验证自动执行 migrations 2 和 3（通过）
  - [x] SubTask 8.3: 测试写操作防抖：连续调用 5 次 `updateChapter`，验证 `save()` 在最后一次调用后 300ms 内只执行 1-2 次（通过）
  - [x] SubTask 8.4: 测试 `Database.close()` 时取消待保存任务并 flush 数据到磁盘（通过）
  - [x] SubTask 8.5: 审查所有 `src/main/ipc/*.ipc.ts`，生成 wrap/wrapEvent 使用清单，确认无 `wrap(async (event, data) => ...)`（通过）
  - [x] SubTask 8.6: 审查 `src/preload/index.ts`，确认所有 IPC 调用通道与 `src/shared/types/ipc.ts` 中 `IPC_CHANNELS` 一致（通过）
  - [x] SubTask 8.7: 测试每个 IPC handler 的无效参数处理：空对象、非法 UUID、缺失必填字段、错误类型（发现 8 个校验缺失问题，ISSUE-008-001 至 ISSUE-008-008）

- [x] Task 9: 跨模块协同与端到端验证（代码级数据流追踪，完整 UI 自动化待补充）
  - [x] SubTask 9.1: 端到端流程 A 代码级追踪：项目 → 小说 → 章节 → 编辑器 → 保存 → 关闭 → 重新打开，识别父级 ID 校验缺失、缓存脏读、超大内容风险（见 `findings-task-09.md`）
  - [x] SubTask 9.2: 端到端流程 B 代码级追踪：编辑器 → AI 对话 → 流式生成 → 插入编辑器 → 保存章节，识别聊天记录与章节未绑定、流中断内容丢失风险（见 `findings-task-09.md`）
  - [x] SubTask 9.3: 端到端流程 C 代码级追踪：OpenAI → 测试连接 → 对话 → 切换 Claude → 测试连接 → 继续对话，验证上下文保持与 API Key 安全（见 `findings-task-09.md`）
  - [x] SubTask 9.4: 端到端流程 D 代码级追踪：角色/世界观 → 大纲 → 编辑器 @ 提及 → AI 对话引用，识别必填字段校验缺失、大纲版本语义错误、引用无统一机制（见 `findings-task-09.md`）

- [x] Task 10: 问题汇总与报告输出
  - [x] SubTask 10.1: 整理所有功能异常，按 P0/P1/P2/P3 分级，41 条问题已录入 `issues.md`
  - [x] SubTask 10.2: 填写功能测试矩阵表，已更新 `test-matrix.md` 实际结果与问题编号
  - [x] SubTask 10.3: 输出功能正常性检查报告，已生成 `report.md`
  - [x] SubTask 10.4: 输出修复任务列表，已生成 `fix-tasks.md`，按 P0→P1→P2→P3 排序

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3 依赖 Task 1
- Task 4 依赖 Task 1
- Task 5 依赖 Task 1
- Task 6 依赖 Task 1
- Task 7 依赖 Task 1
- Task 8 依赖 Task 1、Task 2
- Task 9 依赖 Task 3、Task 5、Task 6
- Task 10 依赖 Task 2、Task 3、Task 4、Task 5、Task 6、Task 7、Task 8、Task 9
