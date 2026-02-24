import { useState, useEffect, useMemo } from 'react';
import { useMaterialsStore, type RawMaterial } from '../../lib/store/materials';
import { useVocabularyStore } from '../../lib/store/vocabulary';

interface CardData {
  emotionalAnchor: string;
  livedExperience: string;
  expressions: string[];
  invitation: string;
}

interface VocabSuggestion {
  term: string;
  passiveCount: number;
  lastSeen: number;
  exampleContext: string;
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
  const [expandedSection, setExpandedSection] = useState<'card' | 'materials' | 'vocab' | 'artifacts' | null>('card');
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);
  const [vocabSuggestions, setVocabSuggestions] = useState<VocabSuggestion[]>([]);

  const { artifacts } = useMaterialsStore();
  const { getRecommendedToActivate, init, initialized } = useVocabularyStore();

  // Get relevant artifacts (those that share materials with current session, or recent ones)
  const relevantArtifacts = useMemo(() => {
    const materialIds = new Set(sourceMaterials.map((m) => m.id));

    // First, find artifacts that share materials
    const related = artifacts.filter((a) =>
      a.materialIds.some((id) => materialIds.has(id))
    );

    // If we have related artifacts, show them; otherwise show recent ones
    if (related.length > 0) {
      return related.slice(0, 5);
    }

    // Show most recent 5 artifacts
    return [...artifacts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [artifacts, sourceMaterials]);

  // Load vocabulary suggestions
  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [initialized, init]);

  useEffect(() => {
    if (initialized) {
      const suggestions = getRecommendedToActivate(5);
      setVocabSuggestions(suggestions);
    }
  }, [initialized, getRecommendedToActivate]);

  const hoveredMaterial = hoveredMaterialId
    ? sourceMaterials.find((m) => m.id === hoveredMaterialId)
    : null;

  return (
    <div className="mb-3">
      {/* Context Toggle Buttons - Top Bar */}
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
            {vocabSuggestions.length > 0 && (
              <button
                onClick={() => setExpandedSection(expandedSection === 'vocab' ? null : 'vocab')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  expandedSection === 'vocab'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
                }`}
              >
                Try These ({vocabSuggestions.length})
              </button>
            )}
            {relevantArtifacts.length > 0 && (
              <button
                onClick={() => setExpandedSection(expandedSection === 'artifacts' ? null : 'artifacts')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  expandedSection === 'artifacts'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
                }`}
              >
                Past Expressions ({relevantArtifacts.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* Context Panel Content - Below Buttons */}
      {showContext && (
        <div className="bg-white rounded-xl border border-gray-100 mt-3 overflow-hidden">
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
                    {/* Show English translation inline */}
                    {material.contentEn && material.contentEn !== material.content && (
                      <p className="text-blue-600 text-xs mt-1 line-clamp-2">{material.contentEn}</p>
                    )}
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
                      {/* English translation in hover popup */}
                      {hoveredMaterial.contentEn && hoveredMaterial.contentEn !== hoveredMaterial.content && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-echo-hint text-xs uppercase tracking-wide mb-1">English</p>
                          <p className="text-blue-600 text-sm leading-relaxed">
                            {hoveredMaterial.contentEn}
                          </p>
                        </div>
                      )}
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

          {expandedSection === 'vocab' && vocabSuggestions.length > 0 && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Words to Try
              </p>
              <p className="text-echo-muted text-xs mb-3">
                You've seen these words but haven't used them yet. Try incorporating them in your expression!
              </p>
              <div className="space-y-2">
                {vocabSuggestions.map((vocab) => (
                  <div
                    key={vocab.term}
                    className="p-3 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => onExpressionClick(vocab.term)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-echo-text text-sm font-medium">{vocab.term}</span>
                      <span className="text-echo-hint text-xs">
                        seen {vocab.passiveCount}x
                      </span>
                    </div>
                    {vocab.exampleContext && (
                      <p className="text-echo-muted text-xs line-clamp-2 italic">
                        "{vocab.exampleContext}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedSection === 'artifacts' && relevantArtifacts.length > 0 && (
            <div className="p-4">
              <p className="text-echo-hint text-xs uppercase tracking-wide mb-3">
                Your Past Expressions
              </p>
              <p className="text-echo-muted text-xs mb-3">
                Draw inspiration from what you've expressed before.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {relevantArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <p className="text-echo-text text-sm line-clamp-3 leading-relaxed">
                      {artifact.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-echo-hint text-xs">
                      {artifact.anchor && (
                        <span className="italic truncate max-w-[150px]">{artifact.anchor}</span>
                      )}
                      <span>
                        {new Date(artifact.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedSection === null && (
            <div className="p-3 text-center">
              <p className="text-echo-hint text-xs">
                Click a tab above to view context
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
