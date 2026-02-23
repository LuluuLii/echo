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
import {
  isFileSystemAccessSupported,
  getICloudStatus,
  getLastSyncTime,
  connectToICloud,
  disconnectFromICloud,
  syncToICloud,
  restoreFromICloud,
  mergeFromICloud,
  enableAutoSync,
  disableAutoSync,
  isAutoSyncEnabled,
  requestPermission,
} from '../lib/icloud';
import { useMaterialsStore } from '../lib/store/materials';
import { useUserStore, type ProficiencyLevel } from '../lib/store/user';
import {
  LearningProfileSection,
  ActiveProviderSection,
  CloudAPISection,
  OllamaSection,
  WebLLMSection,
  TranslationSection,
  ICloudSyncSection,
} from './Components';

type CloudProvider = 'openai' | 'anthropic' | 'gemini';
type ActiveProviderType = 'cloud' | 'local' | 'edge' | 'template';

export function Settings() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [statuses, setStatuses] = useState<Map<string, ProviderStatus>>(new Map());
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string; latencyMs?: number }>>({});

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
  const [webllmModel, setWebllmModel] = useState<string>(DEFAULT_MODELS.webllm);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Active provider
  const [activeType, setActiveType] = useState<ActiveProviderType>('template');
  const [autoFallback, setAutoFallback] = useState(true);

  // Translation provider setting
  const [translationProvider, setTranslationProvider] = useState<string>('active');

  // iCloud sync state
  const [icloudSupported] = useState(isFileSystemAccessSupported());
  const [icloudConnected, setIcloudConnected] = useState(false);
  const [icloudFolderName, setIcloudFolderName] = useState<string | null>(null);
  const [icloudHasPermission, setIcloudHasPermission] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(isAutoSyncEnabled());

  const { reload: reloadStore } = useMaterialsStore();
  const {
    profile,
    learningState,
    hasProfile,
    createProfile,
    updateLearningSettings,
    updatePreferences,
  } = useUserStore();

  // Profile form state
  const [profileTargetLanguage, setProfileTargetLanguage] = useState('en');
  const [profileNativeLanguage, setProfileNativeLanguage] = useState('zh');
  const [profileProficiencyLevel, setProfileProficiencyLevel] = useState<ProficiencyLevel>('B1');
  const [profileTopics, setProfileTopics] = useState('');
  const [profileGoals, setProfileGoals] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

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
        const isOllamaCustom = !(PROVIDER_INFO.ollama.models as readonly string[]).includes(savedOllamaModel);
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

    // Load profile if exists
    if (profile) {
      setProfileTargetLanguage(profile.learning.targetLanguage);
      setProfileNativeLanguage(profile.learning.nativeLanguage);
      setProfileProficiencyLevel(profile.learning.proficiencyLevel);
      setProfileTopics(profile.preferences.topics?.join(', ') || '');
      setProfileGoals(profile.preferences.learningGoals?.join(', ') || '');
    }

    // Load iCloud status
    async function loadICloudStatus() {
      const status = await getICloudStatus();
      setIcloudConnected(status.connected);
      setIcloudFolderName(status.name || null);
      setIcloudHasPermission(status.hasPermission);

      const lastSync = await getLastSyncTime();
      setLastSyncTime(lastSync);
    }
    loadICloudStatus();
  }, []);

  // Load cloud provider config when switching
  useEffect(() => {
    if (!config) return;
    const providerConfig = config.providers[selectedCloudProvider];
    if (providerConfig && 'apiKey' in providerConfig) {
      setCloudApiKey(providerConfig.apiKey || '');
      const savedModel = providerConfig.model || DEFAULT_MODELS[selectedCloudProvider];
      setCloudModel(savedModel);
      const isCustom = !(PROVIDER_INFO[selectedCloudProvider].models as readonly string[]).includes(savedModel);
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

  // ============ Handlers ============

  const handleTestCloud = async () => {
    setTesting(selectedCloudProvider);
    const service = getLLMService();

    const providerConfig = selectedCloudProvider === 'openai'
      ? { apiKey: cloudApiKey, baseUrl: cloudBaseUrl || undefined, model: cloudModel }
      : { apiKey: cloudApiKey, model: cloudModel };

    await service.configureProvider(selectedCloudProvider, providerConfig);

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

  // iCloud handlers
  const handleConnectICloud = async () => {
    setSyncError(null);
    const result = await connectToICloud();
    if (result.success) {
      setIcloudConnected(true);
      setIcloudFolderName(result.name || null);
      setIcloudHasPermission(true);
      setSyncSuccess('Connected to iCloud folder');
      setTimeout(() => setSyncSuccess(null), 3000);
    } else if (result.error && result.error !== 'User cancelled') {
      setSyncError(result.error);
    }
  };

  const handleDisconnectICloud = async () => {
    await disconnectFromICloud();
    setIcloudConnected(false);
    setIcloudFolderName(null);
    setIcloudHasPermission(false);
    setLastSyncTime(null);
    disableAutoSync();
    setAutoSyncEnabled(false);
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setIcloudHasPermission(granted);
    if (!granted) {
      setSyncError('Permission denied. Please reconnect.');
    }
  };

  const handleSyncToICloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    const result = await syncToICloud();
    setIsSyncing(false);

    if (result.success) {
      setLastSyncTime(Date.now());
      setSyncSuccess('Pushed to iCloud');
      setTimeout(() => setSyncSuccess(null), 3000);
    } else {
      setSyncError(result.error || 'Sync failed');
    }
  };

  const handleRestoreFromICloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    const result = await restoreFromICloud();
    setIsSyncing(false);

    if (result.success) {
      setLastSyncTime(Date.now());
      reloadStore();
      setSyncSuccess('Restored from iCloud');
      setTimeout(() => setSyncSuccess(null), 3000);
    } else {
      setSyncError(result.error || 'Restore failed');
    }
  };

  const handleMergeFromICloud = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    const result = await mergeFromICloud();
    setIsSyncing(false);

    if (result.success) {
      setLastSyncTime(Date.now());
      reloadStore();
      const msg = result.newMaterials && result.newMaterials > 0
        ? `Synced (${result.newMaterials} new materials)`
        : 'Synced successfully';
      setSyncSuccess(msg);
      setTimeout(() => setSyncSuccess(null), 3000);
    } else {
      setSyncError(result.error || 'Sync failed');
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    if (enabled) {
      enableAutoSync();
    } else {
      disableAutoSync();
    }
    setAutoSyncEnabled(enabled);
  };

  const handleSaveProfile = () => {
    const learning = {
      targetLanguage: profileTargetLanguage,
      nativeLanguage: profileNativeLanguage,
      proficiencyLevel: profileProficiencyLevel,
    };

    const preferences = {
      topics: profileTopics.split(',').map(t => t.trim()).filter(Boolean),
      learningGoals: profileGoals.split(',').map(g => g.trim()).filter(Boolean),
    };

    if (hasProfile()) {
      updateLearningSettings(learning);
      updatePreferences(preferences);
    } else {
      createProfile(learning, preferences);
    }

    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const getStatusIcon = (providerId: string) => {
    const status = statuses.get(providerId);
    if (!status) return '⚪';
    if (status.ready) return '✅';
    if (status.error) return '❌';
    return '⚪';
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
      <p className="text-echo-muted mb-6">Configure your learning profile and AI providers.</p>

      <LearningProfileSection
        learningState={learningState}
        targetLanguage={profileTargetLanguage}
        setTargetLanguage={setProfileTargetLanguage}
        nativeLanguage={profileNativeLanguage}
        setNativeLanguage={setProfileNativeLanguage}
        proficiencyLevel={profileProficiencyLevel}
        setProficiencyLevel={setProfileProficiencyLevel}
        topics={profileTopics}
        setTopics={setProfileTopics}
        goals={profileGoals}
        setGoals={setProfileGoals}
        saved={profileSaved}
        onSave={handleSaveProfile}
      />

      <ActiveProviderSection
        activeType={activeType}
        setActiveType={setActiveType}
        autoFallback={autoFallback}
        setAutoFallback={setAutoFallback}
        onSave={handleSaveActiveProvider}
      />

      <CloudAPISection
        selectedProvider={selectedCloudProvider}
        setSelectedProvider={setSelectedCloudProvider}
        apiKey={cloudApiKey}
        setApiKey={setCloudApiKey}
        baseUrl={cloudBaseUrl}
        setBaseUrl={setCloudBaseUrl}
        model={cloudModel}
        setModel={setCloudModel}
        useCustomModel={useCustomModel}
        setUseCustomModel={setUseCustomModel}
        testing={testing}
        testResults={testResults}
        getStatusIcon={getStatusIcon}
        onTest={handleTestCloud}
      />

      <OllamaSection
        url={ollamaUrl}
        setUrl={setOllamaUrl}
        model={ollamaModel}
        setModel={setOllamaModel}
        useCustomModel={useCustomOllamaModel}
        setUseCustomModel={setUseCustomOllamaModel}
        testing={testing}
        testResult={testResults.ollama}
        statusIcon={getStatusIcon('ollama')}
        onTest={handleTestOllama}
      />

      <WebLLMSection
        model={webllmModel}
        setModel={setWebllmModel}
        downloadProgress={downloadProgress}
        downloadStatus={downloadStatus}
        isDownloading={isDownloading}
        statusIcon={getStatusIcon('webllm')}
        onDownload={handleDownloadWebLLM}
      />

      <TranslationSection
        provider={translationProvider}
        setProvider={setTranslationProvider}
        onSave={handleSaveTranslationProvider}
      />

      <ICloudSyncSection
        supported={icloudSupported}
        connected={icloudConnected}
        folderName={icloudFolderName}
        hasPermission={icloudHasPermission}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        syncError={syncError}
        syncSuccess={syncSuccess}
        autoSyncEnabled={autoSyncEnabled}
        onConnect={handleConnectICloud}
        onDisconnect={handleDisconnectICloud}
        onRequestPermission={handleRequestPermission}
        onSyncNow={handleMergeFromICloud}
        onPushToICloud={handleSyncToICloud}
        onRestoreFromICloud={handleRestoreFromICloud}
        onToggleAutoSync={handleToggleAutoSync}
      />

      <p className="text-echo-hint text-sm text-center">
        Settings are saved locally in your browser.
      </p>
    </div>
  );
}
