/**
 * OpenAI Provider
 *
 * Supports OpenAI API and compatible services (Azure, proxies, etc.)
 */

import { BaseLLMProvider } from './base';
import {
  type ProviderCapabilities,
  type ChatMessage,
  type ChatOptions,
  type OpenAIConfig,
  DEFAULT_MODELS,
} from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly type = 'cloud' as const;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    maxTokens: 128000,
  };

  private config: OpenAIConfig | null = null;

  async initialize(config: OpenAIConfig): Promise<void> {
    if (!config.apiKey) {
      this.setReady(false, 'API key is required');
      return;
    }

    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      model: config.model || DEFAULT_MODELS.openai,
    };

    // Test connection
    try {
      await this.testConnection();
      this.setReady(true);
    } catch (e) {
      this.setReady(false, e instanceof Error ? e.message : 'Connection failed');
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.config) throw new Error('Not configured');

    const response = await fetch(`${this.config.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const content = json.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}
