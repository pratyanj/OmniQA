import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Edit2, ChevronRight, AlertTriangle,
  Monitor, User, CheckCircle2, RotateCcw, X,
  Cpu, Link2, GitBranch, Hash, Clock, Tag, MessageSquare,
  Paperclip, FileText, Video, Play, Copy, Download, List, Film, Code2, History,
  Share2, Globe, Plus, Save, Terminal, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useBugStore } from '@/stores/bugStore';
import { useUserStore } from '@/stores/userStore';
import { useProjectStore } from '@/stores/projectStore';
import { StatusBadge, SeverityBadge, PriorityBadge } from '@/components/bugs/Badges';
import StatusStepper from '@/components/bugs/StatusStepper';
import ActivityTimeline from '@/components/bugs/ActivityTimeline';
import RecorderWidget from '@/components/bugs/RecorderWidget';
import ReplayHistoryPanel from '@/components/bugs/ReplayHistoryPanel';
import type { BugRecording } from '@/types';
import {
  STATUS_LABELS, BUG_TYPE_LABELS, PLATFORM_LABELS,
  ENVIRONMENT_LABELS, BUG_STATUS_FLOW, PRIORITY_LABELS,
} from '@/types';
import { formatDateTime, timeAgo } from '@/utils/dateUtils';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
function authHeaders() {
  const token = localStorage.getItem('qa_token');
  return { Authorization: `Bearer ${token || ''}` };
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary border-b border-bg-border pb-3">
        <Icon size={14} className="text-text-muted" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | React.ReactNode; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase font-semibold text-text-muted tracking-wide mb-0.5">{label}</div>
      <div className={`text-sm text-text-secondary ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}

export default function BugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBugById, changeStatus, verifyBug, reopenBug, assignBug, addComment } = useBugStore();
  const { currentUser, getUserById, users } = useUserStore();
  const { getProjectById } = useProjectStore();

  const [verifyModal, setVerifyModal] = useState(false);
  const [reopenModal, setReopenModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyVersion, setVerifyVersion] = useState('');
  const [verifyBuild, setVerifyBuild] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'recording'>('details');
  const [recordings, setRecordings] = useState<BugRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<BugRecording | null>(null);
  const [scriptTab, setScriptTab] = useState<'python' | 'typescript'>('python');

  // Playwright Codegen & Automation Studio States
  const [codegenModal, setCodegenModal] = useState(false);
  const [codegenUrl, setCodegenUrl] = useState('');
  const [codegenLang, setCodegenLang] = useState<'python' | 'javascript'>('python');
  const [codegenLaunching, setCodegenLaunching] = useState(false);
  const [codegenCliCmd, setCodegenCliCmd] = useState('');

  const [customScriptModal, setCustomScriptModal] = useState(false);
  const [customScriptPy, setCustomScriptPy] = useState('');
  const [customScriptTs, setCustomScriptTs] = useState('');

  const [shareModal, setShareModal] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [sharing, setSharing] = useState(false);

  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState('');

  // Load recordings when switching to recording tab
  useEffect(() => {
    if (activeTab !== 'recording' || !id) return;
    fetch(`${API}/bugs/${id}/recordings`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((data: BugRecording[]) => {
        setRecordings(data);
        if (data.length > 0 && !selectedRecording) setSelectedRecording(data[0]);
      })
      .catch(() => {});
  }, [activeTab, id]);

  // Sync edited script text when selected recording or tab changes
  useEffect(() => {
    if (!selectedRecording) return;
    setEditedScript(
      scriptTab === 'python'
        ? selectedRecording.generated_script_py || ''
        : selectedRecording.generated_script_ts || ''
    );
    setIsEditingScript(false);
  }, [selectedRecording, scriptTab]);

  const bug = getBugById(id!);
  if (!bug) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertTriangle size={32} className="text-text-muted" />
      <div className="text-text-muted">Bug not found</div>
      <button onClick={() => navigate('/bugs')} className="btn-secondary btn-sm">Back to Bugs</button>
    </div>
  );

  const project  = getProjectById(bug.projectId);
  const reporter = getUserById(bug.reportedBy);
  const assignee = bug.assignedTo ? getUserById(bug.assignedTo) : null;
  const nextStatuses = BUG_STATUS_FLOW[bug.status] ?? [];
  const isQA = currentUser?.role === 'qa_tester' || currentUser?.role === 'qa_lead';
  const isDev = currentUser?.role === 'developer';

  function handleStatusChange(newStatus: string) {
    if (!currentUser) return;
    changeStatus(bug.id, newStatus as any, currentUser.id);
    toast.success(`Status → ${STATUS_LABELS[newStatus as any]}`);
  }

  function handleVerify() {
    if (!currentUser || !verifyVersion) return;
    verifyBug(bug.id, currentUser.id, verifyNotes, verifyVersion, verifyBuild);
    toast.success('Bug verified ✓');
    setVerifyModal(false);
  }

  function handleReopen() {
    if (!currentUser || !reopenReason.trim()) return;
    reopenBug(bug.id, currentUser.id, reopenReason.trim());
    toast.error('Bug reopened');
    setReopenModal(false);
  }

  const handleLaunchCodegen = async () => {
    const target = codegenUrl.trim() || bug.deviceInfo.url || 'http://localhost:5173';
    setCodegenLaunching(true);
    try {
      const res = await fetch(`${API}/recordings/launch-codegen`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bug_id: bug.id,
          target_url: target,
          language: codegenLang,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to launch codegen');
      const data = await res.json();
      setCodegenCliCmd(data.cli_command);
      toast.success('Playwright browser session started! Record your steps and close the browser.');
      // Refresh recordings list
      fetch(`${API}/bugs/${id}/recordings`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : [])
        .then((recs: BugRecording[]) => {
          setRecordings(recs);
          if (recs.length > 0) setSelectedRecording(recs[0]);
        });
    } catch (e: any) {
      toast.error(e.message || 'Could not launch codegen');
    } finally {
      setCodegenLaunching(false);
    }
  };

  const handleSaveCustomScript = async () => {
    if (!customScriptPy.trim() && !customScriptTs.trim()) {
      toast.error('Please enter script content');
      return;
    }
    try {
      const res = await fetch(`${API}/recordings/custom-script`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bug_id: bug.id,
          generated_script_py: customScriptPy || undefined,
          generated_script_ts: customScriptTs || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save script');
      const newRec: BugRecording = await res.json();
      setRecordings(prev => [newRec, ...prev]);
      setSelectedRecording(newRec);
      setCustomScriptModal(false);
      setCustomScriptPy('');
      setCustomScriptTs('');
      toast.success('Playwright script linked to bug!');
    } catch (e: any) {
      toast.error(e.message || 'Error saving script');
    }
  };

  const handleSaveEditedScript = async () => {
    if (!selectedRecording) return;
    try {
      const payload = scriptTab === 'python'
        ? { generated_script_py: editedScript }
        : { generated_script_ts: editedScript };
      const res = await fetch(`${API}/recordings/${selectedRecording.id}/script`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update script');
      const updatedRec: BugRecording = await res.json();
      setSelectedRecording(updatedRec);
      setRecordings(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));
      setIsEditingScript(false);
      toast.success('Script saved!');
    } catch (e: any) {
      toast.error(e.message || 'Error updating script');
    }
  };

  const handleShareWithDev = async () => {
    if (!selectedRecording) return;
    setSharing(true);
    try {
      const res = await fetch(`${API}/recordings/${selectedRecording.id}/share-to-dev`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: shareMsg }),
      });
      if (!res.ok) throw new Error('Failed to share recording');

      if (currentUser) {
        const devName = assignee ? assignee.name : 'the developer';
        addComment(
          bug.id,
          `🤖 Playwright automation test script shared with ${devName}.\n${shareMsg || ''}`,
          currentUser.id
        );
      }

      setShareModal(false);
      setShareMsg('');
      toast.success('Playwright test script shared with developer!');
    } catch (e: any) {
      toast.error(e.message || 'Error sharing test script');
    } finally {
      setSharing(false);
    }
  };


  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-start gap-3 flex-wrap">
        <button onClick={() => navigate('/bugs')} className="btn-ghost btn-icon mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="code text-xs">{bug.bugId}</span>
            {project && <span className="text-xs text-text-muted">{project.icon} {project.name}</span>}
          </div>
          <h1 className="text-lg font-bold text-text-primary leading-tight">{bug.title}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={bug.status} />
            <SeverityBadge severity={bug.severity} />
            <PriorityBadge priority={bug.priority} />
            <span className="text-xs text-text-muted">{BUG_TYPE_LABELS[bug.type]}</span>
            <span className="text-xs text-text-disabled">·</span>
            <span className="text-xs text-text-muted">{PLATFORM_LABELS[bug.platform]}</span>
            <span className="text-xs text-text-disabled">·</span>
            <span className="text-xs text-text-muted">{ENVIRONMENT_LABELS[bug.environment]}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status transitions */}
          {nextStatuses.filter(s => s !== 'verified' && s !== 'reopened').map(s => (
            <button key={s} onClick={() => handleStatusChange(s)} className="btn-secondary btn-sm">
              → {STATUS_LABELS[s]}
            </button>
          ))}

          {/* QA actions for ready_for_qa */}
          {bug.status === 'ready_for_qa' && (isQA || currentUser?.role === 'admin') && (
            <>
              <button onClick={() => setVerifyModal(true)} className="btn-success btn-sm">
                <CheckCircle2 size={13} /> Verify
              </button>
              <button onClick={() => setReopenModal(true)} className="btn-danger btn-sm">
                <RotateCcw size={13} /> Reopen
              </button>
            </>
          )}

          {/* Reopen from verified */}
          {bug.status === 'verified' && (isQA || currentUser?.role === 'admin') && (
            <button onClick={() => setReopenModal(true)} className="btn-danger btn-sm">
              <RotateCcw size={13} /> Reopen
            </button>
          )}

          <button onClick={() => navigate(`/bugs/${bug.id}/edit`)} className="btn-ghost btn-sm">
            <Edit2 size={13} /> Edit
          </button>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="card p-5">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-4">Bug Lifecycle</div>
        <StatusStepper currentStatus={bug.status} />
        <div className="mt-3 text-[11px] text-text-muted">
          Created {formatDateTime(bug.createdAt)} · Updated {timeAgo(bug.updatedAt)}
          {bug.resolvedAt && ` · Resolved ${formatDateTime(bug.resolvedAt)}`}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-700/50">
        {(
          [['details', 'Details', FileText], ['recording', 'Recording', Video]] as const
        ).map(([tab, label, Icon]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={14} />
            {label}
            {tab === 'recording' && recordings.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-600/20 text-violet-400">{recordings.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Recording tab content */}
      {activeTab === 'recording' && (
        <div className="space-y-5">
          {/* Automation Studio Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 to-slate-900/40 border border-violet-500/20">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal size={16} className="text-violet-400" />
                Playwright Automation Studio
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Record browser actions, generate Playwright tests, and share repeatable scripts with developers
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setCodegenModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-900/30 transition-all"
              >
                <Globe size={13} /> Launch Playwright Recorder
              </button>
              <button
                onClick={() => setCustomScriptModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                <Plus size={13} /> Import Script
              </button>
              {selectedRecording && (
                <button
                  onClick={() => setShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <Share2 size={13} /> Share with Dev
                </button>
              )}
            </div>
          </div>

          {recordings.length === 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: Playwright Codegen */}
                <div
                  onClick={() => setCodegenModal(true)}
                  className="card p-5 cursor-pointer hover:border-violet-500/50 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-105 transition-transform">
                      <Globe size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">Playwright Codegen Browser</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Launch an interactive Chromium browser with Playwright Inspector. Record live clicks & inputs against any target app URL.
                    </p>
                  </div>
                  <button className="mt-4 w-full py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors">
                    Launch Recorder Browser
                  </button>
                </div>

                {/* Option 2: Import Custom Script */}
                <div
                  onClick={() => setCustomScriptModal(true)}
                  className="card p-5 cursor-pointer hover:border-violet-500/50 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-105 transition-transform">
                      <Code2 size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">Import / Paste Script</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Already wrote a Playwright test (.py or .spec.ts) locally? Paste it here to link it to this bug and run automated rechecks.
                    </p>
                  </div>
                  <button className="mt-4 w-full py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors">
                    Paste Playwright Script
                  </button>
                </div>

                {/* Option 3: In-page Session Recorder */}
                <div className="card p-5 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-red-400 mb-3">
                      <Video size={20} />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">In-Page Screen & DOM Recorder</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Capture actions right in this browser tab using the floating recording widget at the bottom right.
                    </p>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-500 font-medium">
                    ↘ See floating widget at bottom right
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Recording selector tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {recordings.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecording(r)}
                    className={`flex items-center gap-2 flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedRecording?.id === r.id
                        ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-sm'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <Terminal size={12} />
                    Test #{i + 1}
                    {r.actions_json.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-mono">
                        {r.actions_json.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {selectedRecording && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left: video + timeline */}
                  <div className="space-y-4">
                    {/* Video Player */}
                    {selectedRecording.video_path ? (
                      <div className="card overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 text-sm font-semibold text-slate-200">
                          <Film size={14} className="text-violet-400" /> Video Recording
                        </div>
                        <video
                          controls
                          className="w-full max-h-64 bg-black"
                          src={`${API.replace('/api/v1', '')}/static/${selectedRecording.video_path}`}
                        />
                      </div>
                    ) : (
                      <div className="card p-5 text-center text-slate-400 text-xs">
                        <Terminal size={22} className="mx-auto mb-2 opacity-50 text-violet-400" />
                        <span className="font-semibold text-white">Playwright Automation Script</span>
                        <p className="text-slate-500 mt-1">Ready for automated recheck & test execution</p>
                      </div>
                    )}

                    {/* Action Timeline */}
                    <div className="card p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-3">
                        <List size={14} className="text-violet-400" /> Recorded Steps & Actions
                        <span className="ml-auto text-xs text-slate-500">{selectedRecording.actions_json.length} captured</span>
                      </div>
                      <div className="overflow-auto max-h-48">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-700/50">
                              <th className="text-left py-1.5 pr-3">Time</th>
                              <th className="text-left py-1.5 pr-3">Action</th>
                              <th className="text-left py-1.5">Selector / URL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRecording.actions_json.map((a, i) => (
                              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                <td className="py-1 pr-3 text-slate-500 font-mono">
                                  {String(Math.floor((a.timestamp ?? 0) / 60000)).padStart(2,'0')}:{String(Math.floor(((a.timestamp ?? 0) % 60000) / 1000)).padStart(2,'0')}
                                </td>
                                <td className="py-1 pr-3 text-violet-300 font-semibold capitalize">{a.type}</td>
                                <td className="py-1 text-slate-400 font-mono truncate max-w-[180px]">{a.selector || a.url || a.value || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {selectedRecording.actions_json.length === 0 && (
                          <div className="text-center text-slate-600 py-4">Direct Playwright script linked (no DOM events)</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Playwright script + replay */}
                  <div className="space-y-4">
                    {/* Script viewer & editor */}
                    <div className="card">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 flex-wrap">
                        <Code2 size={14} className="text-violet-400" />
                        <span className="text-sm font-semibold text-slate-200 flex-1">Playwright Script</span>
                        <div className="flex gap-1">
                          {(['python', 'typescript'] as const).map(lang => (
                            <button
                              key={lang}
                              onClick={() => setScriptTab(lang)}
                              className={`text-xs px-2.5 py-1 rounded-lg transition-colors capitalize ${
                                scriptTab === lang
                                  ? 'bg-violet-600/20 text-violet-300'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {lang === 'python' ? '.py' : '.spec.ts'}
                            </button>
                          ))}
                        </div>

                        {/* Edit / Save toggle */}
                        {isEditingScript ? (
                          <button
                            onClick={handleSaveEditedScript}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-600/20 text-green-300 border border-green-500/40 hover:bg-green-600/30 transition-colors"
                          >
                            <Save size={12} /> Save
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditingScript(true)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 transition-colors"
                          >
                            <Edit2 size={11} /> Edit
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const script = scriptTab === 'python' ? selectedRecording.generated_script_py : selectedRecording.generated_script_ts;
                            navigator.clipboard.writeText(script || '').then(() => toast.success('Script copied!'));
                          }}
                          className="p-1.5 text-slate-500 hover:text-white transition-colors"
                          title="Copy Script"
                        >
                          <Copy size={13} />
                        </button>
                        <a
                          href={`${API}/recordings/${selectedRecording.id}/script/${scriptTab}`}
                          download
                          className="p-1.5 text-slate-500 hover:text-white transition-colors"
                          title="Download Script"
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={() => setShareModal(true)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Share with Developer"
                        >
                          <Share2 size={13} />
                        </button>
                      </div>

                      {/* Script content or editor */}
                      {isEditingScript ? (
                        <div className="p-3 space-y-2 bg-slate-950">
                          <textarea
                            className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 min-h-[220px] focus:outline-none focus:border-violet-500"
                            value={editedScript}
                            onChange={e => setEditedScript(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setIsEditingScript(false);
                                setEditedScript(scriptTab === 'python' ? (selectedRecording.generated_script_py || '') : (selectedRecording.generated_script_ts || ''));
                              }}
                              className="btn-ghost btn-sm text-xs"
                            >
                              Cancel
                            </button>
                            <button onClick={handleSaveEditedScript} className="btn-primary btn-sm text-xs">
                              <Save size={12} /> Save Script
                            </button>
                          </div>
                        </div>
                      ) : (
                        <pre className="p-4 text-xs font-mono text-slate-300 overflow-auto max-h-64 bg-slate-950/50 leading-relaxed">
                          {(scriptTab === 'python'
                            ? selectedRecording.generated_script_py
                            : selectedRecording.generated_script_ts
                          ) || '# No script generated yet'}
                        </pre>
                      )}

                      {/* Quick local execution CLI snippet */}
                      <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                        <span className="font-mono truncate">
                          python recording_{selectedRecording.id.substring(0, 8)}.py
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`python recording_${selectedRecording.id.substring(0, 8)}.py`);
                            toast.success('Run command copied!');
                          }}
                          className="text-violet-400 hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
                        >
                          <Copy size={10} /> Copy CLI
                        </button>
                      </div>
                    </div>

                    {/* Replay History Runner */}
                    <div className="card p-4">
                      <ReplayHistoryPanel recordingId={selectedRecording.id} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Details tab content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column — 2/3 */}
          <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {bug.description && (
            <Section title="Description" icon={MessageSquare}>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{bug.description}</p>
            </Section>
          )}

          {/* Reproduction */}
          <Section title="Reproduction Steps" icon={ChevronRight}>
            <div className="space-y-3">
              {bug.stepsToReproduce.length > 0 && (
                <div>
                  <div className="label">Steps to Reproduce</div>
                  <ol className="space-y-1.5 mt-2">
                    {bug.stepsToReproduce.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-text-secondary">
                        <span className="text-brand font-bold font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="label">Expected Result</div>
                  <div className="text-sm text-verified bg-verified/5 border border-verified/20 rounded-lg p-3 leading-relaxed">
                    {bug.expectedResult}
                  </div>
                </div>
                <div>
                  <div className="label">Actual Result</div>
                  <div className="text-sm text-critical bg-critical/5 border border-critical/20 rounded-lg p-3 leading-relaxed">
                    {bug.actualResult}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* System Environment */}
          {(bug.deviceInfo.browser || bug.deviceInfo.os || bug.deviceInfo.url || bug.deviceInfo.appVersion || bug.deviceInfo.deviceLogs) && (
            <Section title="System Environment" icon={Monitor}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Browser / Client"   value={bug.deviceInfo.browser}      mono />
                <Field label="Operating System"  value={bug.deviceInfo.os}           mono />
                <Field label="App Version"       value={bug.deviceInfo.appVersion}   mono />
                <Field label="URL Route"         value={bug.deviceInfo.url}          mono />
                <Field label="Tester / Submitter" value={bug.deviceInfo.operatorName} />
              </div>
              {bug.deviceInfo.deviceLogs && (
                <div className="mt-3">
                  <div className="label">Stack Trace / Console Logs</div>
                  <pre className="text-xs font-mono bg-bg-base border border-bg-border rounded-lg p-3 overflow-auto max-h-40 text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {bug.deviceInfo.deviceLogs}
                  </pre>
                </div>
              )}
            </Section>
          )}

          {/* QA Verification */}
          {bug.qaVerification && (bug.qaVerification.fixVersion || bug.qaVerification.testNotes || bug.qaVerification.reopenReason) && (
            <Section title="QA Verification" icon={CheckCircle2}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Fix Version"  value={bug.qaVerification.fixVersion}  mono />
                <Field label="Build Number" value={bug.qaVerification.buildNumber}  mono />
                <Field label="Verified By"  value={bug.qaVerification.verifiedBy ? getUserById(bug.qaVerification.verifiedBy)?.name : undefined} />
              </div>
              {bug.qaVerification.testNotes && <Field label="Test Notes" value={bug.qaVerification.testNotes} />}
              {bug.qaVerification.reopenReason && (
                <div className="rounded-lg border border-critical/20 bg-critical/5 p-3">
                  <div className="label text-critical">Reopen Reason</div>
                  <div className="text-sm text-text-secondary mt-1">{bug.qaVerification.reopenReason}</div>
                </div>
              )}
            </Section>
          )}

          {/* Attachments */}
          {bug.attachments && bug.attachments.length > 0 && (
            <Section title="Attachments & Screenshots" icon={Paperclip}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {bug.attachments.map(att => {
                  const isImg = att.type === 'image' || att.mimeType?.startsWith('image/');
                  return (
                    <div key={att.id} className="relative group rounded-xl overflow-hidden border border-bg-border bg-bg-card/40 backdrop-blur-sm shadow-sm cursor-pointer hover:border-brand/40 transition-all duration-150"
                      onClick={() => isImg && setSelectedImage(att.url || '')}
                    >
                      {isImg ? (
                        <div className="aspect-video w-full bg-bg-base flex items-center justify-center overflow-hidden">
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        </div>
                      ) : (
                        <div className="aspect-video w-full bg-bg-base flex flex-col items-center justify-center p-3 text-center">
                          <FileText size={28} className="text-text-muted mb-1" />
                          <span className="text-[10px] text-text-disabled uppercase font-bold tracking-wider">{att.type}</span>
                        </div>
                      )}
                      <div className="p-3 bg-bg-card/90">
                        <div className="text-xs font-semibold text-text-primary truncate" title={att.name}>{att.name}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{(att.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Activity Timeline */}
          <Section title="Activity & Comments" icon={MessageSquare}>
            <ActivityTimeline bugId={bug.id} history={bug.history} comments={bug.comments} />
          </Section>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">
          {/* People */}
          <div className="card p-4 space-y-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">People</div>
            <div>
              <div className="label">Reported By</div>
              {reporter && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: reporter.color + '30', color: reporter.color }}>
                    {reporter.initials}
                  </div>
                  <span className="text-sm text-text-secondary">{reporter.name}</span>
                </div>
              )}
            </div>
            <div>
              <div className="label">Assigned To</div>
              <div className="flex items-center gap-2 mt-1">
                {assignee ? (
                  <>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ backgroundColor: assignee.color + '30', color: assignee.color }}>
                      {assignee.initials}
                    </div>
                    <span className="text-sm text-text-secondary">{assignee.name}</span>
                  </>
                ) : <span className="text-sm text-text-muted">Unassigned</span>}
              </div>
              {currentUser && !['closed', 'rejected'].includes(bug.status) && (
                <select
                  className="select text-xs py-1.5 mt-2 w-full"
                  value={bug.assignedTo ?? ''}
                  onChange={e => {
                    if (e.target.value) assignBug(bug.id, e.target.value, currentUser.id);
                  }}
                >
                  <option value="">Reassign…</option>
                  {users.filter(u => u.role === 'developer').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Properties */}
          <div className="card p-4 space-y-3">
            <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Properties</div>
            <Field label="Version"     value={bug.affectedVersion} mono />
            <Field label="Platform"    value={PLATFORM_LABELS[bug.platform]} />
            <Field label="Environment" value={ENVIRONMENT_LABELS[bug.environment]} />
            <Field label="Type"        value={BUG_TYPE_LABELS[bug.type]} />
            {bug.tags.length > 0 && (
              <div>
                <div className="label">Tags</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bug.tags.map(t => (
                    <span key={t} className="text-[10px] text-text-muted bg-bg-base border border-bg-border px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Developer Info */}
          {(bug.developerInfo.branchName || bug.developerInfo.commitId || bug.developerInfo.pullRequestLink) && (
            <div className="card p-4 space-y-3">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1">
                <GitBranch size={11} /> Developer Info
              </div>
              <Field label="Branch"  value={bug.developerInfo.branchName}    mono />
              <Field label="Commit"  value={bug.developerInfo.commitId}       mono />
              <Field label="Est. Fix Time" value={bug.developerInfo.estimatedFixTime} />
              {bug.developerInfo.pullRequestLink && (
                <div>
                  <div className="label">Pull Request</div>
                  <a href={bug.developerInfo.pullRequestLink} target="_blank" rel="noreferrer"
                    className="text-xs text-brand hover:underline flex items-center gap-1 mt-1">
                    <Link2 size={11} /> View PR
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Related Bugs */}
          {bug.relatedBugIds.length > 0 && (
            <div className="card p-4 space-y-2">
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Related Bugs</div>
              {bug.relatedBugIds.map(rid => {
                const rb = getBugById(rid);
                return rb ? (
                  <button key={rid} onClick={() => navigate(`/bugs/${rid}`)}
                    className="w-full flex items-center gap-2 text-left hover:bg-bg-muted p-1.5 rounded transition-colors">
                    <span className="code text-[10px]">{rb.bugId}</span>
                    <span className="text-xs text-text-muted truncate flex-1">{rb.title}</span>
                    <StatusBadge status={rb.status} size="sm" />
                  </button>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    )}

      {/* end details tab */}

      {/* Floating Recorder Widget */}
      <RecorderWidget
        bugId={bug.id}
        onRecordingDone={recId => {
          fetch(`${API}/recordings/${recId}`, { headers: authHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then((rec: BugRecording | null) => {
              if (rec) {
                setRecordings(prev => [rec, ...prev.filter(r => r.id !== rec.id)]);
                setSelectedRecording(rec);
                setActiveTab('recording');
              }
            })
            .catch(() => {});
        }}
      />

      {/* Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 shadow-card-hover">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                <CheckCircle2 size={16} className="text-verified" /> Verify Bug Fix
              </div>
              <button onClick={() => setVerifyModal(false)} className="btn-ghost btn-icon"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Fix Version *</label>
                <input className="input" placeholder="e.g. v3.2.2" value={verifyVersion} onChange={e => setVerifyVersion(e.target.value)} />
              </div>
              <div>
                <label className="label">Build Number</label>
                <input className="input" placeholder="e.g. BUILD-20260529" value={verifyBuild} onChange={e => setVerifyBuild(e.target.value)} />
              </div>
              <div>
                <label className="label">Test Notes</label>
                <textarea className="textarea min-h-[80px]" placeholder="What did you test? What passed?" value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setVerifyModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={handleVerify} disabled={!verifyVersion} className="btn-success btn-sm disabled:opacity-40">
                <CheckCircle2 size={13} /> Mark Verified
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {reopenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6 space-y-4 shadow-card-hover">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                <RotateCcw size={16} className="text-critical" /> Reopen Bug
              </div>
              <button onClick={() => setReopenModal(false)} className="btn-ghost btn-icon"><X size={14} /></button>
            </div>
            <div>
              <label className="label">Why are you reopening this? *</label>
              <textarea
                className="textarea min-h-[100px]"
                placeholder="Describe what still fails and how you tested it…"
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReopenModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={handleReopen} disabled={!reopenReason.trim()} className="btn-danger btn-sm disabled:opacity-40">
                <RotateCcw size={13} /> Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Image View Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            <a href={selectedImage} download={`Screenshot-${Date.now()}.png`} onClick={e => e.stopPropagation()} className="btn-secondary btn-sm bg-black/40 border-white/10 text-white hover:bg-black/60">
              Download
            </a>
            <button onClick={() => setSelectedImage(null)} className="btn-ghost btn-icon bg-black/40 hover:bg-black/60 text-white rounded-full">
              <X size={16} />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Attachment view" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/10 shadow-2xl animate-slide-up" />
          </div>
        </div>
      )}

      {/* Playwright Codegen Launcher Modal */}
      {codegenModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card w-full max-w-lg p-6 space-y-5 shadow-2xl border-violet-500/30">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-violet-400" />
                <h3 className="text-base font-bold text-white">Playwright Codegen Browser</h3>
              </div>
              <button onClick={() => setCodegenModal(false)} className="btn-ghost btn-icon"><X size={14} /></button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Launches an interactive Chromium browser with Playwright Inspector. Record clicks, typing, and navigation on your application to automatically generate an automated test script.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Application URL *</label>
                <input
                  className="input w-full font-mono text-xs"
                  placeholder="e.g. http://localhost:5173 or https://staging.myapp.com"
                  value={codegenUrl || bug.deviceInfo.url || 'http://localhost:5173'}
                  onChange={e => setCodegenUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Generated Language Format</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCodegenLang('python')}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      codegenLang === 'python'
                        ? 'bg-violet-600/20 text-violet-300 border-violet-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    🐍 Python (Playwright Sync)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodegenLang('javascript')}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      codegenLang === 'javascript'
                        ? 'bg-violet-600/20 text-violet-300 border-violet-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    ⚡ TypeScript / JS (@playwright/test)
                  </button>
                </div>
              </div>

              {/* Terminal CLI Command alternative */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-medium"><Terminal size={12} /> Or run locally via CLI:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = codegenUrl || bug.deviceInfo.url || 'http://localhost:5173';
                      const cmd = `playwright codegen ${url} --target ${codegenLang} -o test_${bug.bugId}.py`;
                      navigator.clipboard.writeText(cmd);
                      toast.success('CLI command copied!');
                    }}
                    className="text-violet-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
                <code className="text-[11px] font-mono text-slate-300 block truncate">
                  playwright codegen {codegenUrl || bug.deviceInfo.url || 'http://localhost:5173'} --target {codegenLang} -o test_{bug.bugId}.py
                </code>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button onClick={() => setCodegenModal(false)} className="btn-secondary btn-sm">Close</button>
              <button
                onClick={handleLaunchCodegen}
                disabled={codegenLaunching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-900/40 transition-all disabled:opacity-50"
              >
                <Globe size={13} />
                {codegenLaunching ? 'Launching Browser…' : 'Launch Browser Recorder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import / Custom Script Modal */}
      {customScriptModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card w-full max-w-xl p-6 space-y-4 shadow-2xl border-blue-500/30">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-blue-400" />
                <h3 className="text-base font-bold text-white">Import Playwright Test Script</h3>
              </div>
              <button onClick={() => setCustomScriptModal(false)} className="btn-ghost btn-icon"><X size={14} /></button>
            </div>

            <p className="text-xs text-slate-300">
              Paste your Playwright script code below. This test will be attached to <strong>{bug.bugId}</strong> so QA and developers can run automated repeats to reproduce and verify fixes.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Python Playwright Script (.py)</label>
                <textarea
                  className="w-full font-mono text-xs p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 min-h-[140px] focus:outline-none focus:border-blue-500"
                  placeholder="from playwright.sync_api import sync_playwright&#10;&#10;def run():&#10;    with sync_playwright() as p:&#10;        browser = p.chromium.launch()&#10;        ..."
                  value={customScriptPy}
                  onChange={e => setCustomScriptPy(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">TypeScript / JavaScript Script (.spec.ts) [Optional]</label>
                <textarea
                  className="w-full font-mono text-xs p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 min-h-[100px] focus:outline-none focus:border-blue-500"
                  placeholder="import { test, expect } from '@playwright/test';&#10;&#10;test('reproduce bug', async ({ page }) => { ... });"
                  value={customScriptTs}
                  onChange={e => setCustomScriptTs(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button onClick={() => setCustomScriptModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button
                onClick={handleSaveCustomScript}
                disabled={!customScriptPy.trim() && !customScriptTs.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/40 transition-all disabled:opacity-40"
              >
                <Save size={13} /> Save & Link Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share with Developer Modal */}
      {shareModal && selectedRecording && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="card w-full max-w-lg p-6 space-y-4 shadow-2xl border-emerald-500/30">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-emerald-400" />
                <h3 className="text-base font-bold text-white">Share Playwright Test with Developer</h3>
              </div>
              <button onClick={() => setShareModal(false)} className="btn-ghost btn-icon"><X size={14} /></button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-300 font-bold flex items-center justify-center text-xs">
                {assignee ? assignee.initials : 'DEV'}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Recipient: {assignee ? assignee.name : 'Unassigned (Will post to bug activity)'}
                </div>
                <div className="text-[11px] text-slate-400">
                  Dev can replay this script repeatedly to reproduce the bug until it is fixed!
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Message / Testing Instructions</label>
                <textarea
                  className="w-full text-xs p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 min-h-[80px] focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Please use this automated Playwright test to reproduce the issue. Run it locally or in OmniQA until the test passes!"
                  value={shareMsg}
                  onChange={e => setShareMsg(e.target.value)}
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-emerald-400">Terminal Command for Dev:</span>
                  <button
                    onClick={() => {
                      const cmd = `curl -H "Authorization: Bearer ${localStorage.getItem('qa_token') || ''}" ${API}/recordings/${selectedRecording.id}/script/python > reproduce_${bug.bugId}.py && python reproduce_${bug.bugId}.py`;
                      navigator.clipboard.writeText(cmd);
                      toast.success('Reproduction command copied!');
                    }}
                    className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Copy size={11} /> Copy Command
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  python recording_{selectedRecording.id.substring(0, 8)}.py
                </pre>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
              <button onClick={() => setShareModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button
                onClick={handleShareWithDev}
                disabled={sharing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-all disabled:opacity-50"
              >
                <Share2 size={13} />
                {sharing ? 'Posting to Comments…' : 'Share & Post to Bug Comments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

