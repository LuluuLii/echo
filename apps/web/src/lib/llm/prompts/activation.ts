/**
 * Activation Card Generation Prompts
 *
 * Prompts for generating activation cards from raw materials.
 */

import { type ChatMessage } from '../types';
import { type RawMaterial } from '../../store/materials';

const SYSTEM_PROMPT = `You are an activation card generator for Echo, a language learning app.

Your task is to create an "Activation Card" that helps users connect emotionally with their collected materials and express themselves authentically.

The card should:
1. Find an emotional anchor - a feeling or memory that connects the materials
2. Create a vivid lived experience scenario the user can relate to
3. Suggest natural expressions (phrases, sentence starters) they might use
4. End with a warm invitation to share their own experience

Output ONLY valid JSON in this exact format:
{
  "emotionalAnchor": "A brief emotional connection point (1-2 sentences)",
  "livedExperience": "A relatable scenario that evokes the feeling (2-3 sentences)",
  "expressions": ["Expression 1...", "Expression 2...", "Expression 3..."],
  "invitation": "A warm invitation to share (1-2 sentences)"
}

Guidelines:
- Write naturally, as if speaking to a friend
- Focus on universal emotions and experiences
- The expressions should be conversation starters, not complete sentences
- Make it personal and relatable, not academic
- If the topic is provided, weave it naturally into the card
- If materials are in different languages, respond in the language of the majority`;

/**
 * Build activation card generation messages
 */
export function buildActivationPrompt(
  materials: RawMaterial[],
  topic?: string
): ChatMessage[] {
  const materialsList = materials
    .map((m, i) => `[Material ${i + 1}]\n${m.content}${m.note ? `\n(Note: ${m.note})` : ''}`)
    .join('\n\n');

  const userPrompt = topic
    ? `Topic: "${topic}"\n\nMaterials:\n${materialsList}`
    : `Materials:\n${materialsList}`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Parse activation card response
 */
export interface ActivationCard {
  emotionalAnchor: string;
  livedExperience: string;
  expressions: string[];
  invitation: string;
}

export function parseActivationResponse(response: string): ActivationCard | null {
  try {
    // Try to extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      typeof parsed.emotionalAnchor === 'string' &&
      typeof parsed.livedExperience === 'string' &&
      Array.isArray(parsed.expressions) &&
      typeof parsed.invitation === 'string'
    ) {
      return {
        emotionalAnchor: parsed.emotionalAnchor,
        livedExperience: parsed.livedExperience,
        expressions: parsed.expressions.filter((e: unknown) => typeof e === 'string'),
        invitation: parsed.invitation,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get fallback activation card when parsing fails
 */
export function getFallbackActivationCard(materials: RawMaterial[]): ActivationCard {
  const preview = materials[0]?.content.slice(0, 100) || 'your collected materials';

  return {
    emotionalAnchor:
      'Take a moment to connect with these ideas. What feelings or memories do they bring up?',
    livedExperience: `Looking at "${preview}..." - think about a time when you encountered something similar in your own life.`,
    expressions: [
      'I remember when...',
      'This reminds me of...',
      'I feel like...',
      'What strikes me is...',
    ],
    invitation:
      "There's no right or wrong here. Just speak from your own experience.",
  };
}
