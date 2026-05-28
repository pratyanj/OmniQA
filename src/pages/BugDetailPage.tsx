import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Edit2, ChevronRight, AlertTriangle,
  Monitor, User, CheckCircle2, RotateCcw, X,
  Cpu, Link2, GitBranch, Hash, Clock, Tag, MessageSquare,
  Paperclip, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useBugStore } from '@/stores/bugStore';
import { useUserStore } from '@/stores/userStore';
import { useProjectStore } from '@/stores/projectStore';
import { StatusBadge, SeverityBadge, PriorityBadge } from '@/components/bugs/Badges';
import StatusStepper from '@/components/bugs/StatusStepper';
import ActivityTimeline from '@/components/bugs/ActivityTimeline';
import {
  STATUS_LABELS, BUG_TYPE_LABELS, PLATFORM_LABELS,
  ENVIRONMENT_LABELS, BUG_STATUS_FLOW, PRIORITY_LABELS,
} from '@/types';
import { formatDateTime, timeAgo } from '@/utils/dateUtils';

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
  const { getBugById, changeStatus, verifyBug, reopenBug, assignBug } = useBugStore();
  const { currentUser, getUserById, users } = useUserStore();
  const { getProjectById } = useProjectStore();

  const [verifyModal, setVerifyModal] = useState(false);
  const [reopenModal, setReopenModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyVersion, setVerifyVersion] = useState('');
  const [verifyBuild, setVerifyBuild] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    </div>
  );
}
