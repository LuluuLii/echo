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

/**
 * Translate content to English
 */
export async function translateToEnglish(content: string): Promise<TranslationResult> {
  // Skip if already English
  if (isLikelyEnglish(content)) {
    return {
      success: true,
      translation: content,
      skipped: true,
    };
  }

  const llmService = getLLMService();

  // Wait for service to initialize
  await llmService.waitForInit();

  const activeProvider = llmService.getActiveProvider();

  // Check if we have a working provider
  if (!activeProvider || !activeProvider.isReady()) {
    return {
      success: false,
      error: 'No LLM provider available. Please configure one in Settings.',
    };
  }

  try {
    const messages = buildTranslationPrompt(content);
    const translation = await llmService.chat(messages);

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
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    const result = await translateToEnglish(content);
    results.set(content, result);
    onProgress?.(i + 1, contents.length);
  }

  return results;
}
