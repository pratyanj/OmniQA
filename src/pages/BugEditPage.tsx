import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBugStore } from '@/stores/bugStore';

export default function BugEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBugById } = useBugStore();
  const bug = getBugById(id!);

  if (!bug) return (
    <div className="flex items-center justify-center h-64 text-text-muted">Bug not found</div>
  );

  // For MVP, redirect to detail page — edit can be a Phase 2 enhancement
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/bugs/${id}`)} className="btn-ghost btn-icon">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Edit Bug — {bug.bugId}</h1>
      </div>
      <div className="card p-8 text-center space-y-3">
        <div className="text-text-muted text-sm">Full edit form coming in Phase 2.</div>
        <div className="text-text-disabled text-xs">For now, use inline editing on the detail page (assign, status, comments).</div>
        <button onClick={() => navigate(`/bugs/${id}`)} className="btn-primary btn-sm mx-auto">
          Go to Bug Detail
        </button>
      </div>
    </div>
  );
}
