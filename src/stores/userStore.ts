import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, Notification } from '@/types';
import { SEED_USERS } from '@/data/seed';

interface UserState {
  currentUser: User;
  users: User[];
  notifications: Notification[];

  setCurrentUser: (user: User) => void;
  setRole: (role: UserRole) => void;
  getUserById: (id: string) => User | undefined;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  unreadCount: () => number;
}

const defaultUser = SEED_USERS[0]; // Arjun Sharma (QA Lead)

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', userId: 'u1', type: 'critical_bug',
    title: 'Critical Bug Created',
    message: 'BUG-2026-00019: Security role escalation vulnerability on settings API',
    bugId: 'b19', read: false, timestamp: '2026-05-28T12:00:00Z',
  },
  {
    id: 'n2', userId: 'u1', type: 'bug_reopened',
    title: 'Bug Reopened',
    message: 'BUG-2026-00004: Push notification null-badge crash still occurring on iOS',
    bugId: 'b4', read: false, timestamp: '2026-05-26T09:00:00Z',
  },
  {
    id: 'n3', userId: 'u1', type: 'status_changed',
    title: 'Ready for QA',
    message: 'BUG-2026-00021: Stripe charge database timeout reconcile is ready to verify',
    bugId: 'b21', read: false, timestamp: '2026-05-28T13:00:00Z',
  },
  {
    id: 'n4', userId: 'u1', type: 'comment_added',
    title: 'New Comment',
    message: 'Rahul commented on BUG-2026-00001: Found checkout double-click lock root cause',
    bugId: 'b1', read: true, timestamp: '2026-05-21T14:00:00Z',
  },
];

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: defaultUser,
      users: SEED_USERS,
      notifications: INITIAL_NOTIFICATIONS,

      setCurrentUser: (user) => set({ currentUser: user }),
      setRole: (role) => {
        const user = get().users.find(u => u.role === role) ?? get().users[0];
        set({ currentUser: user });
      },
      getUserById: (id) => get().users.find(u => u.id === id),
      markNotificationRead: (id) =>
        set(s => ({
          notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        })),
      markAllRead: () =>
        set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
      addNotification: (n) =>
        set(s => ({
          notifications: [
            {
              ...n,
              id: `n_${Date.now()}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...s.notifications,
          ],
        })),
      unreadCount: () => get().notifications.filter(n => !n.read).length,
    }),
    { name: 'qa-users' }
  )
);
