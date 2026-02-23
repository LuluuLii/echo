/**
 * Echo User Profile - User's learning profile and preferences
 *
 * Uses a hybrid schema approach:
 * - Core fields: predefined, required/manual setup
 * - Preferences: predefined slots, optional, can be extracted from conversations
 * - Insights: open-ended, LLM-extracted observations
 */

/**
 * Proficiency level using CEFR scale
 */
export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Expression style preference
 */
export type ExpressionStyle = 'casual' | 'formal' | 'humorous';

/**
 * Insight categories (predefined + catch-all)
 */
export type InsightCategory =
  | 'strength'    // User's language strengths
  | 'weakness'    // Areas needing improvement
  | 'interest'    // Topics of interest
  | 'goal'        // Learning goals
  | 'habit'       // Expression habits
  | 'other';      // Catch-all for unexpected discoveries

/**
 * A single insight about the user
 */
export interface UserInsight {
  id: string;
  category: InsightCategory;
  content: string;              // The insight text, e.g., "Uses simple sentence structures"
  confidence: number;           // 0.0 - 1.0
  source: string;               // Source session ID
  firstMentioned: number;       // First discovery timestamp
  lastMentioned: number;        // Most recent mention
  mentionCount: number;         // How many times observed
}

/**
 * Core learning settings (required, user-configured)
 */
export interface LearningSettings {
  targetLanguage: string;       // e.g., "en", "zh"
  nativeLanguage: string;       // e.g., "zh", "en"
  proficiencyLevel: ProficiencyLevel;
}

/**
 * User preferences (optional, can be manually set or extracted)
 */
export interface UserPreferences {
  topics?: string[];            // Preferred topics, e.g., ["travel", "technology"]
  expressionStyle?: ExpressionStyle;
  learningGoals?: string[];     // e.g., ["IELTS preparation", "daily conversation"]
  sessionLength?: number;       // Preferred session length in minutes
}

/**
 * Complete user profile
 */
export interface EchoUserProfile {
  id: string;
  userId: string;

  // Core settings (required)
  learning: LearningSettings;

  // Preferences (optional)
  preferences: UserPreferences;

  // Dynamic insights (LLM-extracted)
  insights: UserInsight[];

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating a new profile
 */
export interface CreateUserProfileInput {
  userId: string;
  learning: LearningSettings;
  preferences?: UserPreferences;
}

/**
 * Input for updating profile settings
 */
export interface UpdateUserProfileInput {
  learning?: Partial<LearningSettings>;
  preferences?: Partial<UserPreferences>;
}

/**
 * Input for adding a new insight
 */
export interface AddInsightInput {
  category: InsightCategory;
  content: string;
  confidence: number;
  source: string;
}
