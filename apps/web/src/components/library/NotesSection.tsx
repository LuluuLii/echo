import { useState, useEffect } from 'react';
import type { RawMaterial } from '../../lib/store/materials';
import { NoteCard } from './NoteCard';

interface NotesSectionProps {
  notes: RawMaterial[];
  onSelectMaterial: (material: RawMaterial) => void;
  // Translation props
  onTranslateAll?: () => void;
  untranslatedCount?: number;
  translateProgress?: { current: number; total: number } | null;
}

const NOTES_PER_PAGE = 6; // 3 columns x 2 rows

export function NotesSection({
  notes,
  onSelectMaterial,
  onTranslateAll,
  untranslatedCount = 0,
  translateProgress,
}: NotesSectionProps) {
  const [page, setPage] = useState(0);

  // Reset page when notes change
  useEffect(() => {
    setPage(0);
  }, [notes.length]);

  // Always show section, even when empty
  if (notes.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-echo-text mb-4">Notes</h2>
        <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-echo-muted text-sm mb-1">No notes yet</p>
          <p className="text-echo-hint text-xs">
            Add your first thought, observation, or note
          </p>
        </div>
      </section>
    );
  }

  const totalPages = Math.ceil(notes.length / NOTES_PER_PAGE);
  const visibleNotes = notes.slice(page * NOTES_PER_PAGE, (page + 1) * NOTES_PER_PAGE);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-echo-text">Notes</h2>
          {/* Translate All button */}
          {onTranslateAll && (
            <button
              onClick={onTranslateAll}
              disabled={translateProgress !== null}
              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {translateProgress
                ? `Translating ${translateProgress.current}/${translateProgress.total}...`
                : untranslatedCount > 0
                ? `Translate All (${untranslatedCount})`
                : 'Re-translate All'}
            </button>
          )}
        </div>
        {/* Pagination arrows */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-echo-hint text-sm">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {/* Horizontal card grid - 3 columns, 2 rows max */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleNotes.map((material) => (
          <NoteCard
            key={material.id}
            material={material}
            onClick={() => onSelectMaterial(material)}
          />
        ))}
      </div>
    </section>
  );
}
