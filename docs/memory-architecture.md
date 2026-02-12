# Echo Memory Architecture

> 三层记忆系统设计，用于管理用户表达过程和知识沉淀

## 概述

Echo 采用三层记忆架构，从临时对话状态到永久知识沉淀：

| Layer | 名称 | TTL | 存储 | 状态 |
|-------|------|-----|------|------|
| L1 | Stream Memory | minutes~hours | localStorage | ✅ 已实现（简化版） |
| L2 | Session Memory | days~permanent | Loro + IndexedDB | ✅ 已实现（简化版） |
| L3 | Canonical Memory | permanent | Loro + IndexedDB | ❌ TODO |

## L1: Stream Memory（流式过程）

对话进行中的实时状态快照，用于断点恢复。

### 当前实现

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

### TODO: 完整实现

```typescript
interface StreamMemory {
  sessionId: string;
  turnCount: number;
  userInputs: string[];           // 所有用户输入
  aiReasoningTraces: string[];    // AI 中间推理
  contextSnapshots: object[];     // 上下文快照
  timestamp: number;
}
```

## L2: Session Memory（会话状态）

每次会话结束时生成的总结，保存讨论主题和共识。

### 当前实现

```typescript
interface SessionMemory {
  id: string;
  sessionId: string;
  topic?: string;            // 讨论主题
  turnCount: number;         // 总共进行了多少轮
  summary: string;           // 简要总结（最后一条用户消息）
  status: 'completed' | 'abandoned';
  artifactId?: string;       // 关联的 Artifact ID
  materialIds: string[];
  createdAt: number;
  exitedAt: number;
}
```

- **触发时机**：用户点击 Save 或 Exit 时
- **存储位置**：Loro + IndexedDB（持久化）

### TODO: 完整实现

```typescript
interface SessionMemory {
  // ... 现有字段 ...
  consensusPoints: string[];     // 已达成的共识
  openQuestions: string[];       // 未完成的问题
  keyInsights: string[];         // 关键洞察（AI 提取）
  emotionalTone: string;         // 情感基调
}
```

## L3: Canonical Memory（知识沉淀）

> ❌ TODO：后续在 Insights 模块实现

跨会话的知识沉淀，构建用户画像。

```typescript
interface CanonicalMemory {
  id: string;
  userId: string;

  // 用户确认的观点
  confirmedBeliefs: Array<{
    content: string;
    firstMentioned: number;
    lastReferenced: number;
    mentionCount: number;
  }>;

  // 反复出现的偏好
  recurringPreferences: Array<{
    pattern: string;
    frequency: number;
    examples: string[];
  }>;

  // 被引用的内容
  frequentlyReferencedMaterials: Array<{
    materialId: string;
    referenceCount: number;
    contexts: string[];
  }>;

  // 主题兴趣图谱
  topicInterestGraph: {
    nodes: Array<{ id: string; label: string; weight: number }>;
    edges: Array<{ from: string; to: string; strength: number }>;
  };
}
```

## Echo Artifact（表达产物）

用户主动保存的最终表达，是可沉淀的知识资产。

```typescript
interface EchoArtifact {
  id: string;
  content: string;           // 用户最终表达
  materialIds: string[];     // 关联的原始素材
  anchor?: string;           // emotionalAnchor 摘要
  createdAt: number;
}
```

## TODO: 对话历史选择性保存

> 后续实现

1. **手动保存**：用户可以主动触发保存 Echo 的系统回复
2. **自动摘要**：如果用户不触发保存，系统自动 summary 提炼值得沉淀的内容

```typescript
interface SavedEchoResponse {
  id: string;
  sessionId: string;
  content: string;
  savedAt: number;
  trigger: 'manual' | 'auto-summary';
}
```

## 数据流

```
用户开始对话
    ↓
[L1] 每 5 轮 → 保存 StreamSnapshot 到 localStorage
    ↓
用户点击 Save
    ↓
[Artifact] 保存用户表达到 Loro
    ↓
[L2] 保存 SessionMemory 到 Loro
    ↓
清除 StreamSnapshot
    ↓
(后续) [L3] 定期从多个 Session 提取 CanonicalMemory
```

## 参考

- 产品设计：[product-design-v2.md](./product-design-v2.md)
- 同步架构：[sync-architecture.md](./sync-architecture.md)
