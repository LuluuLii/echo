/**
 * Gemini Provider
 *
 * Supports Google Gemini API.
 * Note: Gemini uses 'contents' instead of 'messages' and different role names.
 */

import { BaseLLMProvider } from './base';
import {
  type ProviderCapabilities,
  type ChatMessage,
  type ChatOptions,
  type GeminiConfig,
  DEFAULT_MODELS,
} from '../types';

export class GeminiProvider extends BaseLLMProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly type = 'cloud' as const;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    maxTokens: 1000000,
  };

  private config: GeminiConfig | null = null;

  async initialize(config: GeminiConfig): Promise<void> {
    if (!config.apiKey) {
      this.setReady(false, 'API key is required');
      return;
    }

    this.config = {
      ...config,
      model: config.model || DEFAULT_MODELS.gemini,
    };

    // Test connection by listing models
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          if (errorText) errorMessage += `: ${errorText.slice(0, 100)}`;
        }

        if (response.status === 400 || response.status === 403) {
          throw new Error(`Invalid API key: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      }
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        throw new Error('Network error: Cannot reach Gemini API');
      }
      throw e;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const { systemMessage, otherMessages } = this.extractSystemMessage(messages);
    const contents = this.convertToGeminiFormat(otherMessages);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            ...(systemMessage && {
              systemInstruction: {
                parts: [{ text: systemMessage }],
              },
            }),
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens ?? 2048,
            },
          }),
        }
      );
    } catch (e) {
      if (e instanceof TypeError && e.message === 'Failed to fetch') {
        throw new Error('Network error: Cannot reach Gemini API');
      }
      throw e;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        if (errorText) errorMessage += `: ${errorText.slice(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    if (!this.config) throw new Error('Provider not initialized');

    const { systemMessage, otherMessages } = this.extractSystemMessage(messages);
    const contents = this.convertToGeminiFormat(otherMessages);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          ...(systemMessage && {
            systemInstruction: {
              parts: [{ text: systemMessage }],
            },
          }),
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
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
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Convert ChatMessage format to Gemini's contents format
   */
  private convertToGeminiFormat(
    messages: ChatMessage[]
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    return messages.map((m) => ({
      // Gemini uses 'user' and 'model' (not 'assistant')
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  }
}
