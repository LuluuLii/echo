/**
 * User Store Type Definitions
 */

// ============ Profile Types ============

export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ExpressionStyle = 'casual' | 'formal' | 'humorous';
export type InsightCategory = 'strength' | 'weakness' | 'interest' | 'goal' | 'habit' | 'other';

export interface UserInsight {
  id: string;
  category: InsightCategory;
  content: string;
  confidence: number;
  source: string;
  firstMentioned: number;
  lastMentioned: number;
  mentionCount: number;
}

export interface LearningSettings {
  targetLanguage: string;
  nativeLanguage: string;
  proficiencyLevel: ProficiencyLevel;
}

export interface UserPreferences {
  topics?: string[];
  expressionStyle?: ExpressionStyle;
  learningGoals?: string[];
  sessionLength?: number;
}

export interface EchoUserProfile {
  id: string;
  userId: string;
  learning: LearningSettings;
  preferences: UserPreferences;
  insights: UserInsight[];
  createdAt: number;
  updatedAt: number;
}

// ============ Learning State Types ============

export interface LearningFocus {
  topic: string;
  targetExpressions?: string[];
  startedAt: number;
}

export interface LearningGoal {
  id: string;
  description: string;
  targetDate?: number;
  progress: number;
  relatedTopics: string[];
  createdAt: number;
  updatedAt: number;
}

export interface LearningPlan {
  goals: LearningGoal[];
  weeklyTarget?: {
    sessionsPerWeek: number;
    minutesPerSession: number;
  };
}

export interface LearningRhythm {
  lastPracticeAt: number;
  streakDays: number;
  totalSessions: number;
  totalMinutes: number;
  averageSessionLength: number;
  practicesByWeekday: number[];
}

export interface LearningState {
  userId: string;
  currentFocus?: LearningFocus;
  learningPlan?: LearningPlan;
  rhythm: LearningRhythm;
  createdAt: number;
  updatedAt: number;
}

// ============ Topic Proficiency Types ============

export type TopicProficiencyLevel = 'beginner' | 'intermediate' | 'fluent';

export interface TopicStats {
  sessionsCount: number;
  artifactsCount: number;
  vocabularyActive: number;
  vocabularyMastered: number;
  lastPracticeAt: number;
}

export interface TopicProficiencyEntry {
  topic: string;
  proficiencyLevel: TopicProficiencyLevel;
  stats: TopicStats;
  fluentExpressions: string[];
  weakPoints: string[];
  createdAt: number;
  updatedAt: number;
}

export interface OverallAssessment {
  strongTopics: string[];
  growingTopics: string[];
  weakTopics: string[];
  recommendedFocus: string;
  assessmentReason: string;
  assessedAt: number;
}

export interface TopicProficiency {
  userId: string;
  topics: TopicProficiencyEntry[];
  overallAssessment?: OverallAssessment;
  createdAt: number;
  updatedAt: number;
}

// ============ Growth Event Types ============

export type GrowthEventType =
  | 'practice'
  | 'milestone'
  | 'achievement'
  | 'topic_started'
  | 'topic_leveled'
  | 'streak'
  | 'artifact'
  | 'vocabulary';

export interface GrowthEventTags {
  topic?: string;
  emotion?: string;
  proficiencyLevel?: string;
  streakDays?: number;
  count?: number;
  [key: string]: string | number | undefined;
}

export interface GrowthEvent {
  id: string;
  userId: string;
  eventType: GrowthEventType;
  eventData: string;
  eventTags: GrowthEventTags;
  sessionId?: string;
  artifactId?: string;
  materialIds?: string[];
  createdAt: number;
}
