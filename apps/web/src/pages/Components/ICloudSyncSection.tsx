interface ICloudSyncSectionProps {
  supported: boolean;
  connected: boolean;
  folderName: string | null;
  hasPermission: boolean;
  lastSyncTime: number | null;
  isSyncing: boolean;
  syncError: string | null;
  syncSuccess: string | null;
  autoSyncEnabled: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRequestPermission: () => void;
  onSyncNow: () => void;
  onPushToICloud: () => void;
  onRestoreFromICloud: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
}

function formatLastSync(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ICloudSyncSection({
  supported,
  connected,
  folderName,
  hasPermission,
  lastSyncTime,
  isSyncing,
  syncError,
  syncSuccess,
  autoSyncEnabled,
  onConnect,
  onDisconnect,
  onRequestPermission,
  onSyncNow,
  onPushToICloud,
  onRestoreFromICloud,
  onToggleAutoSync,
}: ICloudSyncSectionProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <h2 className="text-lg font-medium text-echo-text mb-4">
        ☁️ iCloud Sync
      </h2>

      {!supported ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-amber-800 text-sm">
            iCloud sync is not supported in this browser.
            Please use Chrome, Edge, or Safari 15.2+ on macOS.
          </p>
        </div>
      ) : !connected ? (
        <div className="space-y-4">
          <p className="text-echo-muted text-sm">
            Connect to an iCloud Drive folder to sync your materials across devices.
          </p>
          <button
            onClick={onConnect}
            className="px-4 py-2 bg-echo-text text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Connect to iCloud Folder
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-echo-text text-sm font-medium">
                {hasPermission ? '✅' : '⚠️'} Connected to: {folderName}
              </p>
              <p className="text-echo-hint text-xs mt-1">
                Last sync: {formatLastSync(lastSyncTime)}
              </p>
            </div>
            <button
              onClick={onDisconnect}
              className="text-echo-hint text-sm hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          </div>

          {/* Permission warning */}
          {!hasPermission && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-700 text-sm mb-2">
                Permission expired. Click to re-authorize.
              </p>
              <button
                onClick={onRequestPermission}
                className="text-amber-700 text-sm font-medium underline"
              >
                Grant Permission
              </button>
            </div>
          )}

          {/* Sync buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSyncNow}
              disabled={isSyncing || !hasPermission}
              className="px-4 py-2 bg-echo-text text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={onPushToICloud}
              disabled={isSyncing || !hasPermission}
              className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Push to iCloud
            </button>
            <button
              onClick={onRestoreFromICloud}
              disabled={isSyncing || !hasPermission}
              className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Restore from iCloud
            </button>
          </div>

          {/* Auto-sync toggle */}
          <label className="flex items-center gap-2 text-sm text-echo-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => onToggleAutoSync(e.target.checked)}
              disabled={!hasPermission}
              className="w-4 h-4"
            />
            Auto-sync every 5 minutes
          </label>

          {/* Success message */}
          {syncSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">✓ {syncSuccess}</p>
            </div>
          )}

          {/* Error message */}
          {syncError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">✗ {syncError}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-echo-hint text-xs mt-4">
        Sync uses Loro CRDT to merge changes automatically.
        Embeddings are rebuilt locally after sync.
      </p>
    </section>
  );
}
