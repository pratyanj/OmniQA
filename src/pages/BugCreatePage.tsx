import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Lightbulb, ChevronRight, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBugStore } from '@/stores/bugStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import DuplicateDetector from '@/components/bugs/DuplicateDetector';
import AttachmentUploader from '@/components/bugs/AttachmentUploader';
import {
  BugStatus, BugSeverity, BugPriority, BugType, Platform, Environment,
  STATUS_LABELS, SEVERITY_LABELS, PRIORITY_LABELS, BUG_TYPE_LABELS,
  PLATFORM_LABELS, ENVIRONMENT_LABELS,
} from '@/types';
import { suggestSeverity } from '@/utils/bugUtils';

export default function BugCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createBug } = useBugStore();
  const { projects } = useProjectStore();
  const { currentUser, users } = useUserStore();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(searchParams.get('project') ?? projects[0]?.id ?? '');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [priority, setPriority] = useState<BugPriority>('p2');
  const [type, setType] = useState<BugType>('functional');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [platform, setPlatform] = useState<Platform>('windows');
  const [affectedVersion, setAffectedVersion] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState(['', '', '']);
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [browser, setBrowser] = useState('');
  const [os, setOs] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [url, setUrl] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedFixTime, setEstimatedFixTime] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Auto-suggest severity from title
  const suggested = suggestSeverity(title, description);

  function addStep() { setSteps(s => [...s, '']); }
  function removeStep(i: number) { setSteps(s => s.filter((_, idx) => idx !== i)); }
  function updateStep(i: number, val: string) { setSteps(s => s.map((x, idx) => idx === i ? val : x)); }

  function handleSubmit() {
    if (!title.trim() || !projectId) {
      toast.error('Title and project are required');
      return;
    }
    setSubmitting(true);
    const bug = createBug({
      title: title.trim(),
      projectId,
      status: 'new',
      severity,
      priority,
      type,
      environment,
      platform,
      affectedVersion,
      description,
      stepsToReproduce: steps.filter(s => s.trim()),
      expectedResult: expected,
      actualResult: actual,
      assignedTo: assignedTo || undefined,
      deviceInfo: { browser, os, appVersion, url, operatorName },
      developerInfo: { assignedTo: assignedTo || undefined, estimatedFixTime },
      qaVerification: {},
      attachments: attachments.map((f) => ({
        type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'other',
        name: f.name,
        size: f.size,
        url: f.dataUrl,
        uploadedBy: currentUser?.id ?? 'u1',
        uploadedAt: new Date().toISOString(),
        mimeType: f.type,
      })),
      relatedBugIds: [],
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    }, currentUser?.id ?? 'u1');

    toast.success(`${bug.bugId} created!`);
    navigate(`/bugs/${bug.id}`);
  }

  const severities: BugSeverity[] = ['critical', 'high', 'medium', 'low', 'cosmetic'];
  const priorities: BugPriority[] = ['p0', 'p1', 'p2', 'p3'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 animate-fade-in">
      {/* Top Header / Sticky Bar */}
      <div className="flex items-center justify-between border-b border-bg-border pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost btn-icon">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Log New Defect</h1>
            <p className="text-sm text-text-muted">Create a detailed bug report for the development queue</p>
          </div>
        </div>
        
        {/* Top Header Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm py-2 px-4 text-xs">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !projectId || submitting}
            className="btn-primary btn-sm py-2 px-4 text-xs font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Plus size={13} /> Create Bug</>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 width) - Title, Description, Reproduction, Expected/Actual */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Title & Description Section */}
          <div className="card p-6 space-y-5">
            <div className="space-y-1">
              <label className="label text-[10px] font-bold text-text-muted tracking-wider uppercase">Bug Title *</label>
              <input
                id="bug-title-input"
                className="w-full bg-transparent border-0 border-b border-bg-border/60 focus:border-brand focus:ring-0 text-xl font-bold px-0 py-2.5 text-text-primary placeholder:text-text-muted/40 transition-colors focus:outline-none"
                placeholder="E.g., Checkout page freezes when double-clicking Pay button"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              {/* Severity suggestion */}
              {suggested && suggested !== severity && title.length > 10 && (
                <div className="flex items-center gap-2 mt-2 text-xs text-medium bg-medium/5 border border-medium/20 rounded-lg px-3 py-2 w-fit">
                  <Lightbulb size={12} className="text-brand animate-pulse" />
                  <span>Suggested severity: <strong>{suggested}</strong></span>
                  <button onClick={() => setSeverity(suggested as BugSeverity)} className="text-brand hover:underline font-semibold ml-1">Apply</button>
                </div>
              )}
            </div>

            {/* Duplicate detector */}
            {title.length > 10 && (
              <div className="border border-bg-border/40 rounded-xl overflow-hidden">
                <DuplicateDetector title={title} />
              </div>
            )}

            <div className="space-y-1">
              <label className="label text-[10px] font-bold text-text-muted tracking-wider uppercase">Detailed Description</label>
              <textarea
                id="bug-description"
                className="textarea min-h-[120px] bg-bg-base/30 text-sm focus:bg-transparent"
                placeholder="Provide background context, logs or stack traces, and impact on system usability…"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Reproduction Steps Section */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-bg-border/30 pb-3">
              <div className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <ChevronRight size={14} className="text-brand" />
                Reproduction Steps
              </div>
              <button onClick={addStep} className="btn-ghost btn-xs flex items-center gap-1 text-brand hover:bg-brand-glow py-1">
                <Plus size={12} /> Add Step
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <span className="text-brand font-mono font-bold text-xs w-6 text-right flex-shrink-0 bg-brand-glow rounded py-0.5 px-1">{i + 1}</span>
                  <input
                    className="input flex-1 bg-bg-base/30 focus:bg-transparent text-sm"
                    placeholder={`Step ${i + 1}: e.g. Navigate to checkout and enter visa details…`}
                    value={step}
                    onChange={e => updateStep(i, e.target.value)}
                  />
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-text-muted hover:text-critical transition-colors p-1 flex-shrink-0 opacity-40 group-hover:opacity-100">
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="label text-[10px] font-bold text-text-muted tracking-wider uppercase">Expected Result</label>
                <textarea
                  id="expected-result"
                  className="textarea min-h-[100px] border-verified/20 focus:border-verified bg-bg-base/20 text-sm leading-relaxed"
                  placeholder="What should the system do under correct behavior?"
                  value={expected}
                  onChange={e => setExpected(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="label text-[10px] font-bold text-text-muted tracking-wider uppercase">Actual Result</label>
                <textarea
                  id="actual-result"
                  className="textarea min-h-[100px] border-critical/20 focus:border-critical bg-bg-base/20 text-sm leading-relaxed"
                  placeholder="What does the system actually do?"
                  value={actual}
                  onChange={e => setActual(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="card p-6 space-y-4">
            <div className="text-xs font-semibold text-text-primary uppercase tracking-wider border-b border-bg-border/30 pb-3 flex items-center gap-2">
              <Paperclip size={14} className="text-brand" />
              Attachments & Screenshots
            </div>
            <AttachmentUploader onFilesSelected={setAttachments} />
          </div>

        </div>

        {/* Right Column (1/3 width) - Metadata, Environment & Assignment */}
        <div className="space-y-6">
          
          {/* Core Classification Card */}
          <div className="card p-5 space-y-4">
            <div className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-bg-border/30 pb-2">Classification</div>
            
            <div className="space-y-3">
              <div>
                <label className="label">Project *</label>
                <select id="bug-project-select" className="select text-sm" value={projectId} onChange={e => setProjectId(e.target.value)}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Affected Version</label>
                <input className="input" placeholder="E.g. v3.2.1" value={affectedVersion} onChange={e => setAffectedVersion(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Severity</label>
                  <select id="bug-severity-select" className="select" value={severity} onChange={e => setSeverity(e.target.value as BugSeverity)}>
                    {severities.map(s => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select id="bug-priority-select" className="select" value={priority} onChange={e => setPriority(e.target.value as BugPriority)}>
                    {priorities.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bug Type</label>
                  <select className="select" value={type} onChange={e => setType(e.target.value as BugType)}>
                    {(Object.entries(BUG_TYPE_LABELS) as [BugType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Environment</label>
                  <select className="select" value={environment} onChange={e => setEnvironment(e.target.value as Environment)}>
                    {(Object.entries(ENVIRONMENT_LABELS) as [Environment, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tech Environment Card */}
          <div className="card p-5 space-y-4">
            <div className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-bg-border/30 pb-2">Technical Environment</div>
            
            <div className="space-y-3">
              <div>
                <label className="label">Platform</label>
                <select className="select" value={platform} onChange={e => setPlatform(e.target.value as Platform)}>
                  {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">URL Route</label>
                <input className="input font-mono text-xs" placeholder="E.g. /checkout/pay" value={url} onChange={e => setUrl(e.target.value)} />
              </div>
              <div>
                <label className="label">Browser / Client</label>
                <input className="input font-mono text-xs" placeholder="E.g. Chrome 125.0" value={browser} onChange={e => setBrowser(e.target.value)} />
              </div>
              <div>
                <label className="label">Operating System</label>
                <input className="input font-mono text-xs" placeholder="E.g. macOS Sonoma" value={os} onChange={e => setOs(e.target.value)} />
              </div>
              <div>
                <label className="label">App Version</label>
                <input className="input font-mono text-xs" placeholder="E.g. v3.2.1" value={appVersion} onChange={e => setAppVersion(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Assignment & Owner Card */}
          <div className="card p-5 space-y-4">
            <div className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-bg-border/30 pb-2">Ownership & Planning</div>
            
            <div className="space-y-3">
              <div>
                <label className="label">Tester / Submitter</label>
                <input className="input" placeholder="E.g. Priya Mehta" value={operatorName} onChange={e => setOperatorName(e.target.value)} />
              </div>
              <div>
                <label className="label">Assign To Developer</label>
                <select className="select" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.filter(u => u.role === 'developer').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Estimated Fix Time</label>
                <input className="input" placeholder="E.g. 8 hours" value={estimatedFixTime} onChange={e => setEstimatedFixTime(e.target.value)} />
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input className="input" placeholder="E.g. payments, high-severity" value={tags} onChange={e => setTags(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Footer Actions inside Card for easy scrolling access */}
          <div className="card p-4 flex gap-3 shadow-card-hover">
            <button onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center py-2.5 text-sm">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !projectId || submitting}
              className="btn-primary flex-1 justify-center py-2.5 font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Plus size={14} /> Create Bug</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
