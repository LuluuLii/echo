import { PROVIDER_INFO, DEFAULT_MODELS } from '../../lib/llm';

interface TestResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
}

interface OllamaSectionProps {
  url: string;
  setUrl: (url: string) => void;
  model: string;
  setModel: (model: string) => void;
  useCustomModel: boolean;
  setUseCustomModel: (value: boolean) => void;
  testing: string | null;
  testResult: TestResult | undefined;
  statusIcon: string;
  onTest: () => void;
}

export function OllamaSection({
  url,
  setUrl,
  model,
  setModel,
  useCustomModel,
  setUseCustomModel,
  testing,
  testResult,
  statusIcon,
  onTest,
}: OllamaSectionProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <h2 className="text-lg font-medium text-echo-text mb-4">
        {statusIcon} Local Server (Ollama)
      </h2>

      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">Server URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-echo-muted">Model</label>
          <label className="flex items-center gap-2 text-sm text-echo-hint cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomModel}
              onChange={(e) => {
                setUseCustomModel(e.target.checked);
                if (!e.target.checked) {
                  setModel(DEFAULT_MODELS.ollama);
                }
              }}
              className="w-3.5 h-3.5"
            />
            Custom model
          </label>
        </div>
        {useCustomModel ? (
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., llama3:8b, mistral:7b"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
          />
        ) : (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {PROVIDER_INFO.ollama.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onTest}
          disabled={testing === 'ollama'}
          className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {testing === 'ollama' ? 'Testing...' : 'Test Connection'}
        </button>
        {testResult?.success && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-sm font-medium">Connected</span>
            {testResult.latencyMs && (
              <span className="text-echo-hint text-xs">({testResult.latencyMs}ms)</span>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {testResult && !testResult.success && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium mb-1">Connection Failed</p>
          <p className="text-red-600 text-sm">{testResult.error}</p>
        </div>
      )}

      <p className="text-echo-hint text-xs mt-3">
        Run <code className="bg-gray-100 px-1 rounded">ollama serve</code> locally to use this option.
      </p>
    </section>
  );
}
