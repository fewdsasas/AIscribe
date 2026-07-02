# AIscribe — AI 辅助小说创作平台

> 一款基于 Electron 的现代化 AI 辅助小说创作桌面应用，集成智能 LLM 对话、结构化编辑、世界构建与版本管理功能，为网文作者提供全方位的创作支持。

![版本](https://img.shields.io/badge/版本-0.1.0-blue)
![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![许可证](https://img.shields.io/badge/许可证-MIT-green)
![测试](https://img.shields.io/badge/测试-1105%20passed-brightgreen)

---

## 目录

- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [架构概览](#架构概览)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
- [配置说明](#配置说明)
- [开发指南](#开发指南)
- [测试](#测试)
- [常见问题](#常见问题)
- [路线图](#路线图)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [联系方式](#联系方式)

---

## 项目概述

AIscribe 是一款面向网络小说创作者的桌面写作工具，结合了专业的富文本编辑器与 AI 对话能力。它采用三进程 Electron 架构，在本地优先存储数据的同时，通过可配置的 LLM 接口为作者提供智能辅助。

**适用人群**：

- 网络小说作者（长篇连载创作）
- 写作爱好者（日常写作练习）
- 创意写作者（角色构建、世界观设定）

**核心设计理念**：

| 理念 | 说明 |
|------|------|
| **本地优先** | 所有数据存储在本地，隐私安全，离线可用，无需网络即可写作 |
| **AI 增强** | 写作建议、结构分析、角色发展等智能辅助，多种 LLM 可选 |
| **结构化创作** | 从项目到小说到章节的层次化管理，支持人物、世界观、情节结构 |
| **版本可控** | 支持快照和恢复，创作过程可回溯，不再担心误修改 |

---

## 核心功能

### 专业编辑器

基于 **TipTap**（ProseMirror）的富文本编辑器，专为长篇小说设计：

- **章节管理**：树形章节导航，支持拖拽排序，一键创建续章
- **大纲编辑**：与编辑器联动，可切换为纲目视图
- **阅读模式**：轻量渲染器（仅 9.6KB），无编辑器运行时开销，专注阅读体验
- **角色提及**：通过 `@角色名` 快速引用，悬停查看角色卡片
- **写作目标**：设定每日字数目标，实时追踪进度
- **自动保存**：300ms 防抖写入，数据不丢失

### AI 对话辅助

多 Provider 对话系统，流式响应实时展示：

- **多模型支持**：OpenAI、Claude（Anthropic）、MiMo、文心一言、通义千问、自定义协议
- **技能系统**：预置「润色段落」「角色分析」「情节建议」「世界观校验」等写作技能，可灵活扩展
- **上下文感知**：可携带当前章节上下文，让 AI 理解创作场景
- **流式输出**：实时显示 AI 回复，无需等待完整响应
- **取消控制**：可随时中断 AI 响应

### 世界构建

在「创作工坊」中管理小说的多维度设定：

- **角色管理**：性格特征、背景故事、关系网络、成长弧光（正向 / 负向 / 静态）
- **世界观设定**：地理环境、历史年表、社会结构、力量体系、科技水平、经济系统
- **情节结构**：支持多种叙事框架（三幕式、英雄之旅、Save the Cat 等），编排核心节拍
- **大纲管理**：简纲与详纲两种模式，支持四阶段（开端 / 发展 / 高潮 / 结局）

### 版本管理

- **快照系统**：在关键节点创建项目快照，保存当前所有数据状态
- **全量恢复**：支持将项目恢复到任意快照节点
- **创作轨迹**：记录写作过程的数据，提供写作模式分析

### 实用工具

- **多格式导入**：TXT（自动分章）、EPUB（解析目录）、DOCX（保留标题层级）、PDF（文本提取）
- **AI 结构修复**：导入后自动检测章节结构，智能拆分合并
- **导出**：支持 TXT / Markdown / HTML 格式导出，大文件自动分块
- **安全加密**：API 密钥通过 AES-256-GCM 加密存储

---

## 技术栈

| 类别 | 技术 | 用途 |
|------|------|------|
| 框架 | Electron 35 + electron-vite | 桌面应用框架与构建 |
| 前端 | React 18 + TypeScript 5.9 | 渲染进程 UI |
| 编辑器 | TipTap 2.x (ProseMirror) | 富文本编辑 |
| 状态管理 | Zustand 5 | 轻量状态管理 |
| 样式 | Tailwind CSS 3.4 | UI 样式 |
| 数据库 | sql.js (SQLite WASM) | 本地持久化存储 |
| 加密 | AES-256-GCM + PBKDF2-SHA256 | 安全配置存储 |
| AI 抽象层 | 多 Provider 策略模式 | LLM 集成 |
| 测试 | Vitest 4 + Testing Library | 单元与集成测试 |
| 打包 | electron-builder | 应用分发 |

---

## 架构概览

### 三进程架构

```
┌──────────────────────────────────────────────────────────┐
│                    Renderer Process                       │
│   React SPA (TipTap, Zustand, Tailwind)                   │
│   ┌──────────────────────────────────────────────────┐   │
│   │  Services Layer → window.aiscribe.* (IPC Bridge) │   │
│   └─────────────────┬────────────────────────────────┘   │
└─────────────────────┼────────────────────────────────────┘
                      │ contextBridge (preload)
┌─────────────────────┼────────────────────────────────────┐
│     Main Process    │                                     │
│  ┌──────────────────▼─────────────────────────────────┐  │
│  │  IPC Handlers (wrap / wrapEvent)                   │  │
│  │  ├── project / novel / chapter / character         │  │
│  │  ├── world / plotStructure / outline / checkpoint  │  │
│  │  ├── llm / skill / learning / export / import      │  │
│  │  └── storage / monitor / repair                    │  │
│  │                                                     │  │
│  │  DI Container → ServiceRegistry                     │  │
│  │  ├── IDatabase (sql.js WASM)                        │  │
│  │  ├── ILLMProvider (多 Provider 策略)                │  │
│  │  ├── SkillLoader (Markdown 技能)                   │  │
│  │  └── LearningEngine (轨迹分析)                      │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**进程职责**：

| 进程 | 入口 | 职责 |
|------|------|------|
| main | `src/main/` | 数据库、LLM 调用、文件 I/O、IPC 处理 |
| preload | `src/preload/` | IPC 桥接，暴露 `window.aiscribe` API |
| renderer | `src/renderer/` | React UI，编辑器和视图 |

### IPC 通信模型

所有跨进程通信通过 IPC 完成，采用统一的处理模式：

```typescript
// Main 进程 handler（src/main/ipc/project.ipc.ts）
ipcMain.handle(
  'project:create',
  wrap(async (data: CreateProjectData) => {
    requireObject(data, '项目数据')
    requireNonEmptyString(data.name, '项目名称')
    const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
    return d.createProject(data)
  })
)

// Renderer 端调用（通过 preload 桥接）
const project = await window.aiscribe.projectCreate({
  name: '我的新小说',
  description: '一部修仙题材的网文',
  genre: 'fantasy'
})
```

IPC 约定：

- **channel 命名**：`camelCaseDomain:action`（如 `project:create`、`plotStructure:get-by-novel`）
- **参数格式**：所有 handler 接收单一对象参数，禁止原始类型
- **错误处理**：统一使用 `wrap()` / `wrapEvent()` 包裹，自动转换异常为结构化 `IPCError`
- **参数校验**：使用 `requireId`、`requireObject`、`requireNonEmptyString` 等校验工具

---

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| 操作系统 | Windows 10+ | macOS 12+ / Ubuntu 20.04+ |

---

## 快速开始

### 1. 克隆与安装

```bash
git clone https://github.com/your-username/aiscribe.git
cd aiscribe
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后，Electron 窗口将自动打开，源码修改会实时热重载。

### 3. 配置 AI 服务（可选）

在应用「设置 → LLM 配置」中填写 Provider 信息。密钥通过 AES-256-GCM 加密存储，不会明文写入文件系统。

支持以下 Provider：

| Provider | 配置要点 | 示例模型 |
|----------|----------|----------|
| OpenAI | API Key、模型名 | `gpt-4o`、`gpt-4o-mini` |
| Claude | API Key、模型名 | `claude-sonnet-4`、`claude-haiku-3` |
| MiMo | API Key、Endpoint | 参考 Provider 文档 |
| 文心一言 | API Key、Secret Key | `ERNIE-4.0` |
| 通义千问 | API Key、模型名 | `qwen-max` |
| 自定义 | Base URL、API Key、协议选择 | 兼容 OpenAI 或 Anthropic 协议 |

### 4. 开始创作

1. **创建项目** — 填写项目名称、描述、体裁（如玄幻、修仙、都市等）
2. **创建小说** — 设定标题、作者、故事简介
3. **创建章节** — 开始写作，编辑器自动保存
4. **构建世界（可选）** — 管理角色、世界观、情节结构
5. **AI 辅助** — 打开 AI 面板，获取写作建议和灵感

### 快速体验

```bash
# 一键启动后，在应用内：
# 1. 点击「新建项目」→ 填写名称 → 创建
# 2. 点击「新建小说」→ 填写标题 → 创建
# 3. 点击「新建章节」→ 开始写作
```

---

## 使用指南

### 界面布局

```
┌──────────┬────────────────────────────────┬──────────┐
│  侧边栏   │         主编辑区                 │  AI 面板 │
│          │                                │          │
│  📁 项目  │  TipTap 富文本编辑器              │  聊天输入  │
│  📖 小说  │  工具栏（格式/目标/角色提及）       │  技能选择  │
│  📄 章节  │  自动保存（300ms）                │  流式输出  │
│  🔧 工坊  │                                │          │
└──────────┴────────────────────────────────┴──────────┘
```

### 项目管理

仪表盘显示所有项目概览，包括：小说数、章节数、最后编辑时间、目标字数等统计信息。

### 编辑器功能

编辑器提供完整工具栏：

- **文本格式**：加粗、斜体、标题（H1-H6）、有序/无序列表、引用、代码块
- **写作目标**：设置当前章节目标字数，进度条实时追踪
- **角色提及**：输入 `@` 触发角色选择，文中插入后可悬停查看信息
- **快捷键**：`Ctrl + B` 加粗，`Ctrl + I` 斜体，`Ctrl + Z` 撤销

### AI 对话面板

右侧 AI 面板提供：

- **技能选择**：下拉选择适用技能，默认「自由对话」
- **上下文携带**：可勾选「附带当前章节内容」让 AI 理解上下文
- **流式输出**：回复逐字显示，支持中途取消
- **对话历史**：保留当前会话记录

### 角色与世界观

在「创作工坊」中可以：

- **添加角色**：填写姓名、角色定位（主角/配角/反派等）、性格特征、外貌描述、背景故事
- **管理关系**：在角色间建立关系（师徒/恋人/敌人等），设定关系强度
- **构建世界**：描述地理环境、历史事件、社会制度、力量体系规则
- **编排情节**：选择叙事框架，添加核心节拍，关联章节

### 导入与修复

支持的文件格式：

| 格式 | 说明 | 限制 |
|------|------|------|
| TXT | 自动分章（按特定标题格式识别） | 需 UTF-8 编码 |
| EPUB | 解析目录结构与正文内容 | 标准 EPUB 2/3 |
| DOCX | 保留标题层级与段落样式 | 使用 mammoth 解析 |
| PDF | 文本提取 | 纯文本 PDF 最佳 |

导入后若检测到章节结构不理想（置信度低），后台自动进行 AI 结构修复：

- **拆分**：将过长章节按语义拆分
- **合并**：将过短章节合并
- **标准化**：统一章节标题格式
- **去杂质**：移除导入时混入的非正文内容

---

## 配置说明

### LLM Provider 安全配置

API 密钥采用 **AES-256-GCM** 加密存储，密钥由机器硬件特征通过 PBKDF2-SHA256（100000 次迭代）派生：

```
Machine ID + CPU Info
        ↓  PBKDF2-SHA256 (100k iterations)
  AES-256-GCM Key
        ↓
  encrypt(apiKey) → userData/aiscribe-config.enc
```

加密后的配置存储在 Electron 的 `userData` 目录，非明文写入文件系统。

### 数据库

- **引擎**：sql.js (SQLite WASM 编译)
- **位置**：`userData/aiscribe.db`
- **迁移**：版本化迁移系统（当前 SCHEMA_VERSION = 3）
- **索引**：v3 迁移已建立 `novel_id` / `project_id` 索引
- **性能**：高频写操作 300ms 防抖合并

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 创建新项目 |
| `Ctrl + S` | 保存当前章节 |
| `Ctrl + P` | 打开项目设置 |
| `Ctrl + I` | 切换 AI 对话面板 |
| `Ctrl + Enter` | 发送 AI 对话消息 |
| `Ctrl + B` | 加粗选中文本 |
| `Ctrl + K` | 插入超链接 |
| `Ctrl + Z` | 撤销 |

### 环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 环境模式，控制日志输出 | `development` |

---

## 开发指南

### 项目结构

```
aiscribe/
├── src/
│   ├── main/                       # 主进程（Node.js）
│   │   ├── ipc/                    # IPC 处理器（每个 domain 一个文件）
│   │   ├── engine/                 # LLM Provider 抽象层 + SkillLoader
│   │   ├── memory/                 # 数据库 + Repository 模式
│   │   │   └── repositories/       # 各实体 Repository 实现
│   │   ├── learning/               # 学习引擎（轨迹记录、模式检测）
│   │   ├── import/                 # 文件导入（TXT/EPUB/DOCX/PDF）+ AI 修复
│   │   ├── export/                 # 导出引擎
│   │   ├── di/                     # 依赖注入容器
│   │   └── utils/                  # 通用工具
│   ├── preload/                    # 预加载脚本（IPC 桥接，无业务逻辑）
│   ├── renderer/                   # 渲染进程（React SPA）
│   │   ├── components/             # UI 组件
│   │   │   ├── editor/             # 编辑器相关
│   │   │   ├── project/            # 项目管理
│   │   │   ├── ai-chat/            # AI 对话
│   │   │   ├── studio/             # 创作工坊
│   │   │   ├── checkpoint/         # 版本管理
│   │   │   ├── shared/             # 通用组件
│   │   │   └── settings/           # 设置页面
│   │   ├── hooks/                  # 自定义 React Hooks
│   │   ├── services/               # 前端服务层（封装 IPC 调用）
│   │   ├── store/                  # Zustand 状态管理
│   │   ├── views/                  # 页面视图
│   │   └── utils/                  # 工具函数
│   └── shared/                     # 跨进程共享
│       ├── types/                  # TypeScript 类型定义
│       └── utils/                  # 共享工具函数
├── tests/                          # 测试文件
│   ├── main/                       # 主进程测试
│   ├── renderer/                   # 渲染进程测试
│   ├── integration/                # 集成测试（含压力测试）
│   ├── e2e/                        # E2E 测试（Playwright）
│   └── shared/                     # 共享代码测试
├── skills/                         # Markdown 技能定义
├── docs/
│   └── standards/                  # 开发规范文档
└── .trae/                          # AI 辅助开发配置
```

### 关键目录说明

| 目录 | 说明 |
|------|------|
| `src/main/ipc/` | 每个 domain 一个 handler 文件，统一使用 `wrap()` / `wrapEvent()` |
| `src/main/memory/repositories/` | Repository 模式，`BaseRepository` 抽取通用 CRUD 操作 |
| `src/renderer/services/` | 每个 domain 一个 service，封装 `window.aiscribe.*` IPC 调用 |
| `src/shared/types/` | 所有跨进程共享的类型定义，IPC 参数类型 |
| `skills/` | 技能系统，每个技能一个 `.md` 文件，运行时加载 |

### 路径别名

| 别名 | 目标路径 | 可用进程 |
|------|----------|----------|
| `@shared/*` | `src/shared/*` | main / preload / renderer |
| `@main/*` | `src/main/*` | main + preload |
| `@renderer/*` | `src/renderer/*` | renderer |

### 开发命令

```bash
# ---- 开发服务器 ----
npm run dev               # 启动 electron-vite 开发服务器（热重载）

# ---- 构建 ----
npm run build             # electron-vite 生产构建
npm run package           # electron-builder 打包（产出在 dist/）

# ---- 代码检查 ----
npm run typecheck         # TypeScript 类型检查（tsc --noEmit）
npm run lint              # ESLint（零警告策略）
npm run lint:fix          # ESLint 自动修复
npm run format            # Prettier 格式化
npm run format:check      # Prettier 格式检查

# ---- 测试 ----
npm run test              # Vitest watch 模式（开发用）
npm run test:run          # 全量测试（1105+ 测试）
npm run test:unit         # 单元测试（排除压力/内存测试）
npm run test:coverage     # 覆盖率报告（main + shared）

# ---- CI 全量检查 ----
npm run ci                # typecheck + lint + format:check + test:unit

# ---- 单文件测试 ----
npx vitest run tests/main/ipc/project-handlers.test.ts
```

### 数据模型层级

```
Project ─→ Novel ─→ Chapter
  ├── Character（性格、关系、成长弧光）
  ├── World（地理、历史、社会、力量体系）
  ├── PlotStructure（叙事框架 + 节拍）
  ├── Outline（简纲 / 详纲）
  ├── Checkpoint（版本快照）
  └── SessionMemory（对话历史）
```
 
所有实体使用 UUID 字符串作为主键。

### 添加新 IPC Handler 的 Checklist

1. 在 `src/shared/types/ipc.ts` 中定义参数类型（`XxxData`）
2. 在 `src/main/ipc/` 下创建 `<domain>.ipc.ts`，使用 `wrap()` / `wrapEvent()`
3. 在 `src/main/ipc/permission.ts` 中声明权限规则
4. 在 `src/main/ipc/index.ts` 的 `registerIpcHandlers` 中注册
5. 在 `src/preload/index.ts` 中暴露 preload API
6. 在 `src/shared/types/electron.d.ts` 的 `AiscribeAPI` 中声明类型
7. 在 `src/renderer/services/` 下创建对应的 service 封装
8. 在 `tests/main/ipc/` 下编写 handler 测试

---

## 测试

### 测试架构

测试分为四个层次：

| 层级 | 工具 | 位置 | 数量 |
|------|------|------|------|
| 单元测试 | Vitest + jsdom | `tests/main/`, `tests/renderer/`, `tests/shared/` | 1076+ |
| 集成测试 | Vitest | `tests/integration/` | 含压力/内存/工作流 |
| E2E 测试 | Playwright | `tests/e2e/` | 核心流程 |
| 压力测试 | Vitest | `tests/integration/stress-*.test.ts` | 并发/内存/大 payload |

### 运行测试

```bash
# 全量测试
npm run test:run

# 仅单元测试（快速）
npm run test:unit

# 压力测试
npm run test:stress

# 覆盖率
npm run test:coverage
```

### 编写测试

测试与源码目录结构保持一致，遵循以下原则：

```typescript
// tests/main/ipc/project-handlers.test.ts 示例
import { describe, expect, it, vi } from 'vitest'

describe('project:create handler', () => {
  it('should require project name', async () => {
    // 测试参数校验
    await expect(handler(null, {})).rejects.toThrow('项目名称')
  })

  it('should create project with valid data', async () => {
    const result = await handler(null, {
      name: '测试项目',
      description: '描述',
      genre: 'fantasy'
    })
    expect(result.id).toBeDefined()
    expect(result.name).toBe('测试项目')
  })
})
```

---

## 常见问题

### 如何配置 AI Provider？

应用内：设置 → LLM 配置 → 填写 Provider / API Key / 模型名 → 测试连接。

### 数据存储在哪里？

数据库文件位于 Electron 的 `userData` 目录：`%APPDATA%/aiscribe/aiscribe.db`（Windows）或 `~/Library/Application Support/aiscribe/aiscribe.db`（macOS）。

### 如何备份数据？

复制上述位置的 `aiscribe.db` 文件即可。也可使用应用内的快照功能导出部分数据。

### 导入的小说乱码怎么办？

TXT 文件请确保使用 UTF-8 编码。DOCX / EPUB / PDF 格式自动检测编码。

### 支持离线使用吗？

支持。除 AI 对话功能（需调用 LLM API）外，编辑器、项目管理、快照等全部功能均可离线使用。

### 如何扩展技能？

在 `skills/` 目录下创建 `<技能名>/SKILL.md` 文件，使用 YAML frontmatter 声明元数据：

```markdown
---
name: 段落润色
description: 对选中的文本进行润色优化
category: writing
---

请对以下文本进行润色，保持原有风格但使表达更加流畅优美：

{{text}}
```

### 如何贡献代码？

请参阅 [贡献指南](#贡献指南) 部分，提交前确保 `npm run ci` 通过。

---

## 路线图

### 短期（1-2 个月）

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 章节列表分页 / 虚拟滚动 | P0 | 支持千级章节流畅滚动 |
| IPC 大查询分页 | P0 | 避免单次 IPC 大 payload 阻塞 |
| 异步 DB 写入队列 | P1 | 合并高频写，降低内存峰值 |
| LRU 缓存策略调优 | P1 | 控制缓存内存上限 |
| 渲染进程路由懒加载 | P1 | 进一步降低首屏体积 |
| 统一 LLM 请求队列与重试 | P2 | 控制并发与失败转移 |

### 长期（3-6 个月）

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 原生 SQLite 替代 sql.js WASM | P0 | 解决大文件内存映射与并发写入 |
| 插件化 Skill 系统 | P1 | 支持 JS/TS 插件扩展 AI 能力 |
| 多项目工作区 | P1 | 同时打开多个数据库 / 项目 |
| 云端同步抽象层 | P2 | Local-first 同步接口，支持多后端 |
| 可观测性埋点 | P2 | IPC / DB / LLM 耗时指标化 |

---

## 贡献指南

### 开发规范

项目强制遵守以下规范：

- **TypeScript strict 模式**，`noUnusedLocals` / `noUnusedParameters` 启用
- **ESLint + Prettier** 零警告策略
- **IPC handler** 必须使用 `wrap()` / `wrapEvent()` 统一错误处理
- **IPC channel 命名** 遵循 `camelCaseDomain:action` 规范
- **依赖规则**：renderer 不引用 `@main/*`，main 不引用 `@renderer/*`

提交前请确保：

```bash
npm run ci          # 全量检查通过
npm run test:run    # 所有测试通过
```

### 提交 PR

1. Fork 仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 提交代码：`npm run ci` 通过后提交
4. 创建 Pull Request，描述改动内容

### 详细规范

参阅 `docs/standards/` 目录下的文档：

- [开发规范](docs/standards/development-guidelines.md) — 代码风格、命名规范、模块划分
- [IPC 开发规范](docs/standards/ipc-guidelines.md) — Channel 命名、参数规范、错误处理
- [错误码参考](docs/standards/ipc-error-codes.md) — 错误码列表、错误转换流程

---

## 许可证

[MIT](LICENSE)

Copyright (c) 2026 AIscribe Contributors

---

## 联系方式

- **项目主页**：[https://github.com/your-username/aiscribe](https://github.com/your-username/aiscribe)
- **问题反馈**：[GitHub Issues](https://github.com/your-username/aiscribe/issues)
- **项目技术报告**：[查看项目优化报告](docs/reports/project-optimization-report.md)

---

> AIscribe — 让创作更专注，让故事更精彩。
