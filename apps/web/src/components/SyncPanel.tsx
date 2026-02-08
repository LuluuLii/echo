import { useEffect, useState } from 'react';
import { useSyncStore } from '../lib/store/sync';
import { useMaterialsStore } from '../lib/store/materials';

interface SyncPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SyncPanel({ open, onClose }: SyncPanelProps) {
  const {
    supported,
    connected,
    folderName,
    hasPermission,
    lastSyncTime,
    syncing,
    restoring,
    error,
    init,
    connect,
    disconnect,
    reauthorize,
    sync,
    restore,
    merge,
    clearError,
  } = useSyncStore();

  const { reload } = useMaterialsStore();
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    if (open) {
      init();
    }
  }, [open, init]);

  const handleSync = async () => {
    await sync();
  };

  const handleRestore = async () => {
    const success = await restore();
    if (success) {
      reload();
      setConfirmRestore(false);
    }
  };

  const handleMerge = async () => {
    const success = await merge();
    if (success) {
      reload();
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-echo-text">iCloud Sync</h2>
          <button
            onClick={onClose}
            className="text-echo-hint hover:text-echo-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {!supported ? (
            <div className="text-center py-4">
              <p className="text-echo-muted">
                Your browser doesn't support iCloud sync.
              </p>
              <p className="text-sm text-echo-hint mt-2">
                Try Chrome, Edge, or Safari on macOS.
              </p>
            </div>
          ) : !connected ? (
            <div className="text-center py-4">
              <p className="text-echo-muted mb-4">
                Connect to a folder in iCloud Drive to sync your data across devices.
              </p>
              <button
                onClick={connect}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Choose iCloud Folder
              </button>
            </div>
          ) : (
            <>
              {/* Connection status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-echo-hint">Connected to</p>
                  <p className="text-echo-text font-medium">{folderName}</p>
                </div>
                <button
                  onClick={disconnect}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Disconnect
                </button>
              </div>

              {/* Permission warning */}
              {!hasPermission && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Permission expired. Please reauthorize to sync.
                  </p>
                  <button
                    onClick={reauthorize}
                    className="mt-2 text-sm text-yellow-700 underline hover:no-underline"
                  >
                    Reauthorize
                  </button>
                </div>
              )}

              {/* Last sync time */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-echo-hint">Last synced</span>
                <span className="text-echo-muted">{formatTime(lastSyncTime)}</span>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between">
                  <p className="text-sm text-red-700">{error}</p>
                  <button onClick={clearError} className="text-red-500 hover:text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSync}
                  disabled={!hasPermission || syncing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <>
                      <Spinner />
                      Syncing...
                    </>
                  ) : (
                    'Sync Now'
                  )}
                </button>

                <button
                  onClick={handleMerge}
                  disabled={!hasPermission || syncing}
                  className="w-full px-4 py-2 border border-gray-200 text-echo-text rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Pull & Merge from iCloud
                </button>

                {!confirmRestore ? (
                  <button
                    onClick={() => setConfirmRestore(true)}
                    disabled={!hasPermission || restoring}
                    className="w-full px-4 py-2 text-sm text-echo-hint hover:text-echo-muted transition-colors"
                  >
                    Restore from iCloud
                  </button>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 mb-2">
                      This will replace all local data with iCloud data. Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRestore}
                        disabled={restoring}
                        className="flex-1 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {restoring ? (
                          <>
                            <Spinner />
                            Restoring...
                          </>
                        ) : (
                          'Yes, Restore'
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmRestore(false)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 text-sm rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
