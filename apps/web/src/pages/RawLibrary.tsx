import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddMaterialModal } from '../components/AddMaterialModal';
import { MaterialDetailModal } from '../components/MaterialDetailModal';
import { useMaterialsStore, type RawMaterial } from '../lib/store/materials';
import { clusterMaterials, type ClusterResult } from '../lib/clustering';
import { translateToEnglish } from '../lib/translation';

type ViewMode = 'list' | 'clusters';

export function RawLibrary() {
  const navigate = useNavigate();
  const { materials, addMaterial, updateMaterial, deleteMaterial, setMaterialTranslation } =
    useMaterialsStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);
  const [isClustering, setIsClustering] = useState(false);

  // Translation state
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [translateAllProgress, setTranslateAllProgress] = useState<{ current: number; total: number } | null>(null);

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

  const handleAddMaterial = (content: string, type: 'text' | 'image', note?: string) => {
    addMaterial(content, type, note);
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

  // Translate all materials without translations
  const handleTranslateAll = async () => {
    const needsTranslation = materials.filter((m) => !m.contentEn);
    if (needsTranslation.length === 0) return;

    setTranslateAllProgress({ current: 0, total: needsTranslation.length });

    for (let i = 0; i < needsTranslation.length; i++) {
      const material = needsTranslation[i];
      setTranslatingIds((prev) => new Set(prev).add(material.id));

      try {
        const result = await translateToEnglish(material.content);
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
      setTranslateAllProgress({ current: i + 1, total: needsTranslation.length });
    }

    setTranslateAllProgress(null);
  };

  const untranslatedCount = materials.filter((m) => !m.contentEn).length;

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-semibold text-echo-text mb-2">
          Your Raw Library
        </h1>
        <p className="text-echo-muted italic mb-4">
          These are things you once noticed.
        </p>
        <p className="text-echo-hint text-sm max-w-md mb-8">
          Start by adding your first material - a thought, a note, or a screenshot.
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
          />
        )}
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-echo-text">Raw Library</h1>
          <p className="text-echo-hint text-sm mt-1">
            {materials.length} {materials.length === 1 ? 'material' : 'materials'} · Click to view or edit
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Translate All Button */}
          {untranslatedCount > 0 && (
            <button
              onClick={handleTranslateAll}
              disabled={translateAllProgress !== null}
              className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {translateAllProgress
                ? `Translating ${translateAllProgress.current}/${translateAllProgress.total}...`
                : `Translate All (${untranslatedCount})`}
            </button>
          )}
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

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid gap-4">
          {materials.map((material) => (
            <div
              key={material.id}
              onClick={() => setSelectedMaterial(material)}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-50 cursor-pointer hover:shadow-md hover:border-gray-100 transition-all group"
            >
              <p className="text-echo-text leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                {material.content}
              </p>
              {/* English translation */}
              {material.contentEn && material.contentEn !== material.content && (
                <p className="text-blue-600 text-sm mt-2 leading-relaxed line-clamp-2 group-hover:line-clamp-none">
                  {material.contentEn}
                </p>
              )}
              {material.note && (
                <p className="text-echo-muted text-sm mt-2 italic">
                  Note: {material.note}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <p className="text-echo-hint text-xs">
                    {new Date(material.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {/* Translation status */}
                  {material.contentEn ? (
                    <span className="text-xs text-green-600">EN</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTranslate(material);
                      }}
                      disabled={translatingIds.has(material.id)}
                      className="text-xs text-blue-500 hover:text-blue-600 disabled:text-gray-400"
                    >
                      {translatingIds.has(material.id) ? 'Translating...' : 'Translate'}
                    </button>
                  )}
                </div>
                <span className="text-echo-hint text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cluster View */}
      {viewMode === 'clusters' && (
        <div className="space-y-6">
          {isClustering ? (
            <div className="text-center py-12">
              <p className="text-echo-muted">Analyzing your materials...</p>
            </div>
          ) : clusterResult && clusterResult.clusters.length > 0 ? (
            clusterResult.clusters.map((cluster) => (
              <div key={cluster.id} className="bg-white rounded-xl shadow-sm border border-gray-50 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-medium text-echo-text capitalize">
                    {cluster.label}
                  </h3>
                  <p className="text-echo-hint text-xs mt-0.5">
                    {cluster.materialIds.length} {cluster.materialIds.length === 1 ? 'material' : 'materials'}
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {cluster.materialIds.map((id) => {
                    const material = materials.find((m) => m.id === id);
                    if (!material) return null;
                    return (
                      <div
                        key={id}
                        onClick={() => setSelectedMaterial(material)}
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-echo-text text-sm leading-relaxed line-clamp-2">
                          {material.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
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
    </div>
  );
}
