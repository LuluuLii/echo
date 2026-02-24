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

export {
  buildTranslatePrompt,
  buildHintsPrompt,
  buildDictionaryPrompt,
  getToolPrompt,
  type SessionToolType,
} from './session-tools';

export {
  buildFeedbackPrompt,
  buildContinuePrompt,
  buildExpressionCheckPrompt,
  getCreationPrompt,
  type CreationAction,
} from './creation-mode';
