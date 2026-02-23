// Raw Material
export type {
  RawMaterial,
  CreateRawMaterialInput,
} from './raw-material';

// Activation Card
export type {
  ActivationCard,
  ActivationCardBack,
  GenerateActivationCardInput,
} from './activation-card';

// Echo Session
export type {
  EchoSession,
  SessionMessage,
  CreateSessionInput,
  SendMessageInput,
  CompleteSessionInput,
} from './echo-session';

// Artifact
export type {
  EchoArtifact,
  CreateArtifactInput,
  UpdateArtifactInput,
} from './artifact';

// User Profile
export type {
  ProficiencyLevel,
  ExpressionStyle,
  InsightCategory,
  UserInsight,
  LearningSettings,
  UserPreferences,
  EchoUserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  AddInsightInput,
} from './user-profile';

// Learning State
export type {
  LearningFocus,
  LearningGoal,
  WeeklyTarget,
  LearningPlan,
  LearningRhythm,
  LearningState,
  CreateLearningStateInput,
  RecordSessionInput,
} from './learning-state';

export {
  createDefaultRhythm,
  calculateStreakDays,
} from './learning-state';

// Topic Proficiency
export type {
  TopicProficiencyLevel,
  TopicStats,
  TopicProficiencyEntry,
  OverallAssessment,
  TopicProficiency,
} from './topic-proficiency';

export {
  createDefaultTopicStats,
  determineProficiencyLevel,
  isTopicStale,
  generateOverallAssessment,
} from './topic-proficiency';

// Growth Event
export type {
  GrowthEventType,
  GrowthEventTags,
  GrowthEvent,
  CreateGrowthEventInput,
  GrowthEventQuery,
  GrowthSummary,
} from './growth-event';

export {
  STREAK_MILESTONES,
  isStreakMilestone,
  getMilestoneDescription,
} from './growth-event';

// Vocabulary
export type {
  VocabularyTermType,
  VocabularyStatus,
  VocabularyUserMark,
  PassiveSource,
  ActiveUsage,
  VocabularyRecord,
  UserUtterance,
  VocabularyStats,
  VocabularyStatsByType,
  VocabularyInsight,
  CreateVocabularyRecordInput,
  RecordActiveUsageInput,
  VocabularyExport,
} from './vocabulary';

export {
  calculateVocabularyStatus,
} from './vocabulary';
