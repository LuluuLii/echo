/**
 * LLM Configuration Management
 *
 * Handles persistence of LLM settings to localStorage.
 */

import { type LLMConfig, type ProvidersConfig, DEFAULT_MODELS } from './types';

const CONFIG_KEY = 'echo-llm-config';

const DEFAULT_CONFIG: LLMConfig = {
  activeProvider: 'template',
  providers: {},
  // Fallback chain: template is always last as ultimate fallback
  fallbackChain: ['webllm', 'ollama', 'openai', 'anthropic', 'gemini', 'template'],
  autoFallback: true,
};

/**
 * Load LLM configuration from localStorage
 */
export function loadConfig(): LLMConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<LLMConfig>;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        providers: {
          ...DEFAULT_CONFIG.providers,
          ...parsed.providers,
        },
      };
    }
  } catch (e) {
    console.warn('Failed to load LLM config:', e);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save LLM configuration to localStorage
 */
export function saveConfig(config: LLMConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save LLM config:', e);
  }
}

/**
 * Update specific provider configuration
 */
export function updateProviderConfig<K extends keyof ProvidersConfig>(
  providerId: K,
  providerConfig: ProvidersConfig[K]
): LLMConfig {
  const config = loadConfig();
  config.providers[providerId] = providerConfig;
  saveConfig(config);
  return config;
}

/**
 * Set active provider
 */
export function setActiveProvider(providerId: string): LLMConfig {
  const config = loadConfig();
  config.activeProvider = providerId;
  saveConfig(config);
  return config;
}

/**
 * Toggle auto fallback
 */
export function setAutoFallback(enabled: boolean): LLMConfig {
  const config = loadConfig();
  config.autoFallback = enabled;
  saveConfig(config);
  return config;
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerId: keyof typeof DEFAULT_MODELS): string {
  return DEFAULT_MODELS[providerId];
}

/**
 * Clear all LLM configuration
 */
export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

/**
 * Check if a provider has valid configuration
 */
export function hasValidConfig(providerId: string, config: LLMConfig): boolean {
  const providerConfig = config.providers[providerId as keyof ProvidersConfig];

  switch (providerId) {
    case 'openai':
    case 'anthropic':
    case 'gemini':
      return !!(providerConfig && 'apiKey' in providerConfig && providerConfig.apiKey);
    case 'ollama':
      return !!(providerConfig && 'baseUrl' in providerConfig && providerConfig.baseUrl);
    case 'webllm':
      return true; // WebLLM doesn't need config, just download
    case 'template':
      return true; // Always available
    default:
      return false;
  }
}
