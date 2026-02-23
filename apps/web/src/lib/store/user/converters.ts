/**
 * Loro <-> Domain Type Converters
 */

import type {
  LoroUserProfile,
  LoroLearningState,
  LoroTopicProficiency,
  LoroGrowthEvent,
} from '../../loro';

import type {
  EchoUserProfile,
  ProficiencyLevel,
  LearningState,
  TopicProficiency,
  GrowthEvent,
  GrowthEventType,
} from './types';

// ============ User Profile ============

export function toEchoUserProfile(loro: LoroUserProfile): EchoUserProfile {
  return {
    id: loro.id,
    userId: loro.userId,
    learning: {
      targetLanguage: loro.targetLanguage,
      nativeLanguage: loro.nativeLanguage,
      proficiencyLevel: loro.proficiencyLevel as ProficiencyLevel,
    },
    preferences: JSON.parse(loro.preferences || '{}'),
    insights: JSON.parse(loro.insights || '[]'),
    createdAt: loro.createdAt,
    updatedAt: loro.updatedAt,
  };
}

export function toLoroUserProfile(profile: EchoUserProfile): LoroUserProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    targetLanguage: profile.learning.targetLanguage,
    nativeLanguage: profile.learning.nativeLanguage,
    proficiencyLevel: profile.learning.proficiencyLevel,
    preferences: JSON.stringify(profile.preferences),
    insights: JSON.stringify(profile.insights),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// ============ Learning State ============

export function toLearningState(loro: LoroLearningState): LearningState {
  return {
    userId: loro.userId,
    currentFocus: loro.currentFocus ? JSON.parse(loro.currentFocus) : undefined,
    learningPlan: loro.learningPlan ? JSON.parse(loro.learningPlan) : undefined,
    rhythm: {
      lastPracticeAt: loro.lastPracticeAt,
      streakDays: loro.streakDays,
      totalSessions: loro.totalSessions,
      totalMinutes: loro.totalMinutes,
      averageSessionLength: loro.averageSessionLength,
      practicesByWeekday: JSON.parse(loro.practicesByWeekday || '[0,0,0,0,0,0,0]'),
    },
    createdAt: loro.createdAt,
    updatedAt: loro.updatedAt,
  };
}

export function toLoroLearningState(state: LearningState): LoroLearningState {
  return {
    userId: state.userId,
    currentFocus: state.currentFocus ? JSON.stringify(state.currentFocus) : undefined,
    learningPlan: state.learningPlan ? JSON.stringify(state.learningPlan) : undefined,
    lastPracticeAt: state.rhythm.lastPracticeAt,
    streakDays: state.rhythm.streakDays,
    totalSessions: state.rhythm.totalSessions,
    totalMinutes: state.rhythm.totalMinutes,
    averageSessionLength: state.rhythm.averageSessionLength,
    practicesByWeekday: JSON.stringify(state.rhythm.practicesByWeekday),
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

// ============ Topic Proficiency ============

export function toTopicProficiency(loro: LoroTopicProficiency): TopicProficiency {
  return {
    userId: loro.userId,
    topics: JSON.parse(loro.topics || '[]'),
    overallAssessment: loro.overallAssessment ? JSON.parse(loro.overallAssessment) : undefined,
    createdAt: loro.createdAt,
    updatedAt: loro.updatedAt,
  };
}

export function toLoroTopicProficiency(prof: TopicProficiency): LoroTopicProficiency {
  return {
    userId: prof.userId,
    topics: JSON.stringify(prof.topics),
    overallAssessment: prof.overallAssessment ? JSON.stringify(prof.overallAssessment) : undefined,
    createdAt: prof.createdAt,
    updatedAt: prof.updatedAt,
  };
}

// ============ Growth Events ============

export function toGrowthEvent(loro: LoroGrowthEvent): GrowthEvent {
  return {
    id: loro.id,
    userId: loro.userId,
    eventType: loro.eventType as GrowthEventType,
    eventData: loro.eventData,
    eventTags: JSON.parse(loro.eventTags || '{}'),
    sessionId: loro.sessionId,
    artifactId: loro.artifactId,
    materialIds: loro.materialIds ? JSON.parse(loro.materialIds) : undefined,
    createdAt: loro.createdAt,
  };
}

export function toLoroGrowthEvent(event: GrowthEvent): LoroGrowthEvent {
  return {
    id: event.id,
    userId: event.userId,
    eventType: event.eventType,
    eventData: event.eventData,
    eventTags: JSON.stringify(event.eventTags),
    sessionId: event.sessionId,
    artifactId: event.artifactId,
    materialIds: event.materialIds ? JSON.stringify(event.materialIds) : undefined,
    createdAt: event.createdAt,
  };
}
