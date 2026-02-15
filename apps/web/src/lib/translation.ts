/**
 * Translation Service
 *
 * Translates material content to English using the configured LLM provider.
 */

import { getLLMService } from './llm';
import { buildTranslationPrompt, isLikelyEnglish } from './llm/prompts/translation';

export interface TranslationResult {
  success: boolean;
  translation?: string;
  error?: string;
  skipped?: boolean; // True if text was already English
}

export interface TranslationOptions {
  force?: boolean; // Force translation even if content appears to be English
}

/**
 * Translate content to English
 */
export async function translateToEnglish(
  content: string,
  options?: TranslationOptions
): Promise<TranslationResult> {
  // Skip if already English (unless force is true)
  if (!options?.force && isLikelyEnglish(content)) {
    return {
      success: true,
      translation: content,
      skipped: true,
    };
  }

  const llmService = getLLMService();

  // Wait for service to initialize
  await llmService.waitForInit();

  const config = llmService.getConfig();

  // Determine which provider to use for translation
  let provider;
  if (config.translationProvider === 'active') {
    provider = llmService.getActiveProvider();
  } else {
    provider = llmService.getProvider(config.translationProvider);
    // If specified provider is not ready, fall back to active
    if (!provider || !provider.isReady()) {
      provider = llmService.getActiveProvider();
    }
  }

  // Check if we have a working provider
  if (!provider || !provider.isReady()) {
    return {
      success: false,
      error: 'No LLM provider available. Please configure one in Settings.',
    };
  }

  try {
    const messages = buildTranslationPrompt(content);
    const translation = await provider.chat(messages);

    return {
      success: true,
      translation: translation.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

/**
 * Batch translate multiple contents
 * Returns a map of original content to translation
 */
export async function translateBatch(
  contents: string[],
  onProgress?: (completed: number, total: number) => void,
  options?: TranslationOptions
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    const result = await translateToEnglish(content, options);
    results.set(content, result);
    onProgress?.(i + 1, contents.length);
  }

  return results;
}
