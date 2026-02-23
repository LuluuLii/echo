/**
 * Growth Event - Records significant learning milestones and activities
 *
 * Used for:
 * - Building a timeline of learning progress
 * - Tracking achievements and milestones
 * - Providing context for AI-generated insights
 */

/**
 * Types of growth events
 */
export type GrowthEventType =
  | 'practice'       // Completed a practice session
  | 'milestone'      // Reached a learning milestone
  | 'achievement'    // Unlocked an achievement
  | 'topic_started'  // Started practicing a new topic
  | 'topic_leveled'  // Reached new proficiency level in a topic
  | 'streak'         // Streak milestone (7 days, 30 days, etc.)
  | 'artifact'       // Saved a notable expression
  | 'vocabulary';    // Vocabulary milestone

/**
 * Tags for categorizing events
 */
export interface GrowthEventTags {
  topic?: string;           // Related topic
  emotion?: string;         // Emotional context
  proficiencyLevel?: string; // New level reached
  streakDays?: number;      // For streak events
  count?: number;           // Generic count (e.g., vocabulary count)
  [key: string]: string | number | undefined;
}

/**
 * A single growth event
 */
export interface GrowthEvent {
  id: string;
  userId: string;

  // Event info
  eventType: GrowthEventType;
  eventData: string;                  // Human-readable description
  eventTags: GrowthEventTags;

  // Relations
  sessionId?: string;
  artifactId?: string;
  materialIds?: string[];

  // Timestamps
  createdAt: number;

  // Optional embedding for semantic search
  embedding?: number[];
}

/**
 * Input for creating a growth event
 */
export interface CreateGrowthEventInput {
  eventType: GrowthEventType;
  eventData: string;
  eventTags?: GrowthEventTags;
  sessionId?: string;
  artifactId?: string;
  materialIds?: string[];
}

/**
 * Query options for fetching growth events
 */
export interface GrowthEventQuery {
  userId: string;
  eventTypes?: GrowthEventType[];
  topic?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}

/**
 * Growth summary for a time period
 */
export interface GrowthSummary {
  periodStart: number;
  periodEnd: number;

  // Counts
  totalSessions: number;
  totalArtifacts: number;
  uniqueTopics: string[];

  // Milestones reached
  milestones: Array<{
    type: GrowthEventType;
    description: string;
    achievedAt: number;
  }>;

  // Top events
  highlights: GrowthEvent[];
}

/**
 * Streak milestone thresholds
 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];

/**
 * Check if a streak count is a milestone
 */
export function isStreakMilestone(streakDays: number): boolean {
  return STREAK_MILESTONES.includes(streakDays);
}

/**
 * Get milestone description
 */
export function getMilestoneDescription(type: GrowthEventType, tags: GrowthEventTags): string {
  switch (type) {
    case 'streak':
      return `Reached a ${tags.streakDays}-day practice streak!`;
    case 'topic_started':
      return `Started practicing "${tags.topic}"`;
    case 'topic_leveled':
      return `Reached ${tags.proficiencyLevel} level in "${tags.topic}"`;
    case 'achievement':
      return tags.count ? `Completed ${tags.count} practice sessions` : 'Achievement unlocked';
    default:
      return 'Milestone reached';
  }
}
