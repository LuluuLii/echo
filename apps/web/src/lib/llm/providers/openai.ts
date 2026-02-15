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

    // Mark as ready without testing - actual errors will surface during chat
    // This saves an API call on every app load
    this.setReady(true);
  }

  /**
   * Verify connection works (called by Settings "Test Connection" button)
   */
  async verifyConnection(): Promise<void> {
    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    if (!this.config) throw new Error('Not configured');

    // Try a minimal chat completion request to test the connection
    // This is more reliable than /models which some services don't support
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
          // Don't send temperature for test - some models don't support it
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `HTTP ${response.status}`;

        // Parse error details if possible
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          if (errorText) {
            errorMessage += `: ${errorText.slice(0, 100)}`;
          }
        }

        // Add helpful hints based on status code
        if (response.status === 401) {
          throw new Error(`Invalid API key: ${errorMessage}`);
        } else if (response.status === 403) {
          throw new Error(`Access denied: ${errorMessage}`);
        } else if (response.status === 404) {
          throw new Error(`Model "${this.config.model}" not found or endpoint unavailable`);
        } else if (response.status === 429) {
          throw new Error(`Rate limited: ${errorMessage}`);
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        // Network error - likely CORS or unreachable
        const isOpenAI = this.config.baseUrl?.includes('api.openai.com');
        if (isOpenAI) {
          throw new Error(
            'Cannot connect to OpenAI directly from browser (CORS). ' +
            'Use OpenRouter or another CORS-enabled service.'
          );
        } else {
          throw new Error(
            `Cannot reach ${this.config.baseUrl}. Possible causes:\n` +
            '• Service does not allow browser requests (CORS)\n' +
            '• URL is incorrect\n' +
            '• Service is down'
          );
        }
      }
      throw e;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.config) throw new Error('Provider not initialized');

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
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
          // Only include temperature if explicitly set (some models don't support it)
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          max_tokens: options?.maxTokens ?? 2048,
        }),
      });
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        throw new Error('Network error: Cannot reach the API server');
      }
      throw e;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        if (errorText) errorMessage += `: ${errorText.slice(0, 200)}`;
      }
      throw new Error(errorMessage);
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
