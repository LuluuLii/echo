# Echo Memory Architecture

> 三层记忆系统设计，用于管理用户表达过程和知识沉淀

## 目录

- [概述](#概述)
- [行业调研](#行业调研)
- [记忆分层架构](#记忆分层架构)
- [Echo 记忆方案设计](#echo-记忆方案设计)
- [数据流](#数据流)
- [参考资料](#参考资料)

---

## 概述

Echo 采用三层记忆架构，从临时对话状态到永久知识沉淀：

| Layer | 名称 | TTL | 存储 | 状态 |
|-------|------|-----|------|------|
| L1 | Stream Memory | minutes~hours | localStorage | ✅ 已实现 |
| L2 | Session Memory | days~permanent | Loro + IndexedDB | ✅ 已实现 |
| L3 | Canonical Memory | permanent | Loro + IndexedDB | ✅ 已实现 |

---

## 行业调研

> 调研时间: 2025-02

### 主流 Memory 方案对比

| 方案 | 核心理念 | 记忆类型 | 关键技术 | 适用场景 |
|------|---------|---------|---------|---------|
| **[Mem0](https://github.com/mem0ai/mem0)** | 通用记忆层 | User/Session/Agent 三层 | 动态提取+图记忆 | 通用 AI Agent |
| **[MemU](https://github.com/NevaMind-AI/memU)** | 主动预测式 | Resources→Items→Categories | 层级文件系统式 | 24/7 主动 Agent |
| **[Memobase](https://github.com/memodb-io/memobase)** | 用户画像中心 | User Profile + Event Timeline | Buffer-flush + SQL | 用户个性化应用 |
| **[A-Mem](https://arxiv.org/abs/2502.12110)** | 知识网络 | Zettelkasten 笔记链接 | 动态索引+反向链接 | 知识密集型任务 |
| **[LangMem](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)** | 认知分层 | Semantic/Episodic/Procedural | Collection vs Profile | LangChain 生态 |

### 关键技术点

#### 1. 记忆提取 (Extraction)

| 方法 | 描述 | 优缺点 |
|------|------|--------|
| **Hot Path (同步)** | 对话中实时提取 | 即时但增加延迟 |
| **Background (异步)** | 对话后反思提取 | 高召回但有延迟 |
| **Batch Processing** | 攒到阈值批量处理 | 省 token 但不实时 |

**Mem0**: 使用 3 个上下文源（最新交互 + 滚动摘要 + 最近消息）→ LLM 提取候选记忆

**Memobase**: Buffer zone (1024 tokens 或 1 小时空闲) → 批量 flush 处理，token 成本降 40-50%

#### 2. 记忆存储 (Storage)

| 模式 | 描述 | 适用场景 |
|------|------|---------|
| **Collections** | 无界文档集，语义搜索 | 知识库、历史对话 |
| **Profiles** | 固定 schema，直接查找 | 用户偏好、画像 |
| **Graph** | 实体+关系图 | 多跳推理、关系发现 |
| **Timeline** | 时间索引事件 | 时序推理、成长追踪 |

#### 3. 记忆检索 (Retrieval)

| 方法 | 描述 |
|------|------|
| **语义搜索** | Embedding 相似度 |
| **元数据过滤** | 按时间/类型/来源筛选 |
| **多层命名空间** | user_id / session_id / topic 层级 |
| **主动推送** | MemU - 预测用户需要，主动注入 |

#### 4. MemU 层级文件系统详解

MemU 采用三层层级架构，类似文件系统的组织方式：

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: MemoryCategory (文件夹)                        │
│  memory/                                                │
│  ├── personal_info/     # 身份信息                       │
│  ├── preferences/       # 偏好                          │
│  ├── relationships/     # 社交关系                       │
│  ├── knowledge/         # 领域知识                       │
│  ├── routines/          # 日常习惯                       │
│  ├── goals/             # 目标计划                       │
│  ├── experiences/       # 经历事件                       │
│  ├── skills/            # 技能                          │
│  ├── tools/             # 工具使用模式                    │
│  └── context/           # 当前上下文                     │
├─────────────────────────────────────────────────────────┤
│  Layer 2: MemoryItem (文件)                              │
│  从原始数据提取的最小语义单元                              │
│  一个 Item 可属于多个 Category (多对多)                   │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Resource (挂载点)                              │
│  原始数据: 对话、文档、图片、视频、音频                    │
└─────────────────────────────────────────────────────────┘
```

**数据模型**:

```python
class Resource:
    url: str                    # 位置标识
    modality: str               # conversation/document/image/video/audio
    content_hash: str           # 去重哈希
    embedding: list[float]

class MemoryItem:
    memory_type: str            # profile/event/skill/tool
    summary: str                # 提取内容
    embedding: list[float]
    reinforcement_count: int    # 强化计数 (重复提及时 +1)
    salience_score: float       # 显著性 = log(1 + count)

class MemoryCategory:
    name: str                   # 分类名
    summary: str                # 自动生成的 Markdown 摘要 (含 [ref:ID])
    items: list[MemoryItem]     # 多对多关系
```

**处理流程 (7 步 Pipeline)**:

```
ingest_resource → preprocess_multimodal → extract_items
    → dedupe_merge → categorize_items → persist_index
```

**强化机制**:
- 第 1 次提到 → 创建 Item, count=1
- 重复提到 → count++, 更新 last_reinforced_at
- salience_score = log(1 + count)

#### 5. Category/Schema 定义策略对比

| 策略 | 代表方案 | Category 来源 | Item 分配 | 优缺点 |
|------|---------|--------------|----------|--------|
| **全预定义** | MemU, Memobase | 配置文件定义 | LLM 选择已有 | 可控但不灵活 |
| **全动态** | Mem0 | 无 Category | 自由提取 facts | 灵活但难查询 |
| **混合** | A-Mem | 预定义 + 运行时扩展 | LLM 可创建新类 | 平衡 |

**MemU 选择预定义的原因**:
- 结构可预测，便于查询和展示
- Category.summary 格式统一
- 不会出现奇怪/重复的分类
- Token 消耗更低（LLM 只选择，不发明）

**缺点**:
- 可能遗漏预设范围外的信息
- 需要提前想好所有分类
- 通用 10 类不一定适合所有场景

---

### 各方案提取产物详解

#### Mem0 (Base) - 自然语言 Facts

```json
// 输入对话
{"role": "user", "content": "I love hiking and planning to visit Paris"}

// 提取出的 memories
{
  "memories": [
    {
      "id": "uuid-xxx",
      "text": "Loves hiking",           // 自然语言 fact
      "event": "ADD",                   // 操作类型: ADD/UPDATE/DELETE
      "created_at": "2025-02-23T10:00:00Z"
    },
    {
      "id": "uuid-yyy",
      "text": "Planning to visit Paris",
      "event": "ADD"
    }
  ]
}
```

**特点**:
- 提取的是**自然语言事实陈述**，不是结构化字段
- 每条 memory 就是一句话
- 存储时会生成 embedding 用于后续检索

#### Mem0ᵍ (Graph) - 实体 + 关系三元组

```
输入: "Alice met Bob at GraphConf 2025 in San Francisco"

Entities (节点):
┌─────────────────────────────────────────┐
│ Node: Alice                             │
│ - type: Person                          │
│ - embedding: [0.12, 0.45, ...]         │
│ - created_at: 2025-02-23               │
├─────────────────────────────────────────┤
│ Node: Bob         (type: Person)        │
│ Node: GraphConf   (type: Event)         │
│ Node: SF          (type: Location)      │
└─────────────────────────────────────────┘

Relations (边):
┌─────────────────────────────────────────┐
│ (Alice) --[met]--> (Bob)                │
│ (Alice) --[attended]--> (GraphConf)     │
│ (GraphConf) --[held_in]--> (SF)         │
└─────────────────────────────────────────┘
```

**实体类型**: Person, Location, Event, Object, Concept (LLM 动态识别)

**关系类型**: `lives_in`, `prefers`, `owns`, `met`, `attended`, `happened_on` 等 (LLM 动态生成)

#### Memobase - Profile 字段 + Event Timeline

```
输入对话:
User: "I'm Gus, 25 years old, working as a software engineer"
User: "Yesterday I went to the gym and felt great"

═══════════════════════════════════════════════════════════
提取结果 1: User Profile (结构化字段)
═══════════════════════════════════════════════════════════

┌─────────────┬─────────────┬───────────────────┐
│ topic       │ sub_topic   │ content           │
├─────────────┼─────────────┼───────────────────┤
│ basic_info  │ name        │ Gus               │
│ basic_info  │ age         │ 25                │
│ work        │ title       │ Software Engineer │
└─────────────┴─────────────┴───────────────────┘

═══════════════════════════════════════════════════════════
提取结果 2: Event (时间线事件)
═══════════════════════════════════════════════════════════

{
  "event_data": "User went to the gym",           // 事件描述
  "event_tags": {
    "emotion": "happy",                            // 情感标签
    "goal": "fitness"                              // 目标标签
  },
  "embedding": [0.23, 0.56, ...],                 // 1536维向量
  "created_at": "2025-02-22T18:00:00Z"
}
```

**Profile Schema (预定义)**:
```yaml
default_profiles:
  - basic_info: [name, age, gender]
  - education: [school, major]
  - work: [title, company]
  - interests: [foods, hobbies, movies]

additional_user_profiles:  # 可扩展
  - relationships: [marital_status, family]
  - personality: [traits, preferences]
```

#### A-Mem - 结构化笔记 (Zettelkasten)

```
输入: "I've recently picked up photography as a hobby"

提取结果: 7 字段元组 m_i

┌─────────────────────────────────────────────────────────┐
│ c_i (原文)     │ "I've recently picked up photography  │
│                │  as a hobby"                          │
├────────────────┼───────────────────────────────────────┤
│ t_i (时间戳)   │ 2025-02-23T10:30:00Z                  │
├────────────────┼───────────────────────────────────────┤
│ K_i (关键词)   │ ["photography", "hobby", "recent"]    │
├────────────────┼───────────────────────────────────────┤
│ G_i (标签)     │ ["hobbies", "personal_development"]   │
├────────────────┼───────────────────────────────────────┤
│ X_i (上下文)   │ "User started a new creative hobby"  │
├────────────────┼───────────────────────────────────────┤
│ e_i (向量)     │ embed(c_i + K_i + G_i + X_i)         │
├────────────────┼───────────────────────────────────────┤
│ L_i (链接)     │ [memory_23, memory_45]               │
└────────────────┴───────────────────────────────────────┘
```

**链接建立**: embedding 找 top-k 相似 → LLM 判断语义关联 → 建立双向链接

---

### 存储方案对比

#### Vector 存储 (Embedding)

| 方案 | 存什么文本 | 向量维度 | 存储后端 |
|------|----------|---------|---------|
| **Mem0** | 原始 fact 文本 | 模型相关 | Qdrant/Pinecone/Chroma |
| **Memobase** | Event gist (压缩摘要) | 1536 | PostgreSQL + pgvector |
| **A-Mem** | c + K + G + X 拼接 | 模型相关 | 内存/PostgreSQL |

#### Profile 存储 (Memobase - PostgreSQL)

```sql
CREATE TABLE user_profiles (
  id UUID,
  project_id VARCHAR,
  user_id VARCHAR,
  topic VARCHAR,           -- 'basic_info'
  sub_topic VARCHAR,       -- 'name'
  content TEXT,            -- 'Gus'
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (id, project_id)
);
```

**优势**: SQL 查询、Sub-100ms 延迟、Schema 可预定义

#### Graph 存储 (Mem0ᵍ - Neo4j)

```cypher
// 节点
CREATE (a:Person {
  name: "Alice",
  embedding: [0.12, 0.45, ...],
  created_at: datetime()
})

// 关系
CREATE (a)-[:MET {timestamp: datetime()}]->(b)

// 查询: 多跳推理
MATCH (alice:Person {name: "Alice"})-[:MET]->(friend)-[:VISITED]->(place)
RETURN friend.name, place.name
```

---

### 方案选型建议

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| **User Profile** | Memobase 风格 (SQL) | 已知字段，SQL 查询更快 |
| **Free-form Facts** | Mem0 风格 (Vector) | 需要语义检索 |
| **时间线事件** | Memobase Timeline | 时间维度查询 |
| **知识关联** | A-Mem 风格 (Links) | 建立素材间联系 |
| **复杂推理** | Mem0ᵍ (Graph) | 多跳关系查询 |

---

### Profile Schema 定义方式

Profile 提取有两种核心策略：**预定义 Schema** vs **动态提取**

#### 对比总结

| 方案 | Schema 定义 | 提取方式 | 优缺点 |
|------|------------|---------|--------|
| **Memobase** | 预定义 + 可扩展 | LLM 往固定槽位填充 | 可控、省 token、但不灵活 |
| **Mem0** | 无 Schema (Free-form) | LLM 自由提取 facts | 灵活、但依赖 LLM 判断质量 |
| **混合方案** | 核心预定义 + 开放槽位 | 两阶段提取 | 平衡可控性和灵活性 |

#### 方案 1: Memobase - 预定义 Schema

你先定义好 topic/sub_topic 结构，LLM 只负责从对话中提取内容填入对应槽位：

```yaml
# config.yaml - 预定义 Schema
default_profiles:
  - topic: "basic_info"
    sub_topics: [name, age, gender]
  - topic: "work"
    sub_topics: [title, company, industry]

# 可扩展自定义
additional_user_profiles:
  - topic: "Gaming"
    description: "用户的游戏偏好"
    sub_topics:
      - name: "FPS"
        description: "射击游戏如 CSGO, Valorant"
```

**LLM Prompt 逻辑**:
```
Given the conversation, extract information for these predefined slots:
- basic_info/name: User's name
- basic_info/age: User's age
Only extract if explicitly mentioned. Return null if not found.
```

**优点**: Schema 可控、Token 消耗低、查询可预测 (SQL-like)

**缺点**: 无法捕获 schema 之外的信息、需要提前设计所有字段

#### 方案 2: Mem0 - 无 Schema (Free-form)

LLM 自由决定提取什么，存储为自然语言 facts：

```python
# 输入
m.add("I'm a software engineer at Google, love hiking on weekends")

# LLM 自由提取的 facts (无预定义结构)
[
  "Works as software engineer",
  "Works at Google",
  "Loves hiking",
  "Hikes on weekends"
]
```

**优点**: 最大灵活性、不需要提前设计 schema、随 LLM 能力提升而改善

**缺点**: 提取质量依赖 LLM 判断、可能冗余/重复、只能语义搜索

#### 方案 3: 混合方案 (推荐)

核心字段预定义 + 开放槽位捕获意外信息：

```typescript
interface UserProfile {
  // ========== 预定义核心字段 ==========
  core: {
    name?: string;
    targetLanguage: string;
    proficiencyLevel: string;
  };

  // ========== 开放槽位 (LLM 动态提取) ==========
  discovered: Array<{
    key: string;        // LLM 自己命名，如 "favorite_author"
    value: string;      // "村上春树"
    confidence: number; // 0.85
    source: string;     // "session_xxx"
  }>;
}
```

**两阶段提取**:

```
阶段 1: 结构化提取 (填预定义槽位)
Prompt: "Extract into these fields: name, language_level..."

阶段 2: 开放提取 (捕获其他有价值信息)
Prompt: "What other user preferences were mentioned
         that don't fit the above categories?"
输出: [{ key: "learning_motivation", value: "准备出国留学" }]
```

---

## 记忆分层架构

基于调研，典型的 LLM Agent 记忆分层：

```
┌─────────────────────────────────────────────────────┐
│                   Working Memory                     │
│          (当前对话上下文，滚动窗口)                    │
├─────────────────────────────────────────────────────┤
│                   Session Memory                     │
│       (单次会话的摘要、关键点、未完成意图)              │
├─────────────────────────────────────────────────────┤
│                   Long-Term Memory                   │
│  ┌─────────────┬─────────────┬─────────────────┐    │
│  │   Semantic  │   Episodic  │   Procedural    │    │
│  │   语义记忆   │   情景记忆   │    程序记忆      │    │
│  ├─────────────┼─────────────┼─────────────────┤    │
│  │ - 用户画像   │ - 成功案例   │ - 行为规则      │    │
│  │ - 偏好设置   │ - 练习历史   │ - 交互模式      │    │
│  │ - 知识事实   │ - 时间线事件 │ - 反馈学习      │    │
│  └─────────────┴─────────────┴─────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### LangMem 三种记忆类型

| 类型 | 描述 | 存储方式 | 示例 |
|------|------|---------|------|
| **Semantic** | 事实与知识 | Collections / Profiles | 用户偏好、知识点 |
| **Episodic** | 过去经验 | Collections + 时间戳 | 成功的对话案例 |
| **Procedural** | 行为规则 | System Instructions | "用户喜欢简洁回答" |

### 存储模式对比

| 模式 | 适用场景 | 查询方式 | 更新策略 |
|------|---------|---------|---------|
| **Collections** | 无界知识 | 语义搜索 | 插入/更新/删除 |
| **Profiles** | 固定属性 | 直接查找 | 覆盖更新 |

---

## Echo 记忆方案设计

### 当前 Echo 记忆内容

| 内容类型 | 当前状态 | 建议分层 | 建议方案 |
|---------|---------|---------|---------|
| **Raw Materials** | ✅ Loro CRDT | 外部数据源 | - |
| **Activation Cards** | ✅ 阅后即焚 | Working Memory | 不持久化 |
| **Session 对话** | ✅ 已实现 | Session Memory | Background 提取 |
| **Artifacts** | ✅ 已实现 | Episodic Memory | Collections (Vector) |
| **User Profile** | ✅ 已实现 | Semantic Memory | Profiles (SQL-like) |
| **Growth Tracking** | ✅ 已实现 | Timeline | Events + 时间索引 |

### L1: Working Memory（工作记忆）

对话进行中的实时状态，包括断点恢复和 Context 构造。

#### StreamSnapshot (断点恢复)

```typescript
interface StreamSnapshot {
  sessionId: string;
  turnCount: number;
  lastUserMessage: string;
  lastEchoResponse: string;
  topic?: string;
  materialIds: string[];
  cardAnchor?: string;
  timestamp: number;
}
```

- **触发时机**：每 5 轮对话自动保存
- **存储位置**：localStorage
- **TTL**：1 小时内可恢复

#### WorkingContext (上下文构造)

从 Long-term Memory 召回相关内容，构造当前对话的上下文：

```typescript
interface WorkingContext {
  sessionId: string;

  // 当前对话状态
  currentTopic?: string;
  currentMaterialIds: string[];
  turnCount: number;

  // ====== 从 Long-term Memory 召回的 Context ======
  assembledContext: {
    // 相关素材 (基于话题/语义相似)
    relevantMaterials: Array<{
      materialId: string;
      relevanceScore: number;
      snippet: string;
    }>;

    // 相关表达 (用户之前的 artifacts)
    relevantArtifacts: Array<{
      artifactId: string;
      content: string;
      similarity: number;
    }>;

    // 推荐激活的词汇 (见过但没用过)
    suggestedVocabulary: Array<{
      term: string;
      exampleContext: string;
      reason: string;  // "你在素材中见过3次，试着用一下"
    }>;

    // 话题熟练度 (用于调整难度)
    topicProficiency?: {
      level: 'beginner' | 'intermediate' | 'fluent';
      fluentExpressions: string[];
      weakPoints: string[];
    };

    // 用户画像摘要 (用于 AI prompt)
    userProfileSummary: string;
  };

  // 上次构造时间
  assembledAt: number;
}
```

**Context 构造流程**:

```
用户开始对话 / 输入话题
    ↓
[Context Assembly]
    ├── 语义搜索相关 Materials (向量相似度)
    ├── 语义搜索相关 Artifacts (之前的表达)
    ├── 查询 TopicProficiency (话题熟练度)
    ├── 查询 VocabularyInsight.recommendedToActivate
    └── 生成 UserProfile 摘要
    ↓
注入到 AI Prompt 中，实现个性化对话
```

**存储**: 内存 (不持久化，每次 session 开始时构造)

### L2: Session Memory（会话状态）

每次会话结束时生成的总结，保存讨论主题和共识。

```typescript
interface SessionMemory {
  id: string;
  sessionId: string;
  topic?: string;
  turnCount: number;
  summary: string;
  status: 'completed' | 'abandoned';
  artifactId?: string;
  materialIds: string[];
  createdAt: number;
  exitedAt: number;

  // TODO: 扩展字段
  consensusPoints?: string[];     // 已达成的共识
  openQuestions?: string[];       // 未完成的问题
  keyInsights?: string[];         // 关键洞察（AI 提取）
}
```

- **触发时机**：用户点击 Save 或 Exit 时
- **存储位置**：Loro + IndexedDB
- **提取方式**：Background (会话结束后异步提取)

### L3: Canonical Memory（知识沉淀）

> ✅ 已实现

跨会话的知识沉淀，构建用户画像。

#### User Profile (Semantic Memory)

采用 **混合方案**: 核心字段预定义 + 开放槽位动态发现

```typescript
interface EchoUserProfile {
  id: string;
  userId: string;

  // ====== 核心字段 (预定义，必填/手动设置) ======
  learning: {
    targetLanguage: string;           // 必填: 目标语言
    nativeLanguage: string;           // 必填: 母语
    proficiencyLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';  // 水平
  };

  // ====== 偏好字段 (预定义，可选，可从对话中提取) ======
  preferences: {
    topics?: string[];                // 偏好话题 ["旅行", "科技"]
    expressionStyle?: 'casual' | 'formal' | 'humorous';
    learningGoals?: string[];         // 学习目标
    sessionLength?: number;           // 偏好时长(分钟)
  };

  // ====== 动态发现 (LLM 开放提取) ======
  insights: Array<{
    category: 'strength' | 'weakness' | 'interest' | 'goal' | 'habit' | 'other';
    content: string;                  // "倾向于使用简单句型"
    confidence: number;               // 0.0 - 1.0
    source: string;                   // 来源 session_id
    firstMentioned: number;           // 首次发现时间
    lastMentioned: number;            // 最近提及时间
    mentionCount: number;             // 提及次数
  }>;

  createdAt: number;
  updatedAt: number;
}
```

**字段设计理由**:

| 字段 | 为什么这样设计 |
|------|---------------|
| `learning.*` | 核心功能依赖，必须明确，用户手动设置 |
| `preferences.*` | 已知会用到，值开放，可手动或 LLM 提取 |
| `insights[]` | 无法预测用户会暴露什么，LLM 开放捕获 |

**Insights Category 策略** (借鉴 MemU):

采用 **预定义 Category + 兜底 other**，LLM 只做分配不创建新类：

```typescript
// 预定义的 Insight 分类 (语言学习专用)
type InsightCategory =
  | 'strength'      // 优势: "词汇量丰富"
  | 'weakness'      // 弱点: "时态使用不准确"
  | 'interest'      // 兴趣: "对科技话题感兴趣"
  | 'goal'          // 目标: "准备雅思考试"
  | 'habit'         // 习惯: "喜欢用简单句"
  | 'other';        // 兜底: 不属于以上的发现

// LLM Prompt
`从对话中提取用户的学习特点，分类到以下类别:
- strength: 用户的语言优势
- weakness: 需要提升的地方
- interest: 感兴趣的话题
- goal: 学习目标
- habit: 表达习惯
- other: 其他发现

只能选择以上类别，不要创建新类别。`
```

**为什么预定义**:
- 语言学习场景的分析维度是已知的
- 便于在 Insights 页面按类别展示
- 避免 LLM 创建重复/无意义的分类
- `other` 作为兜底，不丢失意外发现

**提取流程**:

```
Session 结束
    ↓
阶段 1: 结构化提取 (填 preferences 槽位)
    Prompt: "从对话中提取: 用户偏好的话题、表达风格、学习目标..."
    ↓
阶段 2: 开放提取 (发现新 insights)
    Prompt: "用户还表现出哪些学习特点、优势、弱点？"
    输出: [{ category: "weakness", content: "时态使用不够准确" }]
    ↓
合并到 UserProfile (去重、更新 mentionCount)
```

**存储**: IndexedDB

**更新策略**:
- `learning.*`: 用户手动设置，覆盖更新
- `preferences.*`: LLM 提取或手动，覆盖更新
- `insights[]`: 追加或合并（相似内容增加 mentionCount）

#### Learning State (学习状态)

追踪用户的学习进度、计划和节奏：

```typescript
interface LearningState {
  userId: string;

  // 当前学习焦点
  currentFocus?: {
    topic: string;                // 当前在学的话题
    targetExpressions?: string[]; // 想掌握的表达
    startedAt: number;
  };

  // 学习计划 (用户可设置)
  learningPlan?: {
    goals: Array<{
      description: string;        // "掌握旅行相关表达"
      targetDate?: number;
      progress: number;           // 0-100
      relatedTopics: string[];
    }>;
    weeklyTarget?: {
      sessionsPerWeek: number;
      minutesPerSession: number;
    };
  };

  // 学习节奏统计 (自动计算)
  rhythm: {
    lastPracticeAt: number;
    streakDays: number;           // 连续练习天数
    totalSessions: number;
    totalMinutes: number;
    averageSessionLength: number;
    practicesByWeekday: number[]; // [周日, 周一, ..., 周六]
  };

  updatedAt: number;
}
```

**更新时机**: 每次 Session 结束时自动更新 rhythm

**用途**:
- 显示学习进度和连续天数
- 提醒用户保持学习节奏
- 评估学习计划完成度

#### Topic Proficiency (话题熟练度)

按话题追踪用户的表达能力，识别优势和薄弱点：

```typescript
interface TopicProficiency {
  userId: string;

  // 按话题的熟练度
  topics: Array<{
    topic: string;                // "旅行", "工作", "科技"

    // 熟练度指标
    proficiencyLevel: 'beginner' | 'intermediate' | 'fluent';

    // 数据支撑 (自动统计)
    stats: {
      sessionsCount: number;        // 在此话题练习次数
      artifactsCount: number;       // 产出表达数
      vocabularyActive: number;     // 主动使用的词汇数
      vocabularyMastered: number;   // 掌握的词汇数
      lastPracticeAt: number;
    };

    // 能流利使用的表达 (从 artifacts 中提取)
    fluentExpressions: string[];

    // 薄弱点 (从 insights 中提取)
    weakPoints: string[];
  }>;

  // 整体评估 (定期更新)
  overallAssessment: {
    strongTopics: string[];       // 优势话题 (fluent)
    growingTopics: string[];      // 进步中的话题 (intermediate)
    weakTopics: string[];         // 薄弱话题 (beginner + 长期未练)
    recommendedFocus: string;     // 建议下一步聚焦的话题
    assessmentReason: string;     // AI 生成的评估说明
  };

  updatedAt: number;
}
```

**熟练度判定规则**:
```
beginner:     sessionsCount < 3 或 vocabularyActive < 10
intermediate: sessionsCount >= 3 且 vocabularyActive >= 10
fluent:       sessionsCount >= 10 且 vocabularyMastered >= 20 且 artifactsCount >= 5
```

**更新时机**:
- 每次 Session 结束时更新对应话题的 stats
- 定期 (每周) 重新评估 proficiencyLevel 和 overallAssessment

**用途**:
- Insights 页面展示优势/薄弱话题
- 推荐练习内容 (优先薄弱话题)
- 在对话中调整难度 (根据熟练度)

#### Artifacts (Episodic Memory)

用户主动保存的精炼表达：

```typescript
interface EchoArtifact {
  id: string;
  content: string;           // 用户最终表达
  contentEn?: string;        // 英文版本
  materialIds: string[];     // 关联的原始素材
  anchor?: string;           // emotionalAnchor 摘要

  // 元数据
  topic?: string;
  tags?: string[];

  // 向量 (用于语义检索)
  embedding?: number[];

  createdAt: number;
  sessionId: string;
}
```

**存储**: Loro + IndexedDB + 本地向量索引

**查询**: 语义搜索 + 素材关联

#### Growth Tracking (Timeline)

练习历史和成长轨迹：

```typescript
interface GrowthEvent {
  id: string;
  userId: string;

  // 事件信息
  eventType: 'practice' | 'milestone' | 'achievement';
  eventData: string;                  // 事件描述
  eventTags: Record<string, string>;  // 标签 (topic, emotion, etc.)

  // 关联
  sessionId?: string;
  artifactId?: string;
  materialIds?: string[];

  // 时间
  createdAt: number;

  // 向量 (用于语义检索)
  embedding?: number[];
}
```

**存储**: Loro + IndexedDB

**查询**: 时间范围 + 语义搜索

#### Vocabulary Memory (词汇记忆)

用于追踪用户的主动词汇 vs 被动词汇，支持学习分析和个性化。

**设计原则**:
- **全量存储**: 保留用户所有原始发言，支持完整回溯
- **提取并行**: 同时维护 VocabularyRecord，支持高效查询
- **用户可控**: 支持手动导出/删除原始数据

##### UserUtterance (用户发言记录)

```typescript
interface UserUtterance {
  id: string;
  sessionId: string;

  // 原始内容
  content: string;              // 用户原话
  contentEn?: string;           // 英文翻译 (如果原话是中文)

  // 上下文
  turnIndex: number;            // 第几轮对话
  replyTo?: string;             // 回复的 AI 消息 ID
  topic?: string;               // 话题

  // 关联
  materialIds?: string[];       // 引用了哪些素材

  // 提取状态
  vocabularyExtracted: boolean; // 是否已提取词汇

  // 向量 (用于语义分析)
  embedding?: number[];         // 分析话题分布、评估表达质量

  createdAt: number;
}
```

**存储**: Loro + IndexedDB (全量保存)

**存储估算**: ~200 bytes/条 (不含 embedding)，每日 50 条 ≈ 10KB，每年 ≈ 3.6MB

##### VocabularyRecord (词汇使用记录)

```typescript
interface VocabularyRecord {
  id: string;

  // 词汇/表达
  term: string;                 // "take into account"
  termType: 'word' | 'phrase' | 'expression' | 'sentence_pattern';
  normalized: string;           // 标准化形式 (词根/原形)

  // ====== 被动来源 (素材中见过) ======
  passiveCount: number;         // 在素材中出现次数
  passiveSources: Array<{
    materialId: string;
    context: string;            // 素材中的上下文例句
    seenAt: number;
  }>;

  // ====== 主动使用 (用户发言中用过) ======
  activeCount: number;          // 用户主动使用次数
  activeUsages: Array<{
    utteranceId: string;        // 关联到原始发言
    sessionId: string;
    context: string;            // 用户使用时的句子
    usedAt: number;
  }>;

  // 状态
  status: 'passive' | 'activated' | 'mastered';
  // passive: 只在素材中见过，从未使用
  // activated: 使用过 1-2 次
  // mastered: 使用过 3+ 次，或用户标记

  // 时间线
  firstSeen: number;            // 首次在素材中见到
  firstUsed?: number;           // 首次主动使用
  lastUsed?: number;            // 最近使用

  // 用户标记
  userMarked?: 'known' | 'learning' | 'ignore';
}
```

**存储**: Loro + IndexedDB

**状态流转**:
```
素材导入 → passive (见过)
    ↓
用户使用 1 次 → activated (激活)
    ↓
用户使用 3+ 次 → mastered (掌握)
```

##### VocabularyInsight (词汇分析摘要)

```typescript
interface VocabularyInsight {
  userId: string;

  // 总体统计
  stats: {
    totalPassive: number;       // 被动词汇总数 (见过)
    totalActive: number;        // 主动词汇总数 (用过)
    totalMastered: number;      // 已掌握数量
    activationRate: number;     // 激活率 = active / passive
  };

  // 分类统计
  byType: {
    word: { passive: number; active: number; mastered: number };
    phrase: { passive: number; active: number; mastered: number };
    expression: { passive: number; active: number; mastered: number };
  };

  // 推荐激活 (高频见过但从未用过)
  recommendedToActivate: Array<{
    term: string;
    passiveCount: number;       // 见过几次
    lastSeen: number;
    exampleContext: string;
  }>;

  // 近期进步
  recentProgress: {
    newlyActivated: string[];   // 最近激活的词汇
    newlyMastered: string[];    // 最近掌握的词汇
    periodStart: number;
    periodEnd: number;
  };

  updatedAt: number;
}
```

**更新频率**: 每次 Session 结束后异步更新

##### 数据导出

支持用户手动导出全量数据：

```typescript
interface VocabularyExport {
  exportedAt: number;
  version: string;

  // 全量数据
  utterances: UserUtterance[];      // 所有用户发言
  vocabularyRecords: VocabularyRecord[];  // 所有词汇记录

  // 统计快照
  insight: VocabularyInsight;
}

// 导出格式: JSON 文件，可存储到本地或 iCloud
// 文件名: echo-vocabulary-export-{date}.json
```

**导出后**:
- 用户可选择清理原始 UserUtterance（释放空间）
- VocabularyRecord 保留（功能和分析依赖）
- 导出文件用户自行保管，支持迁移

##### 提取流程

```
用户发送消息
    ↓
[实时] 保存 UserUtterance 到 IndexedDB
    ↓
[Background] 词汇提取 (Session 结束后)
    ├── 分词/短语识别 (可用 NLP 库或 LLM)
    ├── 标准化 (lemmatization)
    └── 更新 VocabularyRecord
           ├── 已存在 → 增加 activeCount, 添加 activeUsages
           └── 不存在 → 创建新记录 (status: activated)
    ↓
[Background] 更新 VocabularyInsight 统计
    ↓
[可选] 触发推荐: "你见过 X 词 5 次了，试着用一下？"
```

---

## 数据流

### 素材导入流程

```
用户导入素材
    ↓
[Material] 保存到 Loro + IndexedDB
    ↓
[Background] 词汇提取
    ├── 分词/短语识别
    └── 创建/更新 VocabularyRecord (passiveCount++)
    ↓
更新 VocabularyInsight.totalPassive
```

### 对话流程

```
用户开始对话 / 选择话题
    ↓
[Context Assembly] 构造 WorkingContext
    ├── 语义搜索相关 Materials
    ├── 语义搜索相关 Artifacts
    ├── 查询 TopicProficiency (当前话题熟练度)
    ├── 查询 VocabularyInsight.recommendedToActivate
    └── 生成 UserProfile 摘要
    ↓
[Working] WorkingContext 注入 AI Prompt，开始对话
    ↓
[实时] 每条用户消息 → 保存 UserUtterance 到 IndexedDB
    ↓
[L1] 每 5 轮 → 保存 StreamSnapshot 到 localStorage
    ↓
用户点击 Save
    ↓
[Artifact] 保存用户表达到 Loro (生成 embedding)
    ↓
[L2] 保存 SessionMemory 到 Loro
    ↓
[Background] 异步提取和更新:
    ├── 更新 EchoUserProfile
    │   ├── 提取 preferences (如果有新发现)
    │   └── 提取 insights (优势/弱点/习惯)
    ├── 更新 LearningState
    │   ├── rhythm.lastPracticeAt = now
    │   ├── rhythm.totalSessions++
    │   └── rhythm.streakDays (计算连续天数)
    ├── 更新 TopicProficiency
    │   ├── topics[话题].stats.sessionsCount++
    │   ├── topics[话题].stats.artifactsCount++
    │   └── 重新评估 proficiencyLevel
    ├── 创建 GrowthEvent (记录练习事件)
    ├── 建立 Artifact ↔ Material 关联
    └── 词汇提取:
        ├── 从 UserUtterance 提取词汇
        ├── 更新 VocabularyRecord (activeCount++)
        ├── 更新 VocabularyInsight 统计
        └── 更新 TopicProficiency.vocabularyActive
    ↓
清除 StreamSnapshot
```

### 定期任务

```
[每周] 整体评估更新
    ├── 重新评估所有话题的 proficiencyLevel
    ├── 更新 TopicProficiency.overallAssessment
    │   ├── 识别 strongTopics / weakTopics
    │   └── 生成 recommendedFocus
    └── 更新 LearningState.learningPlan.progress
```

### 数据导出流程

```
用户请求导出
    ↓
收集数据:
    ├── 所有 UserUtterance
    ├── 所有 VocabularyRecord
    └── 当前 VocabularyInsight
    ↓
生成 JSON 文件: echo-vocabulary-export-{date}.json
    ↓
用户保存到本地/iCloud
    ↓
[可选] 用户选择清理原始 UserUtterance
    └── VocabularyRecord 保留 (功能依赖)
```

---

## 数据模型总览

### 按记忆层级

| 层级 | 数据模型 | 存储 | 说明 |
|------|---------|------|------|
| **L1 Working** | StreamSnapshot | localStorage | 断点恢复，1h TTL |
| **L1 Working** | WorkingContext | 内存 | Context 构造，不持久化 |
| **L2 Session** | SessionMemory | Loro + IDB | 会话记录和总结 |
| **L3 Profile** | EchoUserProfile | Loro + IDB | 用户画像 (偏好 + insights) |
| **L3 Learning** | LearningState | Loro + IDB | 学习状态、计划、节奏 |
| **L3 Topic** | TopicProficiency | Loro + IDB | 话题熟练度 |
| **L3 Artifacts** | EchoArtifact | Loro + IDB | 精炼表达 |
| **L3 Growth** | GrowthEvent | Loro + IDB | 成长事件时间线 |

### 按内容类型

| 类型 | 数据模型 | 说明 |
|------|---------|------|
| **原始素材** | RawMaterial | 被动输入 (被动词汇来源) |
| **用户发言** | UserUtterance | 主动输出 (全量保存) |
| **词汇记录** | VocabularyRecord | 主动/被动词汇追踪 |
| **词汇统计** | VocabularyInsight | 分析摘要和推荐 |

### Long-term Memory 结构

```
Long-term Memory (L3)
├── User-based (基于用户画像)
│   ├── EchoUserProfile       # 偏好、学习目标、insights
│   ├── LearningState         # 学习状态、计划、节奏
│   └── TopicProficiency      # 话题熟练度、优势/薄弱点
│
└── Content-based (基于语料和表达)
    ├── RawMaterial           # 原始素材 (被动输入)
    ├── UserUtterance         # 用户发言 (主动输出)
    ├── EchoArtifact          # 精炼表达 (沉淀产物)
    ├── VocabularyRecord      # 词汇使用记录
    └── VocabularyInsight     # 词汇分析摘要
```

---

## 个性化推荐场景

| 场景 | 数据来源 | 推荐逻辑 |
|------|---------|---------|
| **推荐练习话题** | TopicProficiency.weakTopics | 薄弱话题优先，长期未练的话题 |
| **推荐素材** | RawMaterial + 当前话题 | 语义相似 + 未在练习中使用过 |
| **推荐词汇** | VocabularyInsight.recommendedToActivate | 见过多次但没用过的词汇 |
| **推荐表达** | EchoArtifact + 当前话题 | 相关话题的成功表达作为参考 |
| **调整难度** | TopicProficiency.proficiencyLevel | 根据熟练度调整表达复杂度 |
| **生成 Insights** | TopicProficiency + VocabularyInsight | 薄弱点 vs 流利领域的对比分析 |
| **学习计划** | LearningState + TopicProficiency | 基于目标和当前状态制定 |

---

## Embedding 使用方案

### 哪些数据有 Embedding

| 数据模型 | 有 Embedding | 用途 |
|---------|-------------|------|
| **RawMaterial** | ✅ | 语义搜索、去重检测、聚类分析 |
| **EchoArtifact** | ✅ | 语义搜索、相关推荐 |
| **UserUtterance** | ✅ | 话题分布分析、表达质量评估 |
| **GrowthEvent** | ✅ | 语义搜索历史事件 |
| VocabularyRecord | ❌ | 结构化数据，不需要 |
| EchoUserProfile | ❌ | 结构化数据，直接查询 |

### Embedding 生成时机

| 数据 | 生成时机 | 模型 |
|------|---------|------|
| RawMaterial | 导入时 | all-MiniLM-L6-v2 (本地 WASM) |
| EchoArtifact | 保存时 | all-MiniLM-L6-v2 (本地 WASM) |
| UserUtterance | Session 结束后 (Background) | all-MiniLM-L6-v2 (本地 WASM) |
| GrowthEvent | 创建时 | all-MiniLM-L6-v2 (本地 WASM) |

### 向量索引设计

```typescript
// 分开的向量索引 (本地存储)
interface VectorIndex {
  add(id: string, embedding: number[]): void;
  search(query: number[], topK: number): Array<{id: string, similarity: number}>;
  remove(id: string): void;
}

// 按数据类型分开索引
const indices = {
  materials: new VectorIndex('materials'),
  artifacts: new VectorIndex('artifacts'),
  utterances: new VectorIndex('utterances'),
  events: new VectorIndex('events'),
};
```

### Embedding 应用场景

#### 1. Context Assembly (核心用途)

对话开始时从 Long-term Memory 召回相关内容：

```typescript
async function assembleContext(topic: string): Promise<WorkingContext> {
  const topicEmbedding = await generateEmbedding(topic);

  return {
    // 语义搜索相关素材
    relevantMaterials: await indices.materials.search(topicEmbedding, 5),

    // 语义搜索相关表达 (用户之前的成功表达)
    relevantArtifacts: await indices.artifacts.search(topicEmbedding, 3),

    // 用户在此话题的历史发言
    relevantUtterances: await indices.utterances.search(topicEmbedding, 3),
  };
}
```

#### 2. 素材导入去重

```typescript
async function checkDuplicate(content: string): Promise<{isDuplicate: boolean, similarId?: string}> {
  const embedding = await generateEmbedding(content);
  const results = await indices.materials.search(embedding, 1);

  if (results[0]?.similarity > 0.95) {
    return { isDuplicate: true, similarId: results[0].id };
  }
  return { isDuplicate: false };
}
```

#### 3. 素材聚类 (Insights Territory 可视化)

```typescript
// 基于 embedding 聚类，用于 Insights 页面的 Territory 展示
async function clusterMaterials(): Promise<Cluster[]> {
  const materials = await getAllMaterials();
  const embeddings = materials.map(m => m.embedding);

  // K-means 或 HDBSCAN 聚类
  return cluster(embeddings, { method: 'kmeans', k: 10 });
}
```

#### 4. 话题分布分析

```typescript
// 分析用户表达覆盖的话题分布
async function analyzeTopicDistribution(userId: string): Promise<TopicDistribution> {
  const utterances = await getUserUtterances(userId);
  const embeddings = utterances.map(u => u.embedding);

  // 聚类用户发言，识别用户常表达的话题
  const clusters = cluster(embeddings);

  // 与素材聚类对比，找出"覆盖"和"空白"领域
  const materialClusters = await clusterMaterials();

  return {
    coveredTopics: findOverlap(clusters, materialClusters),
    uncoveredTopics: findGaps(clusters, materialClusters),
  };
}
```

#### 5. 表达质量评估

```typescript
// 评估用户表达是否在"运用"素材，而非简单复述
async function evaluateExpression(utterance: UserUtterance): Promise<ExpressionQuality> {
  const similarMaterials = await indices.materials.search(utterance.embedding, 3);

  const avgSimilarity = average(similarMaterials.map(m => m.similarity));

  if (avgSimilarity > 0.9) {
    return { quality: 'copying', feedback: '尝试用自己的话重新表达' };
  } else if (avgSimilarity > 0.6) {
    return { quality: 'adapting', feedback: '很好地运用了素材内容' };
  } else {
    return { quality: 'original', feedback: '原创表达' };
  }
}
```

### 与 Mem0 方案对比

| 维度 | Mem0 | Echo |
|------|------|------|
| **存储内容** | 自然语言 facts | 结构化数据 + 原始内容 |
| **向量存储** | Qdrant/Pinecone (云端) | 本地 IndexedDB + 向量索引 |
| **检索方式** | 纯向量搜索 | 结构化查询 + 向量搜索混合 |
| **召回策略** | 全量 memories 搜索 | 按数据类型分索引搜索 |

**Echo 的混合方案优势**:
- 结构化数据 (Profile, Vocabulary) 用直接查询，快速精确
- 非结构化内容 (Material, Artifact, Utterance) 用向量搜索，语义召回
- 本地存储，无需网络，隐私友好

---

## 实现路线

### Phase 1: Artifacts 基础版 ✅

- [x] EchoArtifact 数据模型 (`packages/core/models/artifact.ts`)
- [x] 保存时生成 embedding (`apps/web/src/lib/store/materials.ts`)
- [x] 基础语义搜索 (`apps/web/src/lib/embedding.ts`: `searchArtifacts`, `findSimilarArtifacts`, `searchAll`)
- [x] 关联素材展示 (通过 `materialIds` 字段)

### Phase 2: User Profile + Learning State ✅

- [x] EchoUserProfile 数据模型 (混合 Schema) (`packages/core/models/user-profile.ts`)
- [x] LearningState 数据模型 (`packages/core/models/learning-state.ts`)
- [x] Loro 存储操作 (`apps/web/src/lib/loro.ts`: `saveUserProfile`, `saveLearningState`)
- [x] Zustand store (`apps/web/src/lib/store/user.ts`)
- [x] 手动设置界面 (Settings.tsx 中的 Learning Profile 区块)
- [x] Session 结束时更新学习节奏 (`recordSession` in Session.tsx)
- [x] 学习节奏统计 (streak, totalSessions, practicesByWeekday)
- [ ] Session 结束时自动提取 insights (需要 LLM 集成，移至 Phase 5)

### Phase 3: Topic Proficiency ✅

- [x] TopicProficiency 数据模型 (`packages/core/models/topic-proficiency.ts`)
- [x] Loro 存储操作 (`apps/web/src/lib/loro.ts`: `saveTopicProficiency`, `getTopicProficiency`)
- [x] Session 结束时更新话题 stats (`recordSession` 自动更新)
- [x] 熟练度自动判定 (`determineProficiencyLevel` 基于 sessions/vocabulary/artifacts)
- [x] 整体评估生成 (`generateOverallAssessment` 识别优势/薄弱话题)

### Phase 4: Growth Tracking ✅

- [x] GrowthEvent 数据模型 (`packages/core/models/growth-event.ts`)
- [x] Loro 存储操作 (`apps/web/src/lib/loro.ts`: `addGrowthEvent`, `getAllGrowthEvents`)
- [x] 自动创建事件: practice, streak, topic_started, topic_leveled
- [x] 时间线查询 API (`getGrowthEvents`, `getRecentMilestones`)
- [ ] 整合到 Insights 展示 (UI 待实现)

### Phase 5: Vocabulary Memory ✅

- [x] UserUtterance 数据模型 (`packages/core/models/vocabulary.ts`)
- [x] VocabularyRecord 数据模型 (`packages/core/models/vocabulary.ts`)
- [x] Loro 存储操作 (`apps/web/src/lib/loro/vocabulary.ts`)
- [x] Vocabulary store (`apps/web/src/lib/store/vocabulary.ts`)
- [x] Session.tsx 集成 - 实时保存用户发言
- [x] VocabularyInsight 统计生成 (`generateInsight`)
- [x] 主动/被动词汇记录 (`recordPassiveVocabulary`, `recordActiveVocabulary`)
- [x] 推荐激活词汇 (`getRecommendedToActivate`)
- [x] 词汇提取 pipeline - compromise.js 词性还原 (`apps/web/src/lib/vocabulary-extraction.ts`)
- [x] 素材导入时提取被动词汇 (`schedulePassiveVocabularyExtraction` in `background-extraction.ts`)
- [x] 数据导出功能 (`apps/web/src/lib/data-export.ts`)
- [ ] 数据导出 UI (Settings 页面添加导出按钮)

### Phase 6: 智能提取 & 个性化 ✅

- [x] Background 提取 pipeline (`apps/web/src/lib/background-extraction.ts`)
- [x] LLM 词汇提取 (`apps/web/src/lib/vocabulary-extraction.ts`: `extractVocabularyWithLLM`)
- [x] 本地词汇提取 fallback (`extractVocabularyLocal` - 使用 compromise.js)
- [x] 词性还原 lemmatization (`lemmatize`, `lemmatizePhrase`)
- [x] LLM Profile insights 提取 (`extractProfileInsights`)
- [x] Session 结束自动触发后台提取 (`scheduleBackgroundExtraction` in Session.tsx)
- [x] 素材被动词汇提取 - 队列批处理 (`processMaterialExtractionQueue`)
- [ ] 跨 Session 高级模式分析 (表达风格演变、词汇趋势等 - 后续优化)
- [ ] Insights 页面集成 (UI 待实现)

### Phase 7: UI 集成 (待实现)

- [ ] Insights 页面 - 可视化展示 vocabulary/profile/growth 数据
- [ ] 数据导出 UI - Settings 中添加导出/导入按钮
- [ ] 词汇推荐 UI - Session 中展示推荐激活的词汇

### 代码结构

重构后的模块化结构：

```
apps/web/src/lib/
├── loro/                    # Loro CRDT 存储层 (从 loro.ts 拆分)
│   ├── types.ts            # 所有 Loro 类型定义
│   ├── core.ts             # 核心文档管理
│   ├── materials.ts        # 素材 CRUD
│   ├── artifacts.ts        # Artifact CRUD
│   ├── sessions.ts         # Session Memory 操作
│   ├── user-profile.ts     # User Profile 存储
│   ├── proficiency.ts      # Topic Proficiency 存储
│   ├── growth.ts           # Growth Events 存储
│   ├── vocabulary.ts       # Vocabulary 存储
│   └── index.ts            # 统一导出
├── store/
│   ├── materials.ts        # Materials Zustand store
│   ├── vocabulary.ts       # Vocabulary Zustand store
│   └── user/               # User store (从 user.ts 拆分)
│       ├── types.ts        # 类型定义
│       ├── converters.ts   # Loro ↔ Store 转换器
│       ├── helpers.ts      # 辅助函数
│       └── index.ts        # Store 实现
├── background-extraction.ts # 后台提取 pipeline (含素材被动词汇队列)
├── vocabulary-extraction.ts # 词汇提取 (LLM + compromise.js fallback)
└── data-export.ts           # 数据导出/导入功能
```

---

## 参考资料

### 论文 & 研究

- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413)
- [A-Mem: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110)
- [LOCOMO Benchmark](https://snap-research.github.io/locomo/)

### 开源项目

- [Mem0 GitHub](https://github.com/mem0ai/mem0)
- [MemU GitHub](https://github.com/NevaMind-AI/memU)
- [Memobase GitHub](https://github.com/memodb-io/memobase)
- [LangMem Docs](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)

### Echo 相关文档

- [产品设计 v2](./product-design-v2.md)
- [同步架构](./sync-architecture.md)
- [Insights 设计](./insights-design.md)
