import { useState, useEffect } from 'react';
import type { RawMaterial } from '../lib/store/materials';
import { findSimilarMaterials } from '../lib/embedding';
import { translateToEnglish } from '../lib/translation';
import { useMaterialsStore } from '../lib/store/materials';

interface MaterialDetailModalProps {
  material: RawMaterial;
  materials: RawMaterial[]; // All materials for similarity search
  onClose: () => void;
  onUpdate: (id: string, content: string, note?: string) => void;
  onDelete: (id: string) => void;
  onSelectMaterial?: (material: RawMaterial) => void; // Navigate to similar material
}

export function MaterialDetailModal({
  material,
  materials,
  onClose,
  onUpdate,
  onDelete,
  onSelectMaterial,
}: MaterialDetailModalProps) {
  const { setMaterialTranslation } = useMaterialsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(material.content);
  const [note, setNote] = useState(material.note || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [similarMaterials, setSimilarMaterials] = useState<Array<{ material: RawMaterial; score: number }>>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Handle translation
  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const result = await translateToEnglish(material.content);
      if (result.success && result.translation) {
        setMaterialTranslation(material.id, result.translation);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Fetch similar materials
  useEffect(() => {
    if (materials.length <= 1) return;

    setLoadingSimilar(true);
    findSimilarMaterials(
      material.id,
      materials.map((m) => ({ id: m.id, content: m.content })),
      5
    )
      .then((results) => {
        const similar = results
          .filter((r) => r.score > 0.3) // Only show if similarity > 30%
          .map((r) => ({
            material: materials.find((m) => m.id === r.id)!,
            score: r.score,
          }))
          .filter((r) => r.material); // Filter out any undefined
        setSimilarMaterials(similar);
      })
      .catch((error) => {
        console.warn('Failed to find similar materials:', error);
      })
      .finally(() => {
        setLoadingSimilar(false);
      });
  }, [material.id, materials]);

  const handleSave = () => {
    onUpdate(material.id, content, note || undefined);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(material.id);
  };

  const handleCancel = () => {
    setContent(material.content);
    setNote(material.note || '');
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-echo-text">
              {isEditing ? 'Edit Material' : 'Material Detail'}
            </h2>
            <p className="text-echo-hint text-sm mt-1">
              {new Date(material.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-echo-hint hover:text-echo-muted transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-echo-muted text-sm mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-echo-text text-echo-text leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-echo-muted text-sm mb-2">
                  Personal Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note to help you remember the context..."
                  className="w-full h-24 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-echo-text text-echo-text"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Original content */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-echo-text leading-relaxed whitespace-pre-wrap">
                  {material.content}
                </p>
              </div>

              {/* English translation */}
              {material.contentEn && material.contentEn !== material.content ? (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-echo-hint text-xs uppercase tracking-wide mb-2">
                    English Translation
                  </p>
                  <p className="text-blue-700 leading-relaxed whitespace-pre-wrap">
                    {material.contentEn}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-500 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {isTranslating ? 'Translating...' : 'Translate to English'}
                </button>
              )}

              {material.note && (
                <div className="border-l-2 border-echo-accent pl-4">
                  <p className="text-echo-hint text-xs uppercase tracking-wide mb-1">
                    Your Note
                  </p>
                  <p className="text-echo-muted italic">{material.note}</p>
                </div>
              )}

              {/* Similar Materials */}
              {!isEditing && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                    Similar Materials
                  </p>
                  {loadingSimilar ? (
                    <p className="text-echo-muted text-sm">Finding similar materials...</p>
                  ) : similarMaterials.length > 0 ? (
                    <div className="space-y-2">
                      {similarMaterials.map(({ material: sim, score }) => (
                        <button
                          key={sim.id}
                          onClick={() => onSelectMaterial?.(sim)}
                          className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                        >
                          <p className="text-echo-text text-sm line-clamp-2 group-hover:text-echo-accent">
                            {sim.content}
                          </p>
                          <p className="text-echo-hint text-xs mt-1">
                            {Math.round(score * 100)}% similar
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-echo-muted text-sm italic">
                      No similar materials found
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          {showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <p className="text-red-600 text-sm">
                Are you sure you want to delete this material?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-echo-muted hover:text-echo-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-echo-muted hover:text-echo-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-echo-text text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="flex justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-echo-text text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
