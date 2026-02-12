import { useState } from 'react';
import { type RawMaterial } from '../../lib/store/materials';

interface CardData {
  emotionalAnchor: string;
  livedExperience: string;
  expressions: string[];
  invitation: string;
}

interface ChatContextPanelProps {
  card: CardData;
  sourceMaterials: RawMaterial[];
  onExpressionClick: (expr: string) => void;
}

export function ChatContextPanel({
  card,
  sourceMaterials,
  onExpressionClick,
}: ChatContextPanelProps) {
  const [showContext, setShowContext] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'card' | 'materials' | null>('card');
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);

  const hoveredMaterial = hoveredMaterialId
    ? sourceMaterials.find((m) => m.id === hoveredMaterialId)
    : null;

  return (
    <>
      {/* Context Toggle Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowContext(!showContext)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showContext
              ? 'bg-echo-text text-white'
              : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
          }`}
        >
          {showContext ? '▼ Context' : '▶ Show Context'}
        </button>
        {showContext && (
          <>
            <button
              onClick={() => setExpandedSection(expandedSection === 'card' ? null : 'card')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                expandedSection === 'card'
                  ? 'bg-gray-200 text-echo-text'
                  : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
              }`}
            >
              Activation Card
            </button>
            <button
              onClick={() => setExpandedSection(expandedSection === 'materials' ? null : 'materials')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                expandedSection === 'materials'
                  ? 'bg-gray-200 text-echo-text'
                  : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
              }`}
            >
              Raw Materials ({sourceMaterials.length})
            </button>
          </>
        )}
      </div>

      {/* Context Panel Content */}
      {showContext && (
        <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden">
          {expandedSection === 'card' && card.livedExperience && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Activation Card
              </p>
              <div className="border-l-2 border-echo-text bg-gray-50 p-3 mb-3">
                <p className="text-echo-text text-sm italic leading-relaxed">
                  {card.livedExperience}
                </p>
              </div>
              <div className="mb-3">
                <p className="text-echo-hint text-xs mb-2">Expressions you might use:</p>
                <div className="flex flex-wrap gap-2">
                  {card.expressions.map((expr, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-echo-muted text-xs rounded cursor-pointer hover:bg-gray-200"
                      onClick={() => onExpressionClick(expr)}
                    >
                      {expr}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-echo-text text-sm">{card.invitation}</p>
            </div>
          )}

          {expandedSection === 'materials' && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Your Raw Materials
              </p>
              <div className="space-y-2 relative">
                {sourceMaterials.map((material) => (
                  <div
                    key={material.id}
                    onMouseEnter={() => setHoveredMaterialId(material.id)}
                    onMouseLeave={() => setHoveredMaterialId(null)}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-echo-text text-sm line-clamp-2">{material.content}</p>
                    {material.note && (
                      <p className="text-echo-hint text-xs mt-1 italic">Note: {material.note}</p>
                    )}
                  </div>
                ))}
                {hoveredMaterial && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                      <p className="text-echo-hint text-xs uppercase tracking-wide mb-2">Full Content</p>
                      <p className="text-echo-text text-sm leading-relaxed whitespace-pre-wrap">
                        {hoveredMaterial.content}
                      </p>
                      {hoveredMaterial.note && (
                        <p className="text-echo-muted text-sm italic mt-2 pt-2 border-t border-gray-100">
                          Note: {hoveredMaterial.note}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {sourceMaterials.length === 0 && (
                <p className="text-echo-hint text-sm italic">No materials linked.</p>
              )}
            </div>
          )}

          {expandedSection === null && (
            <div className="p-3 text-center">
              <p className="text-echo-hint text-xs">
                Click "Activation Card" or "Raw Materials" above to view context
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
