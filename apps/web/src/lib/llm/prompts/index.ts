/**
 * LLM Prompts
 *
 * All prompts for the Echo application.
 */

export {
  buildActivationPrompt,
  parseActivationResponse,
  getFallbackActivationCard,
  type ActivationCard,
} from './activation';

export {
  buildEchoSystemPrompt,
  buildInitialGreeting,
  buildEchoMessages,
  getRandomFallback,
  FALLBACK_RESPONSES,
} from './echo-companion';
