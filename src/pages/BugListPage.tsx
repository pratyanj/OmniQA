import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Bug, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useBugStore } from '@/stores/bugStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { StatusBadge, SeverityBadge, PriorityBadge } from '@/components/bugs/Badges';
import {
  BugStatus, BugSeverity, BugPriority, BugType, Platform,
  STATUS_LABELS, SEVERITY_LABELS, PRIORITY_LABELS, BUG_TYPE_LABELS,
  PLATFORM_LABELS, SEVERITY_COLORS,
} from '@/types';
import { timeAgo } from '@/utils/dateUtils';

const ALL_STATUSES: BugStatus[] = ['new','triaged','assigned','in_development','ready_for_qa','verified','reopened','closed','rejected','cannot_reproduce','deferred'];
const ALL_SEVERITIES: BugSeverity[] = ['critical','high','medium','low','cosmetic'];
const ALL_PRIORITIES: BugPriority[] = ['p0','p1','p2','p3'];

export default function BugListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bugs, filters, sortBy, sortDir, getFilteredBugs, setFilters, resetFilters, setSortBy, setSortDir } = useBugStore();
  const { projects } = useProjectStore();
  const { getUserById } = useUserStore();
  const [showFilters, setShowFilters] = useState(false);

  // Apply URL params to filters on mount
  useEffect(() => {
    const q = searchParams.get('q');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');
    const updates: Partial<typeof filters> = {};
    if (q) updates.search = q;
    if (severity) updates.severity = [severity as BugSeverity];
    if (status) updates.status = [status as BugStatus];
    if (projectId) updates.projectId = projectId;
    if (Object.keys(updates).length) setFilters(updates);
  }, []);

  const filtered = getFilteredBugs();
  const activeFilterCount = [
    filters.status.length, filters.severity.length, filters.priority.length,
    filters.type.length, filters.projectId ? 1 : 0, filters.assignedTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  }

  function SortIcon({ field }: { field: typeof sortBy }) {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-text-disabled" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-brand" /> : <ArrowDown size={12} className="text-brand" />;
  }

  function toggleStatusFilter(s: BugStatus) {
    const next = filters.status.includes(s) ? filters.status.filter(x => x !== s) : [...filters.status, s];
    setFilters({ status: next });
  }
  function toggleSeverityFilter(s: BugSeverity) {
    const next = filters.severity.includes(s) ? filters.severity.filter(x => x !== s) : [...filters.severity, s];
    setFilters({ severity: next });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Bug Tracker</h1>
          <p className="text-sm text-text-muted mt-0.5">{filtered.length} of {bugs.length} bugs</p>
        </div>
        <button id="new-bug-btn" onClick={() => navigate('/bugs/new')} className="btn-primary btn-sm">
          <Plus size={14} /> Log Bug
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            id="bug-list-search"
            type="text"
            placeholder="Search bugs, IDs, tags…"
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
            className="input pl-9 text-sm"
          />
          {filters.search && (
            <button onClick={() => setFilters({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick severity filters */}
        <div className="flex items-center gap-1">
          {ALL_SEVERITIES.map(s => (
            <button
              key={s}
              id={`sev-filter-${s}`}
              onClick={() => toggleSeverityFilter(s)}
              className={clsx('badge text-[10px] cursor-pointer transition-all', filters.severity.includes(s) ? 'opacity-100' : 'opacity-40 hover:opacity-70')}
              style={{
                color: SEVERITY_COLORS[s],
                backgroundColor: SEVERITY_COLORS[s] + '15',
                borderColor: SEVERITY_COLORS[s] + '30',
              }}
            >
              {SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <button
          id="filter-panel-btn"
          onClick={() => setShowFilters(v => !v)}
          className={clsx('btn-secondary btn-sm flex items-center gap-1.5', showFilters && 'border-brand text-brand')}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 bg-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="btn-ghost btn-sm text-text-muted">
            <X size={13} /> Clear
          </button>
        )}

        {/* Project filter */}
        <select
          id="project-filter-select"
          value={filters.projectId}
          onChange={e => setFilters({ projectId: e.target.value })}
          className="select text-xs py-2 w-44"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <div className="label">Status</div>
            <div className="flex flex-wrap gap-1">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => toggleStatusFilter(s)}
                  className={clsx('badge text-[10px] cursor-pointer transition-all', filters.status.includes(s) ? 'ring-1 ring-brand' : 'opacity-50 hover:opacity-80')}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <div className="label">Priority</div>
            <div className="flex flex-wrap gap-1">
              {ALL_PRIORITIES.map(p => (
                <button
                  key={p}
                  onClick={() => {
                    const next = filters.priority.includes(p) ? filters.priority.filter(x => x !== p) : [...filters.priority, p];
                    setFilters({ priority: next });
                  }}
                  className={clsx('badge text-[10px] cursor-pointer font-mono', filters.priority.includes(p) ? 'ring-1 ring-brand' : 'opacity-50 hover:opacity-80')}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <div className="label">Assigned To</div>
            <select
              value={filters.assignedTo}
              onChange={e => setFilters({ assignedTo: e.target.value })}
              className="select text-xs py-1.5 w-full"
            >
              <option value="">Anyone</option>
              {['u1','u2','u3','u4','u5','u6'].map(id => {
                const u = getUserById(id);
                return u ? <option key={id} value={id}>{u.name}</option> : null;
              })}
            </select>
          </div>
        </div>
      )}

      {/* Bug Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Bug size={32} className="text-text-disabled" />
            <div className="text-sm text-text-muted">No bugs match your filters</div>
            <button onClick={resetFilters} className="btn-secondary btn-sm">Clear Filters</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-32">
                  <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    Bug ID <SortIcon field="createdAt" />
                  </button>
                </th>
                <th>Title</th>
                <th className="w-24">
                  <button onClick={() => toggleSort('severity')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    Severity <SortIcon field="severity" />
                  </button>
                </th>
                <th className="w-20">
                  <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    Priority <SortIcon field="priority" />
                  </button>
                </th>
                <th className="w-32">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="w-28">Assignee</th>
                <th className="w-24">
                  <button onClick={() => toggleSort('updatedAt')} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                    Updated <SortIcon field="updatedAt" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(bug => {
                const assignee = bug.assignedTo ? getUserById(bug.assignedTo) : null;
                return (
                  <tr
                    key={bug.id}
                    id={`bug-row-${bug.id}`}
                    className={clsx(
                      'cursor-pointer',
                      bug.severity === 'critical' && 'row-critical',
                      bug.severity === 'high' && 'row-high',
                    )}
                    onClick={() => navigate(`/bugs/${bug.id}`)}
                  >
                    <td className="font-mono text-[11px] text-text-muted">{bug.bugId}</td>
                    <td>
                      <div className="text-xs font-medium text-text-primary truncate max-w-xs hover:text-brand transition-colors">
                        {bug.title}
                      </div>
                      {bug.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {bug.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] text-text-muted bg-bg-base px-1.5 py-0.5 rounded border border-bg-border">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td><SeverityBadge severity={bug.severity} size="sm" /></td>
                    <td><PriorityBadge priority={bug.priority} size="sm" /></td>
                    <td><StatusBadge status={bug.status} size="sm" /></td>
                    <td>
                      {assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ backgroundColor: assignee.color + '30', color: assignee.color }}>
                            {assignee.initials}
                          </div>
                          <span className="text-xs text-text-muted">{assignee.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-disabled">—</span>
                      )}
                    </td>
                    <td className="text-xs text-text-muted">{timeAgo(bug.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
