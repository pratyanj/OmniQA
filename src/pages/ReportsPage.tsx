import { BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { useBugStore } from '@/stores/bugStore';
import { useUserStore } from '@/stores/userStore';
import { getDailyTrend, getBugsBySeverity, getBugsByDeveloper, getAvgFixTime } from '@/utils/bugUtils';
import { STATUS_LABELS } from '@/types';

const COLORS = ['#6366f1', '#f97316', '#eab308', '#22c55e', '#8b5cf6', '#3b82f6', '#ef4444'];

export default function ReportsPage() {
  const { bugs } = useBugStore();
  const { getUserById } = useUserStore();
  const trend   = getDailyTrend(bugs, 30);
  const bySev   = getBugsBySeverity(bugs);
  const byDev   = getBugsByDeveloper(bugs, id => getUserById(id)?.name ?? id);
  const avgFix  = getAvgFixTime(bugs);

  // Bugs by status
  const byStatus = Object.entries(
    bugs.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([status, count]) => ({ status: STATUS_LABELS[status as any] ?? status, count }))
    .sort((a, b) => b.count - a.count);

  // Reopen rate per developer
  const devReopenRate = byDev.map(d => {
    const devBugs = bugs.filter(b => {
      const u = getUserById(b.assignedTo ?? '');
      return u?.name === d.name;
    });
    const reopened = devBugs.filter(b => b.history.some(h => h.action === 'reopened')).length;
    const rate = devBugs.length > 0 ? Math.round((reopened / devBugs.length) * 100) : 0;
    return { name: d.name, rate };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <BarChart2 size={20} className="text-brand" /> Reports
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Quality analytics and trends</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Logged',   value: bugs.length,                                                     color: '#6366f1' },
          { label: 'Closed/Verified', value: bugs.filter(b => ['closed','verified'].includes(b.status)).length, color: '#22c55e' },
          { label: 'Avg Fix Time',   value: `${avgFix}h`,                                                     color: '#8b5cf6' },
          { label: 'Reopen Rate',    value: `${bugs.length > 0 ? Math.round((bugs.filter(b => b.history.some(h => h.action === 'reopened')).length / bugs.length) * 100) : 0}%`, color: '#f97316' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-text-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 30-day trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-text-primary mb-1">30-Day Bug Trend</div>
          <div className="text-xs text-text-muted mb-4">Bugs created vs resolved over the last 30 days</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} />
              <Line type="monotone" dataKey="created"  stroke="#6366f1" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Status */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-text-primary mb-4">Bugs by Status</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byStatus} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 9 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Severity */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-text-primary mb-1">Severity Distribution</div>
          <div className="text-xs text-text-muted mb-4">All bugs (including closed)</div>
          {(() => {
            const allSev = [
              { name: 'Critical', value: bugs.filter(b => b.severity === 'critical').length, fill: '#ef4444' },
              { name: 'High',     value: bugs.filter(b => b.severity === 'high').length,     fill: '#f97316' },
              { name: 'Medium',   value: bugs.filter(b => b.severity === 'medium').length,   fill: '#eab308' },
              { name: 'Low',      value: bugs.filter(b => b.severity === 'low').length,      fill: '#3b82f6' },
              { name: 'Cosmetic', value: bugs.filter(b => b.severity === 'cosmetic').length, fill: '#8b5cf6' },
            ].filter(d => d.value > 0);
            return (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={allSev} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {allSev.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Legend iconSize={10} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Developer workload */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-text-primary mb-4">Developer Workload</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDev}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="bugs" fill="#6366f1" radius={[3, 3, 0, 0]} name="Open Bugs" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reopen rate */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-text-primary mb-4">Reopen Rate by Developer</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={devReopenRate}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`, 'Reopen Rate']} />
              <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                {devReopenRate.map((d, i) => (
                  <Cell key={i} fill={d.rate > 30 ? '#ef4444' : d.rate > 10 ? '#f97316' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
