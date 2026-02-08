import { create } from 'zustand';
import {
  isFileSystemAccessSupported,
  getICloudStatus,
  connectToICloud,
  disconnectFromICloud,
  requestPermission,
  syncToICloud,
  restoreFromICloud,
  mergeFromICloud,
  getLastSyncTime,
} from '../icloud';

interface SyncState {
  // Status
  supported: boolean;
  connected: boolean;
  folderName: string | null;
  hasPermission: boolean;
  lastSyncTime: number | null;

  // Loading states
  syncing: boolean;
  restoring: boolean;

  // Error
  error: string | null;
}

interface SyncActions {
  // Initialize
  init: () => Promise<void>;

  // Connection
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  reauthorize: () => Promise<boolean>;

  // Sync operations
  sync: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  merge: () => Promise<boolean>;

  // Clear error
  clearError: () => void;
}

type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set, get) => ({
  // Initial state
  supported: false,
  connected: false,
  folderName: null,
  hasPermission: false,
  lastSyncTime: null,
  syncing: false,
  restoring: false,
  error: null,

  init: async () => {
    const supported = isFileSystemAccessSupported();
    set({ supported });

    if (!supported) return;

    const [status, lastSyncTime] = await Promise.all([
      getICloudStatus(),
      getLastSyncTime(),
    ]);

    set({
      connected: status.connected,
      folderName: status.name ?? null,
      hasPermission: status.hasPermission,
      lastSyncTime,
    });
  },

  connect: async () => {
    set({ error: null });

    const result = await connectToICloud();

    if (result.success) {
      set({
        connected: true,
        folderName: result.name ?? null,
        hasPermission: true,
      });
      return true;
    } else {
      if (result.error !== 'User cancelled') {
        set({ error: result.error ?? 'Failed to connect' });
      }
      return false;
    }
  },

  disconnect: async () => {
    await disconnectFromICloud();
    set({
      connected: false,
      folderName: null,
      hasPermission: false,
      lastSyncTime: null,
    });
  },

  reauthorize: async () => {
    set({ error: null });

    const granted = await requestPermission();
    set({ hasPermission: granted });

    if (!granted) {
      set({ error: 'Permission denied' });
    }

    return granted;
  },

  sync: async () => {
    if (get().syncing) return false;

    set({ syncing: true, error: null });

    const result = await syncToICloud();

    if (result.success) {
      const lastSyncTime = await getLastSyncTime();
      set({ syncing: false, lastSyncTime });
      return true;
    } else {
      set({ syncing: false, error: result.error ?? 'Sync failed' });
      return false;
    }
  },

  restore: async () => {
    if (get().restoring) return false;

    set({ restoring: true, error: null });

    const result = await restoreFromICloud();

    if (result.success) {
      const lastSyncTime = await getLastSyncTime();
      set({ restoring: false, lastSyncTime });
      // Note: Caller should reload materials from Loro after restore
      return true;
    } else {
      set({ restoring: false, error: result.error ?? 'Restore failed' });
      return false;
    }
  },

  merge: async () => {
    if (get().syncing) return false;

    set({ syncing: true, error: null });

    const result = await mergeFromICloud();

    if (result.success) {
      const lastSyncTime = await getLastSyncTime();
      set({ syncing: false, lastSyncTime });
      // Note: Caller should reload materials from Loro after merge
      return true;
    } else {
      set({ syncing: false, error: result.error ?? 'Merge failed' });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
