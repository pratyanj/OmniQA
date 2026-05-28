import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, ChevronDown, Check, AlertTriangle, MessageSquare, Bug as BugIcon, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useUserStore } from '@/stores/userStore';
import { useUIStore } from '@/stores/uiStore';
import { ROLE_LABELS } from '@/types';
import { timeAgo } from '@/utils/dateUtils';

const NOTIFICATION_ICONS = {
  critical_bug: AlertTriangle,
  bug_reopened: BugIcon,
  verification_failed: AlertTriangle,
  comment_added: MessageSquare,
  status_changed: Check,
  bug_assigned: BugIcon,
};

export default function Topbar() {
  const navigate = useNavigate();
  const { currentUser, users: allUsers, notifications, markNotificationRead, markAllRead, setCurrentUser, unreadCount } = useUserStore();
  const { theme, toggleTheme } = useUIStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const unread = unreadCount();

  return (
    <header className="h-14 border-b border-bg-border bg-bg-card/80 backdrop-blur-sm flex items-center gap-4 px-6 z-20 sticky top-0">
      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search bugs, IDs, tags…"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchVal.trim()) {
              navigate(`/bugs?q=${encodeURIComponent(searchVal)}`);
              setSearchVal('');
            }
          }}
          className="input-sm pl-8 w-full text-xs"
          id="topbar-search"
        />
      </div>

      <div className="flex-1" />

      {/* Create Bug */}
      <button
        id="topbar-create-bug"
        onClick={() => navigate('/bugs/new')}
        className="btn-primary btn-sm"
      >
        <Plus size={14} /> New Bug
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="btn-icon btn-ghost text-text-secondary hover:text-text-primary"
        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          id="topbar-notifications"
          onClick={() => { setShowNotifs(v => !v); setShowUser(false); }}
          className="btn-icon btn-ghost relative"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-critical text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 card z-50 py-1 shadow-card-hover">
            <div className="flex items-center justify-between px-4 py-2 border-b border-bg-border">
              <span className="text-xs font-semibold text-text-primary">Notifications</span>
              <button onClick={markAllRead} className="text-[10px] text-brand hover:underline">Mark all read</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 10).map(n => {
                const Icon = NOTIFICATION_ICONS[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.bugId) navigate(`/bugs/${n.bugId}`);
                      setShowNotifs(false);
                    }}
                    className={clsx(
                      'w-full flex items-start gap-3 px-4 py-3 hover:bg-bg-muted text-left transition-colors',
                      !n.read && 'bg-brand-glow'
                    )}
                  >
                    <Icon size={14} className={clsx('mt-0.5 flex-shrink-0', !n.read ? 'text-brand' : 'text-text-muted')} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-text-primary truncate">{n.title}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 leading-snug">{n.message}</div>
                      <div className="text-[10px] text-text-disabled mt-1">{timeAgo(n.timestamp)}</div>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          id="topbar-user-menu"
          onClick={() => { setShowUser(v => !v); setShowNotifs(false); }}
          className="flex items-center gap-2 hover:bg-bg-muted px-2 py-1.5 rounded-lg transition-colors"
        >
          {currentUser && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{ backgroundColor: currentUser.color + '30', color: currentUser.color, border: `1px solid ${currentUser.color}40` }}
            >
              {currentUser.initials}
            </div>
          )}
          <div className="text-left hidden sm:block">
            <div className="text-xs font-medium text-text-primary leading-none">{currentUser?.name}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{currentUser ? ROLE_LABELS[currentUser.role] : ''}</div>
          </div>
          <ChevronDown size={12} className="text-text-muted" />
        </button>

        {showUser && (
          <div className="absolute right-0 top-full mt-2 w-52 card z-50 py-1 shadow-card-hover">
            <div className="px-3 py-2 border-b border-bg-border">
              <div className="text-[10px] text-text-muted uppercase font-semibold tracking-wide mb-2">Switch Role</div>
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setCurrentUser(u); setShowUser(false); }}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-muted text-left transition-colors',
                    currentUser?.id === u.id && 'bg-brand-glow'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: u.color + '30', color: u.color }}
                  >
                    {u.initials}
                  </div>
                  <div>
                    <div className="text-xs text-text-primary">{u.name}</div>
                    <div className="text-[10px] text-text-muted">{ROLE_LABELS[u.role]}</div>
                  </div>
                  {currentUser?.id === u.id && <Check size={12} className="text-brand ml-auto" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-bg-muted hover:text-critical transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {(showNotifs || showUser) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowNotifs(false); setShowUser(false); }} />
      )}
    </header>
  );
}
