import { Settings, Users, Shield, Workflow } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { ROLE_LABELS } from '@/types';

export default function AdminPage() {
  const { users, currentUser } = useUserStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Settings size={20} className="text-brand" /> Admin Panel
        </h1>
        <p className="text-sm text-text-muted mt-0.5">System configuration and user management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users size={14} className="text-text-muted" /> Team Members
          </div>
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-2.5 bg-bg-base rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: user.color + '30', color: user.color, border: `1px solid ${user.color}40` }}>
                  {user.initials}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{user.name}</div>
                  <div className="text-xs text-text-muted">{user.email}</div>
                </div>
                <span className="badge text-brand bg-brand-glow border-brand-glow text-[10px]">
                  {ROLE_LABELS[user.role]}
                </span>
                {user.id === currentUser?.id && (
                  <span className="text-[10px] text-verified">You</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Roles */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Shield size={14} className="text-text-muted" /> Role Permissions
          </div>
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Role</th>
                <th>Create Bug</th>
                <th>Verify</th>
                <th>Assign</th>
                <th>Reports</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {[
                { role: 'QA Tester',  create: '✓', verify: '✓', assign: '–', reports: '–', admin: '–' },
                { role: 'Developer',  create: '–', verify: '–', assign: '–', reports: '–', admin: '–' },
                { role: 'QA Lead',    create: '✓', verify: '✓', assign: '✓', reports: '✓', admin: '–' },
                { role: 'Manager',    create: '✓', verify: '–', assign: '✓', reports: '✓', admin: '✓' },
                { role: 'Admin',      create: '✓', verify: '✓', assign: '✓', reports: '✓', admin: '✓' },
              ].map(r => (
                <tr key={r.role}>
                  <td className="font-medium text-text-primary">{r.role}</td>
                  {[r.create, r.verify, r.assign, r.reports, r.admin].map((v, i) => (
                    <td key={i} className={v === '✓' ? 'text-verified' : 'text-text-disabled'}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status Workflow */}
        <div className="card p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Workflow size={14} className="text-text-muted" /> Status Workflow
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            {['New', '→', 'Triaged', '→', 'Assigned', '→', 'In Development', '→', 'Ready for QA', '→', 'Verified', '→', 'Closed'].map((s, i) => (
              <span key={i} className={s === '→' ? 'text-text-disabled' : 'badge text-brand bg-brand-glow border-brand-glow'}>
                {s}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            <span className="badge text-critical bg-critical/10 border-critical/20">Reopened</span>
            <span>← can come from Verified or Ready for QA</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-text-muted">
            <span className="badge text-text-muted bg-bg-muted border-bg-border">Rejected</span>
            <span className="badge text-text-muted bg-bg-muted border-bg-border">Duplicate</span>
            <span className="badge text-text-muted bg-bg-muted border-bg-border">Cannot Reproduce</span>
            <span className="badge text-text-muted bg-bg-muted border-bg-border">Deferred</span>
            <span className="ml-2">← Terminal / special states</span>
          </div>
        </div>
      </div>
    </div>
  );
}
