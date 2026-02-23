import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Activation } from './pages/Activation';
import { Session } from './pages/Session';
import { Insights } from './pages/Insights';
import { RawLibrary } from './pages/RawLibrary';
import { Sessions } from './pages/Sessions';
import { Settings } from './pages/Settings';
import { useMaterialsStore } from './lib/store/materials';
import { useUserStore } from './lib/store/user';
import { useVocabularyStore } from './lib/store/vocabulary';
import { initializeLLMService } from './lib/llm';

function App() {
  const { init, initialized, loading } = useMaterialsStore();
  const { init: initUser } = useUserStore();
  const { init: initVocabulary } = useVocabularyStore();

  useEffect(() => {
    init();
    // Initialize user store after materials (depends on Loro being ready)
    initUser();
    // Initialize vocabulary store
    initVocabulary();
    // Initialize LLM service in parallel (doesn't block app)
    initializeLLMService().then(() => {
      console.log('[LLM] Service initialized');
    });
  }, [init, initUser, initVocabulary]);

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
          <Route path="practice" element={<Session />} />
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
