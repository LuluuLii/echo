# Echo Development Log

> 最后更新: 2026-02-24 (iCloud 优先存储架构)
>
> Claude Code Session: `2b82ed80-9de5-4080-b4ef-88dc28298990`
> 对话记录: `~/.claude/projects/-Users-chenlu-Developer-Echo/2b82ed80-9de5-4080-b4ef-88dc28298990.jsonl`

## 项目概述

Echo 是一个语言学习应用，核心理念是「激活」而非「教学」—— 帮助用户把积累的零碎素材转化为真实的语言表达。

**核心流程**: 素材积累 → 召回检索 → 激活唤醒 → 表达输出

> ⚠️ **设计调整 (v2)**: 调整为离线优先架构，激活和表达环节在离线时通过模板兜底，AI 作为增强而非阻塞。详见 [product-design-v2.md](./product-design-v2.md)

## 当前实现状态

### 已完成功能

#### 1. 项目基础架构 ✅

```
echo/
├── apps/
│   ├── mobile/          # React Native Expo 骨架
│   └── web/             # Vite + React Web 应用 (主要开发)
├── packages/
│   └── core/            # 共享业务逻辑
└── server/              # Hono 后端 API
```

- [x] Monorepo 配置 (pnpm workspaces)
- [x] TypeScript 配置
- [x] Web 应用 (Vite + React + TailwindCSS)
- [x] Mobile 应用骨架 (Expo + Expo Router)
- [x] 后端 API (Hono)
- [x] 共享 Core 包

#### 2. Web 端页面 ✅

| 页面 | 路径 | 功能 |
|------|------|------|
| Raw Library | `/` | 素材列表、添加、查看、编辑、删除 |
| Today (Activation) | `/activation` | 每日激活卡展示、Start Echo |
| Practice (Session) | `/session` | 主动练习入口、多阶段流程 |

#### 3. 素材管理 ✅

- [x] 添加文字素材
- [x] 添加图片素材 (OCR 提取文字)
- [x] 素材列表展示
- [x] 点击查看完整内容
- [x] 编辑素材
- [x] 删除素材
- [x] Personal Note 备注

#### 4. 激活卡生成 ✅

- [x] 从素材生成激活卡 API
- [x] 激活卡结构: emotionalAnchor + livedExperience + expressions + invitation
- [x] 激活卡展示页面
- [x] 来源素材 hover 预览
- [x] 无 API Key 时的 Mock 响应

#### 5. Echo Session ✅

**两个入口**:
1. **Today 流程**: Activation → Start Echo → 直接进入对话
2. **Practice 流程**: 输入话题 → 选择素材 → 生成卡片 → 对话

**对话功能**:
- [x] 消息发送/接收
- [x] Echo AI 回复
- [x] Context 面板 (Activation Card / Raw Materials 切换)
- [x] 表达建议点击填充
- [x] 素材 hover 预览
- [x] Starter prompts 引导
- [x] Save this Echo 保存

#### 6. 后端 API ✅

| 端点 | 功能 |
|------|------|
| `POST /api/ocr` | 图片 OCR 文字提取 |
| `POST /api/activation/generate` | 生成激活卡 |
| `POST /api/session/message` | Echo 对话消息 |

- [x] OpenAI 集成 (懒加载)
- [x] 无 API Key 时的 Mock 响应
- [x] AI Agent Prompts (activation-generator, echo-companion, ocr-extractor)

#### 7. LLM Provider 架构 ✅

- [x] 可插拔 Provider 系统 (OpenAI, Anthropic, Gemini, Ollama, WebLLM)
- [x] 自动 fallback 链
- [x] Settings 页面配置
- [x] 本地 WebLLM 支持 (浏览器端推理)

#### 8. 素材翻译 ✅

- [x] 素材英文翻译 (contentEn 字段)
- [x] 中英双语显示
- [x] 翻译 Provider 选择
- [x] 重翻按钮 (Library / MaterialDetail)
- [x] 批量翻译 (Translate All)

#### 9. 文件导入 ✅ (基础版)

- [x] 支持 .md, .txt, images 导入
- [x] Markdown 按 ## / --- 分段
- [x] 多文件批量导入
- [x] 预览和单独添加

#### 10. Apple Notes 导入 ✅ (macOS)

- [x] AppleScript 读取 Notes 应用
- [x] 文件夹列表浏览
- [x] 笔记多选批量导入
- [x] 批量处理优化 (5 notes/batch)
- [ ] 性能优化 (导入大量笔记时仍较慢)

#### 11. 数据持久化 ✅

- [x] Loro CRDT + IndexedDB 持久化
- [x] Embedding 向量本地存储
- [x] Session Memory 持久化
- [x] 每日激活卡持久化 (一天一张)

### 未完成功能

#### Mobile 端 ❌
- [ ] 完整 UI 实现 (目前只有骨架)
- [ ] expo-image-picker 图片选择
- [ ] NativeWind 样式
- [ ] 本地 SQLite 存储

#### 高级功能
- [ ] 语音输入/输出
- [ ] 每日推送通知
- [ ] Insight 数据分析
- [x] iCloud 同步 (iCloud 优先存储架构)

## 技术栈

| 层 | 技术 | 状态 |
|---|---|---|
| Web | Vite + React + TailwindCSS | ✅ 可用 |
| Mobile | React Native + Expo (SDK 54) | ⚠️ 骨架 |
| UI (Web) | TailwindCSS + 自定义 Echo 主题 | ✅ 可用 |
| UI (Mobile) | NativeWind | ❌ 待配置 |
| 状态管理 | Zustand | ✅ 可用 |
| 本地存储 | expo-sqlite + Drizzle ORM | ❌ 待实现 |
| Backend | Node.js + Hono | ✅ 可用 |
| AI | OpenAI GPT-4o-mini | ✅ 可用 (需 API Key) |
| OCR | GPT-4 Vision | ✅ 可用 (需 API Key) |

## 如何运行

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
# server/.env
OPENAI_API_KEY=sk-xxx  # 可选，无 key 时使用 mock 响应
```

### 3. 启动开发服务

```bash
# 终端 1: 启动后端
pnpm dev:server

# 终端 2: 启动 Web 前端
pnpm dev:web
```

访问 http://localhost:5173

### 4. 启动 Mobile (可选)

```bash
pnpm dev:mobile
```

## 关键文件

### Web 端

| 文件 | 作用 |
|------|------|
| `apps/web/src/pages/RawLibrary.tsx` | 素材库主页 |
| `apps/web/src/pages/Activation.tsx` | 每日激活卡页 |
| `apps/web/src/pages/Session.tsx` | Echo 对话页 (多阶段) |
| `apps/web/src/components/Layout.tsx` | 导航布局 |
| `apps/web/src/components/AddMaterialModal.tsx` | 添加素材弹窗 |
| `apps/web/src/components/MaterialDetailModal.tsx` | 素材详情弹窗 |
| `apps/web/src/lib/store/materials.ts` | Zustand 状态管理 |

### 后端

| 文件 | 作用 |
|------|------|
| `server/src/index.ts` | Hono 入口 |
| `server/src/routes/activation.ts` | 激活卡 API |
| `server/src/routes/session.ts` | 对话 API |
| `server/src/routes/ocr.ts` | OCR API |
| `server/src/services/ai.ts` | OpenAI 服务 |

### Core 包

| 文件 | 作用 |
|------|------|
| `packages/core/models/*.ts` | 数据模型定义 |
| `packages/core/agents/*.ts` | AI Prompt 模板 |

## Git 提交历史

```
7f84c61 chore: Add private docs to gitignore
daaefb8 feat: Add two entry points for Echo session
4b1b3fb feat: Initial Echo Language Learning POC implementation
```

## 下一步计划

> 详细设计见 [product-design-v2.md](./product-design-v2.md)
>
> 同步架构见 [sync-architecture.md](./sync-architecture.md)
>
> Insights 设计见 [insights-design.md](./insights-design.md)

### 已完成

- ✅ **Phase 1: 数据持久化 + 召回检索**
- ✅ **Phase 2: iCloud 同步** (基础版)
- ✅ **Phase 3: 智能推荐** (聚类 + 相似推荐)
- ✅ **Phase 4 V1: Insights Territory** (基础可视化)

---

### Web V1 Roadmap

#### Step 1: 导入功能优化 ✅ 完成

- [x] 拖拽导入 (Web) - 支持拖拽文本和文件 (.md, .txt)
- [x] 剪贴板快捷粘贴 - Cmd+V / Ctrl+V 快捷键
- [x] 导入时去重检测 - 基于 embedding 相似度检测
- [x] 智能分段优化 - 支持多种分段策略 (标题/段落/列表等)

#### Step 2: Memory 整体方案优化 ✅ 完成

重构长期记忆层，分为多个维度：

- [x] **Artifacts** - 精炼表达的存储和关联
- [x] **User Profile** - 用户画像（兴趣、表达风格、常用词汇）
- [x] **Growth Tracking** - 成长轨迹（练习历史、进步记录）
- [x] **Session Memory** - 对话记忆优化
- [x] **Vocabulary Memory** - 词汇追踪（被动/主动/掌握）
- [x] **Background Extraction** - 后台词汇和 Profile insights 提取

#### Step 3: Evaluation 对齐检查 ⬅️ 当前

基于 [evaluation.md](./evaluation.md) 进行功能完整性检查，识别缺失功能。

---

## Evaluation 差距分析 (2026-02-24)

> 基于 evaluation.md 的 E2E 用户旅程检查，识别当前实现的缺失

### 缺失功能总览

| 功能模块 | 缺失项 | 对应评估 |
|---------|-------|---------|
| **Session 对话** | Echo 自然融入表达示范 | 4.4 Feedback - thought_refinement |
| **Session 对话** | 词汇推荐展示 | 2.5, 2.6 推荐「见过但没用过」的词汇 |
| **Session 工具** | Translate/Hints/Dictionary | 设计稿 Tools 下拉 |
| **Session 模式** | Creation Mode (创作模式) | 新需求 |
| **Session 面板** | 右侧 Expression Artifacts 展示 | 设计稿 |
| **Insights 页面** | 词汇状态展示 | 1.12, 2.7 词汇追踪 UI |
| **Creative Studio** | 整个模块不存在 | Journey 4, 5 |
| **Project** | 项目/持续练习概念 | Journey 5 备考场景 |

### 详细差距说明

#### 1. Echo Companion 表达示范 (对话模式)

**当前状态**: Echo prompt 设计为「不纠错」模式

**需要调整**: 在自然回复中融入正确表达示范

```
当前 prompt:
"Never correct grammar explicitly"

调整为:
"如果用户表达有误，在回复中自然地使用正确表达，
例如: 'Yes, I think you mean taking it into account -
that's a great point about...'"
```

**评估对应**: 4.4 Feedback - 是否帮助厘清想法，而非只纠语法

#### 2. Session 词汇推荐

**当前状态**:
- ✅ 数据层: `getRecommendedToActivate()` 已实现
- ❌ UI 层: 没有展示推荐词汇的界面

**需要添加**:
```
┌─────────────────────────────────────────────────┐
│  💡 Try using (来自你的素材):                    │
│  ┌─────────────────────────────────────────┐   │
│  │ "take into account" - 见过 3 次          │   │
│  └─────────────────────────────────────────┘   │
│  触发: Session 开始时 / 用户表达后              │
└─────────────────────────────────────────────────┘
```

**评估对应**: 2.5, 2.6 - 推荐「见过但没用过」的词汇，推荐时机自然

#### 3. Session 工具栏

**当前状态**: 无

**需要添加** (参考设计稿):
- **Translate**: 选中文本即时翻译
- **Hints**: 请求表达提示
- **Dictionary**: 查词功能

#### 4. Creation Mode (创作模式)

**当前状态**: 仅有 Dialog Mode (每次输入 AI 都回复)

**需要添加**:
```
Creation Mode:
- 用户自由写作，AI 不主动回复
- 用户可点击:
  - [Request Feedback] → AI 给出整体反馈和改进建议
  - [Hints] → AI 给出表达提示
  - [Continue] → AI 帮助续写
```

**评估对应**: 新需求 - 支持长文创作场景

#### 5. Insights 词汇板块

**当前状态**: Insights 页面有 Territory 和 Stats，无词汇展示

**需要添加**:
```
┌─────────────────────────────────────────────────┐
│  Vocabulary Overview                            │
│  ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Passive │ │ Active │ │Mastered│              │
│  │  156    │ │   42   │ │   18   │              │
│  └────────┘ └────────┘ └────────┘              │
│                                                 │
│  Recently Activated                             │
│  • "take into account" - 昨天首次使用           │
│  • "in terms of" - 2天前                       │
│                                                 │
│  Recommended to Activate (见过多次但没用过)      │
│  • "nevertheless" - 见过 5 次                   │
└─────────────────────────────────────────────────┘
```

**评估对应**: 1.12, 2.7 - 词汇状态展示和追踪

#### 6. Creative Studio 模块

**当前状态**: 不存在，当前 Practice 入口直接进入 Session

**需要添加** (参考设计稿):
- 将 Practice 导航升级为 Creative Studio
- 支持 Project (持续练习项目)
- 支持随笔创作 (Quick Create)
- Inspiration Workbench (任务列表)

#### 7. Project 数据模型

**当前状态**: 无项目概念

**需要添加**:
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'practice' | 'creation' | 'exam-prep';
  topics: string[];
  materialIds: string[];
  artifactIds: string[];
  progress: {
    totalSessions: number;
    completedSessions: number;
    targetSessions?: number;
  };
  createdAt: number;
  updatedAt: number;
}
```

**评估对应**: Journey 5 - 备考场景

---

## 实现计划

### P0: 核心体验完善

| 任务 | 说明 | 评估对应 |
|-----|------|---------|
| **Echo prompt 调整** | 对话模式中自然融入表达示范 | 4.4 Feedback |
| **Session 词汇推荐** | 推荐「见过但没用过」的词汇 | 2.5, 2.6 |
| **Session 工具栏** | Translate / Hints / Dictionary | 设计稿 |

### P1: 模式升级 + Insights 完善

| 任务 | 说明 | 评估对应 |
|-----|------|---------|
| **Creation Mode** | 创作模式，AI 仅按需响应 | 新需求 |
| **Insights 词汇板块** | 词汇状态展示 (被动/主动/掌握) | 1.12, 2.7 |
| **Session 右侧面板** | Expression Artifacts 展示 | 设计稿 |

### P2: Creative Studio

| 任务 | 说明 | 评估对应 |
|-----|------|---------|
| **Project 数据模型** | Loro 存储 | Journey 5 |
| **Creative Studio 页面** | 替代当前 Practice 入口 | Journey 4, 5 |
| **Task 管理** | 创作任务的增删改查 | 设计稿 |

### P3: 进阶功能

| 任务 | 说明 |
|-----|------|
| **新手引导** | Journey 1.2 |
| **Export/Share** | 设计稿功能 |
| **Progress 可视化** | 学习进度展示 |

---

#### Step 4: P0 核心体验实现 ✅ 完成

- [x] Echo prompt 调整 - 自然融入表达示范 (`echo-companion.ts`)
- [x] Session 词汇推荐 UI (`ChatContextPanel.tsx` - "Try These" tab)
- [x] Session 工具栏 (`ChatInput.tsx` - Translate/Hints/Dictionary)

#### Step 5: P1 模式升级 + Insights ✅ 完成

- [x] Creation Mode 实现 (`Session.tsx`, `ChatPhase.tsx`, `creation-mode.ts`)
  - Dialog/Creation 模式切换
  - Creation 模式下不自动回复
  - Get Feedback / Quick Check / Help Continue 按钮
- [x] Insights 词汇板块 (`Insights.tsx` - Vocabulary Progress section)
- [x] Session Expression Artifacts 面板 (`ChatContextPanel.tsx` - "Past Expressions" tab)

#### Step 6: P2 Creative Studio ✅ 完成

- [x] Project 数据模型 (`packages/core/models/project.ts`, Loro storage)
  - Project: id, name, type, status, topics, materialIds, artifactIds, progress
  - ProjectTask: id, projectId, title, priority, status, materialIds
- [x] Creative Studio 页面 (`CreativeStudio.tsx`)
  - Projects/Tasks/Quick Start 三个视图切换
  - 创建项目表单 (name, type, description)
  - 项目卡片展示 (进度、统计、Continue 按钮)
  - 待办任务列表
- [x] Task 管理
  - createTask, updateTask, deleteTask, completeTask
  - 任务与项目关联
  - 进度自动更新

#### Step 7: iCloud 优先存储架构 ✅ 完成

- [x] `initLoro` 加载优先级调整: iCloud → IndexedDB → localStorage
- [x] `persistNow` 双写: 同时保存到 iCloud + IndexedDB
- [x] 自动同步: 每 5 分钟 `mergeFromICloud()`
- [x] 退出同步: `setupBeforeUnloadSync()`
- [x] JSON 导出: `exportAsJSON()` 函数
- [x] 文档更新: sync-architecture.md

#### Step 8: UI 和交互流程打磨 ⬅️ 下一步

- [ ] 设计系统统一（颜色/字体/间距）
- [ ] 用户流程优化
- [ ] Bug bash
- [ ] 性能优化

#### Step 8: Evaluation Pipeline

- [ ] 自动化测试
- [ ] AI Judge 评测
- [ ] 场景化回归测试

---

### Web V1 完成后 → Mobile 端

- [ ] Mobile UI 完整实现
- [ ] ONNX Runtime 端上 Embedding
- [ ] iCloud 原生访问
- [ ] Share Extension / 相机扫描
- [ ] TestFlight 发布

---

## 导入功能设计

> 目标: 让用户在 PC 端和 Mobile 端都能方便地记录和引入已有素材

### 当前实现 (v1)

**Web 端 AddMaterialModal**:
- 手动输入文字
- 图片上传 + OCR 提取文字
- 文件导入 (.md, .txt, images)
  - Markdown 按 `## ` 标题或 `---` 分隔符分段
  - 批量导入多个文件
  - 预览和单独添加

### 后续优化计划

#### 1. 快捷录入优化

| 功能 | 平台 | 优先级 | 描述 |
|------|------|--------|------|
| **剪贴板快捷粘贴** | Web/Mobile | P0 | 检测剪贴板内容，一键添加为素材 |
| **拖拽导入** | Web | P0 | 拖拽文件/文字到页面直接添加 |
| **Share Extension** | Mobile | P1 | 从其他 App 分享内容到 Echo |
| **快捷键** | Web | P1 | Cmd+V 智能粘贴, Cmd+N 新建素材 |

#### 2. 来源整合

| 功能 | 平台 | 优先级 | 描述 |
|------|------|--------|------|
| **Apple Notes 导出** | Web/Mobile | P1 | 指导用户导出 Notes 为 PDF/文本 |
| **Notion 导入** | Web | P2 | Notion API 或导出 Markdown |
| **微信收藏导入** | Mobile | P2 | 从微信导出或 OCR 截图 |
| **书签/稍后读** | Web | P3 | 导入 Pocket/Instapaper 内容 |

#### 3. 批量处理优化

| 功能 | 描述 |
|------|------|
| **智能分段** | 长文本自动识别段落边界 |
| **去重检测** | 导入前检测相似内容，避免重复 |
| **批量翻译** | 导入时可选自动翻译 |
| **标签建议** | 基于内容自动建议分类标签 |

#### 4. Mobile 端专项

| 功能 | 描述 |
|------|------|
| **相机扫描** | 拍照 → OCR → 素材 |
| **语音录入** | 语音转文字 → 素材 |
| **截图监听** | 检测新截图，提示添加 |
| **Widget** | 主屏 Widget 快速添加 |

#### 5. 导入格式扩展

| 格式 | 处理方式 |
|------|----------|
| `.md` | ✅ 按标题/分隔符分段 |
| `.txt` | ✅ 整体导入 |
| `.pdf` | 解析文本 + 分页/分段 |
| `.docx` | 提取纯文本 |
| `.epub` | 提取章节内容 |
| `.html` | 提取正文 (Readability) |
| 图片 | ✅ OCR 提取文字 |

### 实现路线

**Phase 2.1** (随 iCloud 同步一起):
- [ ] 拖拽导入 (Web)
- [ ] 剪贴板快捷粘贴
- [ ] 导入时去重检测

**Phase 5** (Mobile 端):
- [ ] Share Extension
- [ ] 相机扫描
- [ ] 语音录入

**Future**:
- [ ] Notion 集成
- [ ] PDF/DOCX 解析
- [ ] 智能分段算法
- [ ] Apple Notes 导入性能优化
  - 当前：批量 5 notes/AppleScript 调用
  - 待探索：并发批处理、SQLite 直接读取 (需 Full Disk Access)

## 设计决策记录

### 0. 核心理念：只有表达过的内容才会被留下

**原则**: 激活卡是「邀请函」，不是「作品」

| 内容 | 持久化 |
|------|--------|
| 原始素材 | ✅ 保存 |
| 激活卡 | ❌ 阅后即焚 |
| 表达输出 | ✅ 保存 |

激活卡的价值在于唤醒表达的那一刻，真正留下的是用户说出来的作品。

### 1. 激活卡格式: JSON DSL

**决策**: 使用 JSON 结构而非 HTML

**原因**:
- 离线友好，本地模型可处理
- 前端模板渲染更可控
- 后续可根据需要增强视觉

### 2. 两个 Session 入口

**决策**: Today (激活流) + Practice (主动流)

**原因**:
- Today: 保留「每日激活」核心体验
- Practice: 满足用户主动探索需求
- 激活卡按需生成，不持久化

### 3. Web 优先开发

**决策**: 先完善 Web 端，再移植 Mobile

**原因**:
- 开发迭代更快
- 便于快速验证产品逻辑
- Mobile 端可复用 Core 逻辑

### 4. Embedding 不参与同步

**决策**: Embedding 向量在本地生成，不通过 Loro CRDT 同步

**原因**:
- **可重建性**: Embedding 是派生数据，可以根据素材内容随时重新生成
- **向量维度高**: all-MiniLM-L6-v2 产生 384 维向量，每条素材约 1.5KB
- **CRDT 不适合**: 向量是整体替换语义，不存在合并冲突，用 CRDT 是 overkill
- **模型版本问题**: 不同端可能使用不同版本模型，同步后向量反而不兼容
- **节省同步带宽**: 100 条素材的 embedding 约 150KB，无需占用 iCloud 空间

**策略**: 每个端在同步新素材后，本地独立计算 embedding

### 5. 多端同步方案: Loro + iCloud (iCloud 优先)

**决策**: 使用 Loro CRDT 作为数据结构，iCloud Drive 为主存储，IndexedDB 为缓存

**原因**:
- **Loro**: Rust 实现，高性能，支持 WASM (Web) 和 Swift (iOS)，自动处理冲突
- **iCloud**: 用户数据自主，无需自建服务器，Apple 生态内免费
- **双写策略**: 确保数据可靠性，即使 IndexedDB 被清除也不丢数据

**实现策略** (2026-02-24 更新):
- **iCloud 为主存储** - 连接后优先从 iCloud 加载
- **IndexedDB 为缓存** - 始终保存，作为离线备份
- **localStorage 为紧急备份** - beforeunload 时保存
- **自动同步** - 每 5 分钟合并 iCloud 数据
- **退出同步** - 页面关闭前尝试同步到 iCloud
- **JSON 导出** - 支持导出为 JSON 格式备份

**跨端架构**:
```
iOS App (loro-swift + FileManager) ←→ iCloud Drive ←→ Web App (loro-crdt + File System Access API)
```

详见 [sync-architecture.md](./sync-architecture.md)

---

## 联系

- GitHub: https://github.com/LuluuLii/echo
