/**
 * Project Model
 *
 * A Project represents a focused learning or creation goal that spans multiple sessions.
 * Examples: exam preparation, essay writing, topic mastery.
 */

/**
 * Project type determines the primary mode and UI experience
 */
export type ProjectType = 'practice' | 'creation' | 'exam-prep';

/**
 * Project status
 */
export type ProjectStatus = 'active' | 'completed' | 'archived';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * A task within a project - represents a specific practice or creation goal
 */
export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** Material IDs to use for this task */
  materialIds: string[];
  /** Artifact ID if task resulted in saved expression */
  artifactId?: string;
  /** Session ID if task was practiced in a session */
  sessionId?: string;
  /** Suggested expressions or prompts */
  suggestions?: string[];
  /** Due date (optional) */
  dueAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Project progress tracking
 */
export interface ProjectProgress {
  /** Total tasks in project */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Total sessions associated with project */
  totalSessions: number;
  /** Total artifacts created */
  totalArtifacts: number;
  /** Target sessions (for exam-prep) */
  targetSessions?: number;
  /** Target completion date */
  targetDate?: number;
  /** Last activity timestamp */
  lastActivityAt: number;
}

/**
 * Project model
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  /** Topics/themes for this project */
  topics: string[];
  /** Material IDs associated with this project */
  materialIds: string[];
  /** Artifact IDs created in this project */
  artifactIds: string[];
  /** Session IDs associated with this project */
  sessionIds: string[];
  /** Progress tracking */
  progress: ProjectProgress;
  /** Color for UI display */
  color?: string;
  /** Icon identifier */
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  type: ProjectType;
  topics?: string[];
  materialIds?: string[];
  targetSessions?: number;
  targetDate?: number;
  color?: string;
  icon?: string;
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  topics?: string[];
  materialIds?: string[];
  targetSessions?: number;
  targetDate?: number;
  color?: string;
  icon?: string;
}

/**
 * Input for creating a task
 */
export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  materialIds?: string[];
  suggestions?: string[];
  dueAt?: number;
}

/**
 * Input for updating a task
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  materialIds?: string[];
  artifactId?: string;
  sessionId?: string;
  suggestions?: string[];
  dueAt?: number;
}

/**
 * Create default progress object
 */
export function createDefaultProgress(): ProjectProgress {
  return {
    totalTasks: 0,
    completedTasks: 0,
    totalSessions: 0,
    totalArtifacts: 0,
    lastActivityAt: Date.now(),
  };
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercent(progress: ProjectProgress): number {
  if (progress.totalTasks === 0) return 0;
  return Math.round((progress.completedTasks / progress.totalTasks) * 100);
}

/**
 * Check if project is on track (for exam-prep with target date)
 */
export function isProjectOnTrack(project: Project): boolean | null {
  if (!project.progress.targetDate || !project.progress.targetSessions) {
    return null; // No target set
  }

  const now = Date.now();
  const totalDuration = project.progress.targetDate - project.createdAt;
  const elapsed = now - project.createdAt;
  const expectedProgress = elapsed / totalDuration;
  const actualProgress = project.progress.totalSessions / project.progress.targetSessions;

  return actualProgress >= expectedProgress * 0.8; // 80% of expected is "on track"
}
