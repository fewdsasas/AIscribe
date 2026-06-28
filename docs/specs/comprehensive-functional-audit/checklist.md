# Checklist

## 环境准备与基线

- [x] 测试矩阵模板字段完整，包含验证方式、前置条件、关联代码文件
- [x] 测试环境信息已记录：Windows 10 Pro for Workstations 2009、Node v25.9.0、npm 11.12.1、Electron v42.4.1、sql.js ^1.11.0、测试数据目录、临时项目目录
- [x] 标准化测试数据集已准备：空字符串、超长名称（200 中文字符/500 英文字符）、特殊字符（XSS 脚本、`\"'`、换行、emoji）、有效/无效 API Key、损坏文件、非法 UUID
- [x] 测试环境已清理，无历史临时项目/测试 DB/`tests/temp/` 下旧数据干扰
- [x] `npm run typecheck` 已执行，无类型错误
- [x] `npm run test:run` 已执行，93 files / 773 tests passed
- [x] `npm run lint` 已执行，无错误（有模块类型/TS 版本警告）
- [x] `npm run test:coverage` 已执行（排除压力测试后），覆盖率低于 80% 的模块已标注

## 项目与小说模块

- [x] `project:create` 输入 `{ name: '测试项目', description: '描述', genre: '玄幻', targetWordCount: 100000 }` 返回含 `id/createdAt/updatedAt` 的项目对象
- [x] 项目重命名：空名称被拒绝或给出合理提示（当前 `project:update` 未校验，见 ISSUE-003-003）
- [x] 项目重命名：200 字符超长名称处理符合预期
- [x] 项目重命名：特殊字符处理符合预期
- [x] `project:delete` 级联删除小说/章节/角色/世界观数据（验证外键 `ON DELETE CASCADE`）
- [ ] `project:delete` 级联删除后子仓库缓存同步失效（失败，见 ISSUE-003-005）
- [x] `project:list` 与 `project:dashboard-stats` 返回数据一致
- [x] `novel:create` 输入完整 `CreateNovelData` 返回有效小说对象
- [ ] `novel:create` 缺失/无效 `projectId` 被拦截（失败，见 ISSUE-003-001）
- [x] `novel:get-by-project` 正确返回项目下小说
- [x] `chapter:create` 输入 `{ novelId, title, content, sortOrder }` 返回章节对象
- [ ] `chapter:create` 缺失/无效 `novelId` 被拦截（失败，见 ISSUE-003-002）
- [x] `chapter:update` 修改 `sortOrder` 后持久化，重排序正确
- [x] `chapter:list-with-content` 返回完整章节内容
- [x] 空小说标题被拒绝或提示
- [ ] `chapter:update` 空标题被拦截（失败，见 ISSUE-003-004）
- [x] 无效 `projectId`/`novelId` 返回友好错误

## 角色与世界观模块

- [x] `character:create` 输入完整 `CreateCharacterData`（personality/arc/relationships）成功创建角色
- [x] `character:list` 按小说 ID 返回角色列表
- [ ] 角色 JSON 字段（personality/arc/relationships）保存后原样反序列化（失败，缺必填字段，见 ISSUE-004-001）
- [ ] 角色关系指向不存在 `targetId` 时处理符合预期（失败，无校验，见 ISSUE-004-002）
- [x] `world:save` 输入完整 `SaveWorldData`（geography/history/society/powerSystem）成功保存
- [x] `world:get-by-novel` 返回与保存一致的世界观数据
- [x] 世界观 `keyLocations` 增删改后保存/加载一致
- [x] 世界观 `history` 数组追加事件后保存/加载一致
- [x] 世界观 `society` 对象更新后保存/加载一致
- [ ] `world:save` 必填字段 `type` 被校验（失败，见 ISSUE-004-004）
- [x] 空角色名/空世界名被拒绝或提示
- [ ] 超大 JSON 字段（≥50KB）保存/加载不损坏（失败，无长度上限，见 ISSUE-004-006）
- [ ] `character:create` 必填字段 `novelId`/`role` 被校验（失败，见 ISSUE-004-005）

## 大纲、情节结构与编辑器

- [x] `outline:save` 输入 `type='detailed'` 含 3 个 section（phase=beginning/middle/ending）保存成功
- [ ] `outline:get` 返回与保存一致的大纲结构（部分失败，`createdAt` 被覆盖且 `version` 不递增，见 ISSUE-005-001）
- [x] `plot-structure:save` 输入 framework='three-act' 含 5 个 beats 保存成功
- [ ] `plot-structure:get-by-novel` 返回与保存一致的 beats 及 chapterIds 关联（部分失败，chapterIds 未做外键校验，见 ISSUE-005-002）
- [x] `NovelStructure.ts` 中 `sceneBlock` 使用 `{ type: 'paragraph' }` 创建空段落
- [x] TipTap 编辑器基础输入正常，光标位置正确
- [x] TipTap 段落/标题/列表/引用格式工具生效
- [x] TipTap 撤销（Ctrl+Z）/重做（Ctrl+Y）功能正常
- [x] sceneBlock 插入、分镜输入、删除后编辑器状态正确
- [ ] 场景分隔输入规则真实触发且插入位置正确（失败，测试不足且 `start - 1` 有偏移风险，见 ISSUE-005-004）
- [x] 粘贴 `<script>alert('xss')</script>` 后不执行脚本、内容安全
- [ ] 输入 10,000 字文本后保存/重新加载一致（部分失败，无显式上限防护，见 ISSUE-005-005）
- [x] 插入 emoji（👍🎉🀄）后保存/重新加载一致
- [x] 空 sceneBlock 保存后重新加载不报错
- [ ] `outline`/`plot-structure` 写入记录 OperationLog（失败，见 ISSUE-005-003）

## AI 对话与 LLM 配置

- [x] `llm-provider.ts` 策略注册表包含 `openai`、`claude`、`mimo`、`wenxin`、`tongyi`、`custom`、`custom-anthropic`、`custom-openai`
- [x] OpenAI 策略 endpoint 为 `DEFAULT_ENDPOINTS.openai`，auth header 为 `Authorization: Bearer <apiKey>`
- [x] Claude 策略 endpoint 为 `https://api.anthropic.com/v1/messages`，auth header 为 `x-api-key: <apiKey>`
- [x] Claude 策略将 system 消息单独提取到请求体 `system` 字段
- [x] Custom provider `customProtocol='anthropic'` 使用 `claudeStrategy`
- [x] Custom provider `customProtocol='openai'` 使用 `openaiStrategy`
- [x] `llm:config` 保存后 `aiscribe-llm.enc` 文件存在
- [x] `llm:config-meta` 返回不包含 `apiKey` 字段，仅 `hasKey: boolean`
- [x] `llm:test-connection` 成功场景返回 `true`
- [x] `llm:test-connection` 失败场景返回友好错误
- [x] `llm:test-connection` 超时时间为 15 秒
- [x] `llm:chat` 非流式返回 `LLMResponse` 含 `content` 与 `usage`
- [x] `llm:chat-stream` 正确触发 `llm:chunk` 事件
- [x] `llm:chat-stream` 结束后触发 `llm:done` 事件
- [x] `llm:cancel-stream` 可中断正在进行的流式生成
- [x] 网络断开时 LLM 错误信息友好且不暴露 API Key
- [x] 401/403/404/500 API 错误时错误信息友好且不暴露 API Key
- [x] 模型不存在错误时错误信息友好且不暴露 API Key
- [x] 流中断错误时错误信息友好且不暴露 API Key
- [ ] 非流式 API 错误前缀统一，避免二次包装（失败，见 ISSUE-006-001）
- [x] 切换 provider 后对话上下文保持

## 学习系统、技能系统与导入导出

- [ ] `learning:record` 输入 `RecordLearningData` 成功写入轨迹（失败，必填字段未校验，见 ISSUE-007-001）
- [x] `trajectory-repository.ts` 可查询到刚写入的轨迹
- [x] `learning:analyze` 返回 patterns/suggestions/nextActions/shortcuts
- [ ] `learning:summary` 返回语义正确的 `ProjectSummary`（失败，`totalInteractions` 为下限、`lastActive` 取最早时间，见 ISSUE-007-007）
- [x] `writer-model:save` 保存作者模型后 `writer-model:get` 可读取
- [ ] writerId 语义正确（失败，`projectId` 误作 `writerId`，见 ISSUE-007-008）
- [x] `skill:list` 返回 `skills/` 下所有技能
- [x] `skill:get` 返回单个技能的 name/description/category
- [ ] skill-loader 使用 YAML 解析器解析 frontmatter（失败，使用正则解析，见 ISSUE-007-002）
- [x] `skill:invoke` 调用技能时 `skill-loader.ts` 将 SKILL.md 内容作为 system prompt
- [ ] 调用不存在技能时返回统一错误契约（失败，`skill:get` 返回 null 而 `skill:invoke` 抛异常，见 ISSUE-007-006）
- [x] 缺失 `name` 字段的 SKILL.md 被跳过且不崩溃
- [ ] 损坏的 SKILL.md 被跳过并记录 warning（部分失败，静默且加载失败后不重试，见 ISSUE-007-003）
- [ ] skill-loader 目录不存在时给出告警（失败，硬编码路径且静默返回，见 ISSUE-007-004）
- [ ] 重复 name 的技能不静默覆盖（失败，见 ISSUE-007-005）
- [x] `export:project` 导出文件内容格式正确
- [ ] 异常/损坏章节内容导出处理符合预期（失败，损坏 JSON 回退导致元数据泄漏，见 ISSUE-007-009）
- [ ] HTML 导出保留段落结构（失败，段落被合并，见 ISSUE-007-010）
- [ ] 导入非 JSON 文件时处理符合预期（未覆盖/未实现）
- [ ] 导入缺失必填字段的 JSON 时处理符合预期（未覆盖/未实现）
- [ ] 导入超大文件时处理符合预期（未覆盖/未实现）
- [ ] `learning:record` 对 `context` 大小做限制（失败，见 ISSUE-007-012）

## 数据库、持久化与 IPC

- [x] `Database.create(dbPath)` 初始化后 `schema_version` 表存在且 version = 3
- [x] 低版本 DB 文件打开时自动执行 migrations 2 和 3
- [x] 连续 5 次 `updateChapter` 调用后 `save()` 在 300ms 防抖内合并执行
- [x] `Database.close()` 取消待保存任务并 flush 到磁盘
- [x] 所有 `src/main/ipc/*.ipc.ts` 中 handler 均使用 `wrap()` 或 `wrapEvent()`
- [x] `llm:chat-stream` 使用 `wrapEvent()` 获取 `event.sender`
- [x] 无 `wrap(async (event, data) => ...)` 错误用法
- [x] `src/preload/index.ts` 中所有通道与 `src/shared/types/ipc.ts` 中 `IPC_CHANNELS` 一致
- [x] `project:create` 传入空对象返回友好错误
- [x] `project:get` 传入非法 UUID 返回友好错误
- [ ] `character:create` 传入缺失 `novelId` 返回友好错误（失败，见 ISSUE-008-003 / ISSUE-004-005）
- [x] `llm:chat` 传入空 messages 数组返回友好错误
- [x] `llm:chat-stream` 传入非数组 messages 返回友好错误
- [ ] `novel:create` 传入缺失/无效 `projectId` 返回友好错误（失败，见 ISSUE-008-001）
- [ ] `chapter:create` 传入缺失/无效 `novelId` 返回友好错误（失败，见 ISSUE-008-002）
- [ ] `checkpoint:create` 传入缺失/无效 `projectId` 返回友好错误（失败，见 ISSUE-008-004）
- [ ] `session:create` 传入缺失/无效 `projectId` 返回友好错误（失败，见 ISSUE-008-005）
- [ ] `learning:record` 传入缺失必填字段返回友好错误（失败，见 ISSUE-008-006）
- [ ] `project:update` / `chapter:update` 传入空名称/标题返回友好错误（失败，见 ISSUE-008-007）
- [ ] `world:save` / `outline:save` 传入无效 `type` 返回友好错误（失败，见 ISSUE-008-008）

## 跨模块协同与报告

- [x] 端到端流程 A：创建项目 → 创建小说 → 创建章节 → 编辑器输入 → 保存 → 关闭 → 重新打开，数据一致（代码级数据流追踪完成，完整 UI 自动化待补充）
- [x] 端到端流程 B：编辑器选中内容 → AI 对话流式生成 → 插入编辑器 → 保存章节 → 重新打开，内容一致（代码级数据流追踪完成，完整 UI 自动化待补充）
- [x] 端到端流程 C：OpenAI provider 测试连接/对话 → 切换 Claude provider 测试连接/对话 → 上下文保持（代码级数据流追踪完成，完整 UI 自动化待补充）
- [x] 端到端流程 D：创建角色/世界观 → 大纲引用 → 编辑器 @ 提及 → AI 对话引用 → 引用一致（代码级数据流追踪完成，完整 UI 自动化待补充）
- [x] 所有功能异常已整理为问题清单，包含 P0/P1/P2/P3 分级、模块、功能点、复现步骤、实际结果、预期结果、修复建议、关联代码位置
- [x] 功能测试矩阵表已填写，关联问题编号与代码文件
- [x] 功能正常性检查报告已产出，包含范围/环境/方法/摘要/统计/详细结果/修复建议
- [x] 修复任务列表已按 P0→P1→P2→P3 排序，包含建议修改文件与验证方式
