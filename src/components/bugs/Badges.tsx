import clsx from 'clsx';
import type { BugStatus, BugSeverity, BugPriority } from '@/types';
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_LABELS, SEVERITY_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types';

// ─── Status Badge ──────────────────────────────────────────────────────────
interface StatusBadgeProps { status: BugStatus; size?: 'sm' | 'md'; }

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className={clsx('badge', size === 'sm' ? 'text-[10px] px-1.5 py-px' : '')}
      style={{
        color,
        backgroundColor: color + '18',
        borderColor: color + '35',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Severity Badge ────────────────────────────────────────────────────────
interface SeverityBadgeProps { severity: BugSeverity; size?: 'sm' | 'md'; }

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const color = SEVERITY_COLORS[severity];
  return (
    <span
      className={clsx('badge font-bold', size === 'sm' ? 'text-[10px] px-1.5 py-px' : '')}
      style={{
        color,
        backgroundColor: color + '15',
        borderColor: color + '30',
      }}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

// ─── Priority Badge ────────────────────────────────────────────────────────
interface PriorityBadgeProps { priority: BugPriority; size?: 'sm' | 'md'; }

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority];
  return (
    <span
      className={clsx('badge font-mono font-bold', size === 'sm' ? 'text-[10px] px-1.5 py-px' : '')}
      style={{
        color,
        backgroundColor: color + '15',
        borderColor: color + '30',
      }}
    >
      {priority.toUpperCase()}
    </span>
  );
}
