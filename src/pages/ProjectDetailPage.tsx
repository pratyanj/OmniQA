import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bug, GitBranch, FolderOpen, Users, ExternalLink, Plus } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useBugStore } from '@/stores/bugStore';
import { useUserStore } from '@/stores/userStore';
import { StatusBadge, SeverityBadge } from '@/components/bugs/Badges';
import { ENVIRONMENT_LABELS, ROLE_LABELS } from '@/types';
import { timeAgo } from '@/utils/dateUtils';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProjectById } = useProjectStore();
  const { getBugsByProject } = useBugStore();
  const { getUserById } = useUserStore();

  const project = getProjectById(id!);
  if (!project) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-text-muted">Project not found</div>
      <button onClick={() => navigate('/projects')} className="btn-secondary btn-sm">Back to Projects</button>
    </div>
  );

  const bugs = getBugsByProject(project.id);
  const open = bugs.filter(b => !['closed', 'rejected', 'duplicate'].includes(b.status));
  const closed = bugs.filter(b => ['closed', 'verified'].includes(b.status));
  const critical = open.filter(b => b.severity === 'critical').length;
  const qaLead = getUserById(project.qaLead);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/projects')} className="btn-ghost btn-icon">
          <ArrowLeft size={16} />
        </button>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: project.color + '20', border: `1px solid ${project.color}30` }}
        >
          {project.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{project.name}</h1>
          <p className="text-sm text-text-muted">{project.client} · {project.currentVersion}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => navigate(`/bugs/new?project=${project.id}`)} className="btn-primary btn-sm">
            <Plus size={14} /> Log Bug
          </button>
          <button onClick={() => navigate(`/bugs?projectId=${project.id}`)} className="btn-secondary btn-sm">
            <Bug size={14} /> View All Bugs
          </button>
        </div>
      </div>

      {/* Stats + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 space-y-3">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Project Info</div>
          <p className="text-sm text-text-secondary leading-relaxed">{project.description}</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-text-muted">
              <GitBranch size={12} /> <span className="text-text-secondary">{project.currentVersion}</span>
            </div>
            <div className="flex items-center gap-2 text-text-muted">
              <FolderOpen size={12} /> <span className="text-text-secondary">{ENVIRONMENT_LABELS[project.environment]}</span>
            </div>
            {project.repoLink && (
              <a href={project.repoLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand hover:underline">
                <ExternalLink size={12} /> Repository
              </a>
            )}
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Statistics</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Bugs',  value: bugs.length,   color: '#6366f1' },
              { label: 'Open',        value: open.length,   color: '#f97316' },
              { label: 'Critical',    value: critical,      color: '#ef4444' },
              { label: 'Resolved',    value: closed.length, color: '#22c55e' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 bg-bg-base rounded-lg">
                <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1">
            <Users size={12} /> Team
          </div>
          {qaLead && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: qaLead.color + '30', color: qaLead.color }}>
                {qaLead.initials}
              </div>
              <div>
                <div className="text-xs font-medium text-text-primary">{qaLead.name}</div>
                <div className="text-[10px] text-text-muted">QA Lead</div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {project.teamMembers.map(uid => {
              const u = getUserById(uid);
              if (!u || u.id === project.qaLead) return null;
              return (
                <div key={uid} title={`${u.name} — ${ROLE_LABELS[u.role]}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-default"
                  style={{ backgroundColor: u.color + '30', color: u.color, border: `1px solid ${u.color}40` }}>
                  {u.initials}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bug List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
          <Bug size={14} className="text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">Recent Bugs</span>
          <span className="text-xs text-text-muted">({bugs.length} total)</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Bug ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {bugs.slice(0, 15).map(bug => (
              <tr key={bug.id} className="cursor-pointer" onClick={() => navigate(`/bugs/${bug.id}`)}>
                <td className="font-mono text-[11px] text-text-muted">{bug.bugId}</td>
                <td className="max-w-xs">
                  <span className="text-text-primary hover:text-brand transition-colors text-xs truncate block">{bug.title}</span>
                </td>
                <td><SeverityBadge severity={bug.severity} size="sm" /></td>
                <td><StatusBadge status={bug.status} size="sm" /></td>
                <td className="text-xs text-text-muted">{timeAgo(bug.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
