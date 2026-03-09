# Echo Mobile 产品方案

> 最后更新: 2026-03-09
>
> 核心定位: **Turn your photos into language practice.**
>
> 依赖文档: [product-philosophy.md](./product-philosophy.md) | [product-design-v2.md](./product-design-v2.md) | [sync-architecture.md](./sync-architecture.md)

## 一、设计原则

### 照片是语境，表达是目标

Echo Mobile 以用户的**个人照片**作为核心素材来源，驱动"视觉 → 语言表达 → 反馈 → 再表达"的学习闭环。

与 Web 端的关系：

| 维度 | Web 端 | Mobile 端 |
|------|--------|-----------|
| 素材来源 | 文字摘录、笔记、文件导入 | **相册照片、截图** |
| 激活形式 | 文字 Activation Card | **照片 + 视觉标注** Activation Card |
| 练习方式 | 文字对话 | 文字 + **语音**对话 |
| 数据同步 | iCloud + Loro CRDT | 同架构，共享素材库 |

### 与 Web 端一致的核心理念

- **激活（Activation）**，不是教学（Lesson）
- **自然对话**，不是评分打卡
- **只有表达过的内容才会被留下** — 照片是邀请函，Artifact 才是作品
- Echo Companion 的角色不变：温和、好奇、支持，不纠错、不打分

---

## 二、产品结构

四个 Tab，与 Web 端模块对应：

```
┌─────────────────────────────────────────────────────┐
│                    Echo Mobile                       │
├──────────┬──────────┬──────────┬────────────────────┤
│  Today   │ Practice │ Insights │      Library       │
└──────────┴──────────┴──────────┴────────────────────┘
```

---

## 三、Today — 每日照片激活

### 3.1 核心体验

打开 Echo，看到今天的 **Photo Activation Card**。

```
┌─────────────────────────────────────┐
│                                     │
│          [  Photo  ]                │
│                                     │
│    ┌─ shore ─┐  ┌─ golden light ─┐ │
│    └─────────┘  └────────────────┘ │
│         ┌─ walking along ─┐        │
│         └─────────────────┘        │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  "A quiet evening by the shore —   │
│   the kind of moment you'd want    │
│   to tell someone about."          │
│                                     │
│  💡 shore · golden light · breeze  │
│     stroll · peaceful              │
│                                     │
│         [ Start Echo ]              │
│                                     │
└─────────────────────────────────────┘
```

### 3.2 卡片结构

Photo Activation Card 是 Web 端 Activation Card 的视觉化扩展：

```typescript
interface PhotoActivationCard {
  // 基础信息（与 Web 端 ActivationCard 兼容）
  id: string;
  materialIds: string[];        // 关联的照片素材 ID
  createdAt: number;

  // 照片信息
  photo: {
    assetId: string;            // PHAsset identifier
    thumbnailUri: string;       // 本地缓存路径
    takenAt?: number;           // 拍摄时间
    location?: string;          // 拍摄地点（如有）
  };

  // AI 场景理解
  sceneAnalysis: {
    objects: string[];          // 识别到的物体/元素
    actions: string[];          // 正在发生的动作
    mood: string;               // 氛围/情绪
    setting: string;            // 场景描述
  };

  // 激活内容（与 Web 端结构一致）
  emotionalAnchor: string;      // 情感锚点 — "A quiet evening by the shore..."
  expressions: string[];        // 推荐表达 — 来自用户素材库中见过但没用过的词汇
  invitation: string;           // 表达邀请 — 温和的开放式问题

  // 视觉标注
  annotations: Array<{
    word: string;               // 标注词汇
    position: { x: number; y: number }; // 相对位置 (0-1)
  }>;
}
```

### 3.3 照片选择策略

系统从相册中智能选择"适合激活表达"的照片：

**选择来源（按优先级）：**

1. 今天拍摄的照片
2. 最近 3 天的照片
3. "去年今天"的照片（时间回忆触发）
4. 从未在 Echo 中使用过的照片

**可描述性评估（内部逻辑，不展示给用户）：**

```
高可描述性（优先选择）：
  ✓ 人物活动（eating, walking, talking）
  ✓ 场景（restaurant, park, office）
  ✓ 食物
  ✓ 旅行/户外
  ✓ 社交场合

低可描述性（降低权重）：
  ✗ 纯文字截图 → 走 OCR 截图学习路径
  ✗ 模糊/暗光照片
  ✗ 近期已用过的相似照片
  ✗ 纯色/无内容图片
```

**实现方式：**
- iOS: Vision framework（场景分类、物体检测）
- 本地计算，不上传照片
- 缓存分析结果，避免重复计算

### 3.4 与用户素材库的关联

这是 Echo 区别于"看图说话"工具的关键：

```
用户拍了一张海边照片
         ↓
Vision 识别: beach, sunset, people, walking
         ↓
查询素材库: 用户之前积累过哪些相关表达？
  - "shore" (见过 3 次，从未使用)
  - "golden hour" (见过 1 次)
  - "take a stroll" (在一篇文章中标记过)
         ↓
生成 Activation Card 时融入这些素材
  → expressions 字段包含这些词汇
  → invitation 引导用户使用这些表达
```

### 3.5 截图素材的处理

截图类照片走不同的激活路径：

```
截图（文字类）
    ↓
OCR 提取文字
    ↓
生成 Knowledge Activation Card:

┌─────────────────────────────────────┐
│  [Screenshot Preview]               │
│                                     │
│  "The best way to predict the       │
│   future is to invent it."          │
│         — Alan Kay                  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  "An idea worth turning into        │
│   your own words."                  │
│                                     │
│  💡 predict · invent · the future   │
│                                     │
│  Explain this idea as if telling    │
│  a friend over coffee.              │
│                                     │
│         [ Start Echo ]              │
│                                     │
└─────────────────────────────────────┘
```

截图学习的 Prompt 类型：
- **Explain**: "Explain this idea in your own words."
- **React**: "What's your take on this?"
- **Retell**: "How would you share this with a friend?"

---

## 四、Practice Session — 表达练习

### 4.1 入口

两个入口（与 Web 端一致）：

1. **Today → Start Echo**: 从今日 Activation Card 直接进入
2. **Practice Tab → 选择素材**: 主动选择照片或截图开始练习

### 4.2 对话界面

```
┌─────────────────────────────────────┐
│  ← Practice Session    [Context] 📎│
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [Photo Thumbnail]          │   │
│  │  shore · sunset · walking   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ Echo ──────────────────────┐   │
│  │ What catches your eye in    │   │
│  │ this moment?                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ You ───────────────────────┐   │
│  │ I see people walking on     │   │
│  │ the beach near sunset.      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─ Echo ──────────────────────┐   │
│  │ Nice! It sounds like a      │   │
│  │ peaceful stroll along the   │   │
│  │ shore at golden hour.       │   │
│  │                             │   │
│  │ What brought you there?     │   │
│  └─────────────────────────────┘   │
│                                     │
│  💡 Try: "stroll" "shore"          │
│                                     │
│  ┌──────────────────────┐  🎙  📎 │
│  │ Type your response... │         │
│  └──────────────────────┘          │
└─────────────────────────────────────┘
```

### 4.3 对话模式

**Dialog Mode（默认）**— 与 Web 端一致：
- 用户每次发送消息，Echo 自然回应
- Echo 在回复中**自然融入正确表达**（不直接纠错）
- 推荐词汇以轻量提示出现（"💡 Try: ..."）

**Creation Mode**（自由写作）— 与 Web 端一致：
- 用户自由写作，Echo 不主动回复
- 按需操作：
  - **Get Feedback** → Echo 给出整体反馈和表达建议
  - **Quick Check** → 检查特定段落
  - **Help Continue** → 帮助续写

### 4.4 语音输入

Mobile 端的核心差异化：

```
用户点击 🎙 → 录音 → Speech-to-Text → 显示文字
                                        ↓
                               用户确认/编辑 → 发送
```

- iOS: Speech framework (本地识别，支持离线)
- 显示识别结果，用户可编辑后发送
- Echo 回复同时提供文字（便于对照学习）

### 4.5 Context 面板

右上角 [Context] 按钮展开侧边面板（与 Web 端一致）：

| Tab | 内容 |
|-----|------|
| **Photo** | 当前照片 + 场景分析 + 标注词汇 |
| **Try These** | 推荐词汇（见过但没用过的） |
| **Expressions** | 本次 Session 中的精彩表达（可保存为 Artifact） |

### 4.6 Session 工具

底部工具栏（与 Web 端一致）：

- **Translate**: 长按文本即时翻译
- **Hints**: 请求表达提示
- **Dictionary**: 查词

### 4.7 Practice Tab 的素材选择

```
┌─────────────────────────────────────┐
│  Practice                           │
│                                     │
│  Recent Photos                      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │    │ │    │ │    │ │    │      │
│  └────┘ └────┘ └────┘ └────┘      │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Scene Practice                     │
│  ┌──────────┐ ┌──────────┐         │
│  │ 🍽 Food  │ │ 🌿 Nature│         │
│  │ 12 photos│ │ 8 photos │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐         │
│  │ 🏙 Places│ │ 👥 People│         │
│  └──────────┘ └──────────┘         │
│                                     │
│  Knowledge Practice (Screenshots)   │
│  ┌──────────┐ ┌──────────┐         │
│  │📄 Articles│ │📖 Quotes │         │
│  └──────────┘ └──────────┘         │
│                                     │
│  Random Pick                        │
│  [ 🎲 Surprise Me ]                │
│                                     │
└─────────────────────────────────────┘
```

用户可以：
- 从最近照片中直接选择
- 从场景分类中选择（基于自动聚类）
- 从截图/知识素材中选择
- 随机挑选

---

## 五、Insights — 成长追踪

### 5.1 与 Web 端一致的信息架构

```
┌─────────────────────────────────────┐
│  Insights                           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Expression Streak          │   │
│  │  🔥 7 days                  │   │
│  │  This week: 12 expressions  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Vocabulary                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │Passive │ │ Active │ │Mastered│ │
│  │  156   │ │   42   │ │   18   │ │
│  └────────┘ └────────┘ └────────┘ │
│                                     │
│  Recently Activated                 │
│  • "take a stroll" — 昨天首次使用  │
│  • "in terms of" — 2天前           │
│                                     │
│  Ready to Activate                  │
│  • "nevertheless" — 见过 5 次       │
│  • "compelling" — 见过 3 次         │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Expression Topics                  │
│  ┌─────────────────────────────┐   │
│  │  [Territory Map - 简化版]    │   │
│  │  Travel ●●●●                │   │
│  │  Food ●●●                   │   │
│  │  Work ●●                    │   │
│  │  Nature ●                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Growth Timeline                    │
│  Mar: 23 sessions, 45 expressions  │
│  Feb: 18 sessions, 32 expressions  │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 移动端特有展示

| 板块 | 数据来源 | 说明 |
|------|----------|------|
| **Expression Streak** | SessionMemory | 连续练习天数 |
| **Vocabulary Progress** | VocabularyRecord | Passive → Active → Mastered 流转 |
| **Recently Activated** | VocabularyRecord (activated) | 最近首次使用的词汇 |
| **Ready to Activate** | VocabularyRecord (passive, freq > 3) | 推荐激活的词汇 |
| **Expression Topics** | 聚类分析 / TopicProficiency | 练习主题分布（简化版 Territory） |
| **Growth Timeline** | GrowthEvent + SessionMemory | 月度统计 |

### 5.3 照片学习轨迹（Mobile 独有）

```
┌─────────────────────────────────────┐
│  Photo Journey                      │
│                                     │
│  This Month                         │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │ 📷 │ │ 📷 │ │ 📷 │  ...        │
│  │ 3/8│ │ 3/6│ │ 3/4│              │
│  └────┘ └────┘ └────┘              │
│  12 photos → 28 expressions        │
│                                     │
│  Your Expression Growth             │
│  Early:  "I see beach and sunset"   │
│  Now:    "A peaceful stroll along   │
│           the shore at golden hour" │
│                                     │
└─────────────────────────────────────┘
```

展示用户从同类场景照片中的表达进步 — 早期的简单描述 vs 现在的丰富表达。

---

## 六、Library — 素材库

### 6.1 核心定位

Library 不是相册浏览器，而是**语言学习素材库**。每张照片都是一个潜在的表达练习场景。

### 6.2 视图结构

```
┌─────────────────────────────────────┐
│  Library            [Grid] [List]   │
│                                     │
│  Scene Clusters                     │
│  ┌────────────────────────────┐    │
│  │ 🍽 Food & Dining    24 📷  │    │
│  │ ┌────┐ ┌────┐ ┌────┐ ... │    │
│  │ └────┘ └────┘ └────┘     │    │
│  │ 18 expressions saved      │    │
│  └────────────────────────────┘    │
│                                     │
│  ┌────────────────────────────┐    │
│  │ 🌿 Nature & Outdoors 16 📷│    │
│  │ ┌────┐ ┌────┐ ┌────┐ ... │    │
│  │ └────┘ └────┘ └────┘     │    │
│  │ 12 expressions saved      │    │
│  └────────────────────────────┘    │
│                                     │
│  Knowledge (Screenshots)            │
│  ┌────────────────────────────┐    │
│  │ 📄 Articles & Quotes 8 📷 │    │
│  │ ┌────┐ ┌────┐ ┌────┐ ... │    │
│  │ └────┘ └────┘ └────┘     │    │
│  └────────────────────────────┘    │
│                                     │
│  All Photos (32 total)              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│  │    │ │    │ │    │ │    │     │
│  └────┘ └────┘ └────┘ └────┘     │
│  ...                                │
│                                     │
└─────────────────────────────────────┘
```

### 6.3 自动聚类

照片素材按场景自动分类：

| 聚类方式 | 实现 | 说明 |
|----------|------|------|
| **场景分类** | Vision framework 场景识别 | Food, Nature, Places, People, Activities |
| **截图 vs 照片** | 图片元数据 + Vision | 自动区分知识类截图和拍摄照片 |
| **时间聚类** | 拍摄时间 | 同一天/同一旅行的照片 |

### 6.4 素材详情

点击某张照片：

```
┌─────────────────────────────────────┐
│  ← Back                            │
│                                     │
│  [       Photo Full View        ]   │
│                                     │
│  📅 March 5, 2026                   │
│  📍 Shibuya, Tokyo                  │
│  🏷 Food, Restaurant                │
│                                     │
│  Scene: dining, ramen, chopsticks   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Expressions from this photo:       │
│  • "A steaming bowl of ramen on     │
│    a rainy evening — comfort in     │
│    its purest form."                │
│    — Mar 5 Session                  │
│                                     │
│  [ Practice with this photo ]       │
│                                     │
└─────────────────────────────────────┘
```

每张照片关联：
- 场景分析结果
- 使用过的 Session 记录
- 产生的 Artifacts（表达作品）

### 6.5 与 Web 端素材库的关系

```
Web 端 Library          Mobile 端 Library
  ├─ 文字素材              ├─ 照片素材
  ├─ 导入的文章            ├─ 截图素材
  ├─ Apple Notes           └─ (可查看 Web 端文字素材)
  └─ (可查看照片生成的表达)
         ↕ iCloud + Loro CRDT 同步 ↕
              共享: Artifacts, Vocabulary, Memory
```

照片本身不同步（体积大、设备相关），同步的是：
- 照片的场景分析结果（JSON，轻量）
- 产生的 Artifacts
- 词汇记录
- Session 记录

---

## 七、数据模型扩展

### 7.1 新增模型

```swift
// 照片素材 — 扩展 Material 模型
struct PhotoMaterial {
    let id: String
    let assetId: String              // PHAsset identifier (本地)
    let thumbnailPath: String        // 本地缓存缩略图路径

    // 场景分析 (本地 Vision 计算)
    var sceneAnalysis: SceneAnalysis?
    var ocrText: String?             // 截图文字 (如有)
    var isScreenshot: Bool

    // 元数据
    var takenAt: Date?
    var location: String?
    var describabilityScore: Float   // 0-1, 内部排序用

    // Echo 关联
    var sessionIds: [String]         // 在哪些 Session 中使用过
    var artifactIds: [String]        // 产生了哪些表达

    let createdAt: Date
    var updatedAt: Date
}

struct SceneAnalysis {
    let objects: [String]            // 识别到的物体
    let actions: [String]            // 动作描述
    let mood: String                 // 氛围
    let setting: String              // 场景类型
    let category: SceneCategory      // 分类
}

enum SceneCategory: String, Codable {
    case food
    case nature
    case places
    case people
    case activities
    case knowledge                   // 截图/知识类
    case other
}
```

### 7.2 与现有模型的兼容

PhotoMaterial 生成的 Activation Card 兼容现有 `ActivationCard` 结构：

```swift
// 现有模型保持不变
struct ActivationCard {
    // ... 现有字段 ...

    // 新增可选字段
    var photoAssetId: String?        // 关联照片 (如有)
    var sceneAnalysis: SceneAnalysis? // 场景分析 (如有)
    var annotations: [Annotation]?   // 视觉标注 (如有)
}

struct Annotation {
    let word: String
    let x: Float                     // 0-1 相对位置
    let y: Float
}
```

---

## 八、AI Prompt 设计

### 8.1 照片场景理解

使用 LLM (GPT-4o-mini) 分析照片，生成激活内容：

```
System: You are Echo, helping users express their visual experiences
in English. Analyze the photo and create an activation that makes
the user WANT to describe what they see and feel.

Input:
- Photo (base64 / URL)
- Vision analysis: {objects, actions, mood, setting}
- User's vocabulary: {words they've seen but never used}
- User's recent topics: {what they've been practicing}

Output (JSON):
{
  "emotionalAnchor": "A moment of ...",
  "sceneDescription": "brief, evocative scene description",
  "expressions": ["words from user's passive vocabulary that fit"],
  "annotations": [{"word": "shore", "x": 0.3, "y": 0.8}],
  "invitation": "gentle open-ended question"
}

Rules:
- expressions MUST come from user's existing vocabulary
- invitation should feel like a friend asking, not a teacher testing
- annotations: max 4 words, placed near relevant objects
- DO NOT describe everything — leave room for the user
```

### 8.2 截图知识理解

```
System: The user captured a screenshot containing text.
Create a learning activation that helps them internalize
this knowledge by expressing it in their own words.

Input:
- Screenshot image
- OCR text (pre-extracted)

Output (JSON):
{
  "extractedContent": "key quote or idea",
  "source": "article / book / social media / other",
  "emotionalAnchor": "An idea worth ...",
  "expressions": ["relevant vocabulary"],
  "invitation": "Explain / React / Retell prompt"
}
```

### 8.3 Echo Companion (不变)

Mobile 端的 Echo Companion prompt 与 Web 端完全一致（见 `echo-companion.ts`），额外 context 增加：

```
Additional context for mobile session:
- Photo scene analysis: {objects, actions, mood}
- Photo annotations: {words shown on photo}
- Input method: text / voice (if voice, be more conversational)
```

---

## 九、技术方案

### 9.1 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| UI | SwiftUI | iOS 16+ |
| 照片访问 | PhotoKit (PHAsset) | 读取相册，不复制照片 |
| 场景分析 | Vision framework | 本地物体检测、场景分类 |
| OCR | Vision framework | 截图文字识别 |
| 语音 | Speech framework | 本地语音识别 |
| 存储 | FileManager + iCloud Drive | JSON 持久化 |
| 同步 | Loro (loro-swift) | CRDT 跨端同步 |
| LLM | OpenAI API / 本地模型 | 激活卡生成、对话 |

### 9.2 照片处理流水线

```
相册照片
    ↓
PHAsset 枚举 (最近 N 张)
    ↓
本地 Vision 分析 (批量，后台)
    ├─ 场景分类 (VNClassifyImageRequest)
    ├─ 物体检测 (VNRecognizeAnimalsRequest 等)
    ├─ 文字检测 (VNRecognizeTextRequest) → 判断是否截图
    └─ 可描述性评分 (基于分类置信度)
    ↓
分析结果缓存到本地 (SceneAnalysis JSON)
    ↓
Today 选择 → 评分最高 + 未使用 + 时间权重
    ↓
LLM 生成 Activation Card (场景分析 + 用户素材库)
```

### 9.3 隐私设计

- 照片**永远不离开设备**（除非用户主动发送给 LLM 生成激活卡）
- Vision 分析完全本地
- 同步的只是 SceneAnalysis JSON + Artifacts，不是照片本身
- 用户可以在 Settings 中控制 LLM 是否接收照片

---

## 十、实现路线

### Phase 1: 核心闭环 (MVP)

**目标**: 跑通 "照片 → 激活 → 表达 → 回应" 的完整循环

| 任务 | 说明 |
|------|------|
| 照片访问 + Vision 分析 | PHAsset 枚举、场景分类、可描述性评分 |
| Today: Photo Activation | 每日选照片、调 LLM 生成激活卡、视觉标注展示 |
| Practice Session 对话 | 文字输入、Echo Companion 回应、Context 面板 |
| 基础 Library | 已使用照片列表、场景分类展示 |
| DataStore 适配 | PhotoMaterial 存储、与现有 Material 兼容 |

### Phase 2: 表达增强

| 任务 | 说明 |
|------|------|
| 截图 OCR 学习 | 识别截图、提取文字、Knowledge Activation Card |
| 语音输入 | Speech framework 集成、语音转文字 + 编辑 |
| Session 工具 | Translate / Hints / Dictionary |
| Creation Mode | 自由写作模式 |
| Artifact 保存 | 表达作品保存、关联照片 |

### Phase 3: 成长体系

| 任务 | 说明 |
|------|------|
| Insights 页面 | Vocabulary Progress、Expression Topics、Growth Timeline |
| Photo Journey | 照片学习轨迹、表达进步对比 |
| 词汇推荐增强 | 基于场景推荐 passive → active 词汇 |
| Loro CRDT 同步 | 与 Web 端同步 Artifacts、Vocabulary、Memory |

### Phase 4: 进阶

| 任务 | 说明 |
|------|------|
| 照片聚类优化 | 时间聚类、活动聚类、智能相册 |
| 离线模式 | 本地模型生成激活卡（无需 API） |
| Widget | 主屏 Widget 显示今日激活 |
| 分享 | 表达作品分享（照片 + 文字） |
