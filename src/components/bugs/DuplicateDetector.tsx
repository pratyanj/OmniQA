import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { findDuplicates } from '@/utils/bugUtils';
import { useBugStore } from '@/stores/bugStore';
import { SeverityBadge, StatusBadge } from './Badges';

interface DuplicateDetectorProps {
  title: string;
  excludeId?: string;
}

export default function DuplicateDetector({ title, excludeId }: DuplicateDetectorProps) {
  const { bugs } = useBugStore();
  const [dupes, setDupes] = useState(findDuplicates(title, bugs, excludeId));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDupes(findDuplicates(title, bugs, excludeId));
    }, 300);
    return () => clearTimeout(timer);
  }, [title, bugs, excludeId]);

  if (!dupes.length) return null;

  return (
    <div className="rounded-xl border border-medium/30 bg-medium/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-medium">
        <AlertTriangle size={14} />
        <span className="text-xs font-semibold">Possible duplicate bugs found</span>
      </div>
      <div className="space-y-1.5">
        {dupes.map(bug => (
          <Link
            key={bug.id}
            to={`/bugs/${bug.id}`}
            target="_blank"
            className="flex items-center gap-2 p-2 rounded-lg bg-bg-base hover:bg-bg-muted transition-colors group"
          >
            <span className="code text-[10px] flex-shrink-0">{bug.bugId}</span>
            <span className="text-xs text-text-secondary flex-1 truncate group-hover:text-text-primary transition-colors">
              {bug.title}
            </span>
            <StatusBadge status={bug.status} size="sm" />
            <SeverityBadge severity={bug.severity} size="sm" />
          </Link>
        ))}
      </div>
    </div>
  );
}
