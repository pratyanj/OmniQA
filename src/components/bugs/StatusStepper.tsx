import clsx from 'clsx';
import type { BugStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS, STATUS_LIFECYCLE } from '@/types';
import { Check } from 'lucide-react';

interface StatusStepperProps {
  currentStatus: BugStatus;
}

export default function StatusStepper({ currentStatus }: StatusStepperProps) {
  const currentIdx = STATUS_LIFECYCLE.indexOf(currentStatus);
  const isTerminal = ['closed', 'rejected', 'duplicate', 'cannot_reproduce', 'deferred', 'reopened'].includes(currentStatus);

  if (isTerminal && !STATUS_LIFECYCLE.includes(currentStatus)) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="badge px-3 py-1"
          style={{
            color: STATUS_COLORS[currentStatus],
            backgroundColor: STATUS_COLORS[currentStatus] + '18',
            borderColor: STATUS_COLORS[currentStatus] + '35',
          }}
        >
          {STATUS_LABELS[currentStatus]}
        </span>
        <span className="text-xs text-text-muted">(Terminal state)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STATUS_LIFECYCLE.map((step, idx) => {
        const isDone    = currentIdx > idx;
        const isCurrent = currentIdx === idx;
        const color     = STATUS_COLORS[step];

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <div
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                )}
                style={{
                  backgroundColor: isDone || isCurrent ? color + '20' : 'transparent',
                  borderColor: isDone || isCurrent ? color : '#1e2d45',
                  color: isDone || isCurrent ? color : '#475569',
                }}
              >
                {isDone ? <Check size={12} /> : <span>{idx + 1}</span>}
              </div>
              <span
                className={clsx('text-[9px] font-medium text-center leading-tight max-w-[70px] whitespace-normal')}
                style={{ color: isCurrent ? color : isDone ? '#64748b' : '#334155' }}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>

            {/* Connector */}
            {idx < STATUS_LIFECYCLE.length - 1 && (
              <div
                className="h-0.5 w-8 mb-5 flex-shrink-0 transition-all duration-300"
                style={{ backgroundColor: idx < currentIdx ? STATUS_COLORS[step] : '#1e2d45' }}
              />
            )}
          </div>
        );
      })}

      {/* Special state indicator */}
      {!STATUS_LIFECYCLE.includes(currentStatus) && (
        <div className="ml-4 flex items-center gap-2 mb-5">
          <div className="h-0.5 w-6" style={{ backgroundColor: '#1e2d45' }} />
          <span
            className="badge"
            style={{
              color: STATUS_COLORS[currentStatus],
              backgroundColor: STATUS_COLORS[currentStatus] + '18',
              borderColor: STATUS_COLORS[currentStatus] + '35',
            }}
          >
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>
      )}
    </div>
  );
}
