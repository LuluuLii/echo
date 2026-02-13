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

  // Ollama form state
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('');

  // WebLLM state
  const [webllmModel, setWebllmModel] = useState(DEFAULT_MODELS.webllm);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Active provider
  const [activeType, setActiveType] = useState<ActiveProviderType>('template');
  const [autoFallback, setAutoFallback] = useState(true);

  // Initialize
  useEffect(() => {
    async function init() {
      const service = await initializeLLMService();
      const cfg = service.getConfig();
      setConfig(cfg);
      setStatuses(service.getAllStatuses());
      setAutoFallback(cfg.autoFallback);

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
        setOllamaModel(cfg.providers.ollama.model || DEFAULT_MODELS.ollama);
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
      setCloudModel(providerConfig.model || DEFAULT_MODELS[selectedCloudProvider]);
      if ('baseUrl' in providerConfig) {
        setCloudBaseUrl(providerConfig.baseUrl || '');
      } else {
        setCloudBaseUrl('');
      }
    } else {
      setCloudApiKey('');
      setCloudBaseUrl('');
      setCloudModel(DEFAULT_MODELS[selectedCloudProvider]);
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
    service.updateConfig({ autoFallback });
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
      return <span className="text-green-600 text-sm">Connected</span>;
    }
    return <span className="text-red-500 text-sm">{result.error}</span>;
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
      <p className="text-echo-muted mb-8">Configure AI providers for activation cards and conversations.</p>

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
          <label className="block text-sm text-echo-muted mb-2">Model</label>
          <select
            value={cloudModel}
            onChange={(e) => setCloudModel(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {PROVIDER_INFO[selectedCloudProvider].models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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
          <label className="block text-sm text-echo-muted mb-2">Model</label>
          <select
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-echo-text text-echo-text bg-white"
          >
            {PROVIDER_INFO.ollama.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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
              : 'Download Model (~500MB)'}
        </button>

        <p className="text-echo-hint text-xs mt-3">
          Runs entirely in your browser using WebGPU. Requires a modern browser with WebGPU support.
        </p>
      </section>

      {/* Active Provider Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 mb-6">
        <h2 className="text-lg font-medium text-echo-text mb-4">Active Provider</h2>

        <div className="space-y-3 mb-4">
          {([
            { type: 'cloud', label: 'Cloud API', desc: `Use ${PROVIDER_INFO[selectedCloudProvider].name}` },
            { type: 'local', label: 'Local Server', desc: 'Use Ollama' },
            { type: 'edge', label: 'On-Device', desc: 'Use WebLLM (offline)' },
            { type: 'template', label: 'No AI', desc: 'Use template responses' },
          ] as const).map(({ type, label, desc }) => (
            <label
              key={type}
              className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${
                activeType === type
                  ? 'border-echo-text bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="activeProvider"
                value={type}
                checked={activeType === type}
                onChange={() => setActiveType(type)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-echo-text">{label}</div>
                <div className="text-sm text-echo-muted">{desc}</div>
              </div>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={autoFallback}
            onChange={(e) => setAutoFallback(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-echo-muted">
            Auto-fallback when primary provider is unavailable
          </span>
        </label>

        <button
          onClick={handleSaveActiveProvider}
          className="w-full bg-echo-text text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Save Settings
        </button>
      </section>

      {/* Info */}
      <p className="text-echo-hint text-sm text-center">
        Settings are saved locally in your browser.
      </p>
    </div>
  );
}
