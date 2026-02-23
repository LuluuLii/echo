type ActiveProviderType = 'cloud' | 'local' | 'edge' | 'template';

interface ActiveProviderSectionProps {
  activeType: ActiveProviderType;
  setActiveType: (type: ActiveProviderType) => void;
  autoFallback: boolean;
  setAutoFallback: (value: boolean) => void;
  onSave: () => void;
}

export function ActiveProviderSection({
  activeType,
  setActiveType,
  autoFallback,
  setAutoFallback,
  onSave,
}: ActiveProviderSectionProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-echo-text">Active Provider</h2>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-echo-text text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Save
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {([
          { type: 'cloud', label: 'Cloud API', icon: '☁️' },
          { type: 'local', label: 'Ollama', icon: '🖥️' },
          { type: 'edge', label: 'On-Device', icon: '📱' },
          { type: 'template', label: 'No AI', icon: '📝' },
        ] as const).map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
              activeType === type
                ? 'border-echo-text bg-gray-50 text-echo-text'
                : 'border-gray-200 text-echo-muted hover:border-gray-300'
            }`}
          >
            <span>{icon}</span>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-echo-muted">
        <input
          type="checkbox"
          checked={autoFallback}
          onChange={(e) => setAutoFallback(e.target.checked)}
          className="w-4 h-4"
        />
        Auto-fallback when provider unavailable
      </label>
    </section>
  );
}
