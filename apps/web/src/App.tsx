import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RawLibrary } from './pages/RawLibrary';
import { Activation } from './pages/Activation';
import { Session } from './pages/Session';

function App() {
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
