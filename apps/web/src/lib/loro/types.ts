/**
 * Loro Type Definitions
 * All interfaces for data stored in Loro CRDT
 */

// ============ Materials ============

/**
 * Material data stored in Loro (synced)
 * Note: embedding is NOT stored here, it's local-only
 */
export interface LoroMaterial {
  id: string;
  type: 'text' | 'file';
  content: string;
  contentEn?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  fileName?: string;
  fileType?: 'image' | 'pdf' | 'document';
  mimeType?: string;
  fileData?: string;
  fileThumbnail?: string;
}

// ============ Artifacts ============

/**
 * Echo Artifact - user's finalized expression (synced)
 */
export interface LoroArtifact {
  id: string;
  content: string;
  contentEn?: string;
  materialIds: string[];
  anchor?: string;
  sessionId?: string;
  topic?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

// ============ Sessions ============

/**
 * Session Memory - L2 memory, saved on session exit (synced)
 */
export interface LoroSessionMemory {
  id: string;
  sessionId: string;
  topic?: string;
  turnCount: number;
  summary: string;
  status: 'completed' | 'abandoned';
  artifactId?: string;
  materialIds: string[];
  createdAt: number;
  exitedAt: number;
}

/**
 * Session data stored in Loro (synced)
 */
export interface LoroSession {
  id: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: number;
  completedAt?: number;
}

// ============ User Profile ============

/**
 * User Profile stored in Loro (synced)
 */
export interface LoroUserProfile {
  id: string;
  userId: string;
  targetLanguage: string;
  nativeLanguage: string;
  proficiencyLevel: string;
  preferences: string;  // JSON
  insights: string;     // JSON
  createdAt: number;
  updatedAt: number;
}

/**
 * Learning State stored in Loro (synced)
 */
export interface LoroLearningState {
  userId: string;
  currentFocus?: string;  // JSON
  learningPlan?: string;  // JSON
  lastPracticeAt: number;
  streakDays: number;
  totalSessions: number;
  totalMinutes: number;
  averageSessionLength: number;
  practicesByWeekday: string;  // JSON
  createdAt: number;
  updatedAt: number;
}

// ============ Topic Proficiency ============

/**
 * Topic Proficiency stored in Loro (synced)
 */
export interface LoroTopicProficiency {
  userId: string;
  topics: string;              // JSON: TopicProficiencyEntry[]
  overallAssessment?: string;  // JSON: OverallAssessment
  createdAt: number;
  updatedAt: number;
}

// ============ Growth Events ============

/**
 * Growth Event stored in Loro (synced)
 */
export interface LoroGrowthEvent {
  id: string;
  userId: string;
  eventType: string;
  eventData: string;
  eventTags: string;       // JSON: GrowthEventTags
  sessionId?: string;
  artifactId?: string;
  materialIds?: string;    // JSON: string[]
  createdAt: number;
}

// ============ Vocabulary ============

/**
 * User Utterance stored in Loro (synced)
 */
export interface LoroUserUtterance {
  id: string;
  sessionId: string;
  content: string;
  contentEn?: string;
  turnIndex: number;
  replyTo?: string;
  topic?: string;
  materialIds?: string;    // JSON: string[]
  vocabularyExtracted: boolean;
  createdAt: number;
}

/**
 * Vocabulary Record stored in Loro (synced)
 */
export interface LoroVocabularyRecord {
  id: string;
  term: string;
  termType: string;
  normalized: string;
  passiveCount: number;
  activeCount: number;
  passiveSources: string;  // JSON: PassiveSource[]
  activeUsages: string;    // JSON: ActiveUsage[]
  status: string;
  firstSeen: number;
  firstUsed?: number;
  lastUsed?: number;
  userMarked?: string;
}
