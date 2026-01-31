import OpenAI from 'openai';
import {
  ACTIVATION_CARD_SYSTEM_PROMPT,
  buildActivationCardPrompt,
  ECHO_COMPANION_SYSTEM_PROMPT,
  buildEchoCompanionPrompt,
  type GenerateActivationCardInput,
  type ActivationCardResponse,
  type EchoCompanionContext,
} from '@echo/core';

// Lazy-load OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Mock responses for when API key is not available
const MOCK_ACTIVATION_CARD: ActivationCardResponse = {
  emotionalAnchor: 'A moment when you noticed how your body responds to challenge.',
  livedExperience: 'When learning something new, the frustration and breakthrough feel equally intense.',
  expressions: [
    'The body remembers what the mind forgets.',
    'Progress often feels like standing still.',
    'Small adjustments lead to big changes.',
  ],
  invitation: 'What would you tell someone just starting this journey?',
};

const MOCK_ECHO_RESPONSES = [
  "That's a meaningful observation. Can you tell me more about what that felt like?",
  "I hear you. What do you think made that moment stand out?",
  "That resonates. How would you express that to someone who hasn't experienced it?",
  "Interesting perspective. What words feel most true to you right now?",
];

/**
 * Generate an activation card from user materials
 */
export async function generateActivationCard(
  input: GenerateActivationCardInput
): Promise<ActivationCardResponse> {
  const client = getOpenAI();

  if (!client) {
    console.log('[AI] No API key, returning mock activation card');
    return MOCK_ACTIVATION_CARD;
  }

  const userPrompt = buildActivationCardPrompt(input);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: ACTIVATION_CARD_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const parsed = JSON.parse(content) as ActivationCardResponse;
  return parsed;
}

/**
 * Generate Echo companion response in a session
 */
export async function generateEchoResponse(
  userMessage: string,
  context: EchoCompanionContext
): Promise<string> {
  const client = getOpenAI();

  if (!client) {
    console.log('[AI] No API key, returning mock response');
    const randomIndex = Math.floor(Math.random() * MOCK_ECHO_RESPONSES.length);
    return MOCK_ECHO_RESPONSES[randomIndex];
  }

  const userPrompt = buildEchoCompanionPrompt(userMessage, context);

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: ECHO_COMPANION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return content;
}
