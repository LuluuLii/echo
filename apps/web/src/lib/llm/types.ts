/**
 * LLM Provider Types
 *
 * All interfaces for the pluggable LLM provider system.
 */

// ===== Message Types =====

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// ===== Provider Types =====

export type ProviderType = 'cloud' | 'local' | 'edge' | 'template';

export interface ProviderCapabilities {
  streaming: boolean;
  maxTokens: number;
}

export interface ProviderStatus {
  ready: boolean;
  error?: string;
  // Edge model specific
  downloadProgress?: number;  // 0-100
  downloadStatus?: 'idle' | 'downloading' | 'ready' | 'error';
}

export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  readonly capabilities: ProviderCapabilities;

  // Lifecycle
  initialize(config: ProviderSpecificConfig): Promise<void>;
  isReady(): boolean;
  getStatus(): ProviderStatus;

  // Core methods
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  stream?(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}

// ===== Configuration Types =====

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface WebLLMConfig {
  model: string;
}

export type ProviderSpecificConfig =
  | OpenAIConfig
  | AnthropicConfig
  | GeminiConfig
  | OllamaConfig
  | WebLLMConfig
  | Record<string, never>;  // For template provider

export interface ProvidersConfig {
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  gemini?: GeminiConfig;
  ollama?: OllamaConfig;
  webllm?: WebLLMConfig;
}

export interface LLMConfig {
  // Active provider ID
  activeProvider: string;

  // Per-provider configurations
  providers: ProvidersConfig;

  // Fallback chain: try providers in order
  fallbackChain: string[];

  // Enable automatic fallback
  autoFallback: boolean;
}

// ===== Service Types =====

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
}

export interface LLMServiceEvents {
  onProviderChange?: (providerId: string) => void;
  onStatusChange?: (providerId: string, status: ProviderStatus) => void;
  onError?: (providerId: string, error: Error) => void;
}

// ===== Default Models =====

export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-1.5-flash',
  ollama: 'qwen2.5:0.5b',
  webllm: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
} as const;

export const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    type: 'cloud' as const,
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic',
    type: 'cloud' as const,
    models: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  },
  gemini: {
    name: 'Google Gemini',
    type: 'cloud' as const,
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  },
  ollama: {
    name: 'Ollama',
    type: 'local' as const,
    models: ['qwen2.5:0.5b', 'qwen2.5:1.5b', 'llama3.2:1b', 'llama3.2:3b', 'phi3:mini'],
  },
  webllm: {
    name: 'On-Device (WebLLM)',
    type: 'edge' as const,
    models: ['SmolLM2-360M-Instruct-q4f16_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'],
  },
  template: {
    name: 'Template (No AI)',
    type: 'template' as const,
    models: [],
  },
} as const;
