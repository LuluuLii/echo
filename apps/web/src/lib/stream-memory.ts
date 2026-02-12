/**
 * Stream Memory (L1) - Temporary conversation state
 *
 * Stored in localStorage, auto-saved every N turns.
 * Used for session recovery on page refresh.
 */

const STORAGE_KEY = 'echo-stream-snapshot';

export interface StreamSnapshot {
  sessionId: string;
  turnCount: number;
  lastUserMessage: string;
  lastEchoResponse: string;
  topic?: string;
  materialIds: string[];
  cardAnchor?: string;
  timestamp: number;
}

/**
 * Save stream snapshot to localStorage
 */
export function saveStreamSnapshot(snapshot: StreamSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Failed to save stream snapshot:', error);
  }
}

/**
 * Load stream snapshot from localStorage
 */
export function loadStreamSnapshot(): StreamSnapshot | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as StreamSnapshot;
  } catch (error) {
    console.warn('Failed to load stream snapshot:', error);
    return null;
  }
}

/**
 * Clear stream snapshot from localStorage
 */
export function clearStreamSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear stream snapshot:', error);
  }
}

/**
 * Check if snapshot is recent enough to recover (within 1 hour)
 */
export function isSnapshotRecoverable(snapshot: StreamSnapshot): boolean {
  const ONE_HOUR = 60 * 60 * 1000;
  return Date.now() - snapshot.timestamp < ONE_HOUR;
}
