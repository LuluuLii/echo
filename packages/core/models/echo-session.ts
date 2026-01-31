/**
 * Echo Session - A time-bound expression practice
 *
 * Each session is triggered by an activation card or user's initiative.
 * The session is a safe space for expression without judgment.
 */
export interface EchoSession {
  /** Unique identifier */
  id: string;

  /** Reference to the activation card (optional if user-initiated) */
  cardId?: string;

  /** Conversation messages */
  messages: SessionMessage[];

  /** User's claimed final expression (set when session completes) */
  finalExpression?: string;

  /** Session status */
  status: 'active' | 'completed' | 'abandoned';

  /** Unix timestamp (milliseconds) */
  createdAt: number;

  /** Unix timestamp when completed */
  completedAt?: number;
}

export interface SessionMessage {
  /** Message ID */
  id: string;

  /** Who sent the message */
  role: 'user' | 'echo';

  /** Message content */
  content: string;

  /** Unix timestamp */
  timestamp: number;
}

export interface CreateSessionInput {
  cardId?: string;
}

export interface SendMessageInput {
  sessionId: string;
  content: string;
}

export interface CompleteSessionInput {
  sessionId: string;
  finalExpression: string;
}
