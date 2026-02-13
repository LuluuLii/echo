/**
 * Provider Registry
 *
 * Exports all available LLM providers.
 */

export { BaseLLMProvider } from './base';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { GeminiProvider } from './gemini';
export { OllamaProvider } from './ollama';
export { WebLLMProvider } from './webllm';
export { TemplateProvider } from './template';

import { type LLMProvider } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import { WebLLMProvider } from './webllm';
import { TemplateProvider } from './template';

/**
 * Create all default providers
 */
export function createDefaultProviders(): Map<string, LLMProvider> {
  const providers = new Map<string, LLMProvider>();

  providers.set('openai', new OpenAIProvider());
  providers.set('anthropic', new AnthropicProvider());
  providers.set('gemini', new GeminiProvider());
  providers.set('ollama', new OllamaProvider());
  providers.set('webllm', new WebLLMProvider());
  providers.set('template', new TemplateProvider());

  return providers;
}
