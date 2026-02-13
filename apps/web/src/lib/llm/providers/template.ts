/**
 * Template Provider
 *
 * Fallback provider that returns template-based responses when no AI is available.
 * This ensures the app remains functional without AI.
 */

import { BaseLLMProvider } from './base';
import {
  type ProviderCapabilities,
  type ChatMessage,
  type ChatOptions,
} from '../types';

// Template responses for different scenarios
const TEMPLATES = {
  activation: {
    emotionalAnchor:
      'Take a moment to connect with these ideas. What feelings or memories do they bring up?',
    livedExperience:
      'Think about a time when you encountered something similar in your own life.',
    expressions: [
      'I remember when...',
      'This reminds me of...',
      'I feel like...',
      'What strikes me is...',
    ],
    invitation:
      "There's no right or wrong here. Just speak from your own experience.",
  },
  echo: {
    greetings: [
      "I'm here to listen. What would you like to express?",
      'Take your time. What comes to mind?',
      "I'm ready when you are. What's on your mind?",
    ],
    encouragements: [
      'That\'s interesting. Can you tell me more?',
      'I see. What else comes to mind?',
      'Go on, I\'m listening.',
      'That\'s a thoughtful perspective.',
    ],
    followUps: [
      'How does that make you feel?',
      'What do you think that means to you?',
      'Is there more you\'d like to explore?',
      'What connects this to your own experience?',
    ],
  },
};

export class TemplateProvider extends BaseLLMProvider {
  readonly id = 'template';
  readonly name = 'Template (No AI)';
  readonly type = 'template' as const;
  readonly capabilities: ProviderCapabilities = {
    streaming: false,
    maxTokens: 0,
  };

  async initialize(): Promise<void> {
    // Template provider is always ready
    this.setReady(true);
  }

  async chat(messages: ChatMessage[], _options?: ChatOptions): Promise<string> {
    // Analyze the conversation to determine response type
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    const systemMessage = messages.find((m) => m.role === 'system');

    // Check if this is an activation card request
    if (systemMessage?.content.toLowerCase().includes('activation')) {
      return this.generateActivationResponse();
    }

    // Check if this is an echo session
    if (systemMessage?.content.toLowerCase().includes('echo')) {
      return this.generateEchoResponse(messages, lastUserMessage?.content);
    }

    // Default response
    return this.getRandomItem(TEMPLATES.echo.encouragements);
  }

  private generateActivationResponse(): string {
    // Return a JSON structure for activation card
    return JSON.stringify({
      emotionalAnchor: TEMPLATES.activation.emotionalAnchor,
      livedExperience: TEMPLATES.activation.livedExperience,
      expressions: TEMPLATES.activation.expressions,
      invitation: TEMPLATES.activation.invitation,
    });
  }

  private generateEchoResponse(messages: ChatMessage[], lastMessage?: string): string {
    const turnCount = messages.filter((m) => m.role === 'user').length;

    // First turn: greeting
    if (turnCount <= 1 || !lastMessage) {
      return this.getRandomItem(TEMPLATES.echo.greetings);
    }

    // Short response: encourage more
    if (lastMessage.length < 50) {
      return this.getRandomItem(TEMPLATES.echo.encouragements);
    }

    // Longer response: follow up
    return this.getRandomItem(TEMPLATES.echo.followUps);
  }

  private getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
