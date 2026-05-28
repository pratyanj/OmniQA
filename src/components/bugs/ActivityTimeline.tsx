import { useState } from 'react';
import clsx from 'clsx';
import { useUserStore } from '@/stores/userStore';
import { useBugStore } from '@/stores/bugStore';
import { timeAgo, formatDateTime } from '@/utils/dateUtils';
import type { BugHistoryEntry, Comment } from '@/types';
import {
  Plus, GitBranch, CheckCircle, RotateCcw, UserCheck,
  MessageSquare, Paperclip, Activity, AlertCircle,
} from 'lucide-react';

type FeedItem =
  | (BugHistoryEntry & { kind: 'history' })
  | (Comment & { kind: 'comment' });

function getActionIcon(action: BugHistoryEntry['action']) {
  switch (action) {
    case 'created':    return Plus;
    case 'assigned':   return UserCheck;
    case 'verified':   return CheckCircle;
    case 'reopened':   return RotateCcw;
    case 'commented':  return MessageSquare;
    case 'attachment_added': return Paperclip;
    case 'status_changed': return Activity;
    default:           return AlertCircle;
  }
}

function getActionColor(action: BugHistoryEntry['action']) {
  switch (action) {
    case 'created':    return '#6366f1';
    case 'verified':   return '#22c55e';
    case 'reopened':   return '#ef4444';
    case 'assigned':   return '#3b82f6';
    case 'commented':  return '#8b5cf6';
    default:           return '#64748b';
  }
}

interface ActivityTimelineProps {
  bugId: string;
  history: BugHistoryEntry[];
  comments: Comment[];
}

export default function ActivityTimeline({ bugId, history, comments }: ActivityTimelineProps) {
  const { addComment } = useBugStore();
  const { currentUser, getUserById } = useUserStore();
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Merge and sort history + comments by timestamp
  const feed: FeedItem[] = [
    ...history.map(h => ({ ...h, kind: 'history' as const })),
    ...comments.map(c => ({ ...c, kind: 'comment' as const })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  function handleComment() {
    if (!commentText.trim() || !currentUser) return;
    setSubmitting(true);
    addComment(bugId, commentText.trim(), currentUser.id);
    setCommentText('');
    setTimeout(() => setSubmitting(false), 300);
  }

  return (
    <div className="space-y-4">
      {/* Feed */}
      <div className="space-y-0">
        {feed.map((item, idx) => {
          if (item.kind === 'comment') {
            const user = getUserById(item.userId);
            return (
              <div key={item.id} className="timeline-item">
                <div className="timeline-dot bg-bg-raised border-bg-border">
                  <MessageSquare size={10} className="text-text-muted" />
                </div>
                <div className="card-raised rounded-lg p-3 ml-1">
                  <div className="flex items-center gap-2 mb-2">
                    {user && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ backgroundColor: user.color + '30', color: user.color }}
                      >
                        {user.initials}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-text-primary">{user?.name ?? 'Unknown'}</span>
                    <span className="text-[10px] text-text-muted ml-auto" title={formatDateTime(item.timestamp)}>
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{item.text}</p>
                </div>
              </div>
            );
          } else {
            // History entry
            const user = getUserById(item.changedBy);
            const Icon = getActionIcon(item.action);
            const color = getActionColor(item.action);
            return (
              <div key={item.id} className="timeline-item">
                <div className="timeline-dot" style={{ borderColor: color + '40', backgroundColor: color + '10' }}>
                  <Icon size={10} style={{ color }} />
                </div>
                <div className="flex items-start gap-2 pt-0.5 ml-1">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-text-secondary">{item.description}</span>
                    {item.field === 'status' && item.oldValue && (
                      <span className="text-xs text-text-muted ml-1">
                        ({item.oldValue} → {item.newValue})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-disabled flex-shrink-0 mt-0.5" title={formatDateTime(item.timestamp)}>
                    {timeAgo(item.timestamp)}
                  </div>
                </div>
                {user && (
                  <div className="flex items-center gap-1 ml-1 mt-0.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: user.color + '30', color: user.color }}
                    >
                      {user.initials}
                    </div>
                    <span className="text-[10px] text-text-muted">{user.name}</span>
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>

      {/* Comment Box */}
      <div className="card-raised rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-text-secondary">Add Comment</div>
        <textarea
          id="comment-input"
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder="Write a comment… (Shift+Enter for new line)"
          className="textarea min-h-[80px] text-sm"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); }
          }}
        />
        <div className="flex justify-end">
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || submitting}
            className="btn-primary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageSquare size={13} /> Post Comment
          </button>
        </div>
      </div>
    </div>
  );
}
