import { type RawMaterial, type ActivationCard } from '../../lib/store/materials';

interface ActivationReadyPhaseProps {
  topic: string;
  card: ActivationCard;
  selectedMaterials: RawMaterial[];
  isRegenerating: boolean;
  onBack: () => void;
  onRegenerate: () => void;
  onStartChat: () => void;
}

export function ActivationReadyPhase({
  topic,
  card,
  selectedMaterials,
  isRegenerating,
  onBack,
  onRegenerate,
  onStartChat,
}: ActivationReadyPhaseProps) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-echo-text">Ready to Express</h1>
          <p className="text-echo-hint text-sm mt-1">
            {topic && topic !== '(random exploration)' ? `Topic: "${topic}"` : 'Random exploration'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-echo-hint hover:text-echo-muted text-sm"
        >
          ← Change topic
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-echo-hint text-xs uppercase tracking-wide">Activation Card</p>
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-xs text-echo-muted hover:text-echo-text transition-colors disabled:opacity-50"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>

          <p className="text-echo-muted italic text-sm mb-4 leading-relaxed">
            {card.emotionalAnchor}
          </p>

          <div className="border-l-2 border-echo-text bg-gray-50 p-3 mb-4">
            <p className="text-echo-text italic text-sm leading-relaxed">
              {card.livedExperience}
            </p>
          </div>

          <div className="mb-4">
            <p className="text-echo-hint text-xs mb-2">Expressions to try:</p>
            <div className="space-y-1">
              {card.expressions.map((expr, index) => (
                <p key={index} className="text-echo-muted text-sm">
                  "{expr}"
                </p>
              ))}
            </div>
          </div>

          <p className="text-echo-text text-sm leading-relaxed">
            {card.invitation}
          </p>
        </div>

        {/* Related Materials */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
          <p className="text-echo-hint text-xs uppercase tracking-wide mb-4">
            Related Materials ({selectedMaterials.length})
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedMaterials.map((material) => (
              <div
                key={material.id}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <p className="text-echo-text text-sm leading-relaxed line-clamp-4">
                  {material.content}
                </p>
                {material.note && (
                  <p className="text-echo-hint text-xs mt-2 italic">
                    Note: {material.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="mt-6">
        <button
          onClick={onStartChat}
          className="w-full bg-echo-text text-white py-4 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Start Echo
        </button>
        <p className="text-echo-hint text-sm text-center mt-3 italic">
          This card will fade. The only way to keep it is to speak.
        </p>
      </div>
    </div>
  );
}
