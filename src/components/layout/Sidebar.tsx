import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Bug, CheckSquare,
  BarChart3, Settings, ChevronLeft, ChevronRight, Code2,
} from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { useBugStore } from '@/stores/bugStore';
import { ROLE_LABELS } from '@/types';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',  icon: FolderOpen,      label: 'Projects' },
  { to: '/bugs',      icon: Bug,             label: 'Bug Tracker' },
  { to: '/verify',    icon: CheckSquare,     label: 'Verify Queue', badge: true },
  { to: '/reports',   icon: BarChart3,       label: 'Reports' },
  { to: '/admin',     icon: Settings,        label: 'Admin', roles: ['admin', 'manager'] },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { currentUser } = useUserStore();
  const { getPendingVerificationCount } = useBugStore();
  const navigate = useNavigate();
  const pendingQA = getPendingVerificationCount();

  return (
    <aside
      className={clsx(
        'flex flex-col bg-bg-card border-r border-bg-border transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-bg-border',
        sidebarCollapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0 shadow-glow-brand">
          <Code2 size={16} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="text-sm font-bold text-text-primary leading-none">QA Platform</div>
            <div className="text-[10px] text-text-muted mt-0.5 leading-none">Software QA Tracker</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          if (item.roles && currentUser && !item.roles.includes(currentUser.role)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx('nav-item relative', isActive && 'active', sidebarCollapsed && 'justify-center')
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
              {item.badge && pendingQA > 0 && (
                <span className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white leading-none',
                  sidebarCollapsed && 'absolute top-1 right-1 w-4 h-4 flex items-center justify-center p-0'
                )}>
                  {pendingQA}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info */}
      {currentUser && (
        <div className={clsx(
          'border-t border-bg-border p-3 flex items-center gap-3 cursor-pointer hover:bg-bg-muted transition-colors',
          sidebarCollapsed && 'justify-center'
        )}
          onClick={() => navigate('/admin')}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: currentUser.color + '30', color: currentUser.color, border: `1px solid ${currentUser.color}40` }}
          >
            {currentUser.initials}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">{currentUser.name}</div>
              <div className="text-[10px] text-text-muted">{ROLE_LABELS[currentUser.role]}</div>
            </div>
          )}
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="flex items-center justify-center p-2 border-t border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-muted transition-colors"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
