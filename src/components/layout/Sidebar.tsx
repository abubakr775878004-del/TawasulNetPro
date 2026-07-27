import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  Server,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/constants';
import type { User } from '@/types';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  Server,
  Settings,
};

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user: User;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ currentPage, onNavigate, user, collapsed = false, onToggle }: SidebarProps) => {
  const visibleItems = user.role === 'admin'
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => !['resellers', 'settings', 'mikrotik'].includes(item.id));

  return (
    <aside
      className={cn(
        'fixed top-16 bottom-12 right-0 z-30 flex flex-col transition-all duration-300 border-l border-border/50',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ background: 'hsl(217 45% 11%)' }}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-6 w-6 h-6 bg-sky-500/20 border border-sky-500/30 rounded-full flex items-center justify-center text-sky-400 hover:bg-sky-500/30 transition-colors"
      >
        <ChevronLeft size={12} className={cn('transition-transform', collapsed ? 'rotate-180' : '')} />
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {!collapsed && (
          <p className="text-gray-600 text-xs uppercase tracking-widest px-4 mb-3 font-medium">القائمة الرئيسية</p>
        )}

        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center rounded-lg transition-all duration-200 group',
                  collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                  isActive
                    ? 'text-sky-400 bg-sky-500/10 border-r-[3px] border-sky-500'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-r-[3px] border-transparent'
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {collapsed && (
                  <div className="absolute right-16 bg-gray-800 border border-border text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User role badge */}
      {!collapsed && (
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/3 border border-border/50">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <div>
              <p className="text-white text-xs font-medium">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.role === 'admin' ? 'مدير النظام' : 'موزع'}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
