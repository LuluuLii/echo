import { db, META_KEYS } from './db';
import { getDoc, persistNow } from './loro';

const SYNC_FILE_NAME = 'echo-data.loro';

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Get stored directory handle from IndexedDB
 */
async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  const record = await db.meta.get(META_KEYS.ICLOUD_HANDLE);
  if (record?.value && record.value instanceof FileSystemDirectoryHandle) {
    return record.value;
  }
  return null;
}

/**
 * Store directory handle to IndexedDB
 */
async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await db.meta.put({
    key: META_KEYS.ICLOUD_HANDLE,
    value: handle,
  });
}

/**
 * Clear stored directory handle
 */
async function clearHandle(): Promise<void> {
  await db.meta.delete(META_KEYS.ICLOUD_HANDLE);
}

/**
 * Request permission for a stored handle
 */
async function verifyPermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };

  // Check if permission is already granted
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

/**
 * Connect to iCloud directory
 * Shows directory picker and stores the handle
 */
export async function connectToICloud(): Promise<{
  success: boolean;
  name?: string;
  error?: string;
}> {
  if (!isFileSystemAccessSupported()) {
    return { success: false, error: 'File System Access API not supported' };
  }

  try {
    const handle = await window.showDirectoryPicker({
      id: 'echo-icloud',
      mode: 'readwrite',
      startIn: 'documents',
    });

    await storeHandle(handle);

    return { success: true, name: handle.name };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'User cancelled' };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * Disconnect from iCloud
 */
export async function disconnectFromICloud(): Promise<void> {
  await clearHandle();
}

/**
 * Get current iCloud connection status
 */
export async function getICloudStatus(): Promise<{
  connected: boolean;
  name?: string;
  hasPermission: boolean;
}> {
  const handle = await getStoredHandle();

  if (!handle) {
    return { connected: false, hasPermission: false };
  }

  const hasPermission = await verifyPermission(handle).catch(() => false);

  return {
    connected: true,
    name: handle.name,
    hasPermission,
  };
}

/**
 * Re-request permission for stored handle
 */
export async function requestPermission(): Promise<boolean> {
  const handle = await getStoredHandle();
  if (!handle) return false;

  return verifyPermission(handle);
}

/**
 * Write Loro snapshot to iCloud
 */
async function writeToICloud(snapshot: Uint8Array): Promise<void> {
  const handle = await getStoredHandle();
  if (!handle) {
    throw new Error('Not connected to iCloud');
  }

  const hasPermission = await verifyPermission(handle);
  if (!hasPermission) {
    throw new Error('No permission to write to iCloud folder');
  }

  const fileHandle = await handle.getFileHandle(SYNC_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  // Copy to new ArrayBuffer to satisfy strict type checking
  const buffer = new ArrayBuffer(snapshot.byteLength);
  new Uint8Array(buffer).set(snapshot);
  await writable.write(buffer);
  await writable.close();
}

/**
 * Read Loro snapshot from iCloud
 */
async function readFromICloud(): Promise<Uint8Array | null> {
  const handle = await getStoredHandle();
  if (!handle) {
    throw new Error('Not connected to iCloud');
  }

  const hasPermission = await verifyPermission(handle);
  if (!hasPermission) {
    throw new Error('No permission to read from iCloud folder');
  }

  try {
    const fileHandle = await handle.getFileHandle(SYNC_FILE_NAME);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      return null; // File doesn't exist yet
    }
    throw error;
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  const record = await db.meta.get(META_KEYS.LAST_SYNC);
  return (record?.value as number) ?? null;
}

/**
 * Set last sync timestamp
 */
async function setLastSyncTime(timestamp: number): Promise<void> {
  await db.meta.put({
    key: META_KEYS.LAST_SYNC,
    value: timestamp,
  });
}

/**
 * Sync to iCloud: IndexedDB → iCloud (single direction push)
 */
export async function syncToICloud(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Ensure local data is saved first
    await persistNow();

    // Export snapshot
    const snapshot = getDoc().export({ mode: 'snapshot' });

    // Write to iCloud
    await writeToICloud(snapshot);

    // Record sync time
    await setLastSyncTime(Date.now());

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Restore from iCloud: iCloud → IndexedDB (for new device)
 */
export async function restoreFromICloud(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const snapshot = await readFromICloud();

    if (!snapshot) {
      return { success: false, error: 'No data found in iCloud' };
    }

    // Import into Loro doc
    getDoc().import(snapshot);

    // Persist to local IndexedDB
    await persistNow();

    // Record sync time
    await setLastSyncTime(Date.now());

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Merge from iCloud: Pull remote changes and merge with local
 * Uses Loro CRDT to handle conflicts automatically
 */
export async function mergeFromICloud(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const remoteSnapshot = await readFromICloud();

    if (!remoteSnapshot) {
      // No remote data, just sync local to iCloud
      return syncToICloud();
    }

    // Import remote data (Loro CRDT handles merging)
    getDoc().import(remoteSnapshot);

    // Persist merged result locally
    await persistNow();

    // Push merged result back to iCloud
    const snapshot = getDoc().export({ mode: 'snapshot' });
    await writeToICloud(snapshot);

    // Record sync time
    await setLastSyncTime(Date.now());

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
