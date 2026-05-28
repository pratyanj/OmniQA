import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Bug, RotateCcw, CheckSquare, Clock, Zap,
  TrendingUp, AlertCircle, Activity, ArrowRight, Shield,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useBugStore } from '@/stores/bugStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUserStore } from '@/stores/userStore';
import { StatusBadge, SeverityBadge } from '@/components/bugs/Badges';
import { getDailyTrend, getBugsBySeverity, getBugsByDeveloper, getAvgFixTime } from '@/utils/bugUtils';
import { timeAgo } from '@/utils/dateUtils';
import { SEVERITY_COLORS } from '@/types';

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: number | string; sub?: string; color: string; onClick?: () => void;
}) {
  return (
    <motion.div
      variants={CARD_VARIANTS}
      onClick={onClick}
      className={`card p-5 flex items-start gap-4 ${onClick ? 'cursor-pointer card-hover' : ''}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '20', border: `1px solid ${color}30` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="stat-number" style={{ color }}>{value}</div>
        <div className="text-xs font-medium text-text-secondary mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    bugs, getOpenBugsCount, getCriticalBugsCount,
    getReopenedBugsCount, getPendingVerificationCount, getFixedTodayCount,
  } = useBugStore();
  const { projects } = useProjectStore();
  const { getUserById } = useUserStore();

  const openCount   = getOpenBugsCount();
  const critCount   = getCriticalBugsCount();
  const reopenCount = getReopenedBugsCount();
  const qaPending   = getPendingVerificationCount();
  const fixedToday  = getFixedTodayCount();
  const avgFix      = getAvgFixTime(bugs);

  const trend    = getDailyTrend(bugs, 14);
  const bySev    = getBugsBySeverity(bugs);
  const byDev    = getBugsByDeveloper(bugs, id => getUserById(id)?.name ?? id);
  const recent   = [...bugs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8);

  // Release readiness per project
  const releases = projects.map(p => {
    const pb = bugs.filter(b => b.projectId === p.id);
    const open = pb.filter(b => !['closed', 'rejected', 'duplicate', 'verified'].includes(b.status));
    const crit = open.filter(b => b.severity === 'critical').length;
    const verified = pb.filter(b => b.status === 'verified' || b.status === 'closed').length;
    const pct = pb.length > 0 ? Math.round((verified / pb.length) * 100) : 100;
    return { project: p, crit, pct, blocked: crit > 0 };
  });

  const SEVERITY_CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">Real-time quality overview across all projects</p>
      </div>

      {/* Stat Cards */}
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        initial="hidden" animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <StatCard icon={Bug}         label="Open Bugs"         value={openCount}   color="#6366f1" onClick={() => navigate('/bugs')} />
        <StatCard icon={AlertTriangle} label="Critical"        value={critCount}   color="#ef4444" sub="Need immediate attention" onClick={() => navigate('/bugs?severity=critical')} />
        <StatCard icon={RotateCcw}   label="Reopened"          value={reopenCount} color="#f97316" onClick={() => navigate('/bugs?status=reopened')} />
        <StatCard icon={CheckSquare} label="Pending QA"        value={qaPending}   color="#eab308" onClick={() => navigate('/verify')} />
        <StatCard icon={Zap}         label="Fixed Today"       value={fixedToday}  color="#22c55e" />
        <StatCard icon={Clock}       label="Avg Fix Time"      value={`${avgFix}h`} color="#8b5cf6" sub="Across all bugs" />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">Bug Trend (14 days)</div>
              <div className="text-xs text-text-muted">Created vs Resolved</div>
            </div>
            <TrendingUp size={16} className="text-text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} />
              <Line type="monotone" dataKey="created"  stroke="#6366f1" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Severity donut */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="card p-5"
        >
          <div className="text-sm font-semibold text-text-primary mb-1">By Severity</div>
          <div className="text-xs text-text-muted mb-4">Open bugs only</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={bySev} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {bySev.map((_, i) => (
                  <Cell key={i} fill={SEVERITY_CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {bySev.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SEVERITY_CHART_COLORS[i] }} />
                <span className="text-text-secondary flex-1">{item.name}</span>
                <span className="font-mono font-semibold text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Developer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="card p-5"
        >
          <div className="text-sm font-semibold text-text-primary mb-4">Bugs by Developer</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byDev} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="bugs" fill="#6366f1" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Release Readiness */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} className="text-text-muted" />
            <div className="text-sm font-semibold text-text-primary">Release Readiness</div>
          </div>
          <div className="space-y-3">
            {releases.map(({ project, crit, pct, blocked }) => (
              <div key={project.id}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{project.icon}</span>
                  <span className="text-xs font-medium text-text-primary flex-1 truncate">{project.name}</span>
                  {blocked ? (
                    <span className="badge text-[10px] px-1.5 py-px text-critical bg-critical/10 border-critical/25">
                      BLOCKED
                    </span>
                  ) : (
                    <span className="badge text-[10px] px-1.5 py-px text-verified bg-verified/10 border-verified/25">
                      READY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-bg-base rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: blocked ? '#ef4444' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-muted w-8 text-right">{pct}%</span>
                </div>
                {crit > 0 && (
                  <div className="text-[10px] text-critical mt-0.5">{crit} critical bug{crit > 1 ? 's' : ''} open</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-text-muted" />
              <div className="text-sm font-semibold text-text-primary">Recent Activity</div>
            </div>
            <button onClick={() => navigate('/bugs')} className="text-[11px] text-brand hover:underline flex items-center gap-1">
              All <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {recent.map(bug => (
              <button
                key={bug.id}
                onClick={() => navigate(`/bugs/${bug.id}`)}
                className="w-full flex items-start gap-2 text-left hover:bg-bg-muted p-1.5 rounded-lg transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="code text-[9px] flex-shrink-0">{bug.bugId}</span>
                    <SeverityBadge severity={bug.severity} size="sm" />
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5 truncate group-hover:text-text-primary transition-colors">
                    {bug.title}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={bug.status} size="sm" />
                  <span className="text-[9px] text-text-disabled">{timeAgo(bug.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
