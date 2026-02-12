import { type RawMaterial } from '../../lib/store/materials';

interface MaterialSelectionPhaseProps {
  topic: string;
  filteredMaterials: RawMaterial[];
  selectedMaterials: RawMaterial[];
  setSelectedMaterials: React.Dispatch<React.SetStateAction<RawMaterial[]>>;
  semanticResults: Array<{ id: string; score: number }>;
  isGenerating: boolean;
  onBack: () => void;
  onGenerateCard: () => void;
}

export function MaterialSelectionPhase({
  topic,
  filteredMaterials,
  selectedMaterials,
  setSelectedMaterials,
  semanticResults,
  isGenerating,
  onBack,
  onGenerateCard,
}: MaterialSelectionPhaseProps) {
  const toggleMaterial = (material: RawMaterial) => {
    const isSelected = selectedMaterials.some((m) => m.id === material.id);
    if (isSelected) {
      setSelectedMaterials((prev) => prev.filter((m) => m.id !== material.id));
    } else {
      setSelectedMaterials((prev) => [...prev, material]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-echo-text">
            Select Materials
          </h1>
          <p className="text-echo-hint text-sm mt-1">
            {topic && topic !== '(random exploration)'
              ? `Related to "${topic}"`
              : 'Random exploration'}
            {' · '}{selectedMaterials.length} selected
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-echo-hint hover:text-echo-muted text-sm"
        >
          ← Change topic
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {filteredMaterials.map((material) => {
          const isSelected = selectedMaterials.some((m) => m.id === material.id);
          const semanticScore = semanticResults.find((r) => r.id === material.id)?.score;
          return (
            <div
              key={material.id}
              onClick={() => toggleMaterial(material)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-echo-text text-white'
                  : 'bg-white border border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <p className={`text-sm leading-relaxed line-clamp-3 flex-1 ${
                  isSelected ? 'text-white' : 'text-echo-text'
                }`}>
                  {material.content}
                </p>
                {semanticScore !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-echo-hint'
                  }`}>
                    {Math.round(semanticScore * 100)}%
                  </span>
                )}
              </div>
              {material.note && (
                <p className={`text-xs mt-2 italic ${
                  isSelected ? 'text-white/70' : 'text-echo-hint'
                }`}>
                  Note: {material.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onGenerateCard}
        disabled={selectedMaterials.length === 0 || isGenerating}
        className="w-full bg-echo-text text-white py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
      >
        {isGenerating ? 'Generating Activation Card...' : `Generate from ${selectedMaterials.length} Materials`}
      </button>
    </div>
  );
}
