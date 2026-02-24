# Echo 评测框架

> 产品迭代过程中的评测，确保系统能力对齐产品哲学

---

## 评测原则

### 与产品哲学对齐

Echo 的核心信念：
- **语言是思维的边界**：锤炼语言 = 锤炼思维
- **表达的核心是「有话想说」**：感受语言之美 + 有自己的态度观点
- **只有表达过的才会留下**：输出驱动，而非输入驱动

### 评测优先级

```
最高优先级
├── 表达欲激发：用户是否「想说」？
├── 练习意愿：用户是否愿意继续？
└── 表达正确性：纠错是否准确有效？

重要但次级
├── 个性化：是否贴合用户？
├── 召回相关性：素材/记忆是否召回准确？
└── 生成质量：内容是否流畅自然？
```

**关键洞察**：技术指标（召回率、相关性）是手段，用户的表达欲望和练习行为才是目标。

---

## 评测核心能力

围绕 3 个核心能力展开：

1. **Learning-oriented Generation** - 生成能力
2. **Personalization** - 个性化能力
3. **Expression Understanding** - 表达理解力

### 评测架构

```
Dataset Layer → Model/Agent Strategy Layer → Evaluation Layer
                                              ├── AI Judge
                                              ├── Metrics
                                              └── Regression
```

---

## 分模块评测

### 1. 素材导入与处理

#### 1.1 中文素材翻译为英文

**评测目标**：
- 是否保留表达风格
- 是否适配用户水平
- 是否教学友好

**评测维度**：

| 维度 | 说明 | 优先级 |
|-----|------|-------|
| style_consistency | 是否保留原文风格 | 高 |
| beauty_preservation | 是否保留表达之美（节奏感、画面感、情感张力） | 高 |
| level_appropriateness | 是否适配用户水平 | 中 |
| explanation_helpfulness | 解释是否有助于学习 | 中 |
| learnability_of_expression | 提取的表达是否值得学习 | 高 |

#### 1.2 图片描述

**评测目标**：
- 是否抓住表达性元素（emotion, tone, context）
- 是否提取可学习表达
- 是否避免无用冗余

**测试数据集分类**：
1. 人物/叙事/地点/具体纪实
2. 文字截图
3. 抽象/艺术/情绪

**评测维度**：
- 语义覆盖
- 表达可学习度
- 噪音率

---

### 2. 素材分类与聚类

> 优先级：中（非核心能力，可后续完善）

**测试**：
- material → expected_topic 分类准确率
- material → expected_cluster_id 聚类合理性
- 是否过度分散

---

### 3. Activation Card 生成 ⭐ 核心能力

**评测目标**：
- 是否基于素材建立情感连接
- 是否激发表达欲望（而非布置学习任务）
- 是否引导思考和观点形成

**测试数据集**：
```
{
  user_profile: {...},
  materials: [...],
  expected_learning_goal: "...",
  user_context: "..."  // 用户近期关注/经历
}
```

**评测维度**：

| 维度 | 说明 | 权重 | 优先级 |
|-----|------|-----|-------|
| emotional_resonance | 是否与用户经历产生情感连接？是否唤起具体场景？ | 0.20 | 最高 |
| expression_invitation | 是否让人「想说」？语气是邀请还是命令？ | 0.20 | 最高 |
| thought_provocation | 是否激发思考？是否鼓励形成自己的观点？ | 0.15 | 高 |
| relevance | 与素材的相关性 | 0.15 | 中 |
| personalization | 是否贴合用户画像 | 0.15 | 中 |
| pedagogy | 教学有效性 | 0.10 | 中 |
| novelty | 新颖度，避免重复 | 0.05 | 低 |

**评分公式**：
```
ActivationScore =
  0.20 * emotional_resonance +
  0.20 * expression_invitation +
  0.15 * thought_provocation +
  0.15 * relevance +
  0.15 * personalization +
  0.10 * pedagogy +
  0.05 * novelty
```

**AI Judge 需要的哲学背景**：
> Echo 相信表达欲比学习任务更重要。好的激活卡应该让用户「想说」，而非觉得「该学」。它应该建立素材与用户真实经历的情感连接，引发思考和观点，而非简单地要求复述或造句。

---

### 4. Practice Feedback 生成 ⭐ 核心能力

**评测目标**：
- 是否准确指出表达错误
- 是否帮助用户厘清想法（不只是纠正语法）
- 是否鼓励继续表达

**测试数据集**：
```
{
  user_profile: {...},
  activation_card: {...},
  user_response: "...",  // 包含错误或可改进的表达
  conversation_history: [...]
}
```

**评测维度**：

| 维度 | 说明 | 优先级 |
|-----|------|-------|
| error_detection | 是否准确识别错误 | 最高 |
| error_explanation | 是否清晰解释错误原因 | 最高 |
| correction_quality | 改进建议是否准确有效 | 最高 |
| thought_refinement | 是否帮助厘清想法，而非只纠语法 | 高 |
| expression_encouragement | 是否鼓励继续表达，语气是否积极 | 高 |
| depth_guidance | 是否引导更深入思考（「为什么这样想」「还有什么角度」） | 中 |
| conversation_continuation | 是否自然引导对话继续 | 中 |

**AI Judge 需要的哲学背景**：
> Echo 相信锤炼语言就是锤炼思维。好的反馈不只是指出「你说错了什么」，更要关注「你想表达什么」。它应该帮助用户把模糊的想法说清楚，而非只是修正语法错误。同时，反馈应该鼓励用户继续表达，而非让人感到挫败。

---

### 5. Memory 个性化 ⭐ 核心能力

#### 5.1 用户模拟测试

**方法**：构造 50 个 Synthetic Users，每个包含：
- learning_goal
- vocabulary_weakness
- topic_preference
- emotional_pattern
- expression_style

运行 10 轮 interaction，测试：
- Memory 是否捕获偏好？
- 后续生成是否利用 memory？
- 是否产生 drift？

**评测维度**：

| 维度 | 说明 | 优先级 |
|-----|------|-------|
| preference_recall_rate | 偏好召回率 | 高 |
| profile_alignment_score | 生成内容与 profile 的对齐度 | 高 |
| memory_update_accuracy | 记忆更新准确性 | 高 |
| self_discovery_support | 是否帮助用户「了解自己」？Insights 是否揭示表达模式/成长？ | 中 |
| expression_pattern_capture | 是否捕捉用户的表达风格？ | 中 |

#### 5.2 表达与词汇提取

**评测维度**：
- expression_extraction_precision
- relation_correctness
- 是否丢失关键表达

**方法**：
- Manually annotated gold labels
- Graph similarity（node overlap）

---

### 6. 搜索与召回

**测试**：
- query → material relevance
- topic embedding 召回率
- 是否推荐重复内容

**评测维度**：
- recall@k
- diversity_score
- personalization_relevance

---

### 7. 性能 SLA

为各模块定义 SLA：
- P95 latency
- 并发测试
- Token cost tracking

---

## 场景化测试（Regression Test）

### 场景 1：「被打动 → 想表达」闭环

**验证产品哲学**：感受语言之美 → 激发表达欲

```
输入：
- 一条有情感张力的素材
- 用户画像

测试链路：
素材处理 → 激活卡生成 → 评估

评测：
- 素材的「美」是否被保留？
- 激活卡是否建立了素材与用户经历的连接？
- 整体是否让人「想说」而非「该学」？
```

### 场景 2：「锤炼表达 = 锤炼思维」

**验证产品哲学**：表达过程中厘清想法

```
输入：
- 用户的初始表达（有想法但表达模糊）
- Companion 的 feedback

测试链路：
用户初始表达 → Feedback → 评估反馈质量

评测：
- Feedback 是否帮助厘清想法？
- 是否关注「想表达什么」而非只是「说错了什么」？
- 是否鼓励深入思考？
```

### 场景 3：「被动 → 主动」词汇转化

**验证产品哲学**：见过 → 用过 → 掌握

```
输入：
- 用户的素材库（包含特定词汇/表达）
- 多轮对话历史

测试链路：
词汇在素材中出现 → 激活卡推荐 → 用户使用 → 记录为主动词汇

评测：
- 系统是否推荐「见过但没用过」的表达？
- 推荐时机是否自然（与话题相关）？
- 词汇状态流转是否正确？
```

### 场景 4：长期个性化演进

**验证**：系统是否越来越懂用户

```
模拟用户 30 天学习轨迹：
- 是否越来越个性化？
- 是否出现 memory 膨胀？
- 是否重复内容增加？
```

---

## E2E 用户旅程测试

### 核心旅程定义

| Journey | 场景 | 起点 |
|---------|------|------|
| Journey 1 | 新用户首次体验 | Onboarding |
| Journey 2 | 日常练习 | 首页 |
| Journey 3 | 日常积累 | 导入素材 |
| Journey 4 | 有目的创作 | Create Studio |
| Journey 5 | 备考场景（如雅思 topic） | Create Studio - Project |

### 测试类型

1. **功能正确性**
   - Memory 是否真实更新
   - Insight 是否刷新

2. **流程连续性**
   - 是否存在断层
   - 是否强制跳转

3. **认知负荷**
   - 每步信息是否过载
   - 是否有冗余操作

---

## 特殊测试

### Regression Test

每次模型升级必须跑全量测试，防止：
- Personalization 退化
- Insight 错误率上升
- 表达欲激发能力下降

### Adversarial Test

故意输入：
- 模糊素材
- 错误表达
- 冲突记忆

验证系统稳健性。

### Longitudinal Test

模拟用户 30 天轨迹，验证长期体验。

---

## 评测工程方案

### 目录结构

```
echo-eval/
  datasets/           # 测试数据集
  model_configs/      # 模型配置
  prompts/            # AI Judge prompts（含哲学背景）
  judges/             # Judge 实现
  metrics/            # 指标计算
  scenarios/          # 场景化测试
  reports/            # 评测报告
```

### 运行脚本

```python
run_eval(model_version_x)
compare(previous_version)
generate_regression_report()
run_scenario_tests()  # 场景化测试
```

---

## 待后续设计

- [ ] AI Judge prompt 详细设计（含哲学背景注入）
- [ ] 各维度权重的实验调优
- [ ] 测试数据集构建
- [ ] 产品上线后的用户行为数据收集（另建文档）
