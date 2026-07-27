import { useState } from 'react';
import { Toaster } from 'sonner';
import { initStorage } from '@/lib/storage';
import { getAuth } from '@/lib/auth';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import PackagesPage from '@/pages/PackagesPage';
import LoansPage from '@/pages/LoansPage';
import ResellersPage from '@/pages/ResellersPage';
import MikroTikPage from '@/pages/MikroTikPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFound from '@/pages/NotFound';
import MainLayout from '@/components/layout/MainLayout';
import type { User } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap: seed localStorage with default packages / users / settings
// ─────────────────────────────────────────────────────────────────────────────
initStorage();

// ─────────────────────────────────────────────────────────────────────────────
// Route map
//
// Each entry maps a page ID (used throughout the UI) to:
//   • component  — the React page component to render
//   • adminOnly  — when true, non-admin users are redirected to NotFound
// ─────────────────────────────────────────────────────────────────────────────
type PageId = 'dashboard' | 'packages' | 'loans' | 'resellers' | 'mikrotik' | 'settings';

interface RouteConfig {
  component: (props: { user: User; onNavigate?: (page: string) => void }) => JSX.Element;
  adminOnly?: boolean;
}

const ROUTES: Record<PageId, RouteConfig> = {
  dashboard:  { component: ({ user, onNavigate }) => <DashboardPage user={user} onNavigate={onNavigate!} /> },
  packages:   { component: ({ user }) => <PackagesPage user={user} /> },
  loans:      { component: ({ user }) => <LoansPage user={user} /> },
  resellers:  { component: ({ user }) => <ResellersPage user={user} />, adminOnly: true },
  mikrotik:   { component: () => <MikroTikPage />,  adminOnly: true },
  settings:   { component: () => <SettingsPage />,  adminOnly: true },
};

// ─────────────────────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState<User | null>(() => {
    const auth = getAuth();
    return auth.isAuthenticated ? auth.user : null;
  });

  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('tawasulnet_auth');
    setUser(null);
  };

  // ── Page renderer ──────────────────────────────────────────────────────────
  const renderPage = () => {
    if (!user) return null;

    const route = ROUTES[currentPage];

    // Unknown page ID → 404
    if (!route) {
      return <NotFound onNavigate={(p) => setCurrentPage(p as PageId)} />;
    }

    // Admin-only pages: redirect non-admins to 404
    if (route.adminOnly && user.role !== 'admin') {
      return <NotFound onNavigate={(p) => setCurrentPage(p as PageId)} />;
    }

    return route.component({ user, onNavigate: (p) => setCurrentPage(p as PageId) });
  };

  // ── Unauthenticated view ───────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-center" richColors theme="dark" />
      </>
    );
  }

  // ── Authenticated view ─────────────────────────────────────────────────────
  return (
    <>
      <MainLayout
        user={user}
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p as PageId)}
        onLogout={handleLogout}
      >
        {renderPage()}
      </MainLayout>
      <Toaster position="top-center" richColors theme="dark" />
    </>
  );
}

export default App;
