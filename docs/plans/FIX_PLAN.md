# AIscribe 修复计划

> **基于技术审计报告生成**  
> **生成时间**：2026-06-25  
> **适用版本**：v0.1.0  
> **预计总工期**：4-6 周

---

## 一、待修复问题清单

### 1.1 严重问题（Critical）

| 编号 | 问题 | 影响 | 位置 | 优先级 |
|------|------|------|------|--------|
| C1 | `SecureConfig` 密钥派生不安全（SHA-256 无 salt） | 加密文件可被快速暴力破解，API 密钥泄露 | `secure-config.ts:19-20` | P0 |
| C2 | `sandbox: false` 扩大 Electron 攻击面 | 若 preload 存在漏洞，攻击者可获得 Node.js 能力 | `main/index.ts:22` | P0 |
| C3 | `Database` 类 1111 行，违反 SRP | 维护成本高，修改风险大，新人上手难度大 | `memory/database.ts` | P0 |

### 1.2 高风险（High）

| 编号 | 问题 | 影响 | 位置 | 优先级 |
|------|------|------|------|--------|
| H1 | IPC handler 无权限校验 | 任何渲染器代码可执行任意数据库操作 | `ipc/*.ipc.ts` | P1 |
| H2 | `wrap()` 使用 `any[]`，类型安全失效 | 运行时参数错误无法在编译期发现 | `ipc/index.ts:90` | P1 |
| H3 | 项目无 linter/formatter | 代码风格不统一，质量问题无法自动化保障 | 全局 | P1 |
| H4 | 整体测试覆盖率仅 28% | 回归风险极高，重构缺乏安全保障 | 全局 | P1 |

### 1.3 中风险（Medium）

| 编号 | 问题 | 影响 | 位置 | 优先级 |
|------|------|------|------|--------|
| M1 | `chatSlice.ts` 流式逐字更新触发全量重渲染 | 大文本场景下 UI 卡顿，影响用户体验 | `store/chatSlice.ts` | P2 |
| M2 | `batch` 操作与单条操作代码重复度 >80% | 维护困难，易产生不一致 bug | `memory/database.ts` | P2 |
| M3 | CSP `connect-src` 白名单过宽 | 恶意脚本可访问非预期 API 端点 | `main/index.ts:36-43` | P2 |
| M4 | `exportProject` 文件名 sanitize 不完整 | 潜在路径遍历风险 | `export/index.ts:178` | P2 |
| M5 | `llm-provider.ts` 策略模式复用层次不一致 | 冗余代码，维护成本高 | `engine/llm-provider.ts` | P2 |

### 1.4 低风险（Low）

| 编号 | 问题 | 影响 | 位置 | 优先级 |
|------|------|------|------|--------|
| L1 | `skill-loader.ts` `ensureLoaded()` 文件遍历设计隐患 | 多次调用触发不必要的文件系统遍历 | `engine/skill-loader.ts` | P3 |
| L2 | `wrap()` 与 `wrapEvent()` 职责边界模糊 | 维护者易误用，通过注释无法防止错误 | `ipc/index.ts:90-119` | P3 |
| L3 | `renderer` 大量组件测试覆盖率为 0 | UI 回归风险 | `renderer/components/*` | P3 |
| L4 | `ipcCall` 中 `showErrorToast` 逻辑未实现 | 参数声明但无实际 UI 反馈 | `renderer/utils/ipc.ts` | P3 |

---

## 二、修复计划

### 2.1 阶段总览

```
Phase 1: 安全加固 + 基础设施    (Week 1-2)
Phase 2: 架构重构 + 核心模块拆分  (Week 2-4)
Phase 3: 性能优化 + 测试补全      (Week 4-5)
Phase 4: 回归验证 + 文档更新      (Week 6)
```

---

### Phase 1: 安全加固 + 基础设施（Week 1-2）

#### 目标
- 消除严重安全隐患
- 建立代码质量保障基础设施
- 将主进程核心模块测试覆盖率提升至 >60%

#### Week 1 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 修复 `SecureConfig` 密钥派生（`pbkdf2Sync`） | C1 | 后端工程师 | 4h | 单元测试通过，旧配置兼容或迁移方案明确 |
| 评估并修复 `sandbox: false` | C2 | Electron 专家 | 4h | 评估 `sandbox: true` 可行性，若不可行记录技术债 |
| 配置 ESLint + Prettier | H3 | 全栈工程师 | 4h | `npm run lint` 通过，无报错；`npm run format` 格式化全量文件 |
| 配置 pre-commit hook（husky + lint-staged） | H3 | 全栈工程师 | 2h | 每次 commit 前自动执行 lint + format |
| 补全 `secure-config.ts` 测试 | H4 | 测试工程师 | 4h | 覆盖率从 5% 提升至 >80%，包含加密/解密/跨机迁移场景 |
| 补全 `main/index.ts` 测试 | H4 | 测试工程师 | 4h | 覆盖率从 0% 提升至 >60%，覆盖 `createWindow`、`app.whenReady` |

#### Week 2 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 为 IPC handler 引入权限中间件 | H1 | 后端工程师 | 8h | 所有 handler 可配置权限；只读/读写区分；测试覆盖 |
| 重构 `wrap()` 为泛型安全版本 | H2 | 全栈工程师 | 4h | 消除 `any[]`；编译期参数校验；现有 handler 零改动兼容 |
| 补全 IPC handler 测试（`project`, `novel`, `chapter`） | H4 | 测试工程师 | 8h | `handlers.test.ts` 覆盖率 >70%，覆盖错误边界 |
| 收紧 CSP `connect-src` 白名单 | M3 | 后端工程师 | 2h | 移除泛化域名，按具体 API endpoint 精确配置 |

#### Phase 1 验收标准
- [ ] `npm run lint` 零错误
- [ ] `npm run test:run` 全部通过
- [ ] 主进程核心模块语句覆盖率 >60%
- [ ] 安全扫描无 Critical/High 级别漏洞

---

### Phase 2: 架构重构 + 核心模块拆分（Week 2-4）

#### 目标
- 将 `Database` 类拆分为 Repository 模式
- 消除 `batch` 与单条操作的重复代码
- 优化 LLM Provider 策略模式

#### Week 2-3 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 设计 Repository 接口与目录结构 | C3 | 架构师 | 4h | 输出设计方案文档，评审通过 |
| 拆分 `ProjectRepository` | C3 | 后端工程师 | 6h | 功能等价，测试通过，单文件 < 200 行 |
| 拆分 `NovelRepository` | C3 | 后端工程师 | 4h | 功能等价，测试通过 |
| 拆分 `ChapterRepository` | C3 | 后端工程师 | 4h | 功能等价，测试通过 |
| 拆分 `CharacterRepository` | C3 | 后端工程师 | 4h | 功能等价，测试通过 |
| 提取公共 Row Mapper 工具 | C3 | 后端工程师 | 4h | 消除重复 mapper 代码，类型安全 |

#### Week 3-4 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 拆分剩余 Repository（World/Plot/Outline 等） | C3 | 后端工程师 | 8h | 所有 CRUD 从 `database.ts` 迁移完毕 |
| 重构 `database.ts` 为纯连接/迁移管理器 | C3 | 后端工程师 | 4h | `database.ts` < 300 行，只负责连接、事务、迁移 |
| 抽象 `BaseOpenAILikeStrategy`，消除策略重复 | M5 | 后端工程师 | 6h | 策略代码重复度 < 20% |
| 重构 `batch` 操作为通用批处理工具 | M2 | 后端工程师 | 6h | `createXxxBatch` 代码行数减少 >50%，通过公共 `batchInsert` 实现 |

#### Phase 2 验收标准
- [ ] `database.ts` 行数 < 300 行
- [ ] 每个 Repository 独立可测试
- [ ] `npm run typecheck` 零错误
- [ ] 全量测试通过（无回归）

---

### Phase 3: 性能优化 + 测试补全（Week 4-5）

#### 目标
- 优化流式消息渲染性能
- 测试覆盖率提升至 >60%
- 修复所有 Medium 级别问题

#### Week 4 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 流式消息局部状态管理重构 | M1 | 前端工程师 | 8h | 流式过程中不触发全局 store 更新；大文本（>10k 字）不卡顿 |
| `AIChatView.tsx` `useMemo` 优化可见消息 | M1 | 前端工程师 | 2h | `messages.slice()` 不每次 render 重新计算 |
| 修复 `exportProject` 文件名 sanitize | M4 | 后端工程师 | 2h | 覆盖路径遍历测试用例 |

#### Week 5 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 补全 `renderer/store` 测试 | L3 | 测试工程师 | 8h | `chatSlice` 覆盖率 >80%；`learningSlice` 覆盖率 >90% |
| 补全 `renderer/components` 关键组件测试 | L3 | 测试工程师 | 12h | `AIChatView`、`NovelEditor`、`CheckpointManager` 有基础测试 |
| 补全 `llm-provider.ts` 流式中断/超时测试 | H4 | 测试工程师 | 4h | 覆盖 AbortController、超时、网络错误场景 |
| 修复 `skill-loader.ts` 文件遍历设计 | L1 | 后端工程师 | 2h | 确保 `ensureLoaded()` 只在首次调用时遍历 |

#### Phase 3 验收标准
- [ ] 整体语句覆盖率 >60%
- [ ] 分支覆盖率 >50%
- [ ] 流式消息 1000 字以内无明显卡顿
- [ ] 所有 Medium 级别问题修复完毕

---

### Phase 4: 回归验证 + 文档更新（Week 6）

#### 目标
- 全量回归测试
- 更新技术文档
- 建立长期质量门禁

#### Week 6 任务

| 任务 | 编号 | 负责人 | 预计工时 | 验收标准 |
|------|------|--------|----------|----------|
| 全量回归测试 | 全部 | QA | 8h | 核心功能流（创建项目→写小说→导出）无阻塞性 bug |
| CI/CD 配置（GitHub Actions） | H3/H4 | DevOps | 8h | PR 自动执行 lint + typecheck + test + coverage 门禁 |
| 更新 `AGENTS.md` | 全部 | 文档工程师 | 4h | 包含新的架构约定、测试规范、安全指南 |
| 代码审查（全员） | 全部 | 技术负责人 | 4h | 评审所有重构代码，确保符合团队规范 |

#### Phase 4 验收标准
- [ ] `main` 分支 CI 全部绿色
- [ ] 覆盖率门禁：语句覆盖率 >60%，分支覆盖率 >50%
- [ ] `AGENTS.md` 更新完成
- [ ] 无已知 P0/P1 级别未修复 bug

---

## 三、任务甘特图

```
Week    1       2       3       4       5       6
        |-------|-------|-------|-------|-------|
Phase 1 [=======]
  C1      [===]
  C2      [===]
  H3      [===]
  H4      [=======]
  
Phase 2         [=======|=======]
  C3                [=======]
  M2                    [===]
  M5                [===]
  
Phase 3                         [=======|=======]
  M1                                [===]
  H4                                    [=======]
  
Phase 4                                         [=======]
  CI/CD                                           [===]
  文档                                            [===]
```

---

## 四、关键依赖与风险

### 4.1 依赖关系

```
C1 (SecureConfig)  <-- 必须在 Phase 1 完成，后续测试依赖加密模块
  └─> H4 (测试补全)

C3 (Database 拆分) <-- 必须在 M2 (batch 重构) 之前完成
  └─> M2

H3 (ESLint/Prettier) <-- 必须在 Phase 2 之前完成，否则重构代码风格不统一
  └─> 所有代码修改

C2 (sandbox 评估) <-- 可能阻塞 Phase 1 验收，若无法修复需记录技术债
```

### 4.2 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| `sandbox: true` 导致 preload 功能异常 | 中 | 高 | Week 1 内完成 PoC 验证，若不可行则记录为技术债，延期处理 |
| Database 拆分引入数据迁移 bug | 中 | 高 | 所有 Repository 方法必须有单元测试；集成测试覆盖完整 CRUD 流程 |
| ESLint 配置导致大量既有代码报错 | 高 | 中 | 使用 `eslint --fix` 自动修复；只启用 `error` 级别规则，warning 级别延后 |
| 测试补全工时预估不足 | 高 | 低 | 优先保证核心模块（database、ipc、llm-provider），UI 组件测试可延后 |
| 性能优化效果不明显 | 低 | 中 | 在优化前建立基准测试（benchmark），量化优化效果 |

---

## 五、资源分配建议

| 角色 | 人数 | 负责范围 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|------|----------|---------|---------|---------|---------|
| 架构师 | 1 | 方案设计、技术评审 | ★ | ★★ | ☆ | ★ |
| 后端工程师 | 2 | SecureConfig、IPC、Database 拆分 | ★★ | ★★ | ☆ | ☆ |
| 前端工程师 | 1 | 流式优化、组件测试 | ☆ | ☆ | ★★ | ☆ |
| 测试工程师 | 1 | 测试补全、回归测试 | ★ | ☆ | ★★ | ★ |
| DevOps | 0.5 | CI/CD 配置 | ☆ | ☆ | ☆ | ★ |

---

## 六、里程碑检查点

### ✅ Milestone 1: 安全基线（Week 1 结束）
- [ ] `SecureConfig` 使用 `pbkdf2Sync`
- [ ] `sandbox` 方案确定（修复或记录技术债）
- [ ] ESLint + Prettier 配置完成并应用到全量代码
- [ ] `secure-config.ts` 测试覆盖率 >80%

### ✅ Milestone 2: 架构稳定（Week 3 结束）
- [ ] `database.ts` 拆分为 Repository 模式
- [ ] `Database` 类行数 < 300
- [ ] 所有 Repository 有独立测试
- [ ] IPC 权限中间件上线

### ✅ Milestone 3: 质量达标（Week 5 结束）
- [ ] 整体语句覆盖率 >60%
- [ ] 分支覆盖率 >50%
- [ ] 流式消息性能优化完成
- [ ] 所有 Medium 级别问题修复

### ✅ Milestone 4: 项目交付（Week 6 结束）
- [ ] 全量回归测试通过
- [ ] CI/CD 门禁配置完成
- [ ] `AGENTS.md` 更新完成
- [ ] 无 P0/P1 未修复 bug

---

## 七、修复后预期收益

| 维度 | 修复前 | 修复后（预期） |
|------|--------|---------------|
| 安全评分 | 5.5 | 8.5（密钥加固 + IPC 权限 + CSP 收紧） |
| 测试覆盖率 | 28% | >60% |
| `Database` 类行数 | 1111 行 | < 300 行 |
| 代码质量 | 无 lint | ESLint + Prettier 强制约束 |
| 流式渲染性能 | 逐字全量更新 | 局部状态 + 批量同步 |
| 维护成本 | 高（新人上手慢） | 低（Repository 模式清晰） |

---

> **备注**：此计划可根据实际进展动态调整。建议每周五下午进行 30 分钟进度同步会，检查里程碑达成情况。
