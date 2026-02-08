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
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Echo output data stored in Loro (synced)
 */
export interface LoroOutput {
  id: string;
  sessionId: string;
  content: string;
  materialIds: string[];
  createdAt: number;
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
  updates: Partial<Pick<LoroMaterial, 'content' | 'note'>>
): void {
  const materials = getMaterialsMap();
  const m = materials.get(id);
  if (!m || !(m instanceof LoroMap)) return;

  if (updates.content !== undefined) {
    m.set('content', updates.content);
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
      note: m.get('note') as string | undefined,
      createdAt: m.get('createdAt') as number,
      updatedAt: m.get('updatedAt') as number,
    });
  }

  // Sort by createdAt descending (newest first)
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

// ============ Outputs Operations ============

function getOutputsMap(): LoroMap {
  return getDoc().getMap('outputs');
}

/**
 * Add a new output
 */
export function addOutput(output: LoroOutput): void {
  const outputs = getOutputsMap();
  const o = outputs.setContainer(output.id, new LoroMap());
  o.set('id', output.id);
  o.set('sessionId', output.sessionId);
  o.set('content', output.content);
  o.set('materialIds', JSON.stringify(output.materialIds));
  o.set('createdAt', output.createdAt);
  getDoc().commit();
  scheduleSave();
}

/**
 * Get all outputs
 */
export function getAllOutputs(): LoroOutput[] {
  const outputs = getOutputsMap();
  const result: LoroOutput[] = [];

  for (const [, value] of outputs.entries()) {
    if (!(value instanceof LoroMap)) continue;
    const o = value;
    result.push({
      id: o.get('id') as string,
      sessionId: o.get('sessionId') as string,
      content: o.get('content') as string,
      materialIds: JSON.parse(o.get('materialIds') as string),
      createdAt: o.get('createdAt') as number,
    });
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
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
