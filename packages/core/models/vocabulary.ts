/**
 * Vocabulary Memory - Tracks user's active vs passive vocabulary
 *
 * Used for:
 * - Distinguishing words user has seen (passive) vs used (active)
 * - Recommending vocabulary to practice
 * - Measuring vocabulary growth
 */

/**
 * Type of vocabulary item
 */
export type VocabularyTermType = 'word' | 'phrase' | 'expression' | 'sentence_pattern';

/**
 * Status of vocabulary mastery
 */
export type VocabularyStatus = 'passive' | 'activated' | 'mastered';

/**
 * User's marking of a vocabulary item
 */
export type VocabularyUserMark = 'known' | 'learning' | 'ignore';

/**
 * A source where vocabulary was seen passively
 */
export interface PassiveSource {
  materialId: string;
  context: string;              // Example sentence from material
  seenAt: number;
}

/**
 * An instance where user actively used vocabulary
 */
export interface ActiveUsage {
  utteranceId: string;
  sessionId: string;
  context: string;              // User's sentence
  usedAt: number;
}

/**
 * A vocabulary record tracking passive/active usage
 */
export interface VocabularyRecord {
  id: string;

  // Vocabulary item
  term: string;                 // e.g., "take into account"
  termType: VocabularyTermType;
  normalized: string;           // Normalized/lemmatized form

  // Passive (seen in materials)
  passiveCount: number;
  passiveSources: PassiveSource[];

  // Active (used by user)
  activeCount: number;
  activeUsages: ActiveUsage[];

  // Status
  status: VocabularyStatus;
  // passive: only seen, never used
  // activated: used 1-2 times
  // mastered: used 3+ times or user marked

  // Timeline
  firstSeen: number;
  firstUsed?: number;
  lastUsed?: number;

  // User marking
  userMarked?: VocabularyUserMark;
}

/**
 * A user utterance record (full message storage)
 */
export interface UserUtterance {
  id: string;
  sessionId: string;

  // Content
  content: string;              // User's original message
  contentEn?: string;           // English translation if not English

  // Context
  turnIndex: number;            // Conversation turn index
  replyTo?: string;             // AI message ID this replies to
  topic?: string;

  // Relations
  materialIds?: string[];       // Referenced materials

  // Processing status
  vocabularyExtracted: boolean;

  // Embedding (for semantic analysis)
  embedding?: number[];

  createdAt: number;
}

/**
 * Vocabulary statistics summary
 */
export interface VocabularyStats {
  totalPassive: number;         // Total words seen
  totalActive: number;          // Total words used
  totalMastered: number;        // Total words mastered
  activationRate: number;       // active / passive ratio
}

/**
 * Stats by vocabulary type
 */
export interface VocabularyStatsByType {
  word: { passive: number; active: number; mastered: number };
  phrase: { passive: number; active: number; mastered: number };
  expression: { passive: number; active: number; mastered: number };
  sentence_pattern: { passive: number; active: number; mastered: number };
}

/**
 * Vocabulary insight/summary
 */
export interface VocabularyInsight {
  userId: string;

  // Overall stats
  stats: VocabularyStats;

  // By type
  byType: VocabularyStatsByType;

  // Recommendations
  recommendedToActivate: Array<{
    term: string;
    passiveCount: number;
    lastSeen: number;
    exampleContext: string;
  }>;

  // Recent progress
  recentProgress: {
    newlyActivated: string[];
    newlyMastered: string[];
    periodStart: number;
    periodEnd: number;
  };

  updatedAt: number;
}

/**
 * Input for creating a vocabulary record
 */
export interface CreateVocabularyRecordInput {
  term: string;
  termType: VocabularyTermType;
  normalized?: string;
  passiveSource?: PassiveSource;
}

/**
 * Input for recording active usage
 */
export interface RecordActiveUsageInput {
  term: string;
  utteranceId: string;
  sessionId: string;
  context: string;
}

/**
 * Calculate status based on active count
 */
export function calculateVocabularyStatus(
  activeCount: number,
  userMarked?: VocabularyUserMark
): VocabularyStatus {
  if (userMarked === 'known') return 'mastered';
  if (activeCount >= 3) return 'mastered';
  if (activeCount >= 1) return 'activated';
  return 'passive';
}

/**
 * Export format for vocabulary data
 */
export interface VocabularyExport {
  exportedAt: number;
  version: string;
  utterances: UserUtterance[];
  vocabularyRecords: VocabularyRecord[];
  insight: VocabularyInsight;
}
