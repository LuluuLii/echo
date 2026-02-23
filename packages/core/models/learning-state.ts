/**
 * Learning State - Tracks user's learning progress, plans, and rhythm
 *
 * This is automatically updated as the user practices, providing
 * data for learning analytics and recommendations.
 */

/**
 * Current learning focus
 */
export interface LearningFocus {
  topic: string;                  // Current topic being practiced
  targetExpressions?: string[];   // Specific expressions to master
  startedAt: number;              // When this focus began
}

/**
 * A learning goal
 */
export interface LearningGoal {
  id: string;
  description: string;            // e.g., "Master travel-related expressions"
  targetDate?: number;            // Optional deadline
  progress: number;               // 0-100 percentage
  relatedTopics: string[];        // Topics that contribute to this goal
  createdAt: number;
  updatedAt: number;
}

/**
 * Weekly learning target
 */
export interface WeeklyTarget {
  sessionsPerWeek: number;        // Target number of sessions
  minutesPerSession: number;      // Target duration per session
}

/**
 * Learning plan
 */
export interface LearningPlan {
  goals: LearningGoal[];
  weeklyTarget?: WeeklyTarget;
}

/**
 * Learning rhythm statistics (auto-calculated)
 */
export interface LearningRhythm {
  lastPracticeAt: number;         // Last practice timestamp
  streakDays: number;             // Consecutive days practiced
  totalSessions: number;          // Total practice sessions
  totalMinutes: number;           // Total practice time
  averageSessionLength: number;   // Average session duration in minutes
  practicesByWeekday: number[];   // Sessions per weekday [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
}

/**
 * Complete learning state
 */
export interface LearningState {
  userId: string;

  // Current focus (optional)
  currentFocus?: LearningFocus;

  // Learning plan (optional, user-configured)
  learningPlan?: LearningPlan;

  // Rhythm statistics (auto-updated)
  rhythm: LearningRhythm;

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating learning state
 */
export interface CreateLearningStateInput {
  userId: string;
  currentFocus?: LearningFocus;
  learningPlan?: LearningPlan;
}

/**
 * Input for recording a completed session
 */
export interface RecordSessionInput {
  sessionId: string;
  topic?: string;
  durationMinutes: number;
  completedAt: number;
}

/**
 * Default rhythm values for new users
 */
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

/**
 * Calculate streak days based on practice history
 */
export function calculateStreakDays(
  lastPracticeAt: number,
  currentStreakDays: number,
  now: number = Date.now()
): number {
  if (lastPracticeAt === 0) return 1; // First session

  const lastDate = new Date(lastPracticeAt);
  const today = new Date(now);

  // Reset time to midnight for comparison
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    // Same day, keep streak
    return currentStreakDays;
  } else if (diffDays === 1) {
    // Consecutive day, increment streak
    return currentStreakDays + 1;
  } else {
    // Gap in practice, reset streak
    return 1;
  }
}
