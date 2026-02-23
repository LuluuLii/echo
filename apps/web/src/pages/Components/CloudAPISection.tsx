import { PROVIDER_INFO, DEFAULT_MODELS } from '../../lib/llm';

type CloudProvider = 'openai' | 'anthropic' | 'gemini';

interface TestResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
}

interface CloudAPISectionProps {
  selectedProvider: CloudProvider;
  setSelectedProvider: (provider: CloudProvider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  model: string;
  setModel: (model: string) => void;
  useCustomModel: boolean;
  setUseCustomModel: (value: boolean) => void;
  testing: string | null;
  testResults: Record<string, TestResult>;
  getStatusIcon: (providerId: string) => string;
  onTest: () => void;
}

export function CloudAPISection({
  selectedProvider,
  setSelectedProvider,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  model,
  setModel,
  useCustomModel,
  setUseCustomModel,
  testing,
  testResults,
  getStatusIcon,
  onTest,
}: CloudAPISectionProps) {
  const result = testResults[selectedProvider];

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
      <h2 className="text-lg font-medium text-echo-text mb-4">Cloud API</h2>

      {/* Provider selector */}
      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">Provider</label>
        <div className="flex gap-2">
          {(['openai', 'anthropic', 'gemini'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedProvider === p
                  ? 'bg-echo-text text-white'
                  : 'bg-gray-100 text-echo-muted hover:bg-gray-200'
              }`}
            >
              {getStatusIcon(p)} {PROVIDER_INFO[p].name}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm text-echo-muted mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`Enter your ${PROVIDER_INFO[selectedProvider].name} API key`}
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
        />
      </div>

      {/* Model selector */}
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
                  setModel(DEFAULT_MODELS[selectedProvider]);
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
            placeholder="e.g., anthropic/claude-3.5-sonnet, openai/gpt-4o"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
          />
        ) : (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {PROVIDER_INFO[selectedProvider].models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
        {useCustomModel && selectedProvider === 'openai' && (
          <p className="text-echo-hint text-xs mt-2">
            For OpenRouter, use format like <code className="bg-gray-100 px-1 rounded">anthropic/claude-3.5-sonnet</code>
          </p>
        )}
      </div>

      {/* Base URL (OpenAI only) */}
      {selectedProvider === 'openai' && (
        <div className="mb-4">
          <label className="block text-sm text-echo-muted mb-2">
            Base URL <span className="text-echo-hint">(optional, for proxies)</span>
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
          />
        </div>
      )}

      {/* Test button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onTest}
          disabled={!apiKey || testing === selectedProvider}
          className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {testing === selectedProvider ? 'Testing...' : 'Test Connection'}
        </button>
        {result?.success && (
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-sm font-medium">Connected</span>
            {result.latencyMs && (
              <span className="text-echo-hint text-xs">({result.latencyMs}ms)</span>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {result && !result.success && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium mb-1">Connection Failed</p>
          <p className="text-red-600 text-sm">{result.error}</p>
        </div>
      )}

      {/* Help text for CORS */}
      {selectedProvider === 'openai' && result?.error?.includes('CORS') && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-xs font-medium mb-1">Browser Access (CORS)</p>
          <p className="text-blue-700 text-xs">
            This service doesn't allow direct browser access. Try these CORS-enabled alternatives:
          </p>
          <ul className="text-blue-700 text-xs mt-1 ml-4 list-disc">
            <li><a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline">OpenRouter</a> - Base URL: <code className="bg-blue-100 px-1 rounded">https://openrouter.ai/api/v1</code></li>
            <li><a href="https://api.together.xyz" target="_blank" rel="noopener noreferrer" className="underline">Together AI</a> - Base URL: <code className="bg-blue-100 px-1 rounded">https://api.together.xyz/v1</code></li>
          </ul>
        </div>
      )}
    </section>
  );
}
