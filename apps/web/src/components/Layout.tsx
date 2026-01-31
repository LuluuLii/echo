import { Outlet, Link, useLocation } from 'react-router-dom';

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-echo-bg">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-echo-text">
            Echo
          </Link>
          <nav className="flex gap-4">
            <NavLink to="/" current={location.pathname === '/'}>
              Library
            </NavLink>
            <NavLink to="/activation" current={location.pathname === '/activation'}>
              Activation
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>
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
