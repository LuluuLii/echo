import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Activation } from './pages/Activation';
import { Session } from './pages/Session';
import { CreativeStudio } from './pages/CreativeStudio';
import { Insights } from './pages/Insights';
import { RawLibrary } from './pages/RawLibrary';
import { Sessions } from './pages/Sessions';
import { Settings } from './pages/Settings';
import { useMaterialsStore } from './lib/store/materials';
import { useUserStore } from './lib/store/user';
import { useVocabularyStore } from './lib/store/vocabulary';
import { useProjectsStore } from './lib/store/projects';
import { initializeLLMService } from './lib/llm';
import { enableAutoSync, setupBeforeUnloadSync } from './lib/icloud';

function App() {
  const { init, initialized, loading } = useMaterialsStore();
  const { init: initUser } = useUserStore();
  const { init: initVocabulary } = useVocabularyStore();
  const { init: initProjects } = useProjectsStore();

  useEffect(() => {
    init();
    // Initialize user store after materials (depends on Loro being ready)
    initUser();
    // Initialize vocabulary store
    initVocabulary();
    // Initialize projects store
    initProjects();
    // Initialize LLM service in parallel (doesn't block app)
    initializeLLMService().then(() => {
      console.log('[LLM] Service initialized');
    });

    // Enable iCloud auto-sync (every 5 minutes)
    enableAutoSync(5 * 60 * 1000);

    // Setup beforeunload sync
    setupBeforeUnloadSync();
  }, [init, initUser, initVocabulary, initProjects]);

  if (loading) {
    return (
      <div className="min-h-screen bg-echo-bg flex items-center justify-center">
        <div className="text-echo-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!initialized) {
    return null;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Activation />} />
          <Route path="studio" element={<CreativeStudio />} />
          <Route path="session" element={<Session />} />
          <Route path="insights" element={<Insights />} />
          <Route path="library" element={<RawLibrary />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
