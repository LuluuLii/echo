/**
 * Loro Core - Document management and persistence
 */

import { Loro, LoroMap } from 'loro-crdt';
import { loadSnapshot, saveSnapshot } from '../db';

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
 * Get a named map from the document
 */
export function getMap(name: string): LoroMap {
  return getDoc().getMap(name);
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

/**
 * Commit changes and schedule save
 */
export function commitAndSave(): void {
  getDoc().commit();
  scheduleSave();
}

// ============ Lifecycle ============

/**
 * Save before page unload
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (doc) {
      const snapshot = doc.export({ mode: 'snapshot' });
      try {
        localStorage.setItem('echo-loro-backup', JSON.stringify(Array.from(snapshot)));
      } catch {
        // Ignore if localStorage is full
      }
    }
  });
}
