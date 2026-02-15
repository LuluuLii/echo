/**
 * LLM Service
 *
 * Main service class that manages providers and handles requests.
 * Implements automatic fallback when primary provider fails.
 */

import {
  type LLMProvider,
  type LLMConfig,
  type ChatMessage,
  type ChatOptions,
  type ConnectionTestResult,
  type ProviderStatus,
  type ProvidersConfig,
} from './types';
import { loadConfig, saveConfig, hasValidConfig } from './config';
import { createDefaultProviders } from './providers';

export class LLMService {
  private providers: Map<string, LLMProvider>;
  private config: LLMConfig;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Event callbacks
  onProviderChange?: (providerId: string) => void;
  onStatusChange?: (providerId: string, status: ProviderStatus) => void;

  constructor() {
    this.providers = createDefaultProviders();
    this.config = loadConfig();
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Wait for the service to be initialized
   * Returns immediately if already initialized
   */
  async waitForInit(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize the service and active provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    // Initialize template provider (always available)
    const templateProvider = this.providers.get('template');
    if (templateProvider) {
      await templateProvider.initialize({});
    }

    // Try to initialize the active provider if configured
    await this.initializeActiveProvider();

    this.initialized = true;
  }

  /**
   * Initialize the currently active provider
   */
  private async initializeActiveProvider(): Promise<void> {
    const providerId = this.config.activeProvider;
    const provider = this.providers.get(providerId);

    if (!provider || providerId === 'template') return;

    const providerConfig = this.config.providers[providerId as keyof ProvidersConfig];
    if (providerConfig && hasValidConfig(providerId, this.config)) {
      try {
        await provider.initialize(providerConfig);

        // Special handling for WebLLM: auto-load model if previously configured
        if (providerId === 'webllm' && !provider.isReady()) {
          console.log('[LLM] WebLLM is active, auto-loading model...');
          // Dynamic import to avoid type issues
          const webllmProvider = provider as import('./providers/webllm').WebLLMProvider;
          if (typeof webllmProvider.downloadModel === 'function') {
            // Load model (this may take time, but we await it for initialization)
            await webllmProvider.downloadModel();
          }
        }

        this.onStatusChange?.(providerId, provider.getStatus());
      } catch (e) {
        console.warn(`Failed to initialize ${providerId}:`, e);
      }
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LLMConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      providers: {
        ...this.config.providers,
        ...updates.providers,
      },
    };
    saveConfig(this.config);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get the currently active provider
   */
  getActiveProvider(): LLMProvider | undefined {
    return this.providers.get(this.config.activeProvider);
  }

  /**
   * Get providers that are ready to use
   */
  getReadyProviders(): LLMProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isReady());
  }

  /**
   * Set the active provider
   */
  async setActiveProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Initialize if needed
    if (!provider.isReady() && providerId !== 'template') {
      const providerConfig = this.config.providers[providerId as keyof ProvidersConfig];
      if (providerConfig) {
        await provider.initialize(providerConfig);
      }
    }

    this.config.activeProvider = providerId;
    saveConfig(this.config);
    this.onProviderChange?.(providerId);
  }

  /**
   * Configure a specific provider
   */
  async configureProvider<K extends keyof ProvidersConfig>(
    providerId: K,
    providerConfig: ProvidersConfig[K]
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Update config
    this.config.providers[providerId] = providerConfig;
    saveConfig(this.config);

    // Re-initialize provider
    if (providerConfig) {
      await provider.initialize(providerConfig);
      this.onStatusChange?.(providerId, provider.getStatus());
    }
  }

  /**
   * Test connection to a provider
   */
  async testConnection(providerId: string): Promise<ConnectionTestResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    const providerConfig = this.config.providers[providerId as keyof ProvidersConfig];
    if (!providerConfig && providerId !== 'template') {
      return { success: false, error: 'Provider not configured' };
    }

    const startTime = Date.now();

    try {
      await provider.initialize(providerConfig || {});
      const latencyMs = Date.now() - startTime;

      if (provider.isReady()) {
        return { success: true, latencyMs };
      } else {
        return { success: false, error: provider.getStatus().error };
      }
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Connection failed',
      };
    }
  }

  /**
   * Main chat method with automatic fallback
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    // Build provider chain - always start with active provider
    let chain: string[];
    if (this.config.autoFallback) {
      // Put active provider first, then rest of fallback chain (excluding active to avoid duplicate)
      chain = [
        this.config.activeProvider,
        ...this.config.fallbackChain.filter(id => id !== this.config.activeProvider)
      ];
    } else {
      chain = [this.config.activeProvider];
    }

    let lastError: Error | null = null;

    for (const providerId of chain) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      // Skip if not ready (except template which is always ready)
      if (!provider.isReady() && providerId !== 'template') {
        continue;
      }

      try {
        const result = await provider.chat(messages, options);
        return result;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`Provider ${providerId} failed:`, lastError.message);
        continue;
      }
    }

    // All providers failed
    throw lastError || new Error('No providers available');
  }

  /**
   * Streaming chat with automatic fallback
   */
  async *stream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<string> {
    // Build provider chain
    const chain = this.config.autoFallback
      ? this.config.fallbackChain
      : [this.config.activeProvider];

    for (const providerId of chain) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      if (!provider.isReady() && providerId !== 'template') {
        continue;
      }

      try {
        if (provider.stream) {
          yield* provider.stream(messages, options);
          return;
        } else {
          // Fallback to non-streaming
          const result = await provider.chat(messages, options);
          yield result;
          return;
        }
      } catch (e) {
        console.warn(`Provider ${providerId} failed:`, e);
        continue;
      }
    }

    throw new Error('No providers available');
  }

  /**
   * Get status of all providers
   */
  getAllStatuses(): Map<string, ProviderStatus> {
    const statuses = new Map<string, ProviderStatus>();
    for (const [id, provider] of this.providers) {
      statuses.set(id, provider.getStatus());
    }
    return statuses;
  }
}

// Singleton instance
let serviceInstance: LLMService | null = null;

/**
 * Get the singleton LLM service instance
 */
export function getLLMService(): LLMService {
  if (!serviceInstance) {
    serviceInstance = new LLMService();
  }
  return serviceInstance;
}

/**
 * Initialize the LLM service (call once at app startup)
 */
export async function initializeLLMService(): Promise<LLMService> {
  const service = getLLMService();
  await service.initialize();
  return service;
}
