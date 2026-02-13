/**
 * LLM Module
 *
 * Pluggable LLM provider system supporting:
 * - Cloud APIs: OpenAI, Anthropic, Gemini
 * - Local servers: Ollama
 * - Edge models: WebLLM
 * - Template fallback: No AI required
 *
 * Usage:
 * ```typescript
 * import { getLLMService, initializeLLMService } from './lib/llm';
 *
 * // Initialize at app startup
 * await initializeLLMService();
 *
 * // Use the service
 * const llm = getLLMService();
 * const response = await llm.chat([
 *   { role: 'system', content: 'You are helpful.' },
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 */

// Types
export type {
  LLMProvider,
  LLMConfig,
  ChatMessage,
  ChatOptions,
  ProviderType,
  ProviderStatus,
  ProviderCapabilities,
  ConnectionTestResult,
  ProvidersConfig,
  OpenAIConfig,
  AnthropicConfig,
  GeminiConfig,
  OllamaConfig,
  WebLLMConfig,
} from './types';

export { DEFAULT_MODELS, PROVIDER_INFO } from './types';

// Service
export { LLMService, getLLMService, initializeLLMService } from './service';

// Config utilities
export {
  loadConfig,
  saveConfig,
  updateProviderConfig,
  setActiveProvider,
  setAutoFallback,
  hasValidConfig,
  clearConfig,
} from './config';

// Providers (for direct access if needed)
export {
  BaseLLMProvider,
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  OllamaProvider,
  WebLLMProvider,
  TemplateProvider,
  createDefaultProviders,
} from './providers';
