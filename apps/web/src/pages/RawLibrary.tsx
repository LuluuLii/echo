import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddMaterialModal } from '../components/AddMaterialModal';
import { MaterialDetailModal } from '../components/MaterialDetailModal';
import { useMaterialsStore, type RawMaterial } from '../lib/store/materials';

export function RawLibrary() {
  const navigate = useNavigate();
  const { materials, addMaterial, updateMaterial, deleteMaterial, setCurrentCard } =
    useMaterialsStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerateActivation = async () => {
    if (materials.length < 2) return;

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:3000/api/activation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialIds: materials.map((m) => m.id),
          materials: materials.map((m) => ({
            id: m.id,
            content: m.content,
            note: m.note,
          })),
        }),
      });

      const card = await response.json();
      setCurrentCard(card);
      navigate('/activation');
    } catch (error) {
      console.error('Failed to generate activation card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

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
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-echo-text text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          + Add
        </button>
      </div>

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
            {material.note && (
              <p className="text-echo-muted text-sm mt-2 italic">
                Note: {material.note}
              </p>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <p className="text-echo-hint text-xs">
                {new Date(material.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <span className="text-echo-hint text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Click to view full content →
              </span>
            </div>
          </div>
        ))}
      </div>

      {materials.length >= 2 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <button
            onClick={handleGenerateActivation}
            disabled={isGenerating}
            className="bg-echo-text text-white px-8 py-4 rounded-xl font-medium shadow-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Activation Card'}
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
          onClose={() => setSelectedMaterial(null)}
          onUpdate={handleUpdateMaterial}
          onDelete={handleDeleteMaterial}
        />
      )}
    </div>
  );
}
