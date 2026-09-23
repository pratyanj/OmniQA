import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Filter, Search, AlertTriangle, Clock, MessageSquare,
  Paperclip, ChevronDown, X, User, Layers, Loader2,
} from 'lucide-react';
import type { Bug, BugSeverity, WorkflowTemplate } from '@/types';
import { SEVERITY_COLORS, SEVERITY_LABELS, PRIORITY_LABELS } from '@/types';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useUserStore } from '@/stores/userStore';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

function authHeaders() {
  const token = localStorage.getItem('qa_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// ─── Bug Card ─────────────────────────────────────────────────────────────────

function BugCard({ bug, overlay = false }: { bug: Bug; overlay?: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bug.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const severityColor = SEVERITY_COLORS[bug.severity] || '#6b7280';

  return (
    <div
      ref={setNodeRef}
      style={overlay ? undefined : style}
      {...(!overlay ? { ...attributes, ...listeners } : {})}
      className={`bg-slate-800/80 border border-slate-700/50 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-slate-600/80 hover:bg-slate-800 transition-all shadow-sm ${overlay ? 'rotate-2 shadow-2xl scale-105' : ''}`}
      onClick={() => !isDragging && navigate(`/bugs/${bug.id}`)}
    >
      {/* Bug ID + Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-mono">{bug.bugId}</span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ color: severityColor, background: severityColor + '20' }}
        >
          {SEVERITY_LABELS[bug.severity]}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm text-white font-medium leading-snug mb-3 line-clamp-2">{bug.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          {bug.attachments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs">
              <Paperclip size={11} /> {bug.attachments.length}
            </span>
          )}
          {bug.comments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs">
              <MessageSquare size={11} /> {bug.comments.length}
            </span>
          )}
        </div>
        {bug.assignedTo && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#2563eb' }}
            title={bug.assignedTo}
          >
            {bug.assignedTo.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  nodeId,
  nodeName,
  nodeColor,
  bugs,
}: {
  nodeId: string;
  nodeName: string;
  nodeColor: string;
  bugs: Bug[];
}) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px] bg-slate-900/50 border border-slate-700/40 rounded-2xl">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b rounded-t-2xl"
        style={{ borderColor: nodeColor + '30', background: nodeColor + '08' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: nodeColor }} />
          <span className="font-semibold text-sm text-white">{nodeName}</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: nodeColor, background: nodeColor + '20' }}
        >
          {bugs.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={bugs.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-3 space-y-2.5 overflow-y-auto" style={{ minHeight: 200, maxHeight: 'calc(100vh - 230px)' }}>
          <AnimatePresence>
            {bugs.map(bug => (
              <motion.div
                key={bug.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <BugCard bug={bug} />
              </motion.div>
            ))}
          </AnimatePresence>
          {bugs.length === 0 && (
            <div className="text-center text-slate-600 text-xs py-8">No bugs</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Main Kanban Page ─────────────────────────────────────────────────────────

export default function KanbanPage() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBug, setActiveBug] = useState<Bug | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [projectFilter, setProjectFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<BugSeverity[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { fetchWorkflows, workflows } = useWorkflowStore();
  const { currentUser } = useUserStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load bugs from API
  const loadBugs = async () => {
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.append('projectId', projectFilter);
      if (search) params.append('search', search);
      const res = await fetch(`${API}/bugs?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data: Bug[] = await res.json();
        setBugs(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    loadBugs();
    fetchWorkflows();
  }, [projectFilter, search]);

  // Use first workflow (or default) for columns
  useEffect(() => {
    if (workflows.length > 0) {
      const def = workflows.find(w => w.is_default) || workflows[0];
      setWorkflow(def);
    }
  }, [workflows]);

  // Column definitions from workflow nodes
  const columns = useMemo(() => {
    if (!workflow || workflow.nodes.length === 0) {
      // Fallback static columns
      return [
        { id: 'new', name: 'New', color: '#2563eb' },
        { id: 'assigned', name: 'Assigned', color: '#3b82f6' },
        { id: 'in_development', name: 'In Development', color: '#f97316' },
        { id: 'ready_for_qa', name: 'Ready for QA', color: '#eab308' },
        { id: 'verified', name: 'Verified', color: '#22c55e' },
        { id: 'closed', name: 'Closed', color: '#475569' },
      ];
    }
    return workflow.nodes.map(n => ({
      id: n.name.toLowerCase().replace(/\s+/g, '_'),
      name: n.name,
      color: n.color,
    }));
  }, [workflow]);

  // Filter bugs
  const filteredBugs = useMemo(() => {
    let result = [...bugs];
    if (severityFilter.length > 0) result = result.filter(b => severityFilter.includes(b.severity));
    if (assigneeFilter === 'me' && currentUser) result = result.filter(b => b.assignedTo === currentUser.id);
    if (assigneeFilter === 'unassigned') result = result.filter(b => !b.assignedTo);
    return result;
  }, [bugs, severityFilter, assigneeFilter, currentUser]);

  const bugsByColumn = useMemo(() => {
    const map: Record<string, Bug[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    filteredBugs.forEach(bug => {
      const colId = bug.status;
      if (map[colId]) {
        map[colId].push(bug);
      } else {
        // Try to find column by normalised name
        const match = columns.find(c => c.name.toLowerCase().replace(/\s+/g, '_') === colId);
        if (match) map[match.id].push(bug);
      }
    });
    return map;
  }, [filteredBugs, columns]);

  const findBugById = (id: string) => bugs.find(b => b.id === id);
  const findColumnForBug = (bugId: string) => {
    for (const col of columns) {
      if (bugsByColumn[col.id]?.some(b => b.id === bugId)) return col;
    }
    return null;
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveBug(findBugById(active.id as string) ?? null);
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveBug(null);
    if (!over || active.id === over.id) return;

    const bug = findBugById(active.id as string);
    if (!bug) return;

    // Find target column — over.id might be a bug id or column id
    const targetCol = columns.find(c => c.id === over.id)
      || findColumnForBug(over.id as string);
    if (!targetCol) return;

    const newStatus = targetCol.id;
    if (bug.status === newStatus) return;

    // Optimistic update
    setBugs(bs => bs.map(b => b.id === bug.id ? { ...b, status: newStatus as any } : b));

    try {
      const res = await fetch(`${API}/bugs/${bug.id}/status?newStatus=${newStatus}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Transition failed');
      }
    } catch (e: any) {
      // Revert
      setBugs(bs => bs.map(b => b.id === bug.id ? { ...b, status: bug.status } : b));
      toast.error(e.message || 'Could not move card');
    }
  };

  const SEVERITIES: BugSeverity[] = ['critical', 'high', 'medium', 'low', 'cosmetic'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50 flex-shrink-0">
        <LayoutGrid className="text-violet-400" size={22} />
        <h1 className="text-xl font-bold text-white">Kanban Board</h1>

        {/* Search */}
        <div className="flex-1 max-w-xs ml-4 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bugs…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Workflow label */}
        {workflow && (
          <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
            <Layers size={13} /> {workflow.name}
          </span>
        )}

        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
            showFilters || severityFilter.length > 0 || assigneeFilter !== 'all'
              ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          <Filter size={14} />
          Filters
          {(severityFilter.length + (assigneeFilter !== 'all' ? 1 : 0)) > 0 && (
            <span className="w-4 h-4 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center">
              {severityFilter.length + (assigneeFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-700/50 bg-slate-900/60"
          >
            <div className="flex flex-wrap items-center gap-4 px-5 py-3">
              {/* Severity */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Severity:</span>
                {SEVERITIES.map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(f =>
                      f.includes(sev) ? f.filter(s => s !== sev) : [...f, sev]
                    )}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      severityFilter.includes(sev)
                        ? 'text-white border-current'
                        : 'text-slate-500 border-slate-700 hover:border-slate-500'
                    }`}
                    style={severityFilter.includes(sev) ? { color: SEVERITY_COLORS[sev], borderColor: SEVERITY_COLORS[sev], background: SEVERITY_COLORS[sev] + '20' } : {}}
                  >
                    {SEVERITY_LABELS[sev]}
                  </button>
                ))}
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Assignee:</span>
                {(['all', 'me', 'unassigned'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAssigneeFilter(opt)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all capitalize ${
                      assigneeFilter === opt
                        ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                        : 'text-slate-500 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setSeverityFilter([]); setAssigneeFilter('all'); }}
                className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-3" size={22} /> Loading board…
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-5 h-full" style={{ minHeight: 0 }}>
              {columns.map(col => (
                <KanbanColumn
                  key={col.id}
                  nodeId={col.id}
                  nodeName={col.name}
                  nodeColor={col.color}
                  bugs={bugsByColumn[col.id] || []}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeBug ? (
              <div style={{ transform: 'rotate(2deg)' }}>
                <BugCard bug={activeBug} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
