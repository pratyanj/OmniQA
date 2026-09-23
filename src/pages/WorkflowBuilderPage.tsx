import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Panel,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import {
  Save, ArrowLeft, Plus, Trash2, Star, StarOff, Loader2,
  Circle, CheckCircle, Flag, GitBranch, Zap, X, Check,
} from 'lucide-react';
import { useWorkflowStore } from '@/stores/workflowStore';
import type { WorkflowNode as WFNode, WorkflowEdge as WFEdge, WorkflowTemplate } from '@/types';
import toast from 'react-hot-toast';

// ─── Preset status nodes ──────────────────────────────────────────────────────
const PRESET_STATUSES = [
  { name: 'New',           color: '#2563eb', icon: '🆕' },
  { name: 'Triaged',       color: '#8b5cf6', icon: '🔍' },
  { name: 'Assigned',      color: '#3b82f6', icon: '👤' },
  { name: 'In Development',color: '#f97316', icon: '🛠️' },
  { name: 'Ready for QA',  color: '#eab308', icon: '🧪' },
  { name: 'Verified',      color: '#22c55e', icon: '✅' },
  { name: 'Reopened',      color: '#ef4444', icon: '🔁' },
  { name: 'Closed',        color: '#475569', icon: '🔒' },
  { name: 'Rejected',      color: '#64748b', icon: '❌' },
  { name: 'Duplicate',     color: '#6b7280', icon: '📋' },
  { name: 'Deferred',      color: '#a16207', icon: '⏳' },
];

// ─── Custom node component ────────────────────────────────────────────────────
function WorkflowStateNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`relative min-w-[130px] rounded-xl border-2 shadow-lg transition-all ${
        selected ? 'shadow-xl scale-105' : ''
      }`}
      style={{
        borderColor: selected ? data.color as string : (data.color as string) + '80',
        background: `linear-gradient(135deg, ${data.color}15, ${data.color}08)`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2"
        style={{ borderColor: data.color as string, background: '#1e293b' }}
      />

      <div className="px-4 py-3 text-center">
        {data.is_start && (
          <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        )}
        {data.is_end && (
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 border-2 border-slate-900 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        )}
        <div className="text-xl mb-1">{data.icon as string}</div>
        <div className="text-sm font-semibold text-white">{data.label as string}</div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2"
        style={{ borderColor: data.color as string, background: '#1e293b' }}
      />
    </div>
  );
}

const nodeTypes = { workflowState: WorkflowStateNode };

// ─── Helper: convert DB workflow to RF nodes/edges ────────────────────────────
function wfToRF(wf: WorkflowTemplate): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = wf.nodes.map(n => ({
    id: n.id,
    type: 'workflowState',
    position: { x: n.position_x, y: n.position_y },
    data: {
      label: n.name,
      color: n.color,
      icon: n.icon || '⬡',
      is_start: n.is_start,
      is_end: n.is_end,
      temp_id: n.id,
    },
  }));

  const edges: Edge[] = wf.edges.map(e => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    label: e.label || '',
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    data: {
      requires_comment: e.requires_comment,
      requires_attachment: e.requires_attachment,
    },
  }));

  return { nodes, edges };
}

// ─── Helper: convert RF nodes/edges to API payload ────────────────────────────
function rfToPayload(rfNodes: Node[], rfEdges: Edge[]) {
  const nodes = rfNodes.map(n => ({
    temp_id: n.id,
    name: (n.data.label as string) || 'Unnamed',
    color: (n.data.color as string) || '#2563eb',
    icon: (n.data.icon as string) || '',
    position_x: n.position.x,
    position_y: n.position.y,
    is_start: !!(n.data.is_start),
    is_end: !!(n.data.is_end),
  }));

  const edges = rfEdges.map(e => ({
    source_temp_id: e.source,
    target_temp_id: e.target,
    source_node_id: e.source,
    target_node_id: e.target,
    label: (e.label as string) || '',
    requires_comment: !!(e.data?.requires_comment),
    requires_attachment: !!(e.data?.requires_attachment),
  }));

  return { nodes, edges };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new' || !id;
  const navigate = useNavigate();
  const { createWorkflow, updateWorkflow, getWorkflowById, fetchWorkflows, workflows } = useWorkflowStore();

  const [rfNodes, setNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [name, setName] = useState('Untitled Workflow');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);

  // Node editor state
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#2563eb');
  const [editIcon, setEditIcon] = useState('⬡');
  const [editIsStart, setEditIsStart] = useState(false);
  const [editIsEnd, setEditIsEnd] = useState(false);

  // Load existing workflow
  useEffect(() => {
    if (isNew) return;
    (async () => {
      setLoading(true);
      await fetchWorkflows();
      const wf = getWorkflowById(id!);
      if (wf) {
        setName(wf.name);
        setDescription(wf.description || '');
        setIsDefault(wf.is_default);
        const { nodes, edges } = wfToRF(wf);
        setNodes(nodes);
        setEdges(edges);
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  // When node is selected → open editor
  useEffect(() => {
    if (selectedNode) {
      setEditName((selectedNode.data.label as string) || '');
      setEditColor((selectedNode.data.color as string) || '#2563eb');
      setEditIcon((selectedNode.data.icon as string) || '⬡');
      setEditIsStart(!!(selectedNode.data.is_start));
      setEditIsEnd(!!(selectedNode.data.is_end));
      setShowNodeEditor(true);
    } else {
      setShowNodeEditor(false);
    }
  }, [selectedNode]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge({
          ...params,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
          style: { stroke: '#8b5cf6', strokeWidth: 2 },
          data: { requires_comment: false, requires_attachment: false },
        }, eds)
      ),
    [setEdges]
  );

  const addPresetNode = (preset: typeof PRESET_STATUSES[0]) => {
    const newId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'workflowState',
      position: { x: 100 + rfNodes.length * 180, y: 200 },
      data: {
        label: preset.name,
        color: preset.color,
        icon: preset.icon,
        is_start: false,
        is_end: false,
        temp_id: newId,
      },
    };
    setNodes(ns => [...ns, newNode]);
  };

  const addCustomNode = () => {
    const newId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'workflowState',
      position: { x: 200, y: 100 + rfNodes.length * 100 },
      data: { label: 'New State', color: '#2563eb', icon: '⬡', is_start: false, is_end: false, temp_id: newId },
    };
    setNodes(ns => [...ns, newNode]);
  };

  const applyNodeEdit = () => {
    if (!selectedNode) return;
    setNodes(ns =>
      ns.map(n =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, label: editName, color: editColor, icon: editIcon, is_start: editIsStart, is_end: editIsEnd } }
          : n
      )
    );
    setSelectedNode(null);
    setShowNodeEditor(false);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes(ns => ns.filter(n => n.id !== selectedNode.id));
    setEdges(es => es.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setShowNodeEditor(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Workflow name is required'); return; }
    setSaving(true);
    try {
      const { nodes: nodesPayload, edges: edgesPayload } = rfToPayload(rfNodes, rfEdges);
      const payload = { name, description, is_default: isDefault, nodes: nodesPayload, edges: edgesPayload };

      if (isNew) {
        const wf = await createWorkflow(payload);
        toast.success('Workflow created!');
        navigate(`/workflows/${wf.id}/edit`, { replace: true });
      } else {
        await updateWorkflow(id!, payload);
        toast.success('Workflow saved!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="animate-spin mr-3" size={24} /> Loading workflow…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-slate-900/80 border-b border-slate-700/50 backdrop-blur-sm z-10 flex-shrink-0">
        <button onClick={() => navigate('/workflows')} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700">
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-transparent text-white font-semibold text-lg focus:outline-none border-b border-transparent focus:border-violet-500 transition-colors px-1 min-w-[200px]"
            placeholder="Workflow name…"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-transparent text-slate-400 text-sm focus:outline-none border-b border-transparent focus:border-slate-500 transition-colors px-1 flex-1 max-w-sm"
            placeholder="Description (optional)"
          />
        </div>

        <button
          onClick={() => setIsDefault(d => !d)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
            isDefault
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {isDefault ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
          Default
        </button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-900/40 disabled:opacity-70 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save'}
        </motion.button>
      </div>

      {/* Main area: sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: node palette */}
        <div className="w-56 flex-shrink-0 bg-slate-900/60 border-r border-slate-700/50 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3 px-1">Add States</div>
            <button
              onClick={addCustomNode}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium mb-3 transition-colors"
            >
              <Plus size={14} /> Custom State
            </button>
            <div className="text-xs text-slate-600 uppercase tracking-wider mb-2 px-1">Presets</div>
            <div className="space-y-1">
              {PRESET_STATUSES.map(p => (
                <button
                  key={p.name}
                  onClick={() => addPresetNode(p)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors group"
                >
                  <span>{p.icon}</span>
                  <span className="flex-1 text-left truncate">{p.name}</span>
                  <span className="w-2.5 h-2.5 rounded-full opacity-80" style={{ background: p.color }} />
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 border-t border-slate-700/40 mt-2">
            <div className="text-xs text-slate-500 px-1 mb-2">Instructions</div>
            <p className="text-xs text-slate-600 px-1 leading-relaxed">
              Drag nodes onto canvas. Connect them by dragging from the right handle to the left handle of another node. Click a node to edit it.
            </p>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => { setSelectedNode(node); setSelectedEdge(null); }}
            onEdgeClick={(_, edge) => { setSelectedEdge(edge); setSelectedNode(null); setShowNodeEditor(false); }}
            onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null); setShowNodeEditor(false); }}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            style={{ background: 'transparent' }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
              style: { stroke: '#8b5cf6', strokeWidth: 2 },
            }}
          >
            <Background color="#334155" gap={20} size={1} />
            <Controls className="!bg-slate-800 !border-slate-700 !shadow-xl" />
            <MiniMap
              className="!bg-slate-800 !border-slate-700"
              nodeColor={n => (n.data.color as string) || '#2563eb'}
              maskColor="rgba(15,23,42,0.8)"
            />

            {rfNodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl px-8 py-6 text-center mt-20">
                  <GitBranch size={40} className="mx-auto text-violet-400 mb-3" />
                  <p className="text-white font-semibold mb-1">Start building your workflow</p>
                  <p className="text-slate-400 text-sm">Add states from the left sidebar, then connect them</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right panel: node editor */}
        {showNodeEditor && selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-64 flex-shrink-0 bg-slate-900/80 border-l border-slate-700/50 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Edit State</h3>
              <button onClick={() => { setSelectedNode(null); setShowNodeEditor(false); }} className="text-slate-500 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Icon (emoji)</label>
                <input
                  value={editIcon}
                  onChange={e => setEditIcon(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xl text-center focus:outline-none focus:border-violet-500 transition-colors"
                  maxLength={4}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
                  />
                  <input
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditIsStart(v => !v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    editIsStart ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  <Circle size={12} /> Start
                </button>
                <button
                  onClick={() => setEditIsEnd(v => !v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    editIsEnd ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  <CheckCircle size={12} /> End
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={applyNodeEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
                >
                  <Check size={14} /> Apply
                </button>
                <button
                  onClick={deleteSelectedNode}
                  className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Right panel: edge editor */}
        {selectedEdge && !showNodeEditor && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 flex-shrink-0 bg-slate-900/80 border-l border-slate-700/50 backdrop-blur-sm p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Edit Transition</h3>
              <button onClick={() => setSelectedEdge(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Label</label>
                <input
                  defaultValue={(selectedEdge.label as string) || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEdges(es => es.map(ed => ed.id === selectedEdge.id ? { ...ed, label: val } : ed));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="e.g. Move to QA"
                />
              </div>

              <div className="space-y-2">
                {[
                  { key: 'requires_comment', label: 'Requires Comment' },
                  { key: 'requires_attachment', label: 'Requires Attachment' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(selectedEdge.data?.[key])}
                      onChange={e => {
                        setEdges(es => es.map(ed =>
                          ed.id === selectedEdge.id
                            ? { ...ed, data: { ...ed.data, [key]: e.target.checked } }
                            : ed
                        ));
                      }}
                      className="w-4 h-4 rounded accent-violet-500"
                    />
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => {
                  setEdges(es => es.filter(e => e.id !== selectedEdge.id));
                  setSelectedEdge(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
              >
                <Trash2 size={14} /> Delete Transition
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
