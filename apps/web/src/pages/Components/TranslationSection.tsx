interface TranslationSectionProps {
  provider: string;
  setProvider: (provider: string) => void;
  onSave: () => void;
}

export function TranslationSection({
  provider,
  setProvider,
  onSave,
}: TranslationSectionProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-echo-text">Translation</h2>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-echo-text text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Save
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">
          Translation Provider
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
        >
          <option value="active">Use Active Provider</option>
          <optgroup label="Cloud Providers">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
          </optgroup>
          <optgroup label="Local">
            <option value="ollama">Ollama</option>
            <option value="webllm">On-Device (WebLLM)</option>
          </optgroup>
        </select>
        <p className="text-echo-hint text-xs mt-2">
          Choose which provider to use for translating materials to English.
          {provider !== 'active' && (
            <span className="text-amber-600">
              {' '}Make sure this provider is configured and ready.
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
