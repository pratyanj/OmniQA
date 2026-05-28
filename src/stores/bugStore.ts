import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  Bug, BugStatus, BugFilters, BugHistoryEntry, Comment, Attachment,
} from '@/types';
import { SEED_BUGS } from '@/data/seed';
import { useUserStore } from '@/stores/userStore';

function triggerBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.warn("Browser Notification failed", e);
    }
  }
}

const DEFAULT_FILTERS: BugFilters = {
  search: '',
  status: [],
  severity: [],
  priority: [],
  type: [],
  projectId: '',
  assignedTo: '',
  platform: [],
  dateRange: {},
};

interface BugState {
  bugs: Bug[];
  filters: BugFilters;
  sortBy: 'createdAt' | 'updatedAt' | 'severity' | 'priority' | 'status';
  sortDir: 'asc' | 'desc';
  viewMode: 'table' | 'kanban';

  // Queries
  getBugById: (id: string) => Bug | undefined;
  getFilteredBugs: () => Bug[];
  getBugsByProject: (projectId: string) => Bug[];
  getBugsByStatus: (status: BugStatus) => Bug[];
  getVerificationQueue: () => Bug[];
  getOpenBugsCount: () => number;
  getCriticalBugsCount: () => number;
  getReopenedBugsCount: () => number;
  getPendingVerificationCount: () => number;
  getFixedTodayCount: () => number;

  // Mutations
  createBug: (
    bug: Omit<Bug, 'id' | 'bugId' | 'history' | 'comments' | 'attachments' | 'createdAt' | 'updatedAt'> & {
      attachments?: Omit<Attachment, 'id' | 'bugId'>[]
    },
    reporterId: string
  ) => Bug;
  updateBug: (id: string, updates: Partial<Bug>, userId: string) => void;
  changeStatus: (id: string, newStatus: BugStatus, userId: string, note?: string) => void;
  assignBug: (id: string, assigneeId: string, userId: string) => void;
  addComment: (bugId: string, text: string, userId: string) => void;
  addAttachment: (bugId: string, attachment: Omit<Attachment, 'id'>) => void;
  verifyBug: (id: string, userId: string, notes: string, fixVersion: string, buildNumber: string) => void;
  reopenBug: (id: string, userId: string, reason: string) => void;

  // Filters
  setFilters: (filters: Partial<BugFilters>) => void;
  resetFilters: () => void;
  setSortBy: (field: BugState['sortBy']) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setViewMode: (mode: 'table' | 'kanban') => void;
}

let bugCounter = SEED_BUGS.length + 1;

function padNum(n: number) {
  return String(n).padStart(5, '0');
}

function newBugId() {
  return `BUG-2026-${padNum(bugCounter++)}`;
}

function historyEntry(
  bugId: string,
  action: BugHistoryEntry['action'],
  description: string,
  changedBy: string,
  field = '',
  oldValue = '',
  newValue = '',
): BugHistoryEntry {
  return {
    id: uuid(),
    bugId,
    field,
    oldValue,
    newValue,
    changedBy,
    timestamp: new Date().toISOString(),
    action,
    description,
  };
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, cosmetic: 4 };
const PRIORITY_ORDER = { p0: 0, p1: 1, p2: 2, p3: 3 };
const STATUS_ORDER: Record<BugStatus, number> = {
  new: 0, triaged: 1, assigned: 2, in_development: 3,
  ready_for_qa: 4, reopened: 5, verified: 6,
  closed: 7, rejected: 8, duplicate: 9, cannot_reproduce: 10, deferred: 11,
};

export const useBugStore = create<BugState>()(
  persist(
    (set, get) => ({
      bugs: SEED_BUGS,
      filters: DEFAULT_FILTERS,
      sortBy: 'createdAt',
      sortDir: 'desc',
      viewMode: 'table',

      // ── Queries ────────────────────────────────────────────────────────
      getBugById: (id) => get().bugs.find(b => b.id === id),

      getFilteredBugs: () => {
        const { bugs, filters, sortBy, sortDir } = get();
        let result = [...bugs];

        if (filters.search) {
          const q = filters.search.toLowerCase();
          result = result.filter(b =>
            b.title.toLowerCase().includes(q) ||
            b.bugId.toLowerCase().includes(q) ||
            b.description?.toLowerCase().includes(q) ||
            b.tags.some(t => t.toLowerCase().includes(q))
          );
        }
        if (filters.status.length)    result = result.filter(b => filters.status.includes(b.status));
        if (filters.severity.length)  result = result.filter(b => filters.severity.includes(b.severity));
        if (filters.priority.length)  result = result.filter(b => filters.priority.includes(b.priority));
        if (filters.type.length)      result = result.filter(b => filters.type.includes(b.type));
        if (filters.projectId)        result = result.filter(b => b.projectId === filters.projectId);
        if (filters.assignedTo)       result = result.filter(b => b.assignedTo === filters.assignedTo);
        if (filters.platform.length)  result = result.filter(b => filters.platform.includes(b.platform));

        result.sort((a, b) => {
          let cmp = 0;
          if (sortBy === 'severity')   cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
          else if (sortBy === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          else if (sortBy === 'status')   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          else cmp = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
          return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
      },

      getBugsByProject: (projectId) =>
        get().bugs.filter(b => b.projectId === projectId),

      getBugsByStatus: (status) =>
        get().bugs.filter(b => b.status === status),

      getVerificationQueue: () =>
        get().bugs.filter(b => b.status === 'ready_for_qa'),

      getOpenBugsCount: () =>
        get().bugs.filter(b =>
          !['closed', 'rejected', 'duplicate'].includes(b.status)
        ).length,

      getCriticalBugsCount: () =>
        get().bugs.filter(b =>
          b.severity === 'critical' && !['closed', 'rejected', 'duplicate', 'verified'].includes(b.status)
        ).length,

      getReopenedBugsCount: () =>
        get().bugs.filter(b => b.status === 'reopened').length,

      getPendingVerificationCount: () =>
        get().bugs.filter(b => b.status === 'ready_for_qa').length,

      getFixedTodayCount: () => {
        const today = new Date().toDateString();
        return get().bugs.filter(b => {
          if (b.status !== 'verified' && b.status !== 'closed') return false;
          const updated = new Date(b.updatedAt).toDateString();
          return updated === today;
        }).length;
      },

      // ── Mutations ──────────────────────────────────────────────────────
      createBug: (bug, reporterId) => {
        const bugId = uuid();
        const newAttachments: Attachment[] = (bug.attachments || []).map(a => ({
          ...a,
          id: uuid(),
          bugId: bugId,
        }));
        const newBug: Bug = {
          ...bug,
          id: bugId,
          bugId: newBugId(),
          reportedBy: reporterId,
          history: [],
          comments: [],
          attachments: newAttachments,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newBug.history.push(historyEntry(
          newBug.id, 'created',
          `Bug created by reporter`,
          reporterId, 'status', '', 'new'
        ));
        set(s => ({ bugs: [newBug, ...s.bugs] }));

        // Trigger browser Notification if developer is assigned on creation
        if (newBug.assignedTo) {
          const developer = useUserStore.getState().getUserById(newBug.assignedTo);
          if (developer) {
            triggerBrowserNotification(
              `Bug Assigned: ${newBug.bugId}`,
              `${newBug.title} has been assigned to ${developer.name}.`
            );
          }
        }

        return newBug;
      },

      updateBug: (id, updates, userId) => {
        const currentBug = get().bugs.find(b => b.id === id);
        if (currentBug && updates.assignedTo && updates.assignedTo !== currentBug.assignedTo) {
          const developer = useUserStore.getState().getUserById(updates.assignedTo);
          if (developer) {
            triggerBrowserNotification(
              `Bug Reassigned: ${currentBug.bugId}`,
              `${currentBug.title} has been reassigned to ${developer.name}.`
            );
          }
        }
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== id) return b;
            const entries: BugHistoryEntry[] = [];
            if (updates.title && updates.title !== b.title)
              entries.push(historyEntry(id, 'updated', `Title changed`, userId, 'title', b.title, updates.title));
            if (updates.assignedTo && updates.assignedTo !== b.assignedTo)
              entries.push(historyEntry(id, 'assigned', `Assigned developer changed`, userId, 'assignedTo', b.assignedTo ?? '', updates.assignedTo));
            return {
              ...b, ...updates,
              history: [...b.history, ...entries],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      changeStatus: (id, newStatus, userId, note) =>
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== id) return b;
            const entry = historyEntry(
              id, 'status_changed',
              note ?? `Status changed to ${newStatus}`,
              userId, 'status', b.status, newStatus
            );
            const now = new Date().toISOString();
            return {
              ...b,
              status: newStatus,
              history: [...b.history, entry],
              updatedAt: now,
              resolvedAt: newStatus === 'verified' ? now : b.resolvedAt,
              closedAt:   newStatus === 'closed'   ? now : b.closedAt,
            };
          }),
        })),

      assignBug: (id, assigneeId, userId) => {
        const currentBug = get().bugs.find(b => b.id === id);
        if (currentBug) {
          const developer = useUserStore.getState().getUserById(assigneeId);
          if (developer) {
            triggerBrowserNotification(
              `Bug Assigned: ${currentBug.bugId}`,
              `${currentBug.title} has been assigned to ${developer.name}.`
            );
          }
        }
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== id) return b;
            const entry = historyEntry(id, 'assigned', `Bug assigned`, userId, 'assignedTo', b.assignedTo ?? '', assigneeId);
            return {
              ...b,
              assignedTo: assigneeId,
              status: b.status === 'new' || b.status === 'triaged' ? 'assigned' : b.status,
              developerInfo: { ...b.developerInfo, assignedTo: assigneeId },
              history: [...b.history, entry],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addComment: (bugId, text, userId) =>
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== bugId) return b;
            const comment: Comment = {
              id: uuid(),
              bugId,
              userId,
              text,
              timestamp: new Date().toISOString(),
            };
            const entry = historyEntry(bugId, 'commented', `Comment added`, userId);
            return {
              ...b,
              comments: [...b.comments, comment],
              history: [...b.history, entry],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      addAttachment: (bugId, attachment) =>
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== bugId) return b;
            const att: Attachment = { ...attachment, id: uuid() };
            const entry = historyEntry(bugId, 'attachment_added', `Attachment added: ${attachment.name}`, attachment.uploadedBy);
            return {
              ...b,
              attachments: [...b.attachments, att],
              history: [...b.history, entry],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      verifyBug: (id, userId, notes, fixVersion, buildNumber) =>
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== id) return b;
            const now = new Date().toISOString();
            const entry = historyEntry(id, 'verified', `Bug verified by QA`, userId, 'status', b.status, 'verified');
            return {
              ...b,
              status: 'verified',
              qaVerification: { ...b.qaVerification, verifiedBy: userId, verifiedAt: now, testNotes: notes, fixVersion, buildNumber },
              history: [...b.history, entry],
              updatedAt: now,
              resolvedAt: now,
            };
          }),
        })),

      reopenBug: (id, userId, reason) =>
        set(s => ({
          bugs: s.bugs.map(b => {
            if (b.id !== id) return b;
            const now = new Date().toISOString();
            const entry = historyEntry(id, 'reopened', `Bug reopened: ${reason}`, userId, 'status', b.status, 'reopened');
            return {
              ...b,
              status: 'reopened',
              qaVerification: { ...b.qaVerification, reopenReason: reason, reopenedBy: userId, reopenedAt: now },
              resolvedAt: undefined,
              history: [...b.history, entry],
              updatedAt: now,
            };
          }),
        })),

      // ── Filters ────────────────────────────────────────────────────────
      setFilters: (f) => set(s => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDir: (sortDir) => set({ sortDir }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    { name: 'qa-bugs' }
  )
);
