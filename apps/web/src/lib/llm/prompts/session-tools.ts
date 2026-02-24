/**
 * Session Tools Prompts
 *
 * Prompts for session helper tools: translate, hints, dictionary
 */

import { type ChatMessage } from '../types';

/**
 * Build translation request prompt
 */
export function buildTranslatePrompt(
  text: string,
  sourceLanguage: string = 'Chinese',
  targetLanguage: string = 'English'
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a helpful translator. Translate the given text from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Provide a natural, idiomatic translation
- If the text is already in ${targetLanguage}, simply say so
- If the text is incomplete or unclear, do your best and note any ambiguity
- Keep the response concise - just the translation and any necessary notes`,
    },
    {
      role: 'user',
      content: `Translate this: "${text}"`,
    },
  ];
}

/**
 * Build hints request prompt - help user express something
 */
export function buildHintsPrompt(
  userInput: string,
  context?: string
): ChatMessage[] {
  const contextPart = context
    ? `\nContext of the conversation: ${context}`
    : '';

  return [
    {
      role: 'system',
      content: `You are a helpful expression assistant. The user is trying to express something in English and needs hints on how to say it better or more naturally.

Rules:
- Suggest 2-3 natural ways to express what they're trying to say
- Keep suggestions simple and conversational
- Don't lecture or explain grammar
- If their input is in another language, help them express it in English
- Be encouraging but not overly enthusiastic${contextPart}`,
    },
    {
      role: 'user',
      content: userInput
        ? `I want to express: "${userInput}"\n\nHow can I say this naturally in English?`
        : 'I\'m not sure how to express my thoughts. Can you give me some starting phrases?',
    },
  ];
}

/**
 * Build dictionary lookup prompt
 */
export function buildDictionaryPrompt(
  word: string
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a concise dictionary assistant. Provide a brief definition and example for the given word or phrase.

Format your response like this:
**[word]** (part of speech)
Definition: [brief definition]
Example: [one natural example sentence]

If the word has multiple common meanings, show up to 2. Keep it brief and useful.`,
    },
    {
      role: 'user',
      content: `Define: "${word}"`,
    },
  ];
}

/**
 * Tool response type
 */
export type SessionToolType = 'translate' | 'hints' | 'dictionary';

/**
 * Get prompt for a session tool
 */
export function getToolPrompt(
  tool: SessionToolType,
  input: string,
  context?: string
): ChatMessage[] {
  switch (tool) {
    case 'translate':
      return buildTranslatePrompt(input);
    case 'hints':
      return buildHintsPrompt(input, context);
    case 'dictionary':
      return buildDictionaryPrompt(input);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}
