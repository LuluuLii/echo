/**
 * Anthropic Provider
 *
 * Supports Claude models via Anthropic API.
 * Note: Anthropic uses a different message format with system separate.
 */

import { BaseLLMProvider } from './base';
import {
  type ProviderCapabilities,
  type ChatMessage,
  type ChatOptions,
  type AnthropicConfig,
  DEFAULT_MODELS,
} from '../types';

export class AnthropicProvider extends BaseLLMProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';
  readonly type = 'cloud' as const;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    maxTokens: 200000,
  };

  private config: AnthropicConfig | null = null;

  async initialize(config: AnthropicConfig): Promise<void> {
    if (!config.apiKey) {
      this.setReady(false, 'API key is required');
      return;
    }

    this.config = {
      ...config,
      model: config.model || DEFAULT_MODELS.anthropic,
    };

    // Anthropic doesn't have a simple test endpoint, so we mark as ready
    // The actual test happens on first request
    this.setReady(true);
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const { systemMessage, otherMessages } = this.extractSystemMessage(messages);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options?.maxTokens ?? 2048,
        ...(systemMessage && { system: systemMessage }),
        messages: otherMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const { systemMessage, otherMessages } = this.extractSystemMessage(messages);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
        ...(systemMessage && { system: systemMessage }),
        messages: otherMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
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
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta') {
              const text = json.delta?.text;
              if (text) yield text;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}
