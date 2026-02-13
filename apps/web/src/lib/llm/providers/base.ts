/**
 * Base LLM Provider
 *
 * Abstract base class that all providers extend.
 */

import {
  type LLMProvider,
  type ProviderType,
  type ProviderCapabilities,
  type ProviderStatus,
  type ProviderSpecificConfig,
  type ChatMessage,
  type ChatOptions,
} from '../types';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: ProviderType;
  abstract readonly capabilities: ProviderCapabilities;

  protected _ready: boolean = false;
  protected _error: string | undefined;
  protected _config: ProviderSpecificConfig | null = null;

  abstract initialize(config: ProviderSpecificConfig): Promise<void>;
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;

  isReady(): boolean {
    return this._ready;
  }

  getStatus(): ProviderStatus {
    return {
      ready: this._ready,
      error: this._error,
    };
  }

  protected setReady(ready: boolean, error?: string): void {
    this._ready = ready;
    this._error = error;
  }

  /**
   * Helper to extract system message for providers that need it separate
   */
  protected extractSystemMessage(messages: ChatMessage[]): {
    systemMessage: string | undefined;
    otherMessages: ChatMessage[];
  } {
    const systemMsg = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');
    return {
      systemMessage: systemMsg?.content,
      otherMessages,
    };
  }

  /**
   * Default streaming implementation using non-streaming
   * Override in providers that support native streaming
   */
  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const result = await this.chat(messages, options);
    yield result;
  }
}
