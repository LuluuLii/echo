import type { DuplicateCheckResult } from '../../lib/deduplication';

export interface PendingImport {
  content: string;
  source: 'paste' | 'drop';
  duplicateResult?: DuplicateCheckResult;
}

interface PendingImportsPanelProps {
  imports: PendingImport[];
  isChecking: boolean;
  onConfirm: (index: number) => void;
  onConfirmAll: () => void;
  onDismiss: (index: number) => void;
  onDismissAll: () => void;
}

export function PendingImportsPanel({
  imports,
  isChecking,
  onConfirm,
  onConfirmAll,
  onDismiss,
  onDismissAll,
}: PendingImportsPanelProps) {
  const nonDuplicateCount = imports.filter(p => !p.duplicateResult?.isDuplicate).length;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-echo-text">
            {isChecking ? 'Checking...' : `${imports.length} item${imports.length > 1 ? 's' : ''} to import`}
          </span>
          {imports.some(p => p.duplicateResult?.isDuplicate) && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
              {imports.filter(p => p.duplicateResult?.isDuplicate).length} duplicates
            </span>
          )}
          {imports.some(p => p.duplicateResult?.isNearDuplicate) && (
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
              {imports.filter(p => p.duplicateResult?.isNearDuplicate).length} similar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {nonDuplicateCount > 1 && (
            <button
              onClick={onConfirmAll}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add All ({nonDuplicateCount})
            </button>
          )}
          <button
            onClick={onDismissAll}
            className="text-xs px-3 py-1 text-echo-muted hover:text-echo-text transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
        {imports.map((item, index) => (
          <div
            key={index}
            className={`p-3 flex items-start gap-3 ${
              item.duplicateResult?.isDuplicate ? 'bg-yellow-50/50' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-echo-text line-clamp-2">{item.content}</p>
              {item.duplicateResult?.isDuplicate && (
                <p className="text-xs text-yellow-600 mt-1">
                  Exact duplicate exists
                </p>
              )}
              {item.duplicateResult?.isNearDuplicate && (
                <p className="text-xs text-orange-600 mt-1">
                  Similar to: "{item.duplicateResult.matches[0]?.content.slice(0, 50)}..."
                  <span className="ml-1 text-orange-500">
                    ({Math.round((item.duplicateResult.matches[0]?.similarity || 0) * 100)}% similar)
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onConfirm(index)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  item.duplicateResult?.isDuplicate
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {item.duplicateResult?.isDuplicate ? 'Add Anyway' : 'Add'}
              </button>
              <button
                onClick={() => onDismiss(index)}
                className="text-xs px-2 py-1 text-echo-hint hover:text-echo-muted transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
