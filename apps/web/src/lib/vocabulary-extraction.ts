/**
 * Vocabulary Extraction Pipeline
 *
 * Extracts vocabulary (words, phrases, expressions, sentence patterns)
 * from text using LLM or simple heuristics.
 */

import { getLLMService } from './llm';
import type { VocabularyTermType } from '@echo/core/models';

export interface ExtractedVocabulary {
  term: string;
  termType: VocabularyTermType;
  normalized: string;
  context: string;
}

/**
 * LLM prompt for vocabulary extraction
 */
const EXTRACTION_PROMPT = `Extract important English vocabulary from the following text. Focus on:
1. Words: Individual words that are intermediate to advanced level
2. Phrases: Multi-word phrases (2-4 words) that are commonly used together
3. Expressions: Idiomatic expressions or fixed phrases with special meaning
4. Sentence Patterns: Common grammatical structures that can be reused

For each item, provide:
- term: The exact form from the text
- termType: "word", "phrase", "expression", or "sentence_pattern"
- normalized: The base/dictionary form (lowercase, lemmatized)
- context: A brief snippet showing how it's used

Return a JSON array of objects. Only include vocabulary worth learning (skip common words like "the", "is", "have").
If no significant vocabulary is found, return an empty array.

Text to analyze:
"""
{text}
"""

Return ONLY the JSON array, no explanation.`;

/**
 * Extract vocabulary using LLM
 */
export async function extractVocabularyWithLLM(
  text: string
): Promise<ExtractedVocabulary[]> {
  const llmService = getLLMService();
  await llmService.waitForInit();

  const provider = llmService.getActiveProvider();
  if (!provider || !provider.isReady() || provider.id === 'template') {
    // Fall back to simple extraction if no LLM available
    return extractVocabularySimple(text);
  }

  try {
    const prompt = EXTRACTION_PROMPT.replace('{text}', text);
    const response = await llmService.chat([
      { role: 'user', content: prompt }
    ]);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('[VocabExtraction] No JSON array found in response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and normalize results
    return parsed
      .filter(item =>
        item.term &&
        item.termType &&
        ['word', 'phrase', 'expression', 'sentence_pattern'].includes(item.termType)
      )
      .map(item => ({
        term: String(item.term),
        termType: item.termType as VocabularyTermType,
        normalized: String(item.normalized || item.term).toLowerCase().trim(),
        context: String(item.context || ''),
      }));
  } catch (error) {
    console.error('[VocabExtraction] LLM extraction failed:', error);
    return extractVocabularySimple(text);
  }
}

/**
 * Simple vocabulary extraction without LLM
 * Uses basic heuristics to identify potentially interesting vocabulary
 */
export function extractVocabularySimple(text: string): ExtractedVocabulary[] {
  const results: ExtractedVocabulary[] = [];

  // Common words to skip
  const skipWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'must', 'shall', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'just', 'don', 'now', 'and', 'but', 'or',
    'if', 'because', 'until', 'while', 'this', 'that', 'these', 'those',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
    'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
    'who', 'whom', 'about', 'up', 'down', 'out', 'off', 'over',
  ]);

  // Extract words (5+ characters, not in skip list)
  const words = text.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
  const uniqueWords = [...new Set(words)].filter(w => !skipWords.has(w));

  for (const word of uniqueWords.slice(0, 10)) {
    // Find context
    const regex = new RegExp(`[^.]*\\b${word}\\b[^.]*\\.?`, 'i');
    const contextMatch = text.match(regex);

    results.push({
      term: word,
      termType: 'word',
      normalized: word,
      context: contextMatch ? contextMatch[0].trim().slice(0, 100) : '',
    });
  }

  // Extract common phrases (preposition phrases, verb + adverb, etc.)
  const phrasePatterns = [
    /\b(take|make|have|get|give|put|keep|set|turn|bring|come|go)\s+(on|off|up|down|in|out|over|back|away|into|through)\b/gi,
    /\b(in|on|at|for|with)\s+\w+\s+(of|to|for)\b/gi,
    /\b(more|less|most|least)\s+\w+\s+than\b/gi,
    /\b(as|so)\s+\w+\s+as\b/gi,
  ];

  for (const pattern of phrasePatterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches.slice(0, 3)) {
      const normalized = match.toLowerCase().trim();
      if (!results.some(r => r.normalized === normalized)) {
        results.push({
          term: match,
          termType: 'phrase',
          normalized,
          context: '',
        });
      }
    }
  }

  return results.slice(0, 15);
}

/**
 * Extract vocabulary from multiple texts in batch
 */
export async function extractVocabularyBatch(
  texts: Array<{ id: string; text: string }>
): Promise<Map<string, ExtractedVocabulary[]>> {
  const results = new Map<string, ExtractedVocabulary[]>();

  // Process in sequence to avoid overwhelming LLM
  for (const { id, text } of texts) {
    try {
      const vocabulary = await extractVocabularyWithLLM(text);
      results.set(id, vocabulary);
    } catch (error) {
      console.error(`[VocabExtraction] Failed for ${id}:`, error);
      results.set(id, []);
    }
  }

  return results;
}

/**
 * Process unextracted user utterances
 * Call this periodically (e.g., after session ends)
 */
export async function processUnextractedUtterances(
  utterances: Array<{ id: string; content: string }>,
  onExtracted: (utteranceId: string, vocabulary: ExtractedVocabulary[]) => void
): Promise<number> {
  let processed = 0;

  for (const utterance of utterances) {
    try {
      const vocabulary = await extractVocabularyWithLLM(utterance.content);
      onExtracted(utterance.id, vocabulary);
      processed++;
    } catch (error) {
      console.error(`[VocabExtraction] Failed for utterance ${utterance.id}:`, error);
    }
  }

  return processed;
}

/**
 * Profile extraction prompt for discovering user insights
 */
const PROFILE_EXTRACTION_PROMPT = `Analyze the following conversation messages and extract insights about the user.

Focus on discovering:
1. Strengths: Language skills they demonstrate well
2. Weaknesses: Areas that could be improved
3. Interests: Topics they seem interested in
4. Goals: Learning objectives they mention
5. Habits: Expression patterns or preferences

For each insight, provide:
- category: "strength", "weakness", "interest", "goal", or "habit"
- content: A brief description
- confidence: A number between 0 and 1

Return a JSON array of insights. Only include confident observations (confidence >= 0.6).
If no clear insights can be extracted, return an empty array.

User messages:
"""
{messages}
"""

Return ONLY the JSON array, no explanation.`;

export interface ExtractedInsight {
  category: 'strength' | 'weakness' | 'interest' | 'goal' | 'habit';
  content: string;
  confidence: number;
}

/**
 * Extract user profile insights from conversation
 */
export async function extractProfileInsights(
  userMessages: string[]
): Promise<ExtractedInsight[]> {
  if (userMessages.length === 0) return [];

  const llmService = getLLMService();
  await llmService.waitForInit();

  const provider = llmService.getActiveProvider();
  if (!provider || !provider.isReady() || provider.id === 'template') {
    return []; // No fallback for profile extraction
  }

  try {
    const prompt = PROFILE_EXTRACTION_PROMPT.replace(
      '{messages}',
      userMessages.join('\n---\n')
    );

    const response = await llmService.chat([
      { role: 'user', content: prompt }
    ]);

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and filter results
    return parsed
      .filter(item =>
        item.category &&
        ['strength', 'weakness', 'interest', 'goal', 'habit'].includes(item.category) &&
        item.content &&
        typeof item.confidence === 'number' &&
        item.confidence >= 0.6
      )
      .map(item => ({
        category: item.category as ExtractedInsight['category'],
        content: String(item.content),
        confidence: Number(item.confidence),
      }));
  } catch (error) {
    console.error('[ProfileExtraction] Failed:', error);
    return [];
  }
}
