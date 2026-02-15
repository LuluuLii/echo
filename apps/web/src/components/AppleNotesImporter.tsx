import { useState, useEffect, useCallback } from 'react';
import { checkDuplicate, type DuplicateCheckResult } from '../lib/deduplication';
import { useMaterialsStore } from '../lib/store/materials';

interface AppleNotesImporterProps {
  onClose: () => void;
  onImport: (notes: ImportedNote[]) => void;
}

interface NoteFolder {
  id: string;
  name: string;
  noteCount: number;
}

interface NoteItem {
  id: string;
  name: string;
  folder: string;
  createdAt: string;
  modifiedAt: string;
  snippet: string;
}

interface ImportedNote {
  id: string;
  name: string;
  body: string;
  folder: string;
}

type ImportStep = 'checking' | 'unavailable' | 'folders' | 'notes' | 'importing' | 'review';

const API_BASE = 'http://localhost:3000/api/apple-notes';

export function AppleNotesImporter({ onClose, onImport }: AppleNotesImporterProps) {
  const { materials } = useMaterialsStore();

  // Step management
  const [step, setStep] = useState<ImportStep>('checking');
  const [error, setError] = useState<string | null>(null);

  // Data
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<NoteFolder | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  // Import results
  const [importedNotes, setImportedNotes] = useState<ImportedNote[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Duplicate check results
  const [duplicateResults, setDuplicateResults] = useState<Map<string, DuplicateCheckResult>>(new Map());

  // Check if Apple Notes is available
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const res = await fetch(`${API_BASE}/check`);
      const data = await res.json();

      if (data.available) {
        loadFolders();
      } else {
        setError(data.reason || 'Apple Notes is not available');
        setStep('unavailable');
      }
    } catch {
      setError('Cannot connect to server. Make sure the server is running.');
      setStep('unavailable');
    }
  };

  const loadFolders = async () => {
    try {
      const res = await fetch(`${API_BASE}/folders`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStep('unavailable');
        return;
      }

      setFolders(data.folders || []);
      setStep('folders');
    } catch (err) {
      setError('Failed to load folders');
      setStep('unavailable');
    }
  };

  // Loading state for notes
  const [loadingNotes, setLoadingNotes] = useState(false);

  const loadNotes = async (folder: NoteFolder | null) => {
    setSelectedFolder(folder);
    setSelectedNoteIds(new Set());
    setLoadingNotes(true);
    setError(null);

    try {
      const url = folder
        ? `${API_BASE}/notes?folder=${encodeURIComponent(folder.id)}`
        : `${API_BASE}/notes`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoadingNotes(false);
        return;
      }

      setNotes(data.notes || []);
      setStep('notes');
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const selectAllNotes = () => {
    if (selectedNoteIds.size === notes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(notes.map(n => n.id)));
    }
  };

  const importSelectedNotes = async () => {
    if (selectedNoteIds.size === 0) return;

    setStep('importing');
    setImportProgress({ current: 0, total: selectedNoteIds.size });

    try {
      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteIds: Array.from(selectedNoteIds) }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStep('notes');
        return;
      }

      const imported = data.notes || [];
      setImportedNotes(imported);

      // Check for duplicates
      const dupResults = new Map<string, DuplicateCheckResult>();
      for (let i = 0; i < imported.length; i++) {
        setImportProgress({ current: i + 1, total: imported.length });
        const note = imported[i];
        if (note.body) {
          const result = await checkDuplicate(note.body, materials);
          dupResults.set(note.id, result);
        }
      }
      setDuplicateResults(dupResults);

      setStep('review');
    } catch {
      setError('Failed to import notes');
      setStep('notes');
    }
  };

  const importFolder = async () => {
    if (!selectedFolder) return;

    setStep('importing');

    try {
      const res = await fetch(`${API_BASE}/import-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: selectedFolder.id }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStep('folders');
        return;
      }

      const imported = data.notes || [];
      setImportedNotes(imported);
      setImportProgress({ current: imported.length, total: imported.length });

      // Check for duplicates
      const dupResults = new Map<string, DuplicateCheckResult>();
      for (let i = 0; i < imported.length; i++) {
        const note = imported[i];
        if (note.body) {
          const result = await checkDuplicate(note.body, materials);
          dupResults.set(note.id, result);
        }
      }
      setDuplicateResults(dupResults);

      setStep('review');
    } catch {
      setError('Failed to import folder');
      setStep('folders');
    }
  };

  const confirmImport = () => {
    // Filter out exact duplicates
    const toImport = importedNotes.filter(note => {
      const dup = duplicateResults.get(note.id);
      return !dup?.isDuplicate;
    });
    onImport(toImport);
  };

  const handleRemoveFromImport = (noteId: string) => {
    setImportedNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 'checking':
        return (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-echo-muted">Checking Apple Notes access...</p>
          </div>
        );

      case 'unavailable':
        return (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚫</div>
            <p className="text-echo-text font-medium mb-2">Apple Notes Unavailable</p>
            <p className="text-echo-muted text-sm mb-4">{error}</p>
            <p className="text-echo-hint text-xs">
              This feature requires macOS and permission to access Notes app.
            </p>
          </div>
        );

      case 'folders':
        return (
          <div className="space-y-4">
            {loadingNotes ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-echo-text font-medium">Loading notes...</p>
                <p className="text-echo-hint text-xs mt-2">This may take a moment for large folders</p>
              </div>
            ) : (
              <>
                <p className="text-echo-muted text-sm">Select a folder to import from:</p>

                {/* All Notes option */}
                <button
                  onClick={() => loadNotes(null)}
                  className="w-full p-4 border border-gray-200 rounded-xl text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="font-medium text-echo-text">All Notes</p>
                      <p className="text-echo-hint text-xs">Browse all notes across folders</p>
                    </div>
                  </div>
                </button>

                {/* Folder list */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
              {folders.map(folder => (
                <div key={folder.id} className="flex items-center gap-2">
                  <button
                    onClick={() => loadNotes(folder)}
                    className="flex-1 p-3 border border-gray-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>📁</span>
                        <span className="text-echo-text">{folder.name}</span>
                      </div>
                      <span className="text-echo-hint text-sm">{folder.noteCount} notes</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFolder(folder);
                      importFolder();
                    }}
                    className="px-3 py-3 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    Import All
                  </button>
                </div>
              ))}
            </div>

                {folders.length === 0 && (
                  <p className="text-echo-hint text-center py-4">No folders found</p>
                )}
              </>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('folders')}
                className="text-echo-muted text-sm hover:text-echo-text flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <p className="text-echo-muted text-sm">
                {selectedFolder ? selectedFolder.name : 'All Notes'}
              </p>
              <button
                onClick={selectAllNotes}
                className="text-blue-500 text-sm hover:text-blue-600"
              >
                {selectedNoteIds.size === notes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Notes list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notes.map(note => (
                <button
                  key={note.id}
                  onClick={() => toggleNoteSelection(note.id)}
                  className={`w-full p-3 border rounded-lg text-left transition-colors ${
                    selectedNoteIds.has(note.id)
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedNoteIds.has(note.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedNoteIds.has(note.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-echo-text truncate">{note.name}</p>
                      <p className="text-echo-hint text-xs line-clamp-2 mt-1">{note.snippet}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {notes.length === 0 && (
              <p className="text-echo-hint text-center py-4">No notes in this folder</p>
            )}

            {/* Import button */}
            {selectedNoteIds.size > 0 && (
              <button
                onClick={importSelectedNotes}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Import {selectedNoteIds.size} Note{selectedNoteIds.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
        );

      case 'importing':
        return (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-echo-text font-medium">Importing notes...</p>
            {importProgress && (
              <p className="text-echo-muted text-sm mt-2">
                {importProgress.current} / {importProgress.total}
              </p>
            )}
          </div>
        );

      case 'review':
        const duplicateCount = importedNotes.filter(n => duplicateResults.get(n.id)?.isDuplicate).length;
        const similarCount = importedNotes.filter(n => {
          const dup = duplicateResults.get(n.id);
          return dup?.isNearDuplicate && !dup.isDuplicate;
        }).length;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-echo-text font-medium">Review Import</p>
              <div className="flex items-center gap-2">
                {duplicateCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                    {duplicateCount} duplicates
                  </span>
                )}
                {similarCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                    {similarCount} similar
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {importedNotes.map(note => {
                const dup = duplicateResults.get(note.id);
                return (
                  <div
                    key={note.id}
                    className={`p-3 border rounded-lg ${
                      dup?.isDuplicate
                        ? 'border-yellow-300 bg-yellow-50/50'
                        : dup?.isNearDuplicate
                        ? 'border-orange-200 bg-orange-50/50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-echo-text truncate">{note.name}</p>
                        <p className="text-echo-hint text-xs line-clamp-2 mt-1">
                          {note.body.slice(0, 150)}...
                        </p>
                        {dup?.isDuplicate && (
                          <p className="text-yellow-600 text-xs mt-1">Exact duplicate - will be skipped</p>
                        )}
                        {dup?.isNearDuplicate && !dup.isDuplicate && (
                          <p className="text-orange-600 text-xs mt-1">
                            Similar to existing ({Math.round((dup.matches[0]?.similarity || 0) * 100)}% match)
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFromImport(note.id)}
                        className="text-echo-hint hover:text-red-500 p-1"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {importedNotes.length === 0 ? (
              <p className="text-echo-hint text-center py-4">No notes to import</p>
            ) : (
              <button
                onClick={confirmImport}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                Add {importedNotes.filter(n => !duplicateResults.get(n.id)?.isDuplicate).length} Note{importedNotes.filter(n => !duplicateResults.get(n.id)?.isDuplicate).length !== 1 ? 's' : ''} to Library
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍎</span>
            <h2 className="text-lg font-semibold text-echo-text">Import from Apple Notes</h2>
          </div>
          <button
            onClick={onClose}
            className="text-echo-hint hover:text-echo-muted"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && step !== 'unavailable' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
