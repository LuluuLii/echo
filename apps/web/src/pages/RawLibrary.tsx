import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddMaterialModal } from '../components/AddMaterialModal';
import { MaterialDetailModal } from '../components/MaterialDetailModal';
import { AppleNotesImporter } from '../components/AppleNotesImporter';
import { NotesSection, FilesSection, PendingImportsPanel, type PendingImport } from '../components/library';
import { useMaterialsStore, type RawMaterial } from '../lib/store/materials';
import { clusterMaterials, type ClusterResult } from '../lib/clustering';
import { translateToEnglish } from '../lib/translation';
import { checkDuplicate, smartSegment } from '../lib/deduplication';

type ViewMode = 'list' | 'clusters';

export function RawLibrary() {
  const navigate = useNavigate();
  const { materials, addMaterial, updateMaterial, deleteMaterial, setMaterialTranslation } =
    useMaterialsStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAppleNotesImporter, setShowAppleNotesImporter] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);
  const [isClustering, setIsClustering] = useState(false);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  // Translation state
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [translateAllProgress, setTranslateAllProgress] = useState<{ current: number; total: number } | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Quick import state (for paste/drop confirmation)
  const [pendingImports, setPendingImports] = useState<PendingImport[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Run clustering when switching to cluster view
  useEffect(() => {
    if (viewMode === 'clusters' && materials.length >= 3) {
      setIsClustering(true);
      clusterMaterials(materials.map((m) => ({ id: m.id, content: m.content })))
        .then(setClusterResult)
        .catch((error) => {
          console.error('Clustering failed:', error);
        })
        .finally(() => {
          setIsClustering(false);
        });
    }
  }, [viewMode, materials]);

  // Process incoming content (paste or drop)
  const processIncomingContent = useCallback(async (content: string, source: 'paste' | 'drop') => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Check for duplicates
    setIsCheckingDuplicates(true);
    try {
      // Smart segment if content is long
      const segments = smartSegment(trimmed);

      if (segments.length > 1) {
        // Multiple segments - add all as pending imports
        const pending: PendingImport[] = [];
        for (const segment of segments) {
          const result = await checkDuplicate(segment, materials);
          pending.push({ content: segment, source, duplicateResult: result });
        }
        setPendingImports(pending);
      } else {
        // Single segment
        const result = await checkDuplicate(trimmed, materials);
        setPendingImports([{ content: trimmed, source, duplicateResult: result }]);
      }
    } catch (error) {
      console.error('Failed to check duplicates:', error);
      // On error, still allow import without duplicate info
      setPendingImports([{ content: trimmed, source }]);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, [materials]);

  // Keyboard shortcuts (Cmd/Ctrl + V for paste)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl + V for quick paste (when not in an input/textarea)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const target = e.target as HTMLElement;
        const isInputElement = target.tagName === 'INPUT' ||
                               target.tagName === 'TEXTAREA' ||
                               target.isContentEditable;

        // Only intercept if not in an input field and no modal is open
        if (!isInputElement && !showAddModal && !selectedMaterial && pendingImports.length === 0) {
          e.preventDefault();
          try {
            const text = await navigator.clipboard.readText();
            if (text.trim()) {
              processIncomingContent(text, 'paste');
            }
          } catch (error) {
            // Clipboard access denied - user needs to use modal instead
            console.log('Clipboard access denied, opening modal');
            setShowAddModal(true);
          }
        }
      }

      // Cmd/Ctrl + N for new material
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, selectedMaterial, pendingImports.length, processIncomingContent]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    // Handle text drop
    const text = e.dataTransfer.getData('text/plain');
    if (text.trim()) {
      processIncomingContent(text, 'drop');
      return;
    }

    // Handle file drop
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const pending: PendingImport[] = [];

      for (const file of files) {
        if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          const content = await file.text();
          const segments = smartSegment(content);
          for (const segment of segments) {
            const result = await checkDuplicate(segment, materials);
            pending.push({ content: segment, source: 'drop', duplicateResult: result });
          }
        }
      }

      if (pending.length > 0) {
        setPendingImports(pending);
      }
    }
  }, [materials, processIncomingContent]);

  // Handle confirming pending imports
  const handleConfirmImport = (index: number) => {
    const item = pendingImports[index];
    if (item) {
      addMaterial(item.content, 'text');
      setPendingImports(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleConfirmAllImports = () => {
    const nonDuplicates = pendingImports.filter(p => !p.duplicateResult?.isDuplicate);
    for (const item of nonDuplicates) {
      addMaterial(item.content, 'text');
    }
    setPendingImports([]);
  };

  const handleDismissImport = (index: number) => {
    setPendingImports(prev => prev.filter((_, i) => i !== index));
  };

  const handleDismissAllImports = () => {
    setPendingImports([]);
  };

  const handleAddMaterial = (
    content: string,
    type: 'text' | 'file',
    note?: string,
    fileOptions?: {
      fileName?: string;
      fileType?: 'image' | 'pdf' | 'document';
      mimeType?: string;
      fileData?: string;
      fileThumbnail?: string;
    }
  ) => {
    addMaterial(content, type, note, fileOptions);
    setShowAddModal(false);
  };

  const handleUpdateMaterial = (id: string, content: string, note?: string) => {
    updateMaterial(id, content, note);
    setSelectedMaterial(null);
  };

  const handleDeleteMaterial = (id: string) => {
    deleteMaterial(id);
    setSelectedMaterial(null);
  };

  // Handle Apple Notes import
  const handleAppleNotesImport = (notes: { id: string; name: string; body: string; folder: string }[]) => {
    for (const note of notes) {
      if (note.body.trim()) {
        addMaterial(note.body.trim(), 'text', `Imported from Apple Notes: ${note.folder}/${note.name}`);
      }
    }
    setShowAppleNotesImporter(false);
  };

  const handleGoToActivation = () => {
    navigate('/');
  };

  // Translate a single material
  const handleTranslate = async (material: RawMaterial) => {
    if (translatingIds.has(material.id)) return;

    setTranslatingIds((prev) => new Set(prev).add(material.id));
    try {
      const result = await translateToEnglish(material.content);
      if (result.success && result.translation) {
        setMaterialTranslation(material.id, result.translation);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(material.id);
        return next;
      });
    }
  };

  // Re-translate a material (force new translation)
  const handleRetranslate = async (material: RawMaterial) => {
    if (translatingIds.has(material.id)) return;

    setTranslatingIds((prev) => new Set(prev).add(material.id));
    try {
      const result = await translateToEnglish(material.content, { force: true });
      if (result.success && result.translation) {
        setMaterialTranslation(material.id, result.translation);
      }
    } catch (error) {
      console.error('Re-translation failed:', error);
    } finally {
      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(material.id);
        return next;
      });
    }
  };

  // Get notes only (for translation)
  const getNotes = useCallback(() => {
    return materials.filter(m =>
      m.type === 'text' ||
      ((m.type as string) === 'image' && !m.fileData)
    );
  }, [materials]);

  // Get files only (for summarization)
  const getFiles = useCallback(() => {
    return materials.filter(m => m.type === 'file' && m.fileData);
  }, [materials]);

  // Translate all notes (or re-translate if all done)
  const handleTranslateAllNotes = async () => {
    const notes = getNotes();
    const needsTranslation = notes.filter((m) => !m.contentEn);
    // If all translated, re-translate all
    const toTranslate = needsTranslation.length > 0 ? needsTranslation : notes;
    if (toTranslate.length === 0) return;

    setTranslateAllProgress({ current: 0, total: toTranslate.length });

    for (let i = 0; i < toTranslate.length; i++) {
      const material = toTranslate[i];
      setTranslatingIds((prev) => new Set(prev).add(material.id));

      try {
        const result = await translateToEnglish(material.content, { force: needsTranslation.length === 0 });
        if (result.success && result.translation) {
          setMaterialTranslation(material.id, result.translation);
        }
      } catch (error) {
        console.error('Translation failed for', material.id, error);
      }

      setTranslatingIds((prev) => {
        const next = new Set(prev);
        next.delete(material.id);
        return next;
      });
      setTranslateAllProgress({ current: i + 1, total: toTranslate.length });
    }

    setTranslateAllProgress(null);
  };

  // Summarize state (for files)
  const [summarizeAllProgress, setSummarizeAllProgress] = useState<{ current: number; total: number } | null>(null);

  // Summarize all files (placeholder - needs API implementation)
  const handleSummarizeAllFiles = async () => {
    const files = getFiles();
    // For now, just show a message - actual implementation needs vision API
    console.log('Summarize all files:', files.length);
    // TODO: Implement file summarization with vision API
  };

  const untranslatedNotesCount = getNotes().filter((m) => !m.contentEn).length;
  const unsummarizedFilesCount = getFiles().filter((m) => !m.note).length;

  // Empty state with drag & drop support
  if (materials.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-400 z-40 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
              <p className="text-xl font-semibold text-blue-600 mb-2">Drop to add</p>
              <p className="text-echo-muted text-sm">Text or files (.md, .txt)</p>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-semibold text-echo-text mb-2">
          Your Raw Library
        </h1>
        <p className="text-echo-muted italic mb-4">
          These are things you once noticed.
        </p>
        <p className="text-echo-hint text-sm max-w-md mb-8">
          Start by adding your first material - a thought, a note, or a screenshot.
          <br />
          <span className="text-blue-500">Drag & drop or paste (Cmd+V) to quickly add.</span>
        </p>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-echo-text text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          + Add Material
        </button>

        {showAddModal && (
          <AddMaterialModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddMaterial}
            onOpenAppleNotes={() => {
              setShowAddModal(false);
              setShowAppleNotesImporter(true);
            }}
          />
        )}

        {showAppleNotesImporter && (
          <AppleNotesImporter
            onClose={() => setShowAppleNotesImporter(false)}
            onImport={handleAppleNotesImport}
          />
        )}

        {/* Pending imports panel */}
        {pendingImports.length > 0 && (
          <PendingImportsPanel
            imports={pendingImports}
            isChecking={isCheckingDuplicates}
            onConfirm={handleConfirmImport}
            onConfirmAll={handleConfirmAllImports}
            onDismiss={handleDismissImport}
            onDismissAll={handleDismissAllImports}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="pb-24 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-400 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <p className="text-xl font-semibold text-blue-600 mb-2">Drop to add</p>
            <p className="text-echo-muted text-sm">Text or files (.md, .txt)</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-echo-text">Raw Library</h1>
          <p className="text-echo-hint text-sm mt-1">
            {materials.length} {materials.length === 1 ? 'material' : 'materials'} · Click to view or edit
            <span className="text-blue-400 ml-2">· Cmd+V to paste · Drag to drop</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          {materials.length >= 3 && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-echo-text shadow-sm'
                    : 'text-echo-muted hover:text-echo-text'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('clusters')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'clusters'
                    ? 'bg-white text-echo-text shadow-sm'
                    : 'text-echo-muted hover:text-echo-text'
                }`}
              >
                Clusters
              </button>
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-echo-text text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* List View - Split into Notes and Files */}
      {viewMode === 'list' && (() => {
        // Separate notes and files
        // Notes: text type OR legacy image type without fileData (just OCR text)
        // Files: file type with fileData
        const notes = materials.filter(m =>
          m.type === 'text' ||
          ((m.type as string) === 'image' && !m.fileData)
        );
        const files = materials.filter(m =>
          m.type === 'file' && m.fileData
        );

        return (
          <div className="space-y-8">
            <NotesSection
              notes={notes}
              onSelectMaterial={setSelectedMaterial}
              onTranslateAll={handleTranslateAllNotes}
              untranslatedCount={untranslatedNotesCount}
              translateProgress={translateAllProgress}
            />
            <FilesSection
              files={files}
              onSelectMaterial={setSelectedMaterial}
              onImportClick={() => setShowAddModal(true)}
              onSummarizeAll={handleSummarizeAllFiles}
              unsummarizedCount={unsummarizedFilesCount}
              summarizeProgress={summarizeAllProgress}
            />
          </div>
        );
      })()}

      {/* Cluster View */}
      {viewMode === 'clusters' && (
        <div>
          {isClustering ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-echo-text border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-echo-muted">Analyzing your materials...</p>
            </div>
          ) : clusterResult && clusterResult.clusters.length > 0 ? (
            <>
              {/* Cluster Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {clusterResult.clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    onClick={() => setExpandedClusterId(cluster.id)}
                    className="bg-white rounded-xl shadow-sm border border-gray-50 cursor-pointer hover:shadow-md hover:border-gray-100 transition-all flex flex-col overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-echo-text capitalize line-clamp-1 flex-1">
                          {cluster.label}
                        </h3>
                        <span className="ml-2 px-2 py-0.5 bg-white text-echo-muted text-xs rounded-full flex-shrink-0">
                          {cluster.materialIds.length}
                        </span>
                      </div>
                    </div>
                    {/* Items */}
                    <div className="flex-1 divide-y divide-gray-100">
                      {cluster.materialIds.slice(0, 3).map((id) => {
                        const material = materials.find((m) => m.id === id);
                        if (!material) return null;
                        return (
                          <div key={id} className="px-4 py-3">
                            <p className="text-echo-text text-sm leading-relaxed line-clamp-3">
                              {material.content}
                            </p>
                          </div>
                        );
                      })}
                      {cluster.materialIds.length > 3 && (
                        <div className="px-4 py-2 text-center">
                          <p className="text-echo-hint text-xs">
                            +{cluster.materialIds.length - 3} more...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expanded Cluster Modal */}
              {expandedClusterId && (() => {
                const cluster = clusterResult.clusters.find(c => c.id === expandedClusterId);
                if (!cluster) return null;
                return (
                  <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
                    onClick={() => setExpandedClusterId(null)}
                  >
                    <div
                      className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                        <div>
                          <h2 className="font-semibold text-echo-text capitalize">{cluster.label}</h2>
                          <p className="text-echo-hint text-sm">
                            {cluster.materialIds.length} {cluster.materialIds.length === 1 ? 'material' : 'materials'}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedClusterId(null)}
                          className="text-echo-hint hover:text-echo-text transition-colors text-xl"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cluster.materialIds.map((id) => {
                          const material = materials.find((m) => m.id === id);
                          if (!material) return null;
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                setExpandedClusterId(null);
                                setSelectedMaterial(material);
                              }}
                              className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                              <p className="text-echo-text text-sm leading-relaxed">
                                {material.content}
                              </p>
                              {material.contentEn && material.contentEn !== material.content && (
                                <p className="text-blue-600 text-sm mt-2 pt-2 border-t border-gray-200">
                                  {material.contentEn}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                        <button
                          onClick={() => setExpandedClusterId(null)}
                          className="w-full py-2 text-echo-muted hover:text-echo-text text-sm transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-echo-muted">Add more materials to see clusters</p>
            </div>
          )}
        </div>
      )}

      {materials.length >= 2 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <button
            onClick={handleGoToActivation}
            className="bg-echo-text text-white px-8 py-4 rounded-xl font-medium shadow-lg hover:bg-gray-700 transition-colors"
          >
            Go to Today's Activation
          </button>
        </div>
      )}

      {showAddModal && (
        <AddMaterialModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMaterial}
          onOpenAppleNotes={() => {
            setShowAddModal(false);
            setShowAppleNotesImporter(true);
          }}
        />
      )}

      {showAppleNotesImporter && (
        <AppleNotesImporter
          onClose={() => setShowAppleNotesImporter(false)}
          onImport={handleAppleNotesImport}
        />
      )}

      {selectedMaterial && (
        <MaterialDetailModal
          material={selectedMaterial}
          materials={materials}
          onClose={() => setSelectedMaterial(null)}
          onUpdate={handleUpdateMaterial}
          onDelete={handleDeleteMaterial}
          onSelectMaterial={setSelectedMaterial}
        />
      )}

      {/* Pending imports panel */}
      {pendingImports.length > 0 && (
        <PendingImportsPanel
          imports={pendingImports}
          isChecking={isCheckingDuplicates}
          onConfirm={handleConfirmImport}
          onConfirmAll={handleConfirmAllImports}
          onDismiss={handleDismissImport}
          onDismissAll={handleDismissAllImports}
        />
      )}
    </div>
  );
}
