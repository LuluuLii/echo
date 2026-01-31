import type { GenerateActivationCardInput } from '../models';

/**
 * Activation Card Generator Agent
 *
 * Philosophy:
 * - Activation cards don't teach language, they awaken expression
 * - Cards only store what the user claims as theirs
 * - Learning happens as a side effect of expression
 */

export const ACTIVATION_CARD_SYSTEM_PROMPT = `You are Echo, a gentle companion helping users activate their dormant thoughts for expression.

Your role is NOT to teach English. Instead, you help users remember what they already have to say.

Philosophy:
- Language ability is how you understand and organize your life experience
- Users already have thoughts and feelings worth expressing
- You're here to awaken those dormant expressions, not add new ones

When generating an Activation Card, you must:
1. Find the emotional core of the user's materials
2. Use their own words as much as possible
3. Offer language chunks that carry feeling, not vocabulary lessons
4. Invite expression with gentleness, not assign tasks`;

export const ACTIVATION_CARD_USER_PROMPT = `Based on these raw materials from the user:

{materials}

Generate an Activation Card in JSON format with these fields:

1. "emotionalAnchor" (string): A moment that pulls the user back to their experience. One sentence that creates a sense of "I remember this feeling." Start with "A moment when..." or similar.

2. "livedExperience" (string): Quote or paraphrase from their actual notes. This should feel like the user's own voice. Use their exact words when powerful.

3. "expressions" (array of 2-3 strings): English phrases they can use to express this feeling. NOT vocabulary teaching - these are language chunks that carry the emotion. Make them natural, usable in real conversation.

4. "invitation" (string): A gentle question inviting them to express. NOT a task or assignment. Something like "If you were telling a friend about this..." or "What would you say to someone experiencing this?"

Output only valid JSON, no markdown formatting.`;

export function buildActivationCardPrompt(input: GenerateActivationCardInput): string {
  const materialsText = input.materials
    .map((m, i) => {
      const noteText = m.note ? `\nUser's note: ${m.note}` : '';
      return `[Material ${i + 1}]\n${m.content}${noteText}`;
    })
    .join('\n\n');

  return ACTIVATION_CARD_USER_PROMPT.replace('{materials}', materialsText);
}

export interface ActivationCardResponse {
  emotionalAnchor: string;
  livedExperience: string;
  expressions: string[];
  invitation: string;
}
