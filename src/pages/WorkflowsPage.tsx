import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Trash2, Edit3, Star, Copy, Loader2 } from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { WorkflowTemplate } from '@/types';
import toast from 'react-hot-toast';

export default function WorkflowsPage() {
  const { workflows, loading, fetchWorkflows, deleteWorkflow, createWorkflow } = useWorkflowStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleDelete = async (wf: WorkflowTemplate) => {
    if (!confirm(`Delete workflow "${wf.name}"? This cannot be undone.`)) return;
    setDeletingId(wf.id);
    try {
      await deleteWorkflow(wf.id);
      toast.success('Workflow deleted');
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (wf: WorkflowTemplate) => {
    try {
      const dup = await createWorkflow({
        name: `${wf.name} (Copy)`,
        description: wf.description,
        is_default: false,
        nodes: wf.nodes.map(n => ({ ...n, temp_id: n.id })),
        edges: wf.edges.map(e => ({
          ...e,
          source_temp_id: e.source_node_id,
          target_temp_id: e.target_node_id,
        })),
      });
      toast.success('Workflow duplicated');
      navigate(`/workflows/${dup.id}/edit`);
    } catch (e: any) {
      toast.error(e.message || 'Duplication failed');
    }
  };

  const nodeCount = (wf: WorkflowTemplate) => wf.nodes.length;
  const edgeCount = (wf: WorkflowTemplate) => wf.edges.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <GitBranch className="text-violet-400" size={30} />
            Workflows
          </h1>
          <p className="text-slate-400 mt-1">Define custom bug lifecycle flows for each project</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/workflows/new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-900/40 transition-colors"
        >
          <Plus size={18} />
          New Workflow
        </motion.button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mr-3" size={24} /> Loading workflows…
        </div>
      )}

      {/* Empty state */}
      {!loading && workflows.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <GitBranch size={56} className="mx-auto text-slate-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-300 mb-2">No workflows yet</h2>
          <p className="text-slate-500 mb-6">Create your first workflow to define bug lifecycle stages</p>
          <button
            onClick={() => navigate('/workflows/new')}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            Create Workflow
          </button>
        </motion.div>
      )}

      {/* Workflow grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence>
          {workflows.map((wf, i) => (
            <motion.div
              key={wf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04 }}
              className="group relative bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 hover:border-violet-500/50 hover:bg-slate-800/80 transition-all"
            >
              {/* Default badge */}
              {wf.is_default && (
                <span className="absolute top-4 right-4 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Star size={10} fill="currentColor" /> Default
                </span>
              )}

              {/* Icon + name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                  <GitBranch size={20} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{wf.name}</h3>
                  {wf.description && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">{wf.description}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  {nodeCount(wf)} states
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                  {edgeCount(wf)} transitions
                </span>
              </div>

              {/* State pills preview */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {wf.nodes.slice(0, 6).map(n => (
                  <span
                    key={n.id}
                    className="text-xs px-2 py-0.5 rounded-full border"
                    style={{ color: n.color, borderColor: n.color + '40', background: n.color + '15' }}
                  >
                    {n.name}
                  </span>
                ))}
                {wf.nodes.length > 6 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-slate-600 text-slate-500">
                    +{wf.nodes.length - 6} more
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/workflows/${wf.id}/edit`)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 text-sm font-medium transition-colors"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDuplicate(wf)}
                  className="px-3 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => handleDelete(wf)}
                  disabled={deletingId === wf.id}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === wf.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
