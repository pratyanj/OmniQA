import { useNavigate } from 'react-router-dom';
import { CheckSquare, AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useBugStore } from '@/stores/bugStore';
import { useUserStore } from '@/stores/userStore';
import { useProjectStore } from '@/stores/projectStore';
import { StatusBadge, SeverityBadge, PriorityBadge } from '@/components/bugs/Badges';
import { timeAgo } from '@/utils/dateUtils';

export default function VerificationQueuePage() {
  const navigate = useNavigate();
  const { getVerificationQueue, verifyBug, reopenBug } = useBugStore();
  const { currentUser, getUserById } = useUserStore();
  const { getProjectById } = useProjectStore();
  const queue = getVerificationQueue();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <CheckSquare size={20} className="text-brand" />
          Verification Queue
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {queue.length} bug{queue.length !== 1 ? 's' : ''} waiting for QA sign-off
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="card p-16 flex flex-col items-center justify-center gap-3">
          <CheckSquare size={40} className="text-verified opacity-50" />
          <div className="text-text-muted text-sm">No bugs waiting for verification!</div>
          <div className="text-text-disabled text-xs">All fixes have been reviewed.</div>
        </div>
      ) : (
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden" animate="show"
          className="space-y-3"
        >
          {queue.map(bug => {
            const project = getProjectById(bug.projectId);
            const assignee = bug.assignedTo ? getUserById(bug.assignedTo) : null;
            return (
              <motion.div
                key={bug.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                className="card p-5 space-y-4"
                id={`verify-card-${bug.id}`}
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="code text-xs">{bug.bugId}</span>
                      {project && <span className="text-xs text-text-muted">{project.icon} {project.name}</span>}
                      <SeverityBadge severity={bug.severity} size="sm" />
                      <PriorityBadge priority={bug.priority} size="sm" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">{bug.title}</h3>
                    {bug.qaVerification.testNotes && (
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed bg-bg-base rounded-lg p-2.5 border border-bg-border">
                        <span className="text-text-muted font-medium">Dev Notes: </span>
                        {bug.qaVerification.testNotes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/bugs/${bug.id}`)}
                    className="btn-secondary btn-sm flex-shrink-0"
                  >
                    <ExternalLink size={13} /> View Detail
                  </button>
                </div>

                {/* Info row */}
                <div className="flex items-center gap-4 text-xs text-text-muted border-t border-bg-border pt-3">
                  {assignee && (
                    <span className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ backgroundColor: assignee.color + '30', color: assignee.color }}>
                        {assignee.initials}
                      </div>
                      Fixed by {assignee.name}
                    </span>
                  )}
                  {bug.qaVerification.fixVersion && (
                    <span>Fix: <span className="font-mono text-text-primary">{bug.qaVerification.fixVersion}</span></span>
                  )}
                  {bug.qaVerification.buildNumber && (
                    <span>Build: <span className="font-mono text-text-primary">{bug.qaVerification.buildNumber}</span></span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock size={11} /> Ready {timeAgo(bug.updatedAt)}
                  </span>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  <button
                    id={`verify-btn-${bug.id}`}
                    onClick={() => {
                      if (!currentUser) return;
                      verifyBug(bug.id, currentUser.id, 'QA verified ✓', bug.qaVerification.fixVersion ?? '', bug.qaVerification.buildNumber ?? '');
                      toast.success(`${bug.bugId} verified!`);
                    }}
                    className="btn-success btn-sm"
                  >
                    <CheckSquare size={13} /> Verify ✓
                  </button>
                  <button
                    id={`reopen-quick-btn-${bug.id}`}
                    onClick={() => {
                      const reason = prompt('Why are you reopening this bug?');
                      if (!reason?.trim() || !currentUser) return;
                      reopenBug(bug.id, currentUser.id, reason.trim());
                      toast.error(`${bug.bugId} reopened`);
                    }}
                    className="btn-danger btn-sm"
                  >
                    <AlertTriangle size={13} /> Reopen
                  </button>
                  <span className="text-xs text-text-disabled ml-2">
                    Or open detail page for full verification form
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
