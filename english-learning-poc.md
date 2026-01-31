# Echo - Proof of Concept (英语学习场景)

本文档根据项目早期关于“英语学习”场景的深度讨论整理而成，旨在定义 Echo 在此场景下的核心产品哲学、要解决的唯一问题，以及最小但完整的产品设计。

## 1. 项目哲学：语言是自我表达的延伸

我们认为，成年人学习第二语言的瓶颈，往往不在于“知道得太少”，而在于“能调用的太少”。我们看过、听过、想过的一切，都沉睡在记忆深处，无法在需要表达时被激活。

Echo 的核心哲学是：**语言能力的本质，是你如何理解和组织自己的人生经验。**

因此，Echo 不教你新东西，它只帮你把你已经积累过的东西，重新变成你能说出口的话。它不是一个学习工具，而是一个**个人素材激活与表达辅助工具**。 帮你把那些零散的感受，慢慢变成清晰的语言。

```
你不是没话说，只是你没被提醒
成长不是突飞猛进，而是反复出现
语言能力的本质，是你如何理解和组织自己的人生经验
```

用户画像:

- 有一定英语基础
- 不考试，但想把英语用好
- 有表达欲，有想法
- 日常输入很多，但输出吃力

## 2. 核心问题：从“我没话说”到“我能反复表达”

Echo（语言学习版）只致力于解决一个核心问题：

> **当我想表达时，Echo 能帮我立刻调用我自己已经积累过的思想和语言素材。**

第一性目标是：把“沉睡的个人素材”，转化为“可被反复调用的表达能力”。

## 3. 语言成长闭环模型

积累 → 激活 → 重复 → 输出 → 修正 → 回顾
Capture → Echo reminds you → You speak/write → Echo helps you repeat better
我们将用户的语言成长过程抽象为六个阶段：

1.  **Input (真实输入)**: 日常的阅读、冲浪、听播客，目的是“留下痕迹”。轻量记录，低门槛捕捉。
2.  **Materialization (素材化)**: 将输入转化为可回顾、可引用的“素材颗粒”。
3.  **Activation (激活)**: 在表达前，通过“激活卡片”将过去的自己拉回当下，解决“我明明看过、想过，但在要说的时候，大脑一片空白”的问题。「关联、召回、提示」
4.  **Repetition (重复)**: 通过变式重复和间隔回顾，用不同方式表达同一个观点。
5.  **Output (真实输出)**: 进行有明确目标的写作或口语等输出任务。
6.  **Feedback & Reflection (修正与回顾)**: 修正表达，并让你看到“我在反复说什么”，理解自己的语言风格和观点，以及表达中尚未探索到的用法和领域。

## 4. 关键产品原则

这些原则是指导后续所有功能设计的基石：

1.  **激活卡不教语言，只唤醒表达。** (Activation Cards do not teach language. They awaken expression.)
2.  **解释发生在召回时，而非卡片本身。** (Explanation belongs to recall, not to the card itself.)
3.  **卡片只存储被用户认领的东西。** (Cards only store what the user claims as theirs.)
4.  **学习是表达的副产物，而非独立任务。** (Learning happens as a side effect of expression, not as a separate task.)
5.  **Echo 修正你的表达，但不评判你。** (Echo doesn’t correct you. It reflects you.)

## 5. 最小产品结构 (MVP)

为实现上述闭环，MVP 产品由四个模块构成：

1.  **Raw Library (素材库)**: 极致轻量地捕捉和记录日常输入，不要求整理。

- 「+ Capture」入口，只需要：原文，+可选的一句中/英文备注
- 收集什么？看到的一段话、一个观点、一个视频片段、播客的一段表达、自己随手写的一点想法
- 通过和 AI 对话、提问、交流等方式，聊天内容作为原始素材

2.  **Activation (激活流)**: Echo 的灵魂。通过“激活卡片”在表达前激活相关素材。

- 一张激活卡片包含：你自己的旧素材（原句 / 观点）；AI 帮你总结： “你过去关于这个话题，反复出现的 2–3 个核心观点”
- 帮你建立“我其实是有东西可说的”自信

3.  **Practice / Output (输出练习)**: 围绕已激活的内容进行有支撑的输出。

- 输出准备：生成 speaking notes，可以给用户几个 bullet points 来自于用户自己的素材，或者用户自己编辑
- 围绕已经激活的内容进行输出
- 可以针对 topic 对激活卡进行召回
- AI 不代写只润色、提出建议和指出问题

4.  **Review & Insight (回顾与洞察)**: 让你看到自己的成长轨迹和表达模式。

- 时间轴
- 主题
- 用户这次的核心观点

```
日常看到东西
↓
Raw Library（随手存）
↓
某一天 / 某次输出前
↓
Echo 激活你的旧素材
↓
你围绕它写 / 说
↓
Echo 修正 & 记录
↓
一段时间后回顾
```

## 6. 核心单元设计：激活卡

激活卡是 Echo 的灵魂单元，其设计目标是：**把用户带回某个真实体验里，让“我想表达”自然发生。**

### 6.1 卡片正面 (Front)

正面负责“激活”，其结构和设计遵循“感受优先、低压邀请”的原则。

| 层级 | 名称                                 | 目的                                                   | 示例文案 (以“游泳”素材为例)                                                                                                                                               |
| ---- | ------------------------------------ | ------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ①    | **Emotional Anchor** (情绪锚点)      | 将用户拉回当时的状态，唤起感受。                       | `A moment you became aware of how emotions show up in the body.`                                                                                                          |
| ②    | **Lived Experience** (真实体验)      | 展示用户原始素材、自己的笔记，产生“这是在说我”的共鸣。 | `When I get tense in the water, everything reacts immediately. My shoulders tighten, my legs slow down... Slowing down for just a few seconds somehow resets everything.` |
| ③    | **Expressions to Carry the Feeling** | 提供可直接嵌入句子里的语言块，而非词汇教学。           | `Any tension shows up immediately in the body.` <br> `Slowing down helps me regain control.` <br> `The body reacts faster than the mind.`                                 |
| ④    | **Gentle Invitation** (表达邀请)     | 轻声邀请用户进入一次表达尝试，而非布置任务。           | `If you were explaining this to someone—not as a swimmer, but as a person—what would you say?`                                                                            |
| ⑤    | **CTA** (行动点)                     | 低声量，不打扰。                                       | `Start Echo` / `Talk this through`                                                                                                                                        |

### 6.2 卡片反面 (Back)

反面负责“沉淀”，记录一次被用户“认领”的表达结果。

| 内容构成                             | 目的                                                                 | 示例                                                                                                                                     |
| :----------------------------------- | :------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Final Expression** (最终表达)      | 封存用户满意的输出版本，使其成为可回看的能力痕跡。                   | `“I realized that when I’m under pressure, my body reacts long before my mind does. Slowing down—even briefly—helps me regain control.”` |
| **Metadata** (元数据)                | 轻量记录，用于追溯。                                                 | `时间` `关联 Topic` `关联 Activation Card`                                                                                               |
| **Echo Session Link** (练习过程链接) | 将练习的详细过程（如多轮对话、修改记录）与卡片解耦，保持卡片的轻量。 | `→ View Echo Session`                                                                                                                    |

### 6.3 关于激活和学习

Echo is not here to teach you English. It helps you remember what you already have to say.
激活卡不是学习卡，不做是否掌握和复习提醒、生词记忆的功能 -- If you enjoy memorizing words with flashcards, keep doing that. Echo is here when you want to turn thoughts into language.
表达能力一定来自长期积累。帮用户把“已经发生的积累”，变成“可被调用的能力”。

可以在脑子里保留「学习」的设计，但先不要实现。
概念：Shadow Learning
后台记录：
用户反复出现的表达
用户经常被修正的点
在 Insight 里，轻声告诉用户：
“You’ve naturally picked up these expressions over time.”

概念：Your Expression Mirror
Echo 可以长期记录：
用户常用：
句式
结构
高频表达
以及在类似语义下：
用户很少用到，但在语料中出现过的表达
⚠️ 注意：
这些“没用过的表达”，必须来自用户接触过的内容
不能凭空引入新词
“告诉你你还没成为的那部分自己”

## 7. 几个模块和概念之间的关系和取舍

| 层级 | 名称                            | 核心问题           | 是否可编辑 | 是否是“成果” |
| ---- | ------------------------------- | ------------------ | ---------- | ------------ |
| L1   | 原始素材（Raw Material）        | 我看过/想过什么    | 是         | 否           |
| L2   | 激活卡（Activation Card）       | 哪个体验值得被唤醒 | 可微调     | 否           |
| L3   | 激活流（Activation Flow）       | 今天我该回看什么   | 否         | 否           |
| L4   | Echo 输出（Claimed Expression） | 我真正说过什么     | 是         | **是**       |

原始素材：

- 碎片化、未整理、不要求语言质量和结构
- 来源：微信记录，notes，网页收藏，和 AI 的聊天和问答记录，手动 quick jot
- 原则：raw material 不会被保存为成果，只会被引用、激活和重组

激活卡：被提炼过的入口

- 从一组原始素材中，被系统或用户判断为：“这个体验，值得我再说一遍”
- 一张激活卡：可以引用 1 条或多条原始素材；原始素材：可以被多个激活卡复用

激活流：每日唤醒机制

- 激活流是一个“回看过去自己”的推送系统
- 推送逻辑可能包括：最近反复出现的主题，你曾多次记录但从未输出的体验，与你近期 Topic 相关的卡

Echo Session：输出和练习模块

- 一次时间轴上的表达过程
- 由激活卡触发或由 Topic / 用户主动发起
- 可以：说、写、改、被纠正、被追问
- 「Save」（保存成果的动作） 发生在「Echo Session 结束后」 Save = “这次表达代表了我现在的水平和想法。”

一些取舍：

- 不给激活卡做「收藏」按钮
  - 一旦可以收藏，用户的心智会立刻变成：“这个卡值不值得我留？”而不是：“我现在有没有什么想说的？”
  - 这会产生几个后果：激活卡变成“内容资产”，用户开始囤卡，激活 → 变成判断 → 决策负担上升
- Echo 只保存你真正表达过的东西。如果激活卡也能被收藏，就会出现：我什么都没说，但我收藏了一堆“好卡”。这在语义上是不诚实的。

Activation Card Retention Rules：

1. Activation Cards are ephemeral by default.
2. Users cannot manually bookmark or favorite Activation Cards.
3. Cards may reappear through future activation or recall mechanisms.
4. The only persistent artifact is a claimed expression saved after an Echo Session.
5. Echo values expressed thought over collected content.

系统的
层 1：当天激活（短期）

- 每日激活流展示 1–3 张卡
- 当天不点、不练：
- 卡片 UI 消失
- ❌ 不进入任何“列表”
  这是刻意的。

层 2：系统记忆（中期，用户不可见）
系统内部会记录：

- 这张激活卡：被推送过，被忽略过
- 被打开但未练习
- 被多次召回但未输出
  👉 这些是“系统记忆”，不是用户资产

层 3：再次召回（长期）
激活卡会以不同形式回来：

- 在另一个 Topic 下
- 在 Review / Insight 中
- 在“你反复思考但从未说过的主题”里

用户的体验是： “这个东西，好像以前也出现过。” 而不是： “幸好我收藏了。”
那用户如果真的“很想留下这张卡”怎么办？Echo 的答案应该是：那就把它说出来。

## 8. 最小化 demo

验证 Echo 是否真的能把用户已有的零碎素材 → 激活 → 真实表达 → 留下自我痕迹

### 场景：

一个正在学习自由泳的人，
记录了零碎感受，但没有系统整理，
Echo 帮他把这些零碎感受激活成一次真实表达。

### Screen 1：Raw Library（已有素材）

目的：
证明「用户已经有很多素材，但是沉睡的」。
内容示例（你的游泳笔记）
卡片列表（纯原始态）：
「自由泳：在水中滑翔的感觉」
「为什么游泳要强调放松」
「调整动作为什么这么难」
UI 特点：
无加工
像 Notes / Draft
轻提示文案：
“These are things you once noticed.”
可点击：
单条素材 → 只读查看（POC 可不做编辑）

### Screen 2：Activation Flow（今日激活）

入口：
Home →「Today’s Echo」
展示 1 张激活卡（核心）
卡片正面结构（定稿版）：
Title（强）
“Finding flight in water”
Expression（主视觉）
“In freestyle, I finally felt what it means to glide —
not pushing forward, but being carried.”
Why this matters（弱、柔）
“You once noticed this moment while learning to swim.”
Invitation（明确但温和）
“Want to say something about this?”
底部 CTA：
Start Echo
不出现：
收藏
保存
标签

### Screen 3：Echo Session（表达与练习）

这是整个 POC 的灵魂。
状态 A：空白开始
提示文案：
“Speak freely. There is no right version yet.”
输入方式：
文字（POC 优先）
语音（可标为 Coming Soon）
状态 B：进行中的对话 / 练习
左侧：用户输入（逐条）
右侧：Echo 轻反馈（可选）
改写建议
澄清追问
轻微扩展
（POC 可假设 AI 返回）
状态 C：完成一次满意表达
按钮：
Save this Echo
轻提示：
“This will become part of your story.”

### Screen 4：激活卡 · 背面（结果沉淀）

卡片背面内容：
Final Expression（主）
Meta 信息（弱）：
Topic: Swimming
Source: 3 raw notes
Time
可展开：
“See how you arrived here”
→ 对话折叠记录
重要：
只有到这里，东西才“存在下来”

### Screen 5：Insight（你的表达）

目的：
让用户看到：
“我不是在用工具，我在留下自己。”
内容形式：
时间线卡片：
「On learning to relax in water」
「Fear of adjusting movements」
顶部一句话总结（系统生成）：
“You often reflect on growth through physical discomfort.”
Screen 6（可选）：回访触发（未来感）
一个轻提示页或文案：
“Some thoughts return until they are spoken.”
（为未来多次激活埋钩子）

### POC 验证点

你这个 Demo 要验证的不是功能，而是三个感觉：

- “这是我自己的东西”
- “它真的帮我把模糊变具体了”
- “我愿意再回来一次”
  只要这三点成立，POC 就成功。
