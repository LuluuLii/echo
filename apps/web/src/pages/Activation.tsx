import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore, type ActivationCard } from '../lib/store/materials';
import { generateActivationCard } from '../lib/activation-templates';
import { AddMaterialModal } from '../components/AddMaterialModal';

export function Activation() {
  const navigate = useNavigate();
  const { currentCard, materials, setCurrentCard, clearCurrentCard, addMaterial } = useMaterialsStore();
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState<ActivationCard | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Clear stale card on mount - always generate fresh from current materials
  useEffect(() => {
    clearCurrentCard();
  }, [clearCurrentCard]);

  // Auto-generate card if none exists and we have materials
  useEffect(() => {
    if (!currentCard && !generatedCard && materials.length > 0 && !isGenerating) {
      setIsGenerating(true);

      // Select random 2-4 materials for daily activation
      const shuffled = [...materials].sort(() => Math.random() - 0.5);
      const selectedCount = Math.min(Math.max(2, Math.floor(Math.random() * 3) + 2), materials.length);
      const selectedMaterials = shuffled.slice(0, selectedCount);

      generateActivationCard(
        selectedMaterials.map((m) => ({
          id: m.id,
          content: m.content,
          note: m.note,
        }))
      )
        .then((card) => {
          setGeneratedCard(card);
          setCurrentCard(card);
        })
        .catch((error) => {
          console.error('Failed to generate activation card:', error);
        })
        .finally(() => {
          setIsGenerating(false);
        });
    }
  }, [currentCard, generatedCard, materials, isGenerating, setCurrentCard]);

  // Use current card, generated card, or show loading/empty state
  const card = currentCard || generatedCard;

  // Get source materials for this card
  const sourceMaterials = card
    ? materials.filter((m) => card.materialIds.includes(m.id))
    : [];

  const handleStartEcho = () => {
    if (card) {
      navigate('/practice');
    }
  };

  const handleAddMaterial = (content: string, type: 'text' | 'image', note?: string) => {
    addMaterial(content, type, note);
    setShowAddModal(false);
  };

  const handleRegenerate = async () => {
    if (materials.length === 0) return;

    setIsGenerating(true);
    setGeneratedCard(null);

    // Select random 2-4 materials
    const shuffled = [...materials].sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(Math.max(2, Math.floor(Math.random() * 3) + 2), materials.length);
    const selectedMaterials = shuffled.slice(0, selectedCount);

    try {
      const newCard = await generateActivationCard(
        selectedMaterials.map((m) => ({
          id: m.id,
          content: m.content,
          note: m.note,
        }))
      );
      setGeneratedCard(newCard);
      setCurrentCard(newCard);
    } catch (error) {
      console.error('Failed to regenerate card:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const hoveredMaterial = hoveredMaterialId
    ? materials.find((m) => m.id === hoveredMaterialId)
    : null;

  // Loading state
  if (isGenerating) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center">
          <p className="text-echo-muted">Generating your activation card...</p>
        </div>
      </div>
    );
  }

  // Empty state - no materials
  if (materials.length === 0) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 text-center">
          <h2 className="text-xl font-semibold text-echo-text mb-2">
            Ready to express yourself?
          </h2>
          <p className="text-echo-muted mb-6">
            Add your first material to start receiving personalized activation cards.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-echo-text text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            + Add Your First Material
          </button>
        </div>

        {showAddModal && (
          <AddMaterialModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddMaterial}
          />
        )}
      </div>
    );
  }

  // No card generated yet (shouldn't happen normally)
  if (!card) {
    return null;
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 relative">
        {/* Emotional Anchor */}
        <p className="text-echo-muted italic text-sm mb-6 leading-relaxed">
          {card.emotionalAnchor}
        </p>

        {/* Lived Experience */}
        <div className="border-l-2 border-echo-text bg-gray-50 p-4 mb-8">
          <p className="text-echo-text italic leading-relaxed">
            {card.livedExperience}
          </p>
        </div>

        {/* Expressions */}
        <div className="mb-8">
          <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
            Expressions to carry the feeling:
          </p>
          <div className="space-y-2">
            {card.expressions.map((expr, index) => (
              <p key={index} className="text-echo-muted text-sm">
                "{expr}"
              </p>
            ))}
          </div>
        </div>

        {/* Invitation */}
        <p className="text-echo-text leading-relaxed mb-8">
          {card.invitation}
        </p>

        {/* Source Materials */}
        {sourceMaterials.length > 0 && (
          <div className="mb-8 pt-6 border-t border-gray-100">
            <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
              Generated from {sourceMaterials.length} of your materials:
            </p>
            <div className="flex flex-wrap gap-2">
              {sourceMaterials.map((material) => (
                <div
                  key={material.id}
                  onMouseEnter={() => setHoveredMaterialId(material.id)}
                  onMouseLeave={() => setHoveredMaterialId(null)}
                  className="relative"
                >
                  <span className="inline-block px-3 py-1 bg-gray-100 text-echo-muted text-sm rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
                    {material.content.slice(0, 30)}
                    {material.content.length > 30 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleStartEcho}
          className="w-full bg-echo-text text-white py-4 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Start Echo
        </button>

        {/* Hover Preview */}
        {hoveredMaterial && (
          <div className="absolute left-0 right-0 -bottom-4 transform translate-y-full z-10">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 mx-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-2">
                Original Material
              </p>
              <p className="text-echo-text text-sm leading-relaxed">
                {hoveredMaterial.content}
              </p>
              {hoveredMaterial.note && (
                <p className="text-echo-muted text-sm italic mt-2">
                  Note: {hoveredMaterial.note}
                </p>
              )}
              <p className="text-echo-hint text-xs mt-2">
                {new Date(hoveredMaterial.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 space-y-4">
        <p className="text-echo-hint text-sm italic text-center">
          This card will fade. The only way to keep it is to speak.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleRegenerate}
            className="text-echo-hint hover:text-echo-muted text-sm underline"
          >
            New card
          </button>
          <span className="text-echo-hint">·</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-echo-hint hover:text-echo-muted text-sm underline"
          >
            + Add material
          </button>
        </div>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <AddMaterialModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMaterial}
        />
      )}
    </div>
  );
}
