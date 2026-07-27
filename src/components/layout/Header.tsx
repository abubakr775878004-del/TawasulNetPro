import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { APP_NAME } from '@/constants';
import type { User as UserType } from '@/types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
}

const Header = ({ user, onLogout }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 right-0 left-0 z-40 h-16 flex items-center justify-between px-6 border-b border-border/50"
      style={{ background: 'hsl(0 0% 6% / 0.95)', backdropFilter: 'blur(10px)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <span className="text-sky-400 font-bold text-sm">T</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">{APP_NAME}</span>
        <span className="badge-blue hidden sm:flex">نظام إدارة القروض</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <User size={14} className="text-sky-400" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium leading-none">{user.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {user.role === 'admin' ? 'مدير النظام' : 'موزع'}
              </p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-2 w-48 card-bg rounded-xl border border-border shadow-xl animate-fade-in z-50">
              <div className="p-3 border-b border-border">
                <p className="text-white text-sm font-medium">{user.name}</p>
                <p className="text-gray-500 text-xs">{user.email}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                >
                  <LogOut size={14} />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
