import { useState, useEffect } from 'react';
import {
  getLLMService,
  initializeLLMService,
  type LLMConfig,
  type ProviderStatus,
  PROVIDER_INFO,
  DEFAULT_MODELS,
} from '../lib/llm';
import { WebLLMProvider } from '../lib/llm/providers/webllm';

type CloudProvider = 'openai' | 'anthropic' | 'gemini';
type ActiveProviderType = 'cloud' | 'local' | 'edge' | 'template';

export function Settings() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [statuses, setStatuses] = useState<Map<string, ProviderStatus>>(new Map());
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  // Cloud provider form state
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<CloudProvider>('openai');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudBaseUrl, setCloudBaseUrl] = useState('');
  const [cloudModel, setCloudModel] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);

  // Ollama form state
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('');
  const [useCustomOllamaModel, setUseCustomOllamaModel] = useState(false);

  // WebLLM state
  const [webllmModel, setWebllmModel] = useState(DEFAULT_MODELS.webllm);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Active provider
  const [activeType, setActiveType] = useState<ActiveProviderType>('template');
  const [autoFallback, setAutoFallback] = useState(true);

  // Translation provider setting
  const [translationProvider, setTranslationProvider] = useState<'active' | string>('active');

  // Initialize
  useEffect(() => {
    async function init() {
      const service = await initializeLLMService();
      const cfg = service.getConfig();
      setConfig(cfg);
      setStatuses(service.getAllStatuses());
      setAutoFallback(cfg.autoFallback);
      setTranslationProvider(cfg.translationProvider || 'active');

      // Determine active type
      const active = cfg.activeProvider;
      if (['openai', 'anthropic', 'gemini'].includes(active)) {
        setActiveType('cloud');
        setSelectedCloudProvider(active as CloudProvider);
      } else if (active === 'ollama') {
        setActiveType('local');
      } else if (active === 'webllm') {
        setActiveType('edge');
      } else {
        setActiveType('template');
      }

      // Load saved configs
      if (cfg.providers.openai) {
        setCloudApiKey(cfg.providers.openai.apiKey || '');
        setCloudBaseUrl(cfg.providers.openai.baseUrl || '');
        setCloudModel(cfg.providers.openai.model || DEFAULT_MODELS.openai);
      }
      if (cfg.providers.ollama) {
        setOllamaUrl(cfg.providers.ollama.baseUrl || 'http://localhost:11434');
        const savedOllamaModel = cfg.providers.ollama.model || DEFAULT_MODELS.ollama;
        setOllamaModel(savedOllamaModel);
        const isOllamaCustom = !PROVIDER_INFO.ollama.models.includes(savedOllamaModel);
        setUseCustomOllamaModel(isOllamaCustom);
      }
      if (cfg.providers.webllm) {
        setWebllmModel(cfg.providers.webllm.model || DEFAULT_MODELS.webllm);
      }

      // Check WebLLM status
      const webllmProvider = service.getProvider('webllm') as WebLLMProvider | undefined;
      if (webllmProvider) {
        const status = webllmProvider.getStatus();
        if (status.downloadStatus === 'ready') {
          setDownloadProgress(100);
        }
      }
    }
    init();
  }, []);

  // Load cloud provider config when switching
  useEffect(() => {
    if (!config) return;
    const providerConfig = config.providers[selectedCloudProvider];
    if (providerConfig && 'apiKey' in providerConfig) {
      setCloudApiKey(providerConfig.apiKey || '');
      const savedModel = providerConfig.model || DEFAULT_MODELS[selectedCloudProvider];
      setCloudModel(savedModel);
      // Check if the saved model is a custom one (not in the predefined list)
      const isCustom = !PROVIDER_INFO[selectedCloudProvider].models.includes(savedModel);
      setUseCustomModel(isCustom);
      if ('baseUrl' in providerConfig) {
        setCloudBaseUrl(providerConfig.baseUrl || '');
      } else {
        setCloudBaseUrl('');
      }
    } else {
      setCloudApiKey('');
      setCloudBaseUrl('');
      setCloudModel(DEFAULT_MODELS[selectedCloudProvider]);
      setUseCustomModel(false);
    }
  }, [selectedCloudProvider, config]);

  const handleTestCloud = async () => {
    setTesting(selectedCloudProvider);
    const service = getLLMService();

    // Save config first
    const providerConfig = selectedCloudProvider === 'openai'
      ? { apiKey: cloudApiKey, baseUrl: cloudBaseUrl || undefined, model: cloudModel }
      : { apiKey: cloudApiKey, model: cloudModel };

    await service.configureProvider(selectedCloudProvider, providerConfig);

    // Test connection
    const result = await service.testConnection(selectedCloudProvider);
    setTestResults((prev) => ({ ...prev, [selectedCloudProvider]: result }));
    setStatuses(service.getAllStatuses());
    setConfig(service.getConfig());
    setTesting(null);
  };

  const handleTestOllama = async () => {
    setTesting('ollama');
    const service = getLLMService();

    await service.configureProvider('ollama', {
      baseUrl: ollamaUrl,
      model: ollamaModel || DEFAULT_MODELS.ollama,
    });

    const result = await service.testConnection('ollama');
    setTestResults((prev) => ({ ...prev, ollama: result }));
    setStatuses(service.getAllStatuses());
    setConfig(service.getConfig());
    setTesting(null);
  };

  const handleDownloadWebLLM = async () => {
    setIsDownloading(true);
    setDownloadStatus('Initializing...');
    setDownloadProgress(0);

    const service = getLLMService();
    const webllmProvider = service.getProvider('webllm') as WebLLMProvider | undefined;

    if (!webllmProvider) {
      setDownloadStatus('Error: WebLLM provider not found');
      setIsDownloading(false);
      return;
    }

    // Set progress callback
    webllmProvider.onProgressUpdate = (progress, status) => {
      setDownloadProgress(progress);
      setDownloadStatus(status);
    };

    try {
      await service.configureProvider('webllm', { model: webllmModel });
      await webllmProvider.downloadModel();
      setDownloadStatus('Ready');
      setStatuses(service.getAllStatuses());
      setConfig(service.getConfig());
    } catch (e) {
      setDownloadStatus(`Error: ${e instanceof Error ? e.message : 'Download failed'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveActiveProvider = async () => {
    const service = getLLMService();

    let providerId: string;
    if (activeType === 'cloud') {
      providerId = selectedCloudProvider;
    } else if (activeType === 'local') {
      providerId = 'ollama';
    } else if (activeType === 'edge') {
      providerId = 'webllm';
    } else {
      providerId = 'template';
    }

    await service.setActiveProvider(providerId);
    service.updateConfig({ autoFallback, translationProvider });
    setConfig(service.getConfig());
  };

  const handleSaveTranslationProvider = () => {
    const service = getLLMService();
    service.updateConfig({ translationProvider });
    setConfig(service.getConfig());
  };

  const getStatusIcon = (providerId: string) => {
    const status = statuses.get(providerId);
    if (!status) return '⚪';
    if (status.ready) return '✅';
    if (status.error) return '❌';
    return '⚪';
  };

  const getTestResultDisplay = (providerId: string) => {
    const result = testResults[providerId];
    if (!result) return null;
    if (result.success) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-sm font-medium">Connected</span>
          {result.latencyMs && (
            <span className="text-echo-hint text-xs">({result.latencyMs}ms)</span>
          )}
        </div>
      );
    }
    return null; // Error will be shown in a separate block
  };

  const getTestErrorDisplay = (providerId: string) => {
    const result = testResults[providerId];
    if (!result || result.success) return null;
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 text-sm font-medium mb-1">Connection Failed</p>
        <p className="text-red-600 text-sm">{result.error}</p>
      </div>
    );
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-echo-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-echo-text mb-2">Settings</h1>
      <p className="text-echo-muted mb-6">Configure AI providers for activation cards and conversations.</p>

      {/* Active Provider Section - At Top */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-echo-text">Active Provider</h2>
          <button
            onClick={handleSaveActiveProvider}
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

      {/* Cloud API Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <h2 className="text-lg font-medium text-echo-text mb-4">Cloud API</h2>

        {/* Provider selector */}
        <div className="mb-4">
          <label className="block text-sm text-echo-muted mb-2">Provider</label>
          <div className="flex gap-2">
            {(['openai', 'anthropic', 'gemini'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedCloudProvider(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCloudProvider === p
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
            value={cloudApiKey}
            onChange={(e) => setCloudApiKey(e.target.value)}
            placeholder={`Enter your ${PROVIDER_INFO[selectedCloudProvider].name} API key`}
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
                    setCloudModel(DEFAULT_MODELS[selectedCloudProvider]);
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
              value={cloudModel}
              onChange={(e) => setCloudModel(e.target.value)}
              placeholder="e.g., anthropic/claude-3.5-sonnet, openai/gpt-4o"
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
            />
          ) : (
            <select
              value={cloudModel}
              onChange={(e) => setCloudModel(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
            >
              {PROVIDER_INFO[selectedCloudProvider].models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          {useCustomModel && selectedCloudProvider === 'openai' && (
            <p className="text-echo-hint text-xs mt-2">
              For OpenRouter, use format like <code className="bg-gray-100 px-1 rounded">anthropic/claude-3.5-sonnet</code>
            </p>
          )}
        </div>

        {/* Base URL (OpenAI only) */}
        {selectedCloudProvider === 'openai' && (
          <div className="mb-4">
            <label className="block text-sm text-echo-muted mb-2">
              Base URL <span className="text-echo-hint">(optional, for proxies)</span>
            </label>
            <input
              type="text"
              value={cloudBaseUrl}
              onChange={(e) => setCloudBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
            />
          </div>
        )}

        {/* Test button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleTestCloud}
            disabled={!cloudApiKey || testing === selectedCloudProvider}
            className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {testing === selectedCloudProvider ? 'Testing...' : 'Test Connection'}
          </button>
          {getTestResultDisplay(selectedCloudProvider)}
        </div>

        {/* Error display */}
        {getTestErrorDisplay(selectedCloudProvider)}

        {/* Help text for CORS - only show when there's a CORS-related error */}
        {selectedCloudProvider === 'openai' &&
         testResults[selectedCloudProvider]?.error?.includes('CORS') && (
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

      {/* Local Server Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <h2 className="text-lg font-medium text-echo-text mb-4">
          {getStatusIcon('ollama')} Local Server (Ollama)
        </h2>

        <div className="mb-4">
          <label className="block text-sm text-echo-muted mb-2">Server URL</label>
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
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
                checked={useCustomOllamaModel}
                onChange={(e) => {
                  setUseCustomOllamaModel(e.target.checked);
                  if (!e.target.checked) {
                    setOllamaModel(DEFAULT_MODELS.ollama);
                  }
                }}
                className="w-3.5 h-3.5"
              />
              Custom model
            </label>
          </div>
          {useCustomOllamaModel ? (
            <input
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder="e.g., llama3:8b, mistral:7b"
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text"
            />
          ) : (
            <select
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
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
            onClick={handleTestOllama}
            disabled={testing === 'ollama'}
            className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {testing === 'ollama' ? 'Testing...' : 'Test Connection'}
          </button>
          {getTestResultDisplay('ollama')}
        </div>

        {/* Error display */}
        {getTestErrorDisplay('ollama')}

        <p className="text-echo-hint text-xs mt-3">
          Run <code className="bg-gray-100 px-1 rounded">ollama serve</code> locally to use this option.
        </p>
      </section>

      {/* On-Device Model Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <h2 className="text-lg font-medium text-echo-text mb-4">
          {getStatusIcon('webllm')} On-Device Model (WebLLM)
        </h2>

        <div className="mb-4">
          <label className="block text-sm text-echo-muted mb-2">Model</label>
          <select
            value={webllmModel}
            onChange={(e) => setWebllmModel(e.target.value)}
            disabled={isDownloading}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {PROVIDER_INFO.webllm.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Download progress */}
        {(isDownloading || downloadProgress > 0) && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-echo-muted">{downloadStatus}</span>
              <span className="text-echo-text">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-echo-text h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleDownloadWebLLM}
          disabled={isDownloading || downloadProgress === 100}
          className="px-4 py-2 bg-gray-100 text-echo-text rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {downloadProgress === 100
            ? 'Downloaded'
            : isDownloading
              ? 'Downloading...'
              : `Download Model (${webllmModel.includes('SmolLM2') ? '~250MB' : '~400MB'})`}
        </button>

        <p className="text-echo-hint text-xs mt-3">
          Runs entirely in your browser using WebGPU. Requires a modern browser with WebGPU support.
        </p>
      </section>

      {/* Translation Settings */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-echo-text">Translation</h2>
          <button
            onClick={handleSaveTranslationProvider}
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
            value={translationProvider}
            onChange={(e) => setTranslationProvider(e.target.value)}
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
            {translationProvider !== 'active' && (
              <span className="text-amber-600">
                {' '}Make sure this provider is configured and ready.
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Info */}
      <p className="text-echo-hint text-sm text-center">
        Settings are saved locally in your browser.
      </p>
    </div>
  );
}
