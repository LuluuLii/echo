/**
 * User Store Helper Functions
 */

import type {
  TopicStats,
  TopicProficiencyLevel,
  TopicProficiencyEntry,
  OverallAssessment,
  LearningRhythm,
} from './types';

// Default user ID (single-user app for now)
export const DEFAULT_USER_ID = 'default';

// Streak milestone thresholds
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90, 180, 365];

// ============ Topic Stats ============

export function createDefaultTopicStats(): TopicStats {
  return {
    sessionsCount: 0,
    artifactsCount: 0,
    vocabularyActive: 0,
    vocabularyMastered: 0,
    lastPracticeAt: 0,
  };
}

export function determineProficiencyLevel(stats: TopicStats): TopicProficiencyLevel {
  if (stats.sessionsCount >= 10 && stats.vocabularyMastered >= 20 && stats.artifactsCount >= 5) {
    return 'fluent';
  }
  if (stats.sessionsCount >= 3 && stats.vocabularyActive >= 10) {
    return 'intermediate';
  }
  return 'beginner';
}

// ============ Overall Assessment ============

const STALE_DAYS = 30;

export function generateOverallAssessment(topics: TopicProficiencyEntry[]): OverallAssessment {
  const strongTopics: string[] = [];
  const growingTopics: string[] = [];
  const weakTopics: string[] = [];

  for (const entry of topics) {
    const daysSinceLastPractice = entry.stats.lastPracticeAt > 0
      ? (Date.now() - entry.stats.lastPracticeAt) / (24 * 60 * 60 * 1000)
      : 0;
    const isStale = daysSinceLastPractice > STALE_DAYS;

    if (entry.proficiencyLevel === 'fluent' && !isStale) {
      strongTopics.push(entry.topic);
    } else if (entry.proficiencyLevel === 'intermediate' && !isStale) {
      growingTopics.push(entry.topic);
    } else {
      weakTopics.push(entry.topic);
    }
  }

  let recommendedFocus = '';
  let assessmentReason = '';

  if (weakTopics.length > 0) {
    const startedWeakTopics = topics.filter(
      t => weakTopics.includes(t.topic) && t.stats.sessionsCount > 0
    );
    if (startedWeakTopics.length > 0) {
      startedWeakTopics.sort((a, b) => b.stats.sessionsCount - a.stats.sessionsCount);
      recommendedFocus = startedWeakTopics[0].topic;
      assessmentReason = `You've started practicing "${recommendedFocus}" - a few more sessions could help you reach intermediate level.`;
    } else {
      recommendedFocus = weakTopics[0];
      assessmentReason = `"${recommendedFocus}" is a topic you haven't explored much yet.`;
    }
  } else if (growingTopics.length > 0) {
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

// ============ Learning Rhythm ============

export function createDefaultRhythm(): LearningRhythm {
  return {
    lastPracticeAt: 0,
    streakDays: 0,
    totalSessions: 0,
    totalMinutes: 0,
    averageSessionLength: 0,
    practicesByWeekday: [0, 0, 0, 0, 0, 0, 0],
  };
}

export function calculateStreakDays(
  lastPracticeAt: number,
  currentStreakDays: number,
  now: number = Date.now()
): number {
  if (lastPracticeAt === 0) return 1;

  const lastDate = new Date(lastPracticeAt);
  const today = new Date(now);

  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return currentStreakDays;
  } else if (diffDays === 1) {
    return currentStreakDays + 1;
  } else {
    return 1;
  }
}

export function isStreakMilestone(streakDays: number): boolean {
  return STREAK_MILESTONES.includes(streakDays);
}
