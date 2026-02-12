import { type ActivationCard } from '../../lib/store/materials';

interface ActivationPreviewPhaseProps {
  card: ActivationCard;
  onBack: () => void;
  onStartChat: () => void;
}

export function ActivationPreviewPhase({
  card,
  onBack,
  onStartChat,
}: ActivationPreviewPhaseProps) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-echo-text">
          Your Activation Card
        </h1>
        <button
          onClick={onBack}
          className="text-echo-hint hover:text-echo-muted text-sm"
        >
          ← Regenerate
        </button>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-50 mb-6">
        <p className="text-echo-muted italic text-sm mb-6 leading-relaxed">
          {card.emotionalAnchor}
        </p>

        <div className="border-l-2 border-echo-text bg-gray-50 p-4 mb-8">
          <p className="text-echo-text italic leading-relaxed">
            {card.livedExperience}
          </p>
        </div>

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

        <p className="text-echo-text leading-relaxed mb-8">
          {card.invitation}
        </p>

        <button
          onClick={onStartChat}
          className="w-full bg-echo-text text-white py-4 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Start Echo
        </button>
      </div>

      <p className="text-echo-hint text-sm text-center italic">
        This card will fade. The only way to keep it is to speak.
      </p>
    </div>
  );
}
