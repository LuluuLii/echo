import type { RawMaterial } from '../../lib/store/materials';
import { FileCard } from './FileCard';

interface FilesSectionProps {
  files: RawMaterial[];
  onSelectMaterial: (material: RawMaterial) => void;
  onImportClick?: () => void;
  // Summarize props
  onSummarizeAll?: () => void;
  unsummarizedCount?: number;
  summarizeProgress?: { current: number; total: number } | null;
}

export function FilesSection({
  files,
  onSelectMaterial,
  onImportClick,
  onSummarizeAll,
  unsummarizedCount = 0,
  summarizeProgress,
}: FilesSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-echo-text">Files & Documents</h2>
          {/* Summarize All button */}
          {onSummarizeAll && files.length > 0 && (
            <button
              onClick={onSummarizeAll}
              disabled={summarizeProgress !== null}
              className="px-2.5 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {summarizeProgress
                ? `Summarizing ${summarizeProgress.current}/${summarizeProgress.total}...`
                : unsummarizedCount > 0
                ? `Summarize All (${unsummarizedCount})`
                : 'Re-summarize All'}
            </button>
          )}
        </div>
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
        )}
      </div>

      {files.length === 0 ? (
        /* Empty state */
        <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-echo-muted text-sm mb-1">No files yet</p>
          <p className="text-echo-hint text-xs">
            Import images or documents to see them here
          </p>
        </div>
      ) : (
        /* Files grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((material) => (
            <FileCard
              key={material.id}
              material={material}
              onClick={() => onSelectMaterial(material)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
