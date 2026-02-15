# Echo Development Log

> 最后更新: 2026-02-15

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

#### 10. 数据持久化 ✅

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

#### 高级功能 ❌
- [ ] 语音输入/输出
- [ ] 每日推送通知
- [ ] Insight 数据分析
- [ ] iCloud 同步

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

### Phase 1: 数据持久化 + 召回检索 ✅ 已完成

1. ✅ **Loro + IndexedDB 持久化** - 从一开始使用 Loro 数据格式
2. ✅ **关键词搜索 UI** - Practice 页面添加搜索框
3. ✅ **本地 Embedding** - 集成 transformers.js，素材入库时生成向量
4. ✅ **语义相似度搜索** - 基于 embedding 的智能召回

### Phase 2: iCloud 同步 ⬅️ 当前优先

1. **File System Access API** - Web 端访问 iCloud Drive
2. **手动/定期同步** - IndexedDB → iCloud 单向推送
3. **从 iCloud 恢复** - 新设备初始化
4. **Settings UI** - 同步状态、手动同步按钮

### Phase 3: 智能推荐

1. **自动聚类** - K-Means 聚类 + 标签生成
2. **相似素材推荐** - 查看时显示相关内容
3. ✅ **Activation Card 模板** - 离线模板兜底

### Phase 4: Insights 可视化

1. **聚类地图** - 主题分布可视化
2. **时间轴** - 积累成长轨迹
3. **用户洞察** - 关注主题、活跃度分析

### Phase 5: Mobile 端

1. **Mobile UI** - 完整实现 Mobile 端页面
2. **ONNX Runtime** - 端上 Embedding 模型
3. **iCloud 原生访问** - 替代 File System Access API
4. **TestFlight** - EAS Build 发布测试

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
- [ ] Notion/Apple Notes 集成
- [ ] PDF/DOCX 解析
- [ ] 智能分段算法

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

### 5. 多端同步方案: Loro + iCloud

**决策**: 使用 Loro CRDT 作为数据结构，iCloud Drive 作为同步通道

**原因**:
- **Loro**: Rust 实现，高性能，支持 WASM (Web) 和 Native (Mobile)，自动处理冲突
- **iCloud**: 用户数据自主，无需自建服务器，Apple 生态内免费

**实现策略**:
- **IndexedDB 为权威数据源** - 所有写操作只写 IndexedDB
- **同步为单向推送** - 手动/定期从 IndexedDB 推送到 iCloud
- **从一开始使用 Loro** - 数据格式无需迁移

详见 [sync-architecture.md](./sync-architecture.md)

---

## 联系

- GitHub: https://github.com/LuluuLii/echo
