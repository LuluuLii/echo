/**
 * Topic Proficiency - Tracks user's expression ability per topic
 *
 * Used for:
 * - Identifying strengths and weaknesses
 * - Recommending practice content
 * - Adjusting difficulty in conversations
 */

/**
 * Proficiency level for a topic
 */
export type TopicProficiencyLevel = 'beginner' | 'intermediate' | 'fluent';

/**
 * Statistics for a single topic
 */
export interface TopicStats {
  sessionsCount: number;          // Practice sessions on this topic
  artifactsCount: number;         // Expressions saved for this topic
  vocabularyActive: number;       // Words actively used in this topic
  vocabularyMastered: number;     // Words mastered in this topic
  lastPracticeAt: number;         // Last practice timestamp
}

/**
 * Proficiency data for a single topic
 */
export interface TopicProficiencyEntry {
  topic: string;                  // Topic name, e.g., "travel", "work"
  proficiencyLevel: TopicProficiencyLevel;
  stats: TopicStats;
  fluentExpressions: string[];    // Expressions user can use fluently
  weakPoints: string[];           // Areas needing improvement
  createdAt: number;
  updatedAt: number;
}

/**
 * Overall assessment across all topics
 */
export interface OverallAssessment {
  strongTopics: string[];         // Topics marked as fluent
  growingTopics: string[];        // Topics marked as intermediate
  weakTopics: string[];           // Topics marked as beginner or not practiced recently
  recommendedFocus: string;       // Suggested next focus topic
  assessmentReason: string;       // AI-generated explanation
  assessedAt: number;
}

/**
 * Complete topic proficiency record for a user
 */
export interface TopicProficiency {
  userId: string;
  topics: TopicProficiencyEntry[];
  overallAssessment?: OverallAssessment;
  createdAt: number;
  updatedAt: number;
}

/**
 * Default stats for a new topic
 */
export function createDefaultTopicStats(): TopicStats {
  return {
    sessionsCount: 0,
    artifactsCount: 0,
    vocabularyActive: 0,
    vocabularyMastered: 0,
    lastPracticeAt: 0,
  };
}

/**
 * Determine proficiency level based on stats
 *
 * Rules:
 * - beginner: sessionsCount < 3 OR vocabularyActive < 10
 * - intermediate: sessionsCount >= 3 AND vocabularyActive >= 10
 * - fluent: sessionsCount >= 10 AND vocabularyMastered >= 20 AND artifactsCount >= 5
 */
export function determineProficiencyLevel(stats: TopicStats): TopicProficiencyLevel {
  if (stats.sessionsCount >= 10 && stats.vocabularyMastered >= 20 && stats.artifactsCount >= 5) {
    return 'fluent';
  }
  if (stats.sessionsCount >= 3 && stats.vocabularyActive >= 10) {
    return 'intermediate';
  }
  return 'beginner';
}

/**
 * Check if a topic is considered "stale" (not practiced recently)
 * @param lastPracticeAt - Last practice timestamp
 * @param staleDays - Number of days to consider stale (default: 30)
 */
export function isTopicStale(lastPracticeAt: number, staleDays: number = 30): boolean {
  if (lastPracticeAt === 0) return false; // Never practiced, not stale
  const daysSinceLastPractice = (Date.now() - lastPracticeAt) / (24 * 60 * 60 * 1000);
  return daysSinceLastPractice > staleDays;
}

/**
 * Generate overall assessment from topic entries
 */
export function generateOverallAssessment(topics: TopicProficiencyEntry[]): OverallAssessment {
  const strongTopics: string[] = [];
  const growingTopics: string[] = [];
  const weakTopics: string[] = [];

  for (const entry of topics) {
    if (entry.proficiencyLevel === 'fluent') {
      strongTopics.push(entry.topic);
    } else if (entry.proficiencyLevel === 'intermediate') {
      growingTopics.push(entry.topic);
    } else {
      weakTopics.push(entry.topic);
    }

    // Also mark stale topics as weak
    if (isTopicStale(entry.stats.lastPracticeAt) && entry.proficiencyLevel !== 'beginner') {
      if (!weakTopics.includes(entry.topic)) {
        weakTopics.push(entry.topic);
      }
    }
  }

  // Determine recommended focus
  let recommendedFocus = '';
  let assessmentReason = '';

  if (weakTopics.length > 0) {
    // Prioritize weak topics that have been started but not completed
    const startedWeakTopics = topics.filter(
      t => weakTopics.includes(t.topic) && t.stats.sessionsCount > 0
    );
    if (startedWeakTopics.length > 0) {
      // Pick the one with most sessions (closest to breakthrough)
      startedWeakTopics.sort((a, b) => b.stats.sessionsCount - a.stats.sessionsCount);
      recommendedFocus = startedWeakTopics[0].topic;
      assessmentReason = `You've started practicing "${recommendedFocus}" - a few more sessions could help you reach intermediate level.`;
    } else {
      recommendedFocus = weakTopics[0];
      assessmentReason = `"${recommendedFocus}" is a topic you haven't explored much yet.`;
    }
  } else if (growingTopics.length > 0) {
    // Pick growing topic closest to fluent
    const sortedGrowing = topics
      .filter(t => growingTopics.includes(t.topic))
      .sort((a, b) => b.stats.sessionsCount - a.stats.sessionsCount);
    recommendedFocus = sortedGrowing[0].topic;
    assessmentReason = `You're making good progress on "${recommendedFocus}" - keep practicing to achieve fluency.`;
  } else if (strongTopics.length > 0) {
    assessmentReason = `Great job! You're fluent in all your practiced topics. Consider exploring new topics.`;
  } else {
    assessmentReason = `Start practicing any topic to build your proficiency.`;
  }

  return {
    strongTopics,
    growingTopics,
    weakTopics,
    recommendedFocus,
    assessmentReason,
    assessedAt: Date.now(),
  };
}
