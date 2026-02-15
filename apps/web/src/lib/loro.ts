import { Loro, LoroMap } from 'loro-crdt';
import { loadSnapshot, saveSnapshot } from './db';

/**
 * Material data stored in Loro (synced)
 * Note: embedding is NOT stored here, it's local-only
 */
export interface LoroMaterial {
  id: string;
  type: 'text' | 'image';
  content: string;
  contentEn?: string;  // English translation of content
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Echo Artifact - user's finalized expression (synced)
 */
export interface LoroArtifact {
  id: string;
  content: string;           // User's final expression
  materialIds: string[];     // Related materials
  anchor?: string;           // emotionalAnchor summary
  createdAt: number;
}

/**
 * Session Memory - L2 memory, saved on session exit (synced)
 */
export interface LoroSessionMemory {
  id: string;
  sessionId: string;
  topic?: string;            // Discussion topic
  turnCount: number;         // Total conversation turns
  summary: string;           // Brief summary
  status: 'completed' | 'abandoned';
  artifactId?: string;       // If user saved an artifact
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

// Singleton Loro document
let doc: Loro | null = null;
let initialized = false;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 1000;

/**
 * Get or create the Loro document
 */
export function getDoc(): Loro {
  if (!doc) {
    doc = new Loro();
  }
  return doc;
}

/**
 * Initialize Loro from IndexedDB
 * Call this once at app startup
 */
export async function initLoro(): Promise<void> {
  if (initialized) return;

  const snapshot = await loadSnapshot();
  if (snapshot) {
    getDoc().import(snapshot);
  }

  initialized = true;
}

/**
 * Persist Loro to IndexedDB (debounced)
 */
export function scheduleSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    await persistNow();
  }, DEBOUNCE_MS);
}

/**
 * Persist Loro to IndexedDB immediately
 */
export async function persistNow(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const snapshot = getDoc().export({ mode: 'snapshot' });
  await saveSnapshot(snapshot);
}

// ============ Materials Operations ============

function getMaterialsMap(): LoroMap {
  return getDoc().getMap('materials');
}

/**
 * Add a new material
 */
export function addMaterial(material: Omit<LoroMaterial, 'updatedAt'>): void {
  const materials = getMaterialsMap();
  const m = materials.setContainer(material.id, new LoroMap());
  m.set('id', material.id);
  m.set('type', material.type);
  m.set('content', material.content);
  if (material.note !== undefined) {
    m.set('note', material.note);
  }
  m.set('createdAt', material.createdAt);
  m.set('updatedAt', Date.now());
  getDoc().commit();
  scheduleSave();
}

/**
 * Update an existing material
 */
export function updateMaterial(
  id: string,
  updates: Partial<Pick<LoroMaterial, 'content' | 'contentEn' | 'note'>>
): void {
  const materials = getMaterialsMap();
  const m = materials.get(id);
  if (!m || !(m instanceof LoroMap)) return;

  if (updates.content !== undefined) {
    m.set('content', updates.content);
  }
  if (updates.contentEn !== undefined) {
    m.set('contentEn', updates.contentEn);
  }
  if (updates.note !== undefined) {
    m.set('note', updates.note);
  }
  m.set('updatedAt', Date.now());
  getDoc().commit();
  scheduleSave();
}

/**
 * Delete a material
 */
export function deleteMaterial(id: string): void {
  const materials = getMaterialsMap();
  materials.delete(id);
  getDoc().commit();
  scheduleSave();
}

/**
 * Get a single material by ID
 */
export function getMaterial(id: string): LoroMaterial | undefined {
  const materials = getMaterialsMap();
  const m = materials.get(id);
  if (!m || !(m instanceof LoroMap)) return undefined;

  return {
    id: m.get('id') as string,
    type: m.get('type') as 'text' | 'image',
    content: m.get('content') as string,
    contentEn: m.get('contentEn') as string | undefined,
    note: m.get('note') as string | undefined,
    createdAt: m.get('createdAt') as number,
    updatedAt: m.get('updatedAt') as number,
  };
}

/**
 * Get all materials
 */
export function getAllMaterials(): LoroMaterial[] {
  const materials = getMaterialsMap();
  const result: LoroMaterial[] = [];

  for (const [, value] of materials.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const m = value;
    result.push({
      id: m.get('id') as string,
      type: m.get('type') as 'text' | 'image',
      content: m.get('content') as string,
      contentEn: m.get('contentEn') as string | undefined,
      note: m.get('note') as string | undefined,
      createdAt: m.get('createdAt') as number,
      updatedAt: m.get('updatedAt') as number,
    });
  }

  // Sort by createdAt descending (newest first)
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

// ============ Artifacts Operations ============

function getArtifactsMap(): LoroMap {
  return getDoc().getMap('artifacts');
}

/**
 * Add a new artifact
 */
export function addArtifact(artifact: LoroArtifact): void {
  const artifacts = getArtifactsMap();
  const a = artifacts.setContainer(artifact.id, new LoroMap());
  a.set('id', artifact.id);
  a.set('content', artifact.content);
  a.set('materialIds', JSON.stringify(artifact.materialIds));
  if (artifact.anchor) {
    a.set('anchor', artifact.anchor);
  }
  a.set('createdAt', artifact.createdAt);
  getDoc().commit();
  scheduleSave();
}

/**
 * Get all artifacts
 */
export function getAllArtifacts(): LoroArtifact[] {
  const artifacts = getArtifactsMap();
  const result: LoroArtifact[] = [];

  for (const [, value] of artifacts.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const a = value;
    result.push({
      id: a.get('id') as string,
      content: a.get('content') as string,
      materialIds: JSON.parse(a.get('materialIds') as string),
      anchor: a.get('anchor') as string | undefined,
      createdAt: a.get('createdAt') as number,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

// ============ Session Memory Operations ============

function getSessionMemoriesMap(): LoroMap {
  return getDoc().getMap('sessionMemories');
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
  getDoc().commit();
  scheduleSave();
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
  getDoc().commit();
  scheduleSave();
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
  getDoc().commit();
  scheduleSave();
}

// ============ Sessions Operations ============

function getSessionsMap(): LoroMap {
  return getDoc().getMap('sessions');
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
  getDoc().commit();
  scheduleSave();
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
  getDoc().commit();
  scheduleSave();
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

// ============ Lifecycle ============

/**
 * Save before page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (doc) {
      // Synchronous save attempt
      const snapshot = doc.export({ mode: 'snapshot' });
      // Use sendBeacon or localStorage as fallback
      try {
        localStorage.setItem('echo-loro-backup', JSON.stringify(Array.from(snapshot)));
      } catch {
        // Ignore if localStorage is full
      }
    }
  });
}
