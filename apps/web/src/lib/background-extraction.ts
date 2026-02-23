/**
 * Background Extraction Pipeline
 *
 * Runs after session ends to:
 * 1. Extract vocabulary from user utterances
 * 2. Extract profile insights
 * 3. Update vocabulary records
 * 4. Update user profile
 */

import { useVocabularyStore } from './store/vocabulary';
import { useUserStore } from './store/user';
import {
  extractVocabularyWithLLM,
  extractProfileInsights,
  type ExtractedVocabulary,
  type ExtractedInsight,
} from './vocabulary-extraction';
import { getUnextractedUtterances, markUtteranceExtracted } from './loro';

/**
 * Process pending vocabulary extraction
 * Call this after session ends or periodically
 */
export async function processVocabularyExtraction(): Promise<{
  processed: number;
  vocabularyAdded: number;
}> {
  const vocabularyStore = useVocabularyStore.getState();
  const unextracted = getUnextractedUtterances();

  if (unextracted.length === 0) {
    return { processed: 0, vocabularyAdded: 0 };
  }

  console.log(`[BackgroundExtraction] Processing ${unextracted.length} utterances`);

  let processed = 0;
  let vocabularyAdded = 0;

  for (const utterance of unextracted) {
    try {
      // Extract vocabulary from utterance
      const vocabulary = await extractVocabularyWithLLM(utterance.content);

      // Record active vocabulary usage
      for (const item of vocabulary) {
        vocabularyStore.recordActiveVocabulary({
          term: item.term,
          termType: item.termType,
          utteranceId: utterance.id,
          sessionId: utterance.sessionId,
          context: item.context || utterance.content.slice(0, 100),
        });
        vocabularyAdded++;
      }

      // Mark as extracted
      markUtteranceExtracted(utterance.id);
      processed++;

      console.log(`[BackgroundExtraction] Processed utterance ${utterance.id}: ${vocabulary.length} items`);
    } catch (error) {
      console.error(`[BackgroundExtraction] Failed for ${utterance.id}:`, error);
    }
  }

  return { processed, vocabularyAdded };
}

/**
 * Extract vocabulary from material content (passive vocabulary)
 */
export async function extractPassiveVocabulary(
  materialId: string,
  content: string
): Promise<number> {
  const vocabularyStore = useVocabularyStore.getState();

  try {
    const vocabulary = await extractVocabularyWithLLM(content);

    for (const item of vocabulary) {
      vocabularyStore.recordPassiveVocabulary({
        term: item.term,
        termType: item.termType,
        materialId,
        context: item.context || content.slice(0, 100),
      });
    }

    console.log(`[BackgroundExtraction] Extracted ${vocabulary.length} passive vocab from material ${materialId}`);
    return vocabulary.length;
  } catch (error) {
    console.error(`[BackgroundExtraction] Material extraction failed:`, error);
    return 0;
  }
}

/**
 * Process profile insights from recent session
 */
export async function processProfileInsights(
  userMessages: string[],
  sessionId: string
): Promise<number> {
  if (userMessages.length < 2) {
    // Need at least 2 messages for meaningful insights
    return 0;
  }

  const userStore = useUserStore.getState();

  try {
    const insights = await extractProfileInsights(userMessages);

    for (const insight of insights) {
      userStore.addInsight({
        category: insight.category,
        content: insight.content,
        confidence: insight.confidence,
        source: sessionId,
      });
    }

    console.log(`[BackgroundExtraction] Added ${insights.length} profile insights`);
    return insights.length;
  } catch (error) {
    console.error(`[BackgroundExtraction] Profile extraction failed:`, error);
    return 0;
  }
}

/**
 * Run full background extraction pipeline
 * Call this after session completion
 */
export async function runBackgroundExtraction(params: {
  sessionId: string;
  userMessages: string[];
}): Promise<{
  vocabularyProcessed: number;
  vocabularyAdded: number;
  insightsAdded: number;
}> {
  console.log('[BackgroundExtraction] Starting pipeline for session', params.sessionId);

  // Process vocabulary extraction
  const { processed: vocabularyProcessed, vocabularyAdded } = await processVocabularyExtraction();

  // Process profile insights
  const insightsAdded = await processProfileInsights(params.userMessages, params.sessionId);

  console.log('[BackgroundExtraction] Pipeline complete:', {
    vocabularyProcessed,
    vocabularyAdded,
    insightsAdded,
  });

  return {
    vocabularyProcessed,
    vocabularyAdded,
    insightsAdded,
  };
}

/**
 * Schedule background extraction to run after a delay
 * Uses requestIdleCallback for better performance
 */
export function scheduleBackgroundExtraction(params: {
  sessionId: string;
  userMessages: string[];
  delayMs?: number;
}): void {
  const delay = params.delayMs ?? 2000;

  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          runBackgroundExtraction(params).catch(console.error);
        },
        { timeout: 10000 }
      );
    } else {
      runBackgroundExtraction(params).catch(console.error);
    }
  }, delay);
}
