/**
 * Loro Projects Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroProject, LoroProjectTask } from './types';

function getProjectsMap(): LoroMap {
  return getMap('projects');
}

function getTasksMap(): LoroMap {
  return getMap('projectTasks');
}

// ============ Project Operations ============

/**
 * Add a new project
 */
export function addProject(project: LoroProject): void {
  const projects = getProjectsMap();
  const p = projects.setContainer(project.id, new LoroMap());
  p.set('id', project.id);
  p.set('name', project.name);
  if (project.description !== undefined) {
    p.set('description', project.description);
  }
  p.set('type', project.type);
  p.set('status', project.status);
  p.set('topics', project.topics);
  p.set('materialIds', project.materialIds);
  p.set('artifactIds', project.artifactIds);
  p.set('sessionIds', project.sessionIds);
  p.set('progress', project.progress);
  if (project.color !== undefined) {
    p.set('color', project.color);
  }
  if (project.icon !== undefined) {
    p.set('icon', project.icon);
  }
  p.set('createdAt', project.createdAt);
  p.set('updatedAt', project.updatedAt);
  commitAndSave();
}

/**
 * Update an existing project
 */
export function updateProject(
  id: string,
  updates: Partial<Omit<LoroProject, 'id' | 'createdAt'>>
): void {
  const projects = getProjectsMap();
  const p = projects.get(id);
  if (!p || !(p instanceof LoroMap)) return;

  if (updates.name !== undefined) p.set('name', updates.name);
  if (updates.description !== undefined) p.set('description', updates.description);
  if (updates.type !== undefined) p.set('type', updates.type);
  if (updates.status !== undefined) p.set('status', updates.status);
  if (updates.topics !== undefined) p.set('topics', updates.topics);
  if (updates.materialIds !== undefined) p.set('materialIds', updates.materialIds);
  if (updates.artifactIds !== undefined) p.set('artifactIds', updates.artifactIds);
  if (updates.sessionIds !== undefined) p.set('sessionIds', updates.sessionIds);
  if (updates.progress !== undefined) p.set('progress', updates.progress);
  if (updates.color !== undefined) p.set('color', updates.color);
  if (updates.icon !== undefined) p.set('icon', updates.icon);
  p.set('updatedAt', Date.now());
  commitAndSave();
}

/**
 * Get a single project by ID
 */
export function getProject(id: string): LoroProject | undefined {
  const projects = getProjectsMap();
  const p = projects.get(id);
  if (!p || !(p instanceof LoroMap)) return undefined;

  return {
    id: p.get('id') as string,
    name: p.get('name') as string,
    description: p.get('description') as string | undefined,
    type: p.get('type') as string,
    status: p.get('status') as string,
    topics: p.get('topics') as string,
    materialIds: p.get('materialIds') as string,
    artifactIds: p.get('artifactIds') as string,
    sessionIds: p.get('sessionIds') as string,
    progress: p.get('progress') as string,
    color: p.get('color') as string | undefined,
    icon: p.get('icon') as string | undefined,
    createdAt: p.get('createdAt') as number,
    updatedAt: p.get('updatedAt') as number,
  };
}

/**
 * Delete a project
 */
export function deleteProject(id: string): void {
  const projects = getProjectsMap();
  projects.delete(id);

  // Also delete all tasks belonging to this project
  const tasks = getTasksMap();
  const taskIds: string[] = [];
  for (const [taskId, value] of tasks.entries()) {
    if (!(value instanceof LoroMap)) continue;
    if (value.get('projectId') === id) {
      taskIds.push(taskId);
    }
  }
  for (const taskId of taskIds) {
    tasks.delete(taskId);
  }

  commitAndSave();
}

/**
 * Get all projects
 */
export function getAllProjects(): LoroProject[] {
  const projects = getProjectsMap();
  const result: LoroProject[] = [];

  for (const [, value] of projects.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const p = value;
    result.push({
      id: p.get('id') as string,
      name: p.get('name') as string,
      description: p.get('description') as string | undefined,
      type: p.get('type') as string,
      status: p.get('status') as string,
      topics: p.get('topics') as string,
      materialIds: p.get('materialIds') as string,
      artifactIds: p.get('artifactIds') as string,
      sessionIds: p.get('sessionIds') as string,
      progress: p.get('progress') as string,
      color: p.get('color') as string | undefined,
      icon: p.get('icon') as string | undefined,
      createdAt: p.get('createdAt') as number,
      updatedAt: p.get('updatedAt') as number,
    });
  }

  return result.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Get projects by status
 */
export function getProjectsByStatus(status: string): LoroProject[] {
  return getAllProjects().filter(p => p.status === status);
}

// ============ Task Operations ============

/**
 * Add a new task
 */
export function addTask(task: LoroProjectTask): void {
  const tasks = getTasksMap();
  const t = tasks.setContainer(task.id, new LoroMap());
  t.set('id', task.id);
  t.set('projectId', task.projectId);
  t.set('title', task.title);
  if (task.description !== undefined) {
    t.set('description', task.description);
  }
  t.set('priority', task.priority);
  t.set('status', task.status);
  t.set('materialIds', task.materialIds);
  if (task.artifactId !== undefined) {
    t.set('artifactId', task.artifactId);
  }
  if (task.sessionId !== undefined) {
    t.set('sessionId', task.sessionId);
  }
  if (task.suggestions !== undefined) {
    t.set('suggestions', task.suggestions);
  }
  if (task.dueAt !== undefined) {
    t.set('dueAt', task.dueAt);
  }
  if (task.completedAt !== undefined) {
    t.set('completedAt', task.completedAt);
  }
  t.set('createdAt', task.createdAt);
  t.set('updatedAt', task.updatedAt);
  commitAndSave();
}

/**
 * Update an existing task
 */
export function updateTask(
  id: string,
  updates: Partial<Omit<LoroProjectTask, 'id' | 'projectId' | 'createdAt'>>
): void {
  const tasks = getTasksMap();
  const t = tasks.get(id);
  if (!t || !(t instanceof LoroMap)) return;

  if (updates.title !== undefined) t.set('title', updates.title);
  if (updates.description !== undefined) t.set('description', updates.description);
  if (updates.priority !== undefined) t.set('priority', updates.priority);
  if (updates.status !== undefined) t.set('status', updates.status);
  if (updates.materialIds !== undefined) t.set('materialIds', updates.materialIds);
  if (updates.artifactId !== undefined) t.set('artifactId', updates.artifactId);
  if (updates.sessionId !== undefined) t.set('sessionId', updates.sessionId);
  if (updates.suggestions !== undefined) t.set('suggestions', updates.suggestions);
  if (updates.dueAt !== undefined) t.set('dueAt', updates.dueAt);
  if (updates.completedAt !== undefined) t.set('completedAt', updates.completedAt);
  t.set('updatedAt', Date.now());
  commitAndSave();
}

/**
 * Get a single task by ID
 */
export function getTask(id: string): LoroProjectTask | undefined {
  const tasks = getTasksMap();
  const t = tasks.get(id);
  if (!t || !(t instanceof LoroMap)) return undefined;

  return {
    id: t.get('id') as string,
    projectId: t.get('projectId') as string,
    title: t.get('title') as string,
    description: t.get('description') as string | undefined,
    priority: t.get('priority') as string,
    status: t.get('status') as string,
    materialIds: t.get('materialIds') as string,
    artifactId: t.get('artifactId') as string | undefined,
    sessionId: t.get('sessionId') as string | undefined,
    suggestions: t.get('suggestions') as string | undefined,
    dueAt: t.get('dueAt') as number | undefined,
    completedAt: t.get('completedAt') as number | undefined,
    createdAt: t.get('createdAt') as number,
    updatedAt: t.get('updatedAt') as number,
  };
}

/**
 * Delete a task
 */
export function deleteTask(id: string): void {
  const tasks = getTasksMap();
  tasks.delete(id);
  commitAndSave();
}

/**
 * Get all tasks for a project
 */
export function getProjectTasks(projectId: string): LoroProjectTask[] {
  const tasks = getTasksMap();
  const result: LoroProjectTask[] = [];

  for (const [, value] of tasks.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const t = value;
    if (t.get('projectId') !== projectId) continue;

    result.push({
      id: t.get('id') as string,
      projectId: t.get('projectId') as string,
      title: t.get('title') as string,
      description: t.get('description') as string | undefined,
      priority: t.get('priority') as string,
      status: t.get('status') as string,
      materialIds: t.get('materialIds') as string,
      artifactId: t.get('artifactId') as string | undefined,
      sessionId: t.get('sessionId') as string | undefined,
      suggestions: t.get('suggestions') as string | undefined,
      dueAt: t.get('dueAt') as number | undefined,
      completedAt: t.get('completedAt') as number | undefined,
      createdAt: t.get('createdAt') as number,
      updatedAt: t.get('updatedAt') as number,
    });
  }

  // Sort by priority (high first), then by createdAt
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return result.sort((a, b) => {
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Get pending tasks across all projects
 */
export function getPendingTasks(): LoroProjectTask[] {
  const tasks = getTasksMap();
  const result: LoroProjectTask[] = [];

  for (const [, value] of tasks.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const t = value;
    const status = t.get('status') as string;
    if (status !== 'pending' && status !== 'in_progress') continue;

    result.push({
      id: t.get('id') as string,
      projectId: t.get('projectId') as string,
      title: t.get('title') as string,
      description: t.get('description') as string | undefined,
      priority: t.get('priority') as string,
      status: t.get('status') as string,
      materialIds: t.get('materialIds') as string,
      artifactId: t.get('artifactId') as string | undefined,
      sessionId: t.get('sessionId') as string | undefined,
      suggestions: t.get('suggestions') as string | undefined,
      dueAt: t.get('dueAt') as number | undefined,
      completedAt: t.get('completedAt') as number | undefined,
      createdAt: t.get('createdAt') as number,
      updatedAt: t.get('updatedAt') as number,
    });
  }

  // Sort by due date, then priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return result.sort((a, b) => {
    // Due date first (earlier first, undefined last)
    if (a.dueAt && b.dueAt) return a.dueAt - b.dueAt;
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    // Then priority
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
    return pa - pb;
  });
}
