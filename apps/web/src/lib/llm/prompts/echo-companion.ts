/**
 * Echo Companion Prompts
 *
 * Prompts for the Echo conversation companion.
 */

import { type ChatMessage } from '../types';
import { type RawMaterial, type ActivationCard } from '../../store/materials';

/**
 * Build system prompt for Echo companion
 */
export function buildEchoSystemPrompt(
  card: ActivationCard,
  materials: RawMaterial[]
): string {
  const materialsList = materials
    .map((m, i) => {
      const preview = m.content.slice(0, 200) + (m.content.length > 200 ? '...' : '');
      // Include English translation if available
      if (m.contentEn && m.contentEn !== m.content) {
        const enPreview = m.contentEn.slice(0, 200) + (m.contentEn.length > 200 ? '...' : '');
        return `[${i + 1}] ${preview}\n    (English: ${enPreview})`;
      }
      return `[${i + 1}] ${preview}`;
    })
    .join('\n');

  return `You are Echo, a gentle conversational companion helping users express themselves in a foreign language.

CONTEXT:
The user is practicing expression based on these materials:
${materialsList}

Activation card context:
- Emotional anchor: "${card.emotionalAnchor}"
- Lived experience: "${card.livedExperience}"
- Suggested expressions: ${card.expressions.map((e) => `"${e}"`).join(', ')}

YOUR ROLE:
1. Be a supportive listener, not a teacher
2. Respond warmly and naturally, like a friend
3. Gently encourage deeper expression
4. Ask follow-up questions to help them elaborate
5. If they make language mistakes, don't correct - focus on meaning
6. Mirror their emotional tone
7. Reference the materials naturally when relevant
8. Keep responses concise (2-4 sentences usually)

GUIDELINES:
- Never lecture or explain grammar
- Never ask "Would you like me to correct..."
- Don't be overly enthusiastic or use excessive praise
- ALWAYS respond in English to help the user practice
- Focus on WHAT they're saying, not HOW they're saying it
- Keep responses simple and conversational

START:
If this is the start of conversation, warmly invite them to share based on the activation card's invitation: "${card.invitation}"`;
}

/**
 * Build initial greeting message
 */
export function buildInitialGreeting(card: ActivationCard): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `You are Echo. Generate a warm opening message (2-3 sentences) based on this context:
- Emotional anchor: "${card.emotionalAnchor}"
- Lived experience: "${card.livedExperience}"
- Invitation: "${card.invitation}"

Be natural and conversational. Don't introduce yourself or explain what you are.`,
    },
    {
      role: 'user',
      content: 'Generate the opening message.',
    },
  ];
}

/**
 * Build conversation messages for Echo companion
 */
export function buildEchoMessages(
  card: ActivationCard,
  materials: RawMaterial[],
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): ChatMessage[] {
  const systemPrompt = buildEchoSystemPrompt(card, materials);

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return messages;
}

/**
 * Fallback responses when AI is unavailable
 */
export const FALLBACK_RESPONSES = {
  greeting: [
    "I'm here to listen. What would you like to express?",
    'Take your time. What comes to mind?',
    "I'm ready when you are. What's on your mind?",
  ],
  encouragement: [
    "That's interesting. Can you tell me more?",
    'I see. What else comes to mind?',
    'Go on, I\'m listening.',
    "That's a thoughtful perspective.",
  ],
  followUp: [
    'How does that make you feel?',
    'What do you think that means to you?',
    'Is there more you\'d like to explore?',
    'What connects this to your own experience?',
  ],
  closing: [
    "Thank you for sharing. It's been good talking with you.",
    "I appreciate you opening up. Take care.",
    "Thanks for this conversation. Until next time.",
  ],
};

/**
 * Get a random fallback response
 */
export function getRandomFallback(
  type: keyof typeof FALLBACK_RESPONSES
): string {
  const responses = FALLBACK_RESPONSES[type];
  return responses[Math.floor(Math.random() * responses.length)];
}
