# LLM Provider Architecture

> 可插拔的 LLM 服务层设计，支持云端 API、本地服务、端模型，以及无 AI 兜底

## 设计目标

1. **Provider 解耦** - 应用层只调用统一接口，不感知具体 Provider
2. **可插拔** - 新增 Provider 只需实现接口并注册
3. **自动降级** - Cloud → Local → Edge → Template 渐进式降级
4. **配置持久化** - 用户 API Key 和偏好保存在本地

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ActivationGenerator / EchoCompanion / OCR                  │
│  (只调用 LLMService.chat()，不关心具体 Provider)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     LLMService                               │
│  - 统一 API: chat(), generate(), stream()                   │
│  - Provider 选择与健康检查                                    │
│  - 自动降级 fallbackChain                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  Provider Registry                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ OpenAI   │ │ Anthropic│ │ Gemini   │ │ WebLLM (Edge)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
│  ┌──────────┐ ┌──────────────────────────────────────────┐  │
│  │ Ollama   │ │ Template Fallback (无 AI 兜底)            │  │
│  └──────────┘ └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Provider 类型

| Type | 描述 | 示例 | 特点 |
|------|------|------|------|
| `cloud` | 云端 API | OpenAI, Anthropic, Gemini | 需要 API Key，质量最好 |
| `local` | 本地服务 | Ollama | 需要本地运行服务 |
| `edge` | 端模型 | WebLLM | 浏览器内运行，首次需下载 |
| `template` | 模板兜底 | - | 无 AI，固定文案 |

## 核心接口

### Provider 接口

```typescript
interface LLMProvider {
  readonly id: string;           // 'openai', 'anthropic', 'webllm', etc.
  readonly name: string;         // 显示名称
  readonly type: 'cloud' | 'local' | 'edge' | 'template';

  // 能力声明
  capabilities: {
    streaming: boolean;
    maxTokens: number;
  };

  // 生命周期
  initialize(config: ProviderConfig): Promise<void>;
  isReady(): boolean;
  getStatus(): ProviderStatus;

  // 核心方法
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  stream?(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}

interface ProviderStatus {
  ready: boolean;
  error?: string;
  // Edge 模型特有
  downloadProgress?: number;  // 0-100
  downloadStatus?: 'idle' | 'downloading' | 'ready' | 'error';
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
```

### 配置接口

```typescript
interface LLMConfig {
  // 用户选择的首选 Provider
  activeProvider: string;  // 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'webllm' | 'template'

  // 各 Provider 配置
  providers: {
    openai?: {
      apiKey: string;
      baseUrl?: string;  // 支持代理
      model: string;     // 'gpt-4o-mini', 'gpt-4o', etc.
    };
    anthropic?: {
      apiKey: string;
      model: string;     // 'claude-3-haiku-20240307', etc.
    };
    gemini?: {
      apiKey: string;
      model: string;     // 'gemini-1.5-flash', etc.
    };
    ollama?: {
      baseUrl: string;   // 'http://localhost:11434'
      model: string;     // 'llama3', 'qwen2.5', etc.
    };
    webllm?: {
      model: string;     // 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
    };
  };

  // 降级策略: 按顺序尝试
  fallbackChain: string[];  // ['openai', 'webllm', 'template']

  // 是否启用自动降级
  autoFallback: boolean;
}
```

## LLMService 主类

```typescript
class LLMService {
  private providers: Map<string, LLMProvider>;
  private config: LLMConfig;

  // 注册 Provider
  registerProvider(provider: LLMProvider): void;

  // 获取当前活跃 Provider
  getActiveProvider(): LLMProvider | null;

  // 获取所有可用 Provider
  getAvailableProviders(): LLMProvider[];

  // 切换 Provider
  setActiveProvider(id: string): Promise<void>;

  // 更新配置
  updateConfig(config: Partial<LLMConfig>): void;

  // 测试连接
  testConnection(providerId: string): Promise<{ success: boolean; error?: string }>;

  // 核心调用 - 自动处理降级
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;

  // 流式调用
  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}
```

## 端模型选择

### 当前选择: Qwen2.5-0.5B

| 属性 | 值 |
|------|------|
| 模型 | Qwen2.5-0.5B-Instruct |
| 大小 | ~500MB (量化后) |
| 运行时 | WebLLM (MLC) |
| 要求 | WebGPU 支持 |

### 后续候选

| 模型 | 大小 | 特点 |
|------|------|------|
| SmolLM2-360M | ~300MB | 更小更快 |
| Phi-3-mini | ~2GB | 推理更强 |
| Gemma-2B | ~1.5GB | 平衡选择 |

### Mobile 端 (TODO)

> 研究 Apple Intelligence / Core ML 原生能力，可能不需要自带模型

## 文件结构

```
apps/web/src/lib/llm/
├── index.ts                 # 导出 LLMService 单例
├── types.ts                 # 所有类型定义
├── service.ts               # LLMService 实现
├── config.ts                # 配置管理 (localStorage)
├── providers/
│   ├── index.ts             # Provider 注册
│   ├── base.ts              # BaseLLMProvider 抽象类
│   ├── openai.ts            # OpenAI 适配器
│   ├── anthropic.ts         # Anthropic 适配器
│   ├── gemini.ts            # Gemini 适配器
│   ├── ollama.ts            # Ollama 适配器
│   ├── webllm.ts            # WebLLM 端模型
│   └── template.ts          # 模板兜底
└── prompts/
    ├── activation.ts        # 激活卡生成 prompt
    └── echo-companion.ts    # Echo 对话 prompt
```

## 设置页面 UI

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > AI Provider                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Cloud API ──────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Provider    [OpenAI        ▼]                       │  │
│  │  API Key     [sk-••••••••••••••••••    ] [Test]     │  │
│  │  Model       [gpt-4o-mini   ▼]                       │  │
│  │  Base URL    [https://api.openai.com  ] (optional)   │  │
│  │                                                       │  │
│  │  Status: ✅ Connected                                 │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Local Server ───────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Ollama URL  [http://localhost:11434  ] [Test]       │  │
│  │  Model       [qwen2.5:0.5b  ▼]                       │  │
│  │                                                       │  │
│  │  Status: ⚠️ Not running                               │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ On-Device Model ────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Model       [Qwen2.5-0.5B  ▼]                       │  │
│  │  Size        500 MB                                   │  │
│  │                                                       │  │
│  │  Status: 📥 Not downloaded                            │  │
│  │           [Download Model]                            │  │
│  │                                                       │  │
│  │  ─────────────────────────── 45%                     │  │
│  │  Downloading... 225 MB / 500 MB                      │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Active Provider ────────────────────────────────────┐  │
│  │                                                       │  │
│  │  Use: (•) Cloud API  ( ) Local  ( ) On-Device        │  │
│  │                                                       │  │
│  │  ☑️ Auto-fallback when primary unavailable            │  │
│  │     Fallback order: Cloud → Local → On-Device        │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│                                          [Save Settings]    │
└─────────────────────────────────────────────────────────────┘
```

## 实现计划

### Phase 1: 基础架构
- [ ] types.ts - 接口定义
- [ ] config.ts - 配置管理
- [ ] base.ts - Provider 基类
- [ ] service.ts - LLMService
- [ ] template.ts - 模板兜底 Provider

### Phase 2: Cloud Providers
- [ ] openai.ts
- [ ] anthropic.ts
- [ ] gemini.ts

### Phase 3: 设置页面
- [ ] Settings 路由和页面
- [ ] Provider 配置 UI
- [ ] 连接测试功能

### Phase 4: 本地服务
- [ ] ollama.ts

### Phase 5: 端模型
- [ ] webllm.ts
- [ ] 模型下载 UI
- [ ] 进度显示

### Phase 6: 应用集成
- [ ] 迁移 Activation 生成
- [ ] 迁移 Echo Session 对话
- [ ] 移除后端 AI 依赖

## API 兼容性说明

### OpenAI 格式 (标准)

```typescript
// OpenAI, Ollama, 大多数兼容服务
{
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ]
}
```

### Anthropic 格式

```typescript
// Anthropic 特殊: system 单独传
{
  model: "claude-3-haiku-20240307",
  system: "...",
  messages: [
    { role: "user", content: "..." }
  ]
}
```

### Gemini 格式

```typescript
// Gemini: 使用 contents 而非 messages
{
  contents: [
    { role: "user", parts: [{ text: "..." }] }
  ],
  systemInstruction: { parts: [{ text: "..." }] }
}
```

各 Provider 适配器负责格式转换，对外统一使用 OpenAI 格式。
