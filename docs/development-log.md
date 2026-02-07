# Echo Development Log

> 最后更新: 2026-02-07

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

### 未完成功能

#### 数据持久化 ❌
- [ ] SQLite 本地存储 (目前数据仅在内存/Zustand)
- [ ] 刷新页面数据丢失
- [ ] Drizzle ORM 集成

#### Mobile 端 ❌
- [ ] 完整 UI 实现 (目前只有骨架)
- [ ] expo-image-picker 图片选择
- [ ] NativeWind 样式
- [ ] 本地 SQLite 存储

#### 高级功能 ❌
- [ ] 语音输入/输出
- [ ] 每日推送通知
- [ ] Insight 数据分析
- [ ] 离线 AI 支持
- [ ] 数据同步

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

### Phase 1: 召回检索基础 ⬅️ 当前优先

1. **关键词搜索 UI** - Practice 页面添加搜索框
2. **本地 Embedding** - 集成 transformers.js，素材入库时生成向量
3. **语义相似度搜索** - 基于 embedding 的智能召回
4. **数据持久化** - SQLite/IndexedDB 存储（含 embedding）

### Phase 2: 智能推荐

1. **自动聚类** - K-Means 聚类 + 标签生成
2. **相似素材推荐** - 查看时显示相关内容
3. **Activation Card 模板** - 离线模板兜底

### Phase 3: Insights 可视化

1. **聚类地图** - 主题分布可视化
2. **时间轴** - 积累成长轨迹
3. **用户洞察** - 关注主题、活跃度分析

### Phase 4: Mobile 端

1. **Mobile UI** - 完整实现 Mobile 端页面
2. **ONNX Runtime** - 端上 Embedding 模型
3. **TestFlight** - EAS Build 发布测试

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

---

## 联系

- GitHub: https://github.com/LuluuLii/echo
