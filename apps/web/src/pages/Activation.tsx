import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaterialsStore } from '../lib/store/materials';

export function Activation() {
  const navigate = useNavigate();
  const { currentCard, materials, setCurrentCard } = useMaterialsStore();
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);

  // Get source materials for this card
  const sourceMaterials = currentCard
    ? materials.filter((m) => currentCard.materialIds.includes(m.id))
    : materials;

  // Fallback card for demo
  const card = currentCard || {
    id: 'demo',
    emotionalAnchor:
      'A moment you became aware of how emotions show up in the body.',
    livedExperience:
      'When I get tense in the water, everything reacts immediately. My shoulders tighten, my legs slow down... Slowing down for just a few seconds somehow resets everything.',
    expressions: [
      'Any tension shows up immediately in the body.',
      'Slowing down helps me regain control.',
      'The body reacts faster than the mind.',
    ],
    invitation:
      'If you were explaining this to someone — not as a swimmer, but as a person — what would you say?',
    materialIds: [],
    createdAt: Date.now(),
  };

  const handleStartEcho = () => {
    // Ensure the card is in the store before navigating
    if (!currentCard) {
      setCurrentCard(card);
    }
    navigate('/session');
  };

  const hoveredMaterial = hoveredMaterialId
    ? materials.find((m) => m.id === hoveredMaterialId)
    : null;

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

      <p className="text-echo-hint text-sm text-center mt-6 italic">
        This card will fade. The only way to keep it is to speak.
      </p>
    </div>
  );
}
