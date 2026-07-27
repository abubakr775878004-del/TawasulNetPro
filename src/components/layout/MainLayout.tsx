import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface MainLayoutProps {
  user: User;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const MainLayout = ({ user, currentPage, onNavigate, onLogout, children }: MainLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} />
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main
        className={cn(
          'transition-all duration-300 pt-16 pb-12 min-h-screen',
          collapsed ? 'pr-16' : 'pr-64'
        )}
      >
        <div className="p-6 max-w-[1400px] animate-fade-in">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
