# AIscribe 全维度技术审计报告

> **审计范围**：AIscribe 代码库（Electron + React + SQLite/sql.js + TipTap）  
> **审计时间**：2026年6月25日  
> **审计维度**：架构设计、代码质量、安全性、性能与效率、测试覆盖率  
> **严重级别定义**：🔴 Critical（可能导致数据丢失/安全漏洞）、🟠 High（显著影响稳定性/可维护性）、🟡 Medium（局部影响）、🟢 Low（建议性优化）

---

## 一、架构设计评估

### 1.1 整体架构概览

| 维度 | 评估 | 说明 |
|------|------|------|
| 进程分离 | ✅ 良好 | Main / Preload / Renderer 三进程职责清晰，IPC 通信规范 |
| 模块化程度 | ⚠️ 一般 | IPC 按 domain 拆分合理，但 Database 类过于庞大 |
| 依赖注入 | ❌ 不足 | 大量全局单例（`LLMProvider.defaultInstance`、`getDb()`），测试耦合度高 |
| 路径别名 | ✅ 良好 | `@shared`/`@main`/`@renderer` 三域隔离，配置一致 |

### 1.2 关键架构问题

**🔴 [Critical] `Database` 类违反单一职责原则（SRP）**
- **位置**：`src/main/memory/database.ts`（1111 行）
- **问题**：一个类承载了 schema 定义、CRUD、迁移、持久化、Row Mapping、批量操作等 10+ 种职责，任何 schema 变更都会触发整个文件的重新编译和测试。
- **影响**：代码可维护性差，新成员上手成本高，修改风险大。

**🟠 [High] 全局状态与服务定位器（Service Locator）模式泛滥**
- **位置**：`src/main/ipc/index.ts` 中的 `getDb()`、`getSkillLoader()`、`getLearningEngine()`
- **问题**：全局单例通过闭包持有状态，导致：
  - 单元测试难以并行执行（共享状态污染）
  - 无法在不修改全局状态的情况下注入 Mock 依赖
  - `getLearningEngine()` 内部耦合了 `getDb()`，形成隐式依赖链

**🟡 [Medium] `wrap()` 与 `wrapEvent()` 的职责边界模糊**
- **位置**：`src/main/ipc/index.ts`
- **问题**：`wrap` 通过 `args.slice(1)` 跳过 Electron event 对象，这种隐式约定极易导致维护者误用。注释中虽有警告，但无法通过编译器约束。
- **改进**：改用泛型约束，使 `wrap` 明确区分 `event` 与业务参数。

---

## 二、代码质量评估

### 2.1 代码质量雷达

| 维度 | 评分 | 说明 |
|------|------|------|
| 命名规范 | ⭐⭐⭐⭐ | 中英文混合命名（业务术语保留中文），基本清晰 |
| 类型安全 | ⭐⭐⭐ | `strict: true`，但存在多处 `any[]` 和类型断言 |
| 重复代码 | ⭐⭐ | `batch` 操作与单条操作代码高度重复（如 `createProject` vs `createProjectsBatch`） |
| 注释覆盖 | ⭐⭐⭐ | JSDoc 覆盖核心 API，但复杂逻辑（如 LLM 流式解析）缺少行内注释 |
| 无工具链 | ⭐ | **无 linter、无 formatter**，代码风格全凭人工约束 |

### 2.2 关键代码质量问题

**🟠 [High] `src/main/memory/database.ts` 存在大量重复代码**
- `createProject` / `createProjectsBatch` 等 6 组方法，batch 版本与单条版本逻辑重复度 >80%
- `rowToProject`、`rowToNovel` 等 9 个 row mapper 方法，结构模式完全一致，应通过元编程或代码生成统一

**🟡 [Medium] `llm-provider.ts` 策略模式实现冗余**
- `openaiStrategy` 与 `mimoStrategy` 完全继承式复用，但 `wenxinStrategy` 和 `tongyiStrategy` 又独立实现，策略间的复用层次不一致
- 建议：抽象出 `BaseOpenAILikeStrategy` 基类，减少重复代码

**🟡 [Medium] `secure-config.ts` 的密钥派生过于简陋**
- ```typescript
  function deriveKeyFromMaterial(material: string): Buffer {
    return crypto.createHash('sha256').update(material).digest()
  }
  ```
- **问题**：直接使用 SHA-256 哈希派生密钥，缺少迭代和盐值，不符合 NIST SP 800-132 推荐做法
- **改进**：改用 `crypto.pbkdf2Sync(material, salt, 100000, 32, 'sha256')`

**🟢 [Low] `AGENTS.md` 明确声明 "No linter or formatter configured"**
- 项目缺少 ESLint / Prettier，代码质量无法自动化保障，建议立即配置

---

## 三、安全性评估

### 3.1 安全扫描结果

| 威胁类型 | 风险等级 | 状态 | 详情 |
|----------|----------|------|------|
| **SQL 注入** | 🟢 低风险 | ✅ 安全 | 全部使用参数化查询（`?` 占位符），无字符串拼接 SQL |
| **XSS（渲染器）** | 🟡 中风险 | ⚠️ 需关注 | `escapeHtml` 在导出模块使用正确，但 TipTap 编辑器输出未做二次 sanitize |
| **API 密钥泄露** | 🟠 高风险 | ❌ 存在隐患 | `SecureConfig` 加密密钥派生弱；错误日志中虽有 key 掩码，但正则 `\[a-zA-Z]*key[-_][a-zA-Z0-9]{8,}` 可能漏匹配 |
| **CSP 配置** | 🟡 中风险 | ⚠️ 需关注 | `style-src 'unsafe-inline'` 和 `connect-src` 白名单过宽（允许整个 `api.openai.com` 域名） |
| **文件路径遍历** | 🟡 中风险 | ⚠️ 需关注 | `exportProject` 中 `safeTitle` 替换字符集不完整，存在绕过可能 |
| **IPC 权限控制** | 🟠 高风险 | ❌ 缺失 | 所有 IPC handler 均无权限校验，任何渲染器代码均可调用 `db:tables` 暴露 schema 信息 |

### 3.2 关键安全问题详解

**🔴 [Critical] `SecureConfig` 密钥派生存在设计缺陷**

```typescript
// 当前实现（不安全）
function deriveKeyFromMaterial(material: string): Buffer {
  return crypto.createHash('sha256').update(material).digest()
}
```

- **攻击场景**：攻击者如果获取了加密文件，可以通过暴力枚举或彩虹表快速破解（因为 SHA-256 是快速哈希，且缺少 salt）
- **改进方案**：
  ```typescript
  function deriveKeyFromMaterial(material: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(material, salt, 100000, 32, 'sha256')
  }
  ```

**🟠 [High] IPC 通道缺少权限隔离**
- 当前所有 IPC handler 对渲染器完全开放，没有基于用户身份或会话的权限校验
- 建议：引入 IPC 白名单 / 权限中间件，区分只读和读写操作

**🟠 [High] `sandbox: false` 的安全权衡**
- `src/main/index.ts` 中 `sandbox: false` 配合 `contextIsolation: true` 和 `nodeIntegration: false`
- 虽然通过 preload 的 `contextBridge` 限制了直接访问，但 `sandbox: false` 仍然扩大了攻击面。如果 preload 脚本存在漏洞（如原型链污染），攻击者可获得 Node.js 能力

---

## 四、性能与效率评估

### 4.1 性能评估矩阵

| 模块 | 评估 | 说明 |
|------|------|------|
| 数据库写入 | ✅ 良好 | 300ms debounce 防抖，避免频繁 I/O；atomic rename 保证写入安全 |
| LLM 流式传输 | ✅ 良好 | AbortController + 超时控制（120s），流式解析 SSE 事件 |
| 渲染器状态更新 | ⚠️ 一般 | `chatSlice.ts` 中每次 `appendToMessage` 都触发 full array re-render |
| 批量操作 | ⚠️ 一般 | `createProjectsBatch` 等已使用事务，但缺少批量查询优化 |

### 4.2 关键性能问题

**🟡 [Medium] `chatSlice.ts` 存在不必要的 state 拷贝**

```typescript
// 当前实现
appendToMessage: (id, text) => {
  set((state) => {
    const messages = state.messages.map((m) =>
      m.id === id ? { ...m, content: m.content + text } : m
    )
    scheduleSave(messages)
    return { messages }
  })
}
```

- **问题**：流式响应时逐字 `appendToMessage`，每次都会创建一个新的 `messages` 数组，触发 React 全量重渲染
- **改进**：使用 Zustand 的 `subscribe` 或局部 `useState` 管理流式文本，流结束后再同步到全局 store

**🟡 [Medium] `AIChatView.tsx` 中 `messages.slice(-visibleMessageCount)` 导致 O(n) 裁剪开销**
- 虽然 `MAX_VISIBLE_MESSAGES = 100` 控制了上限，但 `slice` 操作在每次 render 时都会执行
- 建议：使用 `useMemo` 缓存可见消息列表

**🟢 [Low] `skill-loader.ts` 每次调用 `ensureLoaded()` 都会遍历文件系统**
- `getSkill()`、`getRegistry()` 等调用都会触发 `ensureLoaded()`，虽然 `this.loaded` 有短路，但设计上存在隐患

---

## 五、测试覆盖率评估

### 5.1 覆盖率总览

```
All files          | 28.55% Stmts | 24.43% Branch | 28.32% Funcs | 30.57% Lines
```

### 5.2 分模块覆盖率

| 模块 | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 | 关键问题 |
|------|-----------|-----------|-----------|---------|
| `main/index.ts` | **0%** | 0% | 0% | 主进程入口无测试 |
| `main/secure-config.ts` | **4.76%** | 0% | 77.77% | 加密模块几乎未测试 |
| `main/ipc/*.ipc.ts` | 0% - 60% | 0% - 100% | 0% - 66% | 多数 handler 未覆盖 |
| `main/memory/database.ts` | **56.46%** | 46.68% | 72.46% | CRUD 测试较全，但迁移/错误路径未覆盖 |
| `main/learning/*` | 64% - 100% | 45% - 85% | 63% - 100% | `engine.ts` 0% |
| `renderer/components/*` | **0% - 55%** | 0% - 84% | 0% - 100% | 大量 UI 组件 0% |
| `renderer/store/*` | 35% - 100% | 14% - 100% | 40% - 100% | `chatSlice.ts` 仅 35% |

### 5.3 测试质量评估

- **测试框架**：Vitest + jsdom，配置合理
- **Mock 策略**：`handlers.test.ts` 中手动 mock `electron` 模块，策略正确但覆盖率不足
- **缺失场景**：
  - 数据库并发写入场景
  - LLM 流式中断/超时场景
  - `SecureConfig` 跨机迁移场景
  - IPC 错误边界（如 `getDb()` 失败）

---

## 六、严重问题汇总（按优先级排序）

### 🔴 Critical（立即修复）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| C1 | `SecureConfig` 使用 SHA-256 直接派生密钥，无 salt/迭代 | 加密文件可被快速暴力破解 | `secure-config.ts:19-20` |
| C2 | `sandbox: false` 扩大 Electron 攻击面 | 若 preload 存在漏洞，攻击者可获 Node.js 能力 | `index.ts:22` |
| C3 | `Database` 类 1111 行，单一职责严重违反 | 维护成本高，修改风险大，影响整个数据层稳定性 | `database.ts` |

### 🟠 High（建议本周修复）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| H1 | IPC 通道无权限校验 | 任何渲染器代码可执行任意数据库操作 | `ipc/*.ipc.ts` |
| H2 | `wrap()` 函数使用 `any[]`，类型安全无法保证 | 运行时参数错误难以在编译期发现 | `ipc/index.ts:90` |
| H3 | 无 linter/formatter | 代码风格不统一，质量无法自动化保障 | 全局 |
| H4 | 整体测试覆盖率仅 28%，主进程入口 0% | 回归风险极高，重构缺乏安全保障 | 全局 |

### 🟡 Medium（建议本月修复）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| M1 | `chatSlice.ts` 流式更新触发全量重渲染 | 性能损耗，大文本场景卡顿 | `chatSlice.ts:115-123` |
| M2 | `batch` 操作与单条操作大量重复代码 | 维护困难，易产生不一致 bug | `database.ts` |
| M3 | CSP `connect-src` 白名单过宽 | 若渲染器被注入恶意脚本，可访问任意 API 端点 | `index.ts:36-43` |
| M4 | `exportProject` 文件名 sanitize 不完整 | 潜在路径遍历风险 | `export/index.ts:178` |

---

## 七、改进建议与重构思路

### 7.1 安全加固（最高优先级）

```typescript
// 1. SecureConfig 重构：使用 PBKDF2 + 随机 salt
function deriveKeyFromMaterial(material: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(material, salt, 100_000, 32, 'sha256')
}

// 保存时：salt || iv || authTag || ciphertext
// 加载时：读取 salt，重新派生密钥

// 2. IPC 权限中间件（示例）
type Permission = 'read' | 'write' | 'admin'
function requirePermission(perm: Permission) {
  return (handler: (...args: any[]) => Promise<any>) => {
    return async (...args: any[]) => {
      // 校验当前会话权限
      if (!hasPermission(getCurrentSession(), perm)) {
        throw new Error('Permission denied')
      }
      return handler(...args)
    }
  }
}
```

### 7.2 架构重构：数据层拆分

将 `Database` 类按实体拆分为 Repository 模式：

```
src/main/memory/
  ├── database.ts          # 连接管理、事务、迁移
  ├── repositories/
  │   ├── project.repo.ts
  │   ├── novel.repo.ts
  │   ├── chapter.repo.ts
  │   └── ...
  └── mappers/
      ├── project.mapper.ts
      └── ...
```

- **收益**：每个 Repository < 200 行，单一职责清晰；测试时可直接 mock 单个 Repository

### 7.3 性能优化：流式消息局部状态管理

```typescript
// AIChatView.tsx 重构思路
function useStreamingMessage() {
  const [streamingText, setStreamingText] = useState('')
  
  const append = useCallback((chunk: string) => {
    setStreamingText(prev => prev + chunk)
  }, [])
  
  const finalize = useCallback(() => {
    // 流结束后，一次性写入全局 store
    useChatStore.getState().addMessage({ role: 'assistant', content: streamingText })
    setStreamingText('')
  }, [streamingText])
  
  return { streamingText, append, finalize }
}
```

### 7.4 测试覆盖率提升路线图

| 阶段 | 目标 | 关键动作 |
|------|------|---------|
| **Phase 1**（1周） | 主进程核心模块 >60% | 补全 `secure-config.ts`、`index.ts` 测试；使用 `vitest-electron` 或 mock Electron API |
| **Phase 2**（2周） | IPC handler >70% | 为所有 handler 编写集成测试，覆盖错误边界 |
| **Phase 3**（1月） | 渲染器 >50% | 使用 `@testing-library/react` 测试关键组件（AIChatView、NovelEditor） |
| **Phase 4**（持续） | 全量 >80% | 引入覆盖率门禁（CI 阻断），配置 `@vitest/coverage-v8` threshold |

### 7.5 工具链补全

```bash
# 1. 安装 lint/format 工具
npm install -D eslint @typescript-eslint/parser @typescript-eslint/plugin prettier eslint-config-prettier

# 2. 配置 pre-commit hook（推荐 husky + lint-staged）
npm install -D husky lint-staged

# 3. CI 集成
# - GitHub Actions: 运行 `npm run typecheck && npm run test:run`
# - 覆盖率门禁: `npm run test:coverage` + threshold 检查
```

---

## 八、结论与行动建议

### 8.1 整体评分

| 维度 | 评分（满分 10） | 关键短板 |
|------|----------------|---------|
| 架构设计 | 6.5 | 数据层臃肿、全局状态管理 |
| 代码质量 | 6.0 | 无 lint/format、重复代码、any 类型 |
| 安全性 | 5.5 | 密钥派生弱、IPC 无权限、sandbox 关闭 |
| 性能效率 | 7.0 | 流式渲染可优化、批量查询待完善 |
| 测试覆盖 | 4.5 | 28% 覆盖率，大量核心模块 0% |
| **综合** | **6.0** | **安全加固 + 测试补全是当前最紧急任务** |

### 8.2 立即行动清单

1. **今日**：修复 `SecureConfig` 密钥派生，使用 `pbkdf2Sync`
2. **本周**：配置 ESLint + Prettier；为 `main/index.ts` 和 `secure-config.ts` 补全测试
3. **两周内**：启动 `Database` 类拆分（Repository 模式）；引入 IPC 权限中间件
4. **一月内**：测试覆盖率提升至 60% 以上；性能优化流式消息渲染

---

> **审计人**：OpenCode (CTO & 资深架构师)  
> **审计方法**：静态代码分析 + 测试执行 + 架构走查  
> **下次审计建议**：3 个月后复查安全修复和覆盖率提升进展
