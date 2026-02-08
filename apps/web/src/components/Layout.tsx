import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { SyncPanel } from './SyncPanel';

export function Layout() {
  const location = useLocation();
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-echo-bg">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-echo-text">
            Echo
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4">
              <NavLink to="/" current={location.pathname === '/'}>
                Library
              </NavLink>
              <NavLink to="/activation" current={location.pathname === '/activation'}>
                Today
              </NavLink>
              <NavLink to="/session" current={location.pathname === '/session'}>
                Practice
              </NavLink>
            </nav>
            <button
              onClick={() => setSyncPanelOpen(true)}
              className="p-2 text-echo-hint hover:text-echo-muted transition-colors"
              title="Sync Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Sync Panel */}
      <SyncPanel open={syncPanelOpen} onClose={() => setSyncPanelOpen(false)} />
    </div>
  );
}

function NavLink({
  to,
  current,
  children,
}: {
  to: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors ${
        current
          ? 'text-echo-text'
          : 'text-echo-hint hover:text-echo-muted'
      }`}
    >
      {children}
    </Link>
  );
}
