# Echo 产品设计 v2 - 离线优先架构

> 更新时间: 2026-02-07

## 设计理念调整

### 核心洞察

语言输出的核心在于**积累**和**输出**，AI 应该是增强而非必需。系统在离线时仍应完全可用——用户可以输入、浏览历史、输出表达。

### 架构原则

```
┌─────────────────────────────────────────────────────────┐
│              核心价值循环（离线完全可用）                  │
│                                                         │
│  积累 → 召回 → 激活 → 表达 → 积累...                     │
│  (Import) (Recall) (Activate) (Express)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

激活环节的实现方式:
┌──────────────────┬──────────────────┐
│      在线        │      离线        │
├──────────────────┼──────────────────┤
│  AI 生成激活卡    │  模板 + 素材填充  │
│  个性化邀请      │  预设邀请语       │
│  智能表达建议    │  通用表达短语库   │
└──────────────────┴──────────────────┘
```

### AI 角色定位

| 功能 | AI 依赖 | 离线方案 |
|------|---------|----------|
| 素材输入 | OCR (可选) | 手动输入 |
| 召回检索 | ❌ 不依赖 | 本地 Embedding + 关键词 |
| 激活卡生成 | 增强体验 | 模板兜底 |
| Echo 对话 | 增强体验 | 自由输出模式 |
| 聚类分析 | ❌ 不依赖 | 本地 Embedding |
| Insights | ❌ 不依赖 | 本地计算 |

---

## 功能模块设计

### 1. 召回检索模块

#### 两种检索方式

| 方式 | 触发 | 实现 | 用途 |
|------|------|------|------|
| **关键词搜索** | 用户主动输入 | 全文匹配 | 精确查找 |
| **语义推荐** | 系统自动 | Embedding 相似度 | 智能发现 |

#### 用户流程

```
┌─────────────────────────────────────────┐
│            Practice 页面                 │
├─────────────────────────────────────────┤
│  🔍 [搜索框: 输入关键词...]              │
│                                         │
│  ─── 或者让系统推荐 ───                  │
│                                         │
│  📦 基于你最近的素材，推荐相关内容:        │
│  ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ 游泳 │ │ 紧张 │ │ 突破 │               │
│  └─────┘ └─────┘ └─────┘               │
│                                         │
│  选中的素材 (3):                         │
│  • "水中紧张时肩膀会僵硬..."              │
│  • "放慢节奏后反而更快..."               │
│  • "身体比意识反应更快..."               │
│                                         │
│  [生成激活卡] 或 [直接开始输出]           │
└─────────────────────────────────────────┘
```

#### 技术方案

```typescript
// 1. 关键词搜索 - 纯前端
function searchByKeyword(query: string, materials: RawMaterial[]) {
  const keywords = query.toLowerCase().split(/\s+/);
  return materials.filter(m =>
    keywords.some(k =>
      m.content.toLowerCase().includes(k) ||
      m.note?.toLowerCase().includes(k)
    )
  );
}

// 2. Embedding 相似度 - 本地模型
async function searchBySimilarity(query: string, materials: RawMaterial[]) {
  const queryEmbedding = await embed(query);
  return materials
    .map(m => ({
      material: m,
      score: cosineSimilarity(queryEmbedding, m.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
```

### 2. Embedding 方案

#### 技术选型

| 平台 | 方案 | 模型 | 大小 |
|------|------|------|------|
| Web | transformers.js | all-MiniLM-L6-v2 | ~25MB |
| React Native | ONNX Runtime | 同上 | ~25MB |
| 服务端 | OpenAI / 本地 | text-embedding-3-small | API |

#### 实现策略

```typescript
// lib/embedding.ts

// 1. 初始化本地模型 (首次加载)
let pipeline: Pipeline | null = null;

async function initEmbedding() {
  if (!pipeline) {
    const { pipeline: createPipeline } = await import('@xenova/transformers');
    pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return pipeline;
}

// 2. 生成 Embedding
async function embed(text: string): Promise<number[]> {
  const model = await initEmbedding();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// 3. 素材入库时自动生成 Embedding
async function addMaterial(content: string, note?: string) {
  const embedding = await embed(content);
  await db.materials.insert({
    id: crypto.randomUUID(),
    content,
    note,
    embedding, // 存储向量
    createdAt: Date.now(),
  });
}
```

#### Embedding 存储

```sql
-- SQLite 存储方案
CREATE TABLE materials (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  note TEXT,
  embedding BLOB,  -- 序列化的 Float32Array
  created_at INTEGER
);

-- 或使用 sqlite-vss 扩展支持向量索引
```

### 3. 聚类与相似度

#### 自动聚类

```typescript
// 使用 K-Means 或层次聚类
interface Cluster {
  id: string;
  centroid: number[];      // 聚类中心向量
  label?: string;          // AI 生成或用户命名
  materialIds: string[];   // 包含的素材
}

// 新素材入库时:
// 1. 计算与现有聚类中心的距离
// 2. 加入最近的聚类，或创建新聚类
// 3. 更新聚类中心
```

#### 相似素材推荐

```typescript
// 当用户查看某条素材时，推荐相似内容
async function getRelatedMaterials(materialId: string, limit = 5) {
  const material = await db.materials.get(materialId);
  const allMaterials = await db.materials.getAll();

  return allMaterials
    .filter(m => m.id !== materialId)
    .map(m => ({
      material: m,
      similarity: cosineSimilarity(material.embedding, m.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

### 4. Insights 地图

#### 可视化设计

```
┌─────────────────────────────────────────────────────────┐
│                    Insights 地图                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         ○ ○                    ○                        │
│        ○ ● ○  [运动/身体]      ○ ○  [情绪/感受]          │
│         ○ ○                  ○ ● ○                      │
│           \                   /                         │
│            \                 /                          │
│             ○ ○ ○ ○ ○ ○ ○ ○                             │
│              [学习/成长]                                 │
│                   ● ●                                   │
│                                                         │
│  ─────────────────────────────────────────────         │
│  时间轴: [2024.01 ----●----●----●---- 2024.12]         │
│                                                         │
│  ● 素材点  ○ 输出点  ━ 聚类边界  --- 相似连线            │
└─────────────────────────────────────────────────────────┘
```

#### 数据结构

```typescript
interface InsightsData {
  clusters: Cluster[];
  timeline: {
    date: string;
    materialCount: number;
    outputCount: number;
  }[];
  topThemes: {
    label: string;
    count: number;
    recentActivity: number;
  }[];
}
```

### 5. Activation Card 模板兜底

#### 分级策略

```typescript
async function generateActivationCard(materials: RawMaterial[]) {
  // 1. 尝试 AI 生成
  if (isOnline() && hasAPIKey()) {
    try {
      return await aiGenerateCard(materials);
    } catch (e) {
      console.warn('AI generation failed, falling back to template');
    }
  }

  // 2. 模板兜底
  return generateFromTemplate(materials);
}

function generateFromTemplate(materials: RawMaterial[]): ActivationCard {
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const randomMaterial = materials[Math.floor(Math.random() * materials.length)];

  return {
    id: crypto.randomUUID(),
    emotionalAnchor: template.emotionalAnchor,
    livedExperience: randomMaterial.content,
    expressions: template.defaultExpressions,
    invitation: template.invitation,
    materialIds: materials.map(m => m.id),
    createdAt: Date.now(),
  };
}
```

#### 模板库

```typescript
const TEMPLATES = [
  {
    emotionalAnchor: "回想一下当你记录这些时的场景...",
    invitation: "如果要向一个朋友描述这个感受，你会怎么说？",
    defaultExpressions: [
      "What I noticed was...",
      "It made me realize...",
      "The feeling was like...",
    ],
  },
  {
    emotionalAnchor: "这些零碎的记录背后，藏着一个你很在意的主题...",
    invitation: "试着用一段话把它说出来？",
    defaultExpressions: [
      "What matters to me is...",
      "I've been thinking about...",
      "This connects to...",
    ],
  },
  // 更多模板...
];
```

---

## 实现优先级

### Phase 1: 召回检索基础 ⬅️ 当前

1. **关键词搜索 UI**
   - Practice 页面添加搜索框
   - 实时过滤素材列表

2. **本地 Embedding 集成**
   - 集成 transformers.js
   - 素材入库时生成 embedding
   - 存储到 Zustand / 后续持久化

3. **语义相似度搜索**
   - 输入 query 计算相似素材
   - 展示相似度排序结果

### Phase 2: 智能推荐

1. **自动聚类**
   - K-Means 或层次聚类
   - 聚类标签 (AI 生成或规则提取)

2. **相似素材推荐**
   - 查看素材时显示相关内容
   - "更多类似内容" 入口

3. **Activation Card 模板**
   - 离线模板库
   - 优雅降级逻辑

### Phase 3: Insights 可视化

1. **数据聚合**
   - 主题分布统计
   - 时间线数据

2. **可视化组件**
   - 聚类地图 (可考虑 D3.js / Recharts)
   - 时间轴

3. **用户洞察**
   - "你最近关注的主题"
   - "这个月的成长轨迹"

---

## 技术依赖

### 新增依赖

```json
{
  "@xenova/transformers": "^2.x",  // 浏览器端 embedding
  "d3": "^7.x",                    // Insights 可视化 (Phase 3)
}
```

### 存储扩展

```typescript
// 扩展 RawMaterial 模型
interface RawMaterial {
  id: string;
  type: 'text' | 'image';
  content: string;
  note?: string;
  embedding?: number[];  // 新增: 向量表示
  clusterId?: string;    // 新增: 所属聚类
  createdAt: number;
}

// 新增 Cluster 模型
interface Cluster {
  id: string;
  label?: string;
  centroid: number[];
  materialIds: string[];
  createdAt: number;
  updatedAt: number;
}

// 新增 EchoOutput 模型 (用户的输出)
interface EchoOutput {
  id: string;
  sessionId: string;
  content: string;
  embedding?: number[];
  materialIds: string[];  // 来源素材
  createdAt: number;
}
```

---

## 离线体验对照

| 功能 | 在线体验 | 离线体验 |
|------|----------|----------|
| 添加素材 | OCR + 手动 | 仅手动输入 |
| 关键词搜索 | ✅ 完全可用 | ✅ 完全可用 |
| 语义搜索 | ✅ 完全可用 | ✅ 完全可用 (本地模型) |
| 激活卡 | AI 生成 | 模板生成 |
| Echo 对话 | AI 反馈 | 自由输出 (无反馈) |
| 保存输出 | ✅ 完全可用 | ✅ 完全可用 |
| Insights | ✅ 完全可用 | ✅ 完全可用 |
| 聚类分析 | ✅ 完全可用 | ✅ 完全可用 |

**核心价值循环在离线时 100% 可用。**
