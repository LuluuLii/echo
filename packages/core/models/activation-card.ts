/**
 * Activation Card - The soul unit of Echo
 *
 * Activation cards don't teach language, they awaken expression.
 * They pull the user back to a real experience, making "I want to express" happen naturally.
 */
export interface ActivationCard {
  /** Unique identifier */
  id: string;

  /**
   * Layer 1: Emotional Anchor
   * Pulls the user back to the moment, awakening feelings.
   * Example: "A moment you became aware of how emotions show up in the body."
   */
  emotionalAnchor: string;

  /**
   * Layer 2: Lived Experience
   * The user's own words or paraphrased from their raw materials.
   * Creates "this is talking about me" resonance.
   */
  livedExperience: string;

  /**
   * Layer 3: Expressions to Carry the Feeling
   * 2-3 English phrases they can use to express this feeling.
   * Not vocabulary teaching, but language chunks for embedding.
   */
  expressions: string[];

  /**
   * Layer 4: Gentle Invitation
   * A soft question inviting expression, not assigning a task.
   * Example: "If you were explaining this to someone — what would you say?"
   */
  invitation: string;

  /** IDs of source raw materials */
  materialIds: string[];

  /** Unix timestamp (milliseconds) */
  createdAt: number;
}

/**
 * Activation Card Back - The result after expression
 * Only created when user completes an Echo Session
 */
export interface ActivationCardBack {
  /** Reference to the activation card */
  cardId: string;

  /** User's final claimed expression */
  finalExpression: string;

  /** Reference to the Echo Session */
  sessionId: string;

  /** Unix timestamp */
  createdAt: number;
}

export interface GenerateActivationCardInput {
  /** Raw material IDs to generate from */
  materialIds: string[];

  /** Raw material contents for context */
  materials: Array<{
    id: string;
    content: string;
    note?: string;
  }>;
}
