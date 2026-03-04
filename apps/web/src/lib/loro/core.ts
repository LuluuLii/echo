/**
 * Loro Core - Document management and persistence
 *
 * Storage Strategy:
 * - Primary: iCloud Drive file (when connected)
 * - Cache/Fallback: IndexedDB
 * - Emergency backup: localStorage (on page unload)
 */

import { Loro, LoroMap } from 'loro-crdt';
import { loadSnapshot, saveSnapshot } from '../db';
import { loadFromICloud, saveToICloud, getICloudStatus } from '../icloud';

// Singleton Loro document
let doc: Loro | null = null;
let initialized = false;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let iCloudConnected = false;

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
 * Check if iCloud is connected
 */
export function isICloudConnected(): boolean {
  return iCloudConnected;
}

/**
 * Initialize Loro with iCloud-first loading strategy
 *
 * Load order:
 * 1. Try iCloud Drive file (if connected and has permission)
 * 2. Fall back to IndexedDB
 * 3. Fall back to localStorage backup
 *
 * Call this once at app startup
 */
export async function initLoro(): Promise<{
  source: 'icloud' | 'indexeddb' | 'localstorage' | 'empty';
}> {
  if (initialized) {
    return { source: 'indexeddb' }; // Already initialized
  }

  let loadedFrom: 'icloud' | 'indexeddb' | 'localstorage' | 'empty' = 'empty';

  // 1. Try loading from iCloud first
  try {
    const status = await getICloudStatus();
    iCloudConnected = status.connected && status.hasPermission;

    if (iCloudConnected) {
      console.log('[Loro] Attempting to load from iCloud...');
      const iCloudSnapshot = await loadFromICloud();
      if (iCloudSnapshot && iCloudSnapshot.byteLength > 0) {
        getDoc().import(iCloudSnapshot);
        loadedFrom = 'icloud';
        console.log('[Loro] Loaded from iCloud');
      }
    }
  } catch (error) {
    console.warn('[Loro] Failed to load from iCloud:', error);
  }

  // 2. If not loaded from iCloud, try IndexedDB
  if (loadedFrom === 'empty') {
    try {
      const indexedDBSnapshot = await loadSnapshot();
      if (indexedDBSnapshot && indexedDBSnapshot.byteLength > 0) {
        getDoc().import(indexedDBSnapshot);
        loadedFrom = 'indexeddb';
        console.log('[Loro] Loaded from IndexedDB');
      }
    } catch (error) {
      console.warn('[Loro] Failed to load from IndexedDB:', error);
    }
  }

  // 3. If still not loaded, try localStorage backup
  if (loadedFrom === 'empty') {
    try {
      const backupStr = localStorage.getItem('echo-loro-backup');
      if (backupStr) {
        const backupArray = JSON.parse(backupStr);
        const backupSnapshot = new Uint8Array(backupArray);
        if (backupSnapshot.byteLength > 0) {
          getDoc().import(backupSnapshot);
          loadedFrom = 'localstorage';
          console.log('[Loro] Loaded from localStorage backup');
        }
      }
    } catch (error) {
      console.warn('[Loro] Failed to load from localStorage:', error);
    }
  }

  initialized = true;

  // If loaded from IndexedDB or localStorage but iCloud is connected,
  // sync to iCloud to ensure it has the latest data
  if (loadedFrom !== 'icloud' && loadedFrom !== 'empty' && iCloudConnected) {
    console.log('[Loro] Syncing local data to iCloud...');
    const snapshot = getDoc().export({ mode: 'snapshot' });
    await saveToICloud(snapshot);
  }

  return { source: loadedFrom };
}

/**
 * Persist Loro to storage (debounced)
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
 * Persist Loro to storage immediately
 *
 * Save strategy:
 * 1. Always save to IndexedDB (cache)
 * 2. Also save to iCloud if connected (primary)
 */
export async function persistNow(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  const snapshot = getDoc().export({ mode: 'snapshot' });

  // Always save to IndexedDB (cache/fallback)
  await saveSnapshot(snapshot);

  // Also save to iCloud if connected (primary)
  if (iCloudConnected) {
    await saveToICloud(snapshot);
  }
}

/**
 * Commit changes and schedule save
 */
export function commitAndSave(): void {
  getDoc().commit();
  scheduleSave();
}

/**
 * Force refresh iCloud connection status
 */
export async function refreshICloudStatus(): Promise<boolean> {
  const status = await getICloudStatus();
  iCloudConnected = status.connected && status.hasPermission;
  return iCloudConnected;
}

// ============ Lifecycle ============

/**
 * Save before page unload (emergency backup to localStorage)
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (doc) {
      const snapshot = doc.export({ mode: 'snapshot' });
      try {
        // Emergency backup to localStorage
        localStorage.setItem('echo-loro-backup', JSON.stringify(Array.from(snapshot)));
      } catch {
        // Ignore if localStorage is full
      }
    }
  });
}
