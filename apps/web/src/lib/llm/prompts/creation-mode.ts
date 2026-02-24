/**
 * Creation Mode Prompts
 *
 * Prompts for creation mode actions: feedback, continue, etc.
 */

import { type ChatMessage } from '../types';
import { type RawMaterial } from '../../store/materials';

/**
 * Build feedback request prompt for creation mode
 */
export function buildFeedbackPrompt(
  userContent: string,
  materials: RawMaterial[]
): ChatMessage[] {
  const materialsContext = materials.length > 0
    ? `\n\nContext materials:\n${materials.map((m, i) => `[${i + 1}] ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`).join('\n')}`
    : '';

  return [
    {
      role: 'system',
      content: `You are a supportive writing companion helping users improve their English expression. You focus on helping them express their thoughts more clearly and naturally, not just fixing grammar.

Your feedback style:
- Acknowledge what they're expressing well
- Suggest ways to make their expression clearer or more natural
- If there are language issues, model the correct usage naturally
- Keep feedback encouraging and constructive
- Focus on 2-3 most impactful improvements, don't overwhelm
- Never be condescending or overly corrective${materialsContext}`,
    },
    {
      role: 'user',
      content: `Please give me feedback on my writing:\n\n"${userContent}"\n\nWhat am I expressing well? How can I make this clearer or more natural?`,
    },
  ];
}

/**
 * Build continue/expansion prompt for creation mode
 */
export function buildContinuePrompt(
  userContent: string,
  materials: RawMaterial[]
): ChatMessage[] {
  const materialsContext = materials.length > 0
    ? `\n\nContext materials to draw from:\n${materials.map((m, i) => `[${i + 1}] ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`).join('\n')}`
    : '';

  return [
    {
      role: 'system',
      content: `You are a writing companion helping users continue their thoughts. When asked to continue, you should:

- Match the user's voice and style
- Provide 2-3 possible directions they could take
- Offer natural sentence starters or phrases
- Draw from the context materials when relevant
- Keep suggestions brief and let the user choose their direction
- Don't write too much - give them a jumping-off point${materialsContext}`,
    },
    {
      role: 'user',
      content: `I've written:\n\n"${userContent}"\n\nHelp me continue. What could come next?`,
    },
  ];
}

/**
 * Build expression check prompt - helps refine expression without full feedback
 */
export function buildExpressionCheckPrompt(
  userContent: string
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are a quick expression helper. When shown a piece of writing:

1. If the expression is natural and clear: Say so briefly
2. If there are awkward parts: Show a more natural way to say it
3. Keep your response very brief (1-3 sentences max)

Format:
✓ [if it's good, brief encouragement]
→ [if needed, show improved version naturally]`,
    },
    {
      role: 'user',
      content: `Check this: "${userContent}"`,
    },
  ];
}

export type CreationAction = 'feedback' | 'continue' | 'check';

/**
 * Get prompt for a creation mode action
 */
export function getCreationPrompt(
  action: CreationAction,
  content: string,
  materials: RawMaterial[] = []
): ChatMessage[] {
  switch (action) {
    case 'feedback':
      return buildFeedbackPrompt(content, materials);
    case 'continue':
      return buildContinuePrompt(content, materials);
    case 'check':
      return buildExpressionCheckPrompt(content);
    default:
      throw new Error(`Unknown creation action: ${action}`);
  }
}
