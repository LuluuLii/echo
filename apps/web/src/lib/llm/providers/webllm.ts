/**
 * WebLLM Provider
 *
 * Runs LLM models locally in the browser using WebGPU.
 * Requires WebGPU support and model download on first use.
 */

import { BaseLLMProvider } from './base';
import {
  type ProviderCapabilities,
  type ProviderStatus,
  type ChatMessage,
  type ChatOptions,
  type WebLLMConfig,
  DEFAULT_MODELS,
} from '../types';

// WebLLM types (loaded dynamically)
interface MLCEngine {
  reload: (model: string) => Promise<void>;
  chat: {
    completions: {
      create: (params: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<{ choices: Array<{ message: { content: string } }> }>;
    };
  };
}

interface InitProgressReport {
  progress: number;
  text: string;
}

export class WebLLMProvider extends BaseLLMProvider {
  readonly id = 'webllm';
  readonly name = 'On-Device (WebLLM)';
  readonly type = 'edge' as const;
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    maxTokens: 4096,
  };

  private config: WebLLMConfig | null = null;
  private engine: MLCEngine | null = null;
  private downloadProgress: number = 0;
  private downloadStatus: 'idle' | 'downloading' | 'ready' | 'error' = 'idle';
  private downloadError: string | undefined;

  // Event callbacks
  onProgressUpdate?: (progress: number, status: string) => void;

  async initialize(config: WebLLMConfig): Promise<void> {
    this.config = {
      model: config.model || DEFAULT_MODELS.webllm,
    };

    // Check WebGPU support
    if (!this.isWebGPUSupported()) {
      this.setReady(false, 'WebGPU is not supported in this browser');
      this.downloadStatus = 'error';
      return;
    }

    // Mark as not ready until model is downloaded
    this.setReady(false);
    this.downloadStatus = 'idle';
  }

  /**
   * Download and load the model
   * Call this explicitly when user wants to download
   */
  async downloadModel(): Promise<void> {
    if (!this.config) throw new Error('Provider not initialized');
    if (this.downloadStatus === 'downloading') return;

    this.downloadStatus = 'downloading';
    this.downloadProgress = 0;

    try {
      // Dynamically import WebLLM
      const webllm = await import('@mlc-ai/web-llm');

      // Create engine with progress callback
      this.engine = await webllm.CreateMLCEngine(this.config.model, {
        initProgressCallback: (report: InitProgressReport) => {
          this.downloadProgress = Math.round(report.progress * 100);
          this.onProgressUpdate?.(this.downloadProgress, report.text);
        },
      });

      this.downloadStatus = 'ready';
      this.setReady(true);
    } catch (e) {
      this.downloadStatus = 'error';
      this.downloadError = e instanceof Error ? e.message : 'Failed to download model';
      this.setReady(false, this.downloadError);
      throw e;
    }
  }

  override getStatus(): ProviderStatus {
    return {
      ready: this._ready,
      error: this._error || this.downloadError,
      downloadProgress: this.downloadProgress,
      downloadStatus: this.downloadStatus,
    };
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.engine) {
      throw new Error('Model not loaded. Call downloadModel() first.');
    }

    const response = await this.engine.chat.completions.create({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    });

    return response.choices[0]?.message?.content || '';
  }

  async *stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    if (!this.engine) {
      throw new Error('Model not loaded. Call downloadModel() first.');
    }

    // WebLLM streaming requires different handling
    // For now, fall back to non-streaming
    const result = await this.chat(messages, options);
    yield result;
  }

  /**
   * Check if WebGPU is supported
   */
  isWebGPUSupported(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Get estimated model size for UI display
   */
  getModelSize(): string {
    const sizes: Record<string, string> = {
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': '~500 MB',
      'SmolLM2-360M-Instruct-q4f16_1-MLC': '~300 MB',
      'Phi-3-mini-4k-instruct-q4f16_1-MLC': '~2 GB',
    };
    return sizes[this.config?.model || ''] || 'Unknown';
  }

  /**
   * Unload model and free memory
   */
  async unload(): Promise<void> {
    this.engine = null;
    this.downloadStatus = 'idle';
    this.downloadProgress = 0;
    this.setReady(false);
  }
}
