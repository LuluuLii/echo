/**
 * Translation Prompts
 *
 * Prompts for translating material content to English.
 */

import { type ChatMessage } from '../types';

const SYSTEM_PROMPT = `You are a translator helping language learners. Your task is to translate the given text to natural, conversational English.

Guidelines:
- Translate to natural, everyday English
- Preserve the original meaning and tone
- Keep the translation concise
- If the text is already in English, return it as-is
- Output ONLY the translation, no explanations or notes`;

/**
 * Build translation prompt
 */
export function buildTranslationPrompt(content: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Translate to English:\n\n${content}` },
  ];
}

/**
 * Check if text appears to be primarily English
 * Simple heuristic based on character ranges
 */
export function isLikelyEnglish(text: string): boolean {
  // Remove whitespace and punctuation for analysis
  const cleaned = text.replace(/[\s\p{P}]/gu, '');
  if (cleaned.length === 0) return true;

  // Count ASCII letters (English)
  const asciiLetters = cleaned.match(/[a-zA-Z]/g)?.length || 0;

  // If more than 80% ASCII letters, likely English
  return asciiLetters / cleaned.length > 0.8;
}
