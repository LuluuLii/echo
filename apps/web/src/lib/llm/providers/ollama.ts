/**
 * Ollama Provider
 *
 * Supports locally running Ollama server.
 * Uses OpenAI-compatible API format.
 */

import { BaseLLMProvider } from './base';
import {
  type ProviderCapabilities,
  type ChatMessage,
  type ChatOptions,
  type OllamaConfig,
  DEFAULT_MODELS,
} from '../types';

export class OllamaProvider extends BaseLLMProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly type = 'local' as const;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    maxTokens: 32000,
  };

  private config: OllamaConfig | null = null;

  async initialize(config: OllamaConfig): Promise<void> {
    if (!config.baseUrl) {
      this.setReady(false, 'Base URL is required');
      return;
    }

    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      model: config.model || DEFAULT_MODELS.ollama,
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

    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Ollama returned HTTP ${response.status}`);
      }
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        throw new Error(
          `Cannot connect to Ollama at ${this.config.baseUrl}. ` +
          'Make sure Ollama is running: ollama serve'
        );
      }
      throw e;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
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
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            const content = json.message?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * List available models on the Ollama server
   */
  async listModels(): Promise<string[]> {
    if (!this.config) throw new Error('Provider not initialized');

    const response = await fetch(`${this.config.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('Failed to list models');
    }

    const data = await response.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  }
}
