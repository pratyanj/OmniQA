import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, CheckCircle2, XCircle, Loader2, Clock,
  Terminal, Image, ChevronDown, ChevronRight, AlertCircle,
} from 'lucide-react';
import type { ReplayRun, ReplayStatus } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

function authHeaders() {
  const token = localStorage.getItem('qa_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` };
}

const STATUS_CONFIG: Record<ReplayStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: {
    label: 'Pending',
    icon: <Clock size={13} />,
    color: 'text-slate-400',
    bg: 'bg-slate-700/50',
  },
  running: {
    label: 'Running',
    icon: <Loader2 size={13} className="animate-spin" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  passed: {
    label: 'Passed',
    icon: <CheckCircle2 size={13} />,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle size={13} />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  error: {
    label: 'Error',
    icon: <AlertCircle size={13} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
};

function RunRow({ run, onRerun }: { run: ReplayRun; onRerun: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[run.status];
  const runNum = run.created_at; // used as a label

  return (
    <div className={`rounded-xl border transition-all ${run.status === 'passed' ? 'border-green-500/20' : run.status === 'failed' || run.status === 'error' ? 'border-red-500/20' : 'border-slate-700/50'} bg-slate-800/50`}>
      {/* Row header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}

        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>

        <span className="text-xs text-slate-400 flex-1">
          {run.started_at
            ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true })
            : 'Not started yet'}
        </span>

        {run.completed_at && run.started_at && (
          <span className="text-xs text-slate-600">
            {Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s
          </span>
        )}

        {(run.status === 'passed' || run.status === 'failed' || run.status === 'error') && (
          <button
            onClick={e => { e.stopPropagation(); onRerun(); }}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
            title="Run again"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </button>

      {/* Expanded: logs + screenshot */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-700/40 px-4 py-3 space-y-3">
              {run.step_failed && (
                <div className="flex items-start gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-red-300">
                  <XCircle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>Failed at: <strong>{run.step_failed}</strong></span>
                </div>
              )}

              {run.log && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                    <Terminal size={11} /> Execution Log
                  </div>
                  <pre className="bg-slate-950 rounded-xl p-3 text-xs text-slate-300 font-mono overflow-auto max-h-48 leading-relaxed">
                    {run.log}
                  </pre>
                </div>
              )}

              {run.screenshot_path && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                    <Image size={11} /> Failure Screenshot
                  </div>
                  <img
                    src={`${API.replace('/api/v1', '')}/static/${run.screenshot_path}`}
                    alt="Failure screenshot"
                    className="rounded-xl border border-slate-700/50 max-h-48 object-contain"
                  />
                </div>
              )}

              {run.status === 'running' && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Replay in progress… logs will appear when done.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ReplayHistoryPanelProps {
  recordingId: string;
  onRunComplete?: (status: ReplayStatus) => void;
}

export default function ReplayHistoryPanel({ recordingId, onRunComplete }: ReplayHistoryPanelProps) {
  const [runs, setRuns] = useState<ReplayRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [headed, setHeaded] = useState(false);
  const [language, setLanguage] = useState<'python' | 'typescript'>('python');

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API}/recordings/${recordingId}/runs`, { headers: authHeaders() });
      if (res.ok) {
        const data: ReplayRun[] = await res.json();
        setRuns(data);
        if (data.length > 0 && onRunComplete) {
          onRunComplete(data[0].status as ReplayStatus);
        }
      }
    } catch { /* silent */ }
  }, [recordingId, onRunComplete]);

  useEffect(() => {
    setLoading(true);
    fetchRuns().finally(() => setLoading(false));
  }, [fetchRuns]);

  // Poll while any run is pending/running
  useEffect(() => {
    const hasActive = runs.some(r => r.status === 'pending' || r.status === 'running');
    if (!hasActive) return;
    const id = setInterval(fetchRuns, 2500);
    return () => clearInterval(id);
  }, [runs, fetchRuns]);

  const triggerReplay = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API}/replay/${recordingId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ headed, language }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to trigger replay');
      const newRun: ReplayRun = await res.json();
      setRuns(r => [newRun, ...r]);
      toast.success(headed ? 'Launching Headed Browser replay…' : 'Replay test initiated in background');
    } catch (e: any) {
      toast.error(e.message || 'Could not start replay');
    } finally {
      setTriggering(false);
    }
  };

  const latestRun = runs[0];

  return (
    <div className="space-y-4">
      {/* Header + trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-700/50">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Terminal size={15} className="text-violet-400" />
            Playwright Test Runner
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Automate and repeat bug verification test</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Headed / Headless toggle */}
          <button
            onClick={() => setHeaded(!headed)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              headed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={headed ? 'Chromium will open on your screen' : 'Runs silently in background'}
          >
            {headed ? '👁️ Headed Browser' : '⚡ Headless'}
          </button>

          {/* Trigger button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={triggerReplay}
            disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-900/30 transition-all disabled:opacity-60"
          >
            {triggering ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} className="fill-white" />}
            {runs.length > 0 ? 'Repeat Test' : 'Run Test'}
          </motion.button>
        </div>
      </div>

      {/* Latest Run Quick Result Banner */}
      {latestRun && (
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
          latestRun.status === 'passed'
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : latestRun.status === 'failed' || latestRun.status === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : latestRun.status === 'running'
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          <div className="flex items-center gap-2 truncate">
            {STATUS_CONFIG[latestRun.status].icon}
            <span className="font-semibold uppercase tracking-wider text-[10px]">{latestRun.status}</span>
            <span className="truncate text-slate-300">
              {latestRun.status === 'passed' && 'All steps passed! Bug is either verified or fixed.'}
              {latestRun.status === 'failed' && `Failed: ${latestRun.step_failed || 'Assertion / step error'}`}
              {latestRun.status === 'running' && 'Automated test executing in Playwright…'}
              {latestRun.status === 'pending' && 'Queued for execution…'}
            </span>
          </div>
          {latestRun.status !== 'running' && (
            <button
              onClick={triggerReplay}
              className="text-[11px] underline font-semibold flex-shrink-0 hover:text-white"
            >
              Re-run
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-6 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin mx-auto mb-2" />
          Loading test runs…
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="text-center py-8 text-slate-600 text-sm border border-dashed border-slate-800 rounded-xl">
          <Play size={28} className="mx-auto mb-2 opacity-40 text-violet-400" />
          <p className="font-medium text-slate-400">No test runs recorded yet</p>
          <p className="text-xs text-slate-500 mt-1">Click "Run Test" above to execute this Playwright script.</p>
        </div>
      )}

      <div className="space-y-2">
        {runs.map(run => (
          <RunRow key={run.id} run={run} onRerun={triggerReplay} />
        ))}
      </div>
    </div>
  );
}

