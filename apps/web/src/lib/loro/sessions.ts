/**
 * Loro Sessions Operations
 */

import { LoroMap } from 'loro-crdt';
import { getMap, commitAndSave } from './core';
import type { LoroSession, LoroSessionMemory } from './types';

// ============ Session Memory Operations ============

function getSessionMemoriesMap(): LoroMap {
  return getMap('sessionMemories');
}

/**
 * Add a new session memory
 */
export function addSessionMemory(memory: LoroSessionMemory): void {
  const memories = getSessionMemoriesMap();
  const m = memories.setContainer(memory.id, new LoroMap());
  m.set('id', memory.id);
  m.set('sessionId', memory.sessionId);
  if (memory.topic) {
    m.set('topic', memory.topic);
  }
  m.set('turnCount', memory.turnCount);
  m.set('summary', memory.summary);
  m.set('status', memory.status);
  if (memory.artifactId) {
    m.set('artifactId', memory.artifactId);
  }
  m.set('materialIds', JSON.stringify(memory.materialIds));
  m.set('createdAt', memory.createdAt);
  m.set('exitedAt', memory.exitedAt);
  commitAndSave();
}

/**
 * Update an existing session memory
 */
export function updateSessionMemory(
  id: string,
  updates: Partial<Pick<LoroSessionMemory, 'turnCount' | 'summary' | 'status' | 'artifactId' | 'exitedAt'>>
): void {
  const memories = getSessionMemoriesMap();
  const m = memories.get(id);
  if (!m || !(m instanceof LoroMap)) return;

  if (updates.turnCount !== undefined) {
    m.set('turnCount', updates.turnCount);
  }
  if (updates.summary !== undefined) {
    m.set('summary', updates.summary);
  }
  if (updates.status !== undefined) {
    m.set('status', updates.status);
  }
  if (updates.artifactId !== undefined) {
    m.set('artifactId', updates.artifactId);
  }
  if (updates.exitedAt !== undefined) {
    m.set('exitedAt', updates.exitedAt);
  }
  commitAndSave();
}

/**
 * Get a session memory by ID
 */
export function getSessionMemory(id: string): LoroSessionMemory | undefined {
  const memories = getSessionMemoriesMap();
  const m = memories.get(id);
  if (!m || !(m instanceof LoroMap)) return undefined;

  return {
    id: m.get('id') as string,
    sessionId: m.get('sessionId') as string,
    topic: m.get('topic') as string | undefined,
    turnCount: m.get('turnCount') as number,
    summary: m.get('summary') as string,
    status: m.get('status') as 'completed' | 'abandoned',
    artifactId: m.get('artifactId') as string | undefined,
    materialIds: JSON.parse(m.get('materialIds') as string),
    createdAt: m.get('createdAt') as number,
    exitedAt: m.get('exitedAt') as number,
  };
}

/**
 * Get all session memories
 */
export function getAllSessionMemories(): LoroSessionMemory[] {
  const memories = getSessionMemoriesMap();
  const result: LoroSessionMemory[] = [];

  for (const [, value] of memories.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const m = value;
    result.push({
      id: m.get('id') as string,
      sessionId: m.get('sessionId') as string,
      topic: m.get('topic') as string | undefined,
      turnCount: m.get('turnCount') as number,
      summary: m.get('summary') as string,
      status: m.get('status') as 'completed' | 'abandoned',
      artifactId: m.get('artifactId') as string | undefined,
      materialIds: JSON.parse(m.get('materialIds') as string),
      createdAt: m.get('createdAt') as number,
      exitedAt: m.get('exitedAt') as number,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Delete a session memory
 */
export function deleteSessionMemory(id: string): void {
  const memories = getSessionMemoriesMap();
  memories.delete(id);
  commitAndSave();
}

// ============ Sessions Operations ============

function getSessionsMap(): LoroMap {
  return getMap('sessions');
}

/**
 * Add a new session
 */
export function addSession(session: LoroSession): void {
  const sessions = getSessionsMap();
  const s = sessions.setContainer(session.id, new LoroMap());
  s.set('id', session.id);
  s.set('status', session.status);
  s.set('createdAt', session.createdAt);
  if (session.completedAt !== undefined) {
    s.set('completedAt', session.completedAt);
  }
  commitAndSave();
}

/**
 * Update session status
 */
export function updateSession(
  id: string,
  updates: Partial<Pick<LoroSession, 'status' | 'completedAt'>>
): void {
  const sessions = getSessionsMap();
  const s = sessions.get(id);
  if (!s || !(s instanceof LoroMap)) return;

  if (updates.status !== undefined) {
    s.set('status', updates.status);
  }
  if (updates.completedAt !== undefined) {
    s.set('completedAt', updates.completedAt);
  }
  commitAndSave();
}

/**
 * Get a session by ID
 */
export function getSession(id: string): LoroSession | undefined {
  const sessions = getSessionsMap();
  const s = sessions.get(id);
  if (!s || !(s instanceof LoroMap)) return undefined;

  return {
    id: s.get('id') as string,
    status: s.get('status') as 'active' | 'completed' | 'abandoned',
    createdAt: s.get('createdAt') as number,
    completedAt: s.get('completedAt') as number | undefined,
  };
}
