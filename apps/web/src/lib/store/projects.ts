import { create } from 'zustand';
import {
  addProject as loroAddProject,
  updateProject as loroUpdateProject,
  deleteProject as loroDeleteProject,
  getProject as loroGetProject,
  getAllProjects as loroGetAllProjects,
  addTask as loroAddTask,
  updateTask as loroUpdateTask,
  deleteTask as loroDeleteTask,
  getTask as loroGetTask,
  getProjectTasks as loroGetProjectTasks,
  getPendingTasks as loroGetPendingTasks,
  type LoroProject,
  type LoroProjectTask,
} from '../loro';

import type {
  Project,
  ProjectType,
  ProjectStatus,
  ProjectTask,
  TaskPriority,
  TaskStatus,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from '@echo/core/models';

import { createDefaultProgress } from '@echo/core/models';

// ============ Converters ============

function toProject(loro: LoroProject): Project {
  return {
    id: loro.id,
    name: loro.name,
    description: loro.description,
    type: loro.type as ProjectType,
    status: loro.status as ProjectStatus,
    topics: JSON.parse(loro.topics),
    materialIds: JSON.parse(loro.materialIds),
    artifactIds: JSON.parse(loro.artifactIds),
    sessionIds: JSON.parse(loro.sessionIds),
    progress: JSON.parse(loro.progress),
    color: loro.color,
    icon: loro.icon,
    createdAt: loro.createdAt,
    updatedAt: loro.updatedAt,
  };
}

function toLoroProject(project: Project): LoroProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    type: project.type,
    status: project.status,
    topics: JSON.stringify(project.topics),
    materialIds: JSON.stringify(project.materialIds),
    artifactIds: JSON.stringify(project.artifactIds),
    sessionIds: JSON.stringify(project.sessionIds),
    progress: JSON.stringify(project.progress),
    color: project.color,
    icon: project.icon,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function toTask(loro: LoroProjectTask): ProjectTask {
  return {
    id: loro.id,
    projectId: loro.projectId,
    title: loro.title,
    description: loro.description,
    priority: loro.priority as TaskPriority,
    status: loro.status as TaskStatus,
    materialIds: JSON.parse(loro.materialIds),
    artifactId: loro.artifactId,
    sessionId: loro.sessionId,
    suggestions: loro.suggestions ? JSON.parse(loro.suggestions) : undefined,
    dueAt: loro.dueAt,
    completedAt: loro.completedAt,
    createdAt: loro.createdAt,
    updatedAt: loro.updatedAt,
  };
}

function toLoroTask(task: ProjectTask): LoroProjectTask {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    materialIds: JSON.stringify(task.materialIds),
    artifactId: task.artifactId,
    sessionId: task.sessionId,
    suggestions: task.suggestions ? JSON.stringify(task.suggestions) : undefined,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

// ============ Store ============

interface ProjectsStore {
  // State
  projects: Project[];
  tasks: ProjectTask[];
  initialized: boolean;

  // Initialization
  init: () => void;
  reload: () => void;

  // Project operations
  createProject: (input: CreateProjectInput) => Project;
  updateProject: (id: string, input: UpdateProjectInput) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  getActiveProjects: () => Project[];

  // Task operations
  createTask: (input: CreateTaskInput) => ProjectTask;
  updateTask: (id: string, input: UpdateTaskInput) => void;
  deleteTask: (id: string) => void;
  getProjectTasks: (projectId: string) => ProjectTask[];
  getPendingTasks: () => ProjectTask[];
  completeTask: (id: string, artifactId?: string) => void;

  // Project association
  addSessionToProject: (projectId: string, sessionId: string) => void;
  addArtifactToProject: (projectId: string, artifactId: string) => void;
  addMaterialToProject: (projectId: string, materialId: string) => void;
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: [],
  tasks: [],
  initialized: false,

  init: () => {
    if (get().initialized) return;

    const loroProjects = loroGetAllProjects();
    const projects = loroProjects.map(toProject);

    const loroTasks = loroGetPendingTasks();
    const tasks = loroTasks.map(toTask);

    set({ projects, tasks, initialized: true });
  },

  reload: () => {
    const loroProjects = loroGetAllProjects();
    const projects = loroProjects.map(toProject);

    const loroTasks = loroGetPendingTasks();
    const tasks = loroTasks.map(toTask);

    set({ projects, tasks });
  },

  createProject: (input) => {
    const now = Date.now();
    const progress = createDefaultProgress();
    if (input.targetSessions) {
      progress.targetSessions = input.targetSessions;
    }
    if (input.targetDate) {
      progress.targetDate = input.targetDate;
    }

    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'active',
      topics: input.topics || [],
      materialIds: input.materialIds || [],
      artifactIds: [],
      sessionIds: [],
      progress,
      color: input.color,
      icon: input.icon,
      createdAt: now,
      updatedAt: now,
    };

    loroAddProject(toLoroProject(project));

    set((state) => ({
      projects: [project, ...state.projects],
    }));

    return project;
  },

  updateProject: (id, input) => {
    const { projects } = get();
    const existing = projects.find((p) => p.id === id);
    if (!existing) return;

    const loroUpdates: Partial<LoroProject> = {};
    if (input.name !== undefined) loroUpdates.name = input.name;
    if (input.description !== undefined) loroUpdates.description = input.description;
    if (input.status !== undefined) loroUpdates.status = input.status;
    if (input.topics !== undefined) loroUpdates.topics = JSON.stringify(input.topics);
    if (input.materialIds !== undefined) loroUpdates.materialIds = JSON.stringify(input.materialIds);
    if (input.color !== undefined) loroUpdates.color = input.color;
    if (input.icon !== undefined) loroUpdates.icon = input.icon;

    // Handle progress updates
    if (input.targetSessions !== undefined || input.targetDate !== undefined) {
      const newProgress = { ...existing.progress };
      if (input.targetSessions !== undefined) newProgress.targetSessions = input.targetSessions;
      if (input.targetDate !== undefined) newProgress.targetDate = input.targetDate;
      loroUpdates.progress = JSON.stringify(newProgress);
    }

    loroUpdateProject(id, loroUpdates);

    // Reload to get updated data
    const updated = loroGetProject(id);
    if (updated) {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? toProject(updated) : p
        ),
      }));
    }
  },

  deleteProject: (id) => {
    loroDeleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      tasks: state.tasks.filter((t) => t.projectId !== id),
    }));
  },

  getProject: (id) => {
    return get().projects.find((p) => p.id === id);
  },

  getActiveProjects: () => {
    return get().projects.filter((p) => p.status === 'active');
  },

  createTask: (input) => {
    const now = Date.now();
    const task: ProjectTask = {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      priority: input.priority || 'medium',
      status: 'pending',
      materialIds: input.materialIds || [],
      suggestions: input.suggestions,
      dueAt: input.dueAt,
      createdAt: now,
      updatedAt: now,
    };

    loroAddTask(toLoroTask(task));

    // Update project progress
    const project = get().projects.find((p) => p.id === input.projectId);
    if (project) {
      const newProgress = {
        ...project.progress,
        totalTasks: project.progress.totalTasks + 1,
        lastActivityAt: now,
      };
      loroUpdateProject(input.projectId, {
        progress: JSON.stringify(newProgress),
      });
    }

    set((state) => ({
      tasks: [task, ...state.tasks],
    }));

    // Reload projects to get updated progress
    get().reload();

    return task;
  },

  updateTask: (id, input) => {
    const loroUpdates: Partial<LoroProjectTask> = {};
    if (input.title !== undefined) loroUpdates.title = input.title;
    if (input.description !== undefined) loroUpdates.description = input.description;
    if (input.priority !== undefined) loroUpdates.priority = input.priority;
    if (input.status !== undefined) loroUpdates.status = input.status;
    if (input.materialIds !== undefined) loroUpdates.materialIds = JSON.stringify(input.materialIds);
    if (input.artifactId !== undefined) loroUpdates.artifactId = input.artifactId;
    if (input.sessionId !== undefined) loroUpdates.sessionId = input.sessionId;
    if (input.suggestions !== undefined) loroUpdates.suggestions = JSON.stringify(input.suggestions);
    if (input.dueAt !== undefined) loroUpdates.dueAt = input.dueAt;

    loroUpdateTask(id, loroUpdates);

    const updated = loroGetTask(id);
    if (updated) {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? toTask(updated) : t
        ),
      }));
    }
  },

  deleteTask: (id) => {
    const task = get().tasks.find((t) => t.id === id);
    loroDeleteTask(id);

    // Update project progress if task existed
    if (task) {
      const project = get().projects.find((p) => p.id === task.projectId);
      if (project) {
        const wasCompleted = task.status === 'completed';
        const newProgress = {
          ...project.progress,
          totalTasks: Math.max(0, project.progress.totalTasks - 1),
          completedTasks: wasCompleted
            ? Math.max(0, project.progress.completedTasks - 1)
            : project.progress.completedTasks,
          lastActivityAt: Date.now(),
        };
        loroUpdateProject(task.projectId, {
          progress: JSON.stringify(newProgress),
        });
      }
    }

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));

    get().reload();
  },

  getProjectTasks: (projectId) => {
    const loroTasks = loroGetProjectTasks(projectId);
    return loroTasks.map(toTask);
  },

  getPendingTasks: () => {
    return get().tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  },

  completeTask: (id, artifactId) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const now = Date.now();
    loroUpdateTask(id, {
      status: 'completed',
      artifactId,
      completedAt: now,
    });

    // Update project progress
    const project = get().projects.find((p) => p.id === task.projectId);
    if (project) {
      const newProgress = {
        ...project.progress,
        completedTasks: project.progress.completedTasks + 1,
        lastActivityAt: now,
      };
      if (artifactId) {
        newProgress.totalArtifacts = project.progress.totalArtifacts + 1;
      }
      loroUpdateProject(task.projectId, {
        progress: JSON.stringify(newProgress),
      });
    }

    get().reload();
  },

  addSessionToProject: (projectId, sessionId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project || project.sessionIds.includes(sessionId)) return;

    const newSessionIds = [...project.sessionIds, sessionId];
    const newProgress = {
      ...project.progress,
      totalSessions: project.progress.totalSessions + 1,
      lastActivityAt: Date.now(),
    };

    loroUpdateProject(projectId, {
      sessionIds: JSON.stringify(newSessionIds),
      progress: JSON.stringify(newProgress),
    });

    get().reload();
  },

  addArtifactToProject: (projectId, artifactId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project || project.artifactIds.includes(artifactId)) return;

    const newArtifactIds = [...project.artifactIds, artifactId];
    const newProgress = {
      ...project.progress,
      totalArtifacts: project.progress.totalArtifacts + 1,
      lastActivityAt: Date.now(),
    };

    loroUpdateProject(projectId, {
      artifactIds: JSON.stringify(newArtifactIds),
      progress: JSON.stringify(newProgress),
    });

    get().reload();
  },

  addMaterialToProject: (projectId, materialId) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project || project.materialIds.includes(materialId)) return;

    const newMaterialIds = [...project.materialIds, materialId];

    loroUpdateProject(projectId, {
      materialIds: JSON.stringify(newMaterialIds),
    });

    get().reload();
  },
}));
