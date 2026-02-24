/**
 * Vocabulary Extraction Pipeline
 *
 * Extracts vocabulary (words, phrases, expressions, sentence patterns)
 * from text using LLM with local lemmatization via compromise.
 */

import nlp from 'compromise';
import { getLLMService } from './llm';
import type { VocabularyTermType } from '@echo/core/models';

export interface ExtractedVocabulary {
  term: string;
  termType: VocabularyTermType;
  normalized: string;
  context: string;
}

// ============ Lemmatization (compromise) ============

/**
 * Lemmatize a term to its base form using compromise
 */
function lemmatize(term: string): string {
  const doc = nlp(term);

  // Try verb → infinitive
  const verbs = doc.verbs();
  if (verbs.length > 0) {
    const infinitive = verbs.toInfinitive().out('text');
    if (infinitive) return infinitive.toLowerCase().trim();
  }

  // Try noun → singular
  const nouns = doc.nouns();
  if (nouns.length > 0) {
    const singular = nouns.toSingular().out('text');
    if (singular) return singular.toLowerCase().trim();
  }

  // Default: lowercase
  return term.toLowerCase().trim();
}

/**
 * Lemmatize a phrase (preserve structure, lemmatize key words)
 */
function lemmatizePhrase(phrase: string): string {
  const doc = nlp(phrase);

  // Convert verbs to infinitive form
  doc.verbs().toInfinitive();

  // Convert nouns to singular
  doc.nouns().toSingular();

  return doc.out('text').toLowerCase().trim();
}

// ============ Common Words Filter ============

const COMMON_WORDS = new Set([
  // Articles, pronouns, prepositions
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'must', 'shall', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'now', 'and', 'but', 'or', 'if', 'because',
  'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it',
  'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
  'about', 'up', 'down', 'out', 'off', 'over', 'also', 'well', 'back',
  'being', 'both', 'come', 'even', 'find', 'first', 'get', 'give', 'go',
  'going', 'good', 'great', 'know', 'last', 'like', 'little', 'long',
  'look', 'made', 'make', 'many', 'much', 'new', 'old', 'one', 'part',
  'people', 'place', 'right', 'say', 'see', 'take', 'think', 'time',
  'two', 'use', 'want', 'way', 'work', 'world', 'year', 'years', 'thing',
  'things', 'day', 'days', 'man', 'men', 'woman', 'women', 'life',
]);

function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word.toLowerCase());
}

// ============ LLM Extraction ============

const EXTRACTION_PROMPT = `Extract important English vocabulary from the following text. Focus on:
1. Words: Individual words that are intermediate to advanced level (skip basic words like "go", "make", "good")
2. Phrases: Multi-word phrases (2-4 words) that are commonly used together
3. Expressions: Idiomatic expressions or fixed phrases with special meaning
4. Sentence Patterns: Common grammatical structures that can be reused

For each item, provide:
- term: The exact form from the text
- termType: "word", "phrase", "expression", or "sentence_pattern"
- context: A brief snippet showing how it's used (10-20 words)

Return a JSON array of objects. Only include vocabulary worth learning.
If no significant vocabulary is found, return an empty array.

Text to analyze:
"""
{text}
"""

Return ONLY the JSON array, no explanation.`;

/**
 * Extract vocabulary using LLM, with local lemmatization
 */
export async function extractVocabularyWithLLM(
  text: string
): Promise<ExtractedVocabulary[]> {
  const llmService = getLLMService();
  await llmService.waitForInit();

  const provider = llmService.getActiveProvider();
  if (!provider || !provider.isReady() || provider.id === 'template') {
    // Fall back to local extraction if no LLM available
    console.log('[VocabExtraction] No LLM available, using local extraction');
    return extractVocabularyLocal(text);
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
      return extractVocabularyLocal(text);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return extractVocabularyLocal(text);
    }

    // Validate and apply local lemmatization
    return parsed
      .filter(item =>
        item.term &&
        item.termType &&
        ['word', 'phrase', 'expression', 'sentence_pattern'].includes(item.termType)
      )
      .map(item => {
        const term = String(item.term);
        const termType = item.termType as VocabularyTermType;

        // Apply local lemmatization for accurate normalized form
        const normalized = termType === 'word'
          ? lemmatize(term)
          : lemmatizePhrase(term);

        return {
          term,
          termType,
          normalized,
          context: String(item.context || '').slice(0, 100),
        };
      });
  } catch (error) {
    console.error('[VocabExtraction] LLM extraction failed:', error);
    return extractVocabularyLocal(text);
  }
}

// ============ Local Extraction (Fallback) ============

/**
 * Extract vocabulary locally using compromise (no LLM)
 */
export function extractVocabularyLocal(text: string): ExtractedVocabulary[] {
  const results: ExtractedVocabulary[] = [];
  const doc = nlp(text);
  const seen = new Set<string>();

  // 1. Extract nouns (skip common ones)
  const nouns = doc.nouns().out('array') as string[];
  for (const noun of nouns) {
    const normalized = lemmatize(noun);
    if (normalized.length >= 4 && !isCommonWord(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        term: noun,
        termType: 'word',
        normalized,
        context: findContext(text, noun),
      });
    }
  }

  // 2. Extract verbs (skip common ones)
  const verbs = doc.verbs().out('array') as string[];
  for (const verb of verbs) {
    const normalized = lemmatize(verb);
    if (normalized.length >= 4 && !isCommonWord(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        term: verb,
        termType: 'word',
        normalized,
        context: findContext(text, verb),
      });
    }
  }

  // 3. Extract adjectives
  const adjectives = doc.adjectives().out('array') as string[];
  for (const adj of adjectives) {
    const normalized = adj.toLowerCase().trim();
    if (normalized.length >= 4 && !isCommonWord(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        term: adj,
        termType: 'word',
        normalized,
        context: findContext(text, adj),
      });
    }
  }

  // 4. Extract adverbs
  const adverbs = doc.adverbs().out('array') as string[];
  for (const adv of adverbs) {
    const normalized = adv.toLowerCase().trim();
    if (normalized.length >= 4 && !isCommonWord(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        term: adv,
        termType: 'word',
        normalized,
        context: findContext(text, adv),
      });
    }
  }

  // 5. Extract phrasal verbs (e.g., "pick up", "take off")
  const phrasalVerbs = doc.match('#PhrasalVerb').out('array') as string[];
  for (const pv of phrasalVerbs) {
    const normalized = lemmatizePhrase(pv);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        term: pv,
        termType: 'phrase',
        normalized,
        context: findContext(text, pv),
      });
    }
  }

  // 6. Extract common phrase patterns
  const phrasePatterns = [
    '#Verb (on|off|up|down|in|out|over|back|away|into|through)',  // Phrasal verbs
    'in #Noun of',  // in spite of, in terms of
    'take #Noun into account',
    'as #Adjective as',
    'more #Adjective than',
  ];

  for (const pattern of phrasePatterns) {
    try {
      const matches = doc.match(pattern).out('array') as string[];
      for (const match of matches) {
        const normalized = lemmatizePhrase(match);
        if (!seen.has(normalized) && match.split(' ').length >= 2) {
          seen.add(normalized);
          results.push({
            term: match,
            termType: 'phrase',
            normalized,
            context: findContext(text, match),
          });
        }
      }
    } catch {
      // Pattern might not match, continue
    }
  }

  // Limit results
  return results.slice(0, 20);
}

/**
 * Find context for a term in the original text
 */
function findContext(text: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`[^.]*\\b${escaped}\\b[^.]*\\.?`, 'i');
  const match = text.match(regex);
  return match ? match[0].trim().slice(0, 100) : '';
}

// ============ Batch Processing ============

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

// ============ Profile Insights Extraction ============

const PROFILE_EXTRACTION_PROMPT = `Analyze the following conversation messages and extract insights about the user's language learning.

Focus on discovering:
1. Strengths: Language skills they demonstrate well
2. Weaknesses: Areas that could be improved
3. Interests: Topics they seem interested in
4. Goals: Learning objectives they mention
5. Habits: Expression patterns or preferences

For each insight, provide:
- category: "strength", "weakness", "interest", "goal", or "habit"
- content: A brief description (1-2 sentences)
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
    return []; // No fallback for profile extraction - requires LLM
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
