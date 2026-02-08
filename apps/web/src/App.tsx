import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RawLibrary } from './pages/RawLibrary';
import { Activation } from './pages/Activation';
import { Session } from './pages/Session';
import { useMaterialsStore } from './lib/store/materials';

function App() {
  const { init, initialized, loading } = useMaterialsStore();

  useEffect(() => {
    init();
  }, [init]);

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
          <Route index element={<RawLibrary />} />
          <Route path="activation" element={<Activation />} />
          <Route path="session" element={<Session />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
