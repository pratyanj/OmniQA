import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, ExternalLink, Users, Bug, GitBranch } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useBugStore } from '@/stores/bugStore';
import { useUserStore } from '@/stores/userStore';
import { ENVIRONMENT_LABELS } from '@/types';
import { formatDate } from '@/utils/dateUtils';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, addProject } = useProjectStore();
  const { getBugsByProject } = useBugStore();
  const { getUserById } = useUserStore();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Projects</h1>
          <p className="text-sm text-text-muted mt-0.5">{projects.filter(p => p.status === 'active').length} active projects</p>
        </div>
        <button id="create-project-btn" onClick={() => setShowCreate(true)} className="btn-primary btn-sm">
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Project Cards */}
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4"
      >
        {projects.map(project => {
          const bugs = getBugsByProject(project.id);
          const open = bugs.filter(b => !['closed', 'rejected', 'duplicate'].includes(b.status)).length;
          const critical = bugs.filter(b => b.severity === 'critical' && !['closed', 'rejected', 'verified'].includes(b.status)).length;
          const qaLead = getUserById(project.qaLead);

          return (
            <motion.div
              key={project.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              className="card card-hover cursor-pointer p-5 space-y-4"
              onClick={() => navigate(`/projects/${project.id}`)}
              id={`project-card-${project.id}`}
            >
              {/* Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: project.color + '20', border: `1px solid ${project.color}30` }}
                  >
                    {project.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{project.name}</div>
                    <div className="text-xs text-text-muted">{project.client}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge text-[10px]" style={{
                    color: project.status === 'active' ? '#22c55e' : '#6b7280',
                    backgroundColor: (project.status === 'active' ? '#22c55e' : '#6b7280') + '15',
                    borderColor: (project.status === 'active' ? '#22c55e' : '#6b7280') + '30',
                  }}>
                    {project.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{project.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-bg-base rounded-lg">
                  <div className="text-lg font-bold text-text-primary">{open}</div>
                  <div className="text-[10px] text-text-muted">Open Bugs</div>
                </div>
                <div className="text-center p-2 bg-bg-base rounded-lg">
                  <div className="text-lg font-bold" style={{ color: critical > 0 ? '#ef4444' : '#22c55e' }}>{critical}</div>
                  <div className="text-[10px] text-text-muted">Critical</div>
                </div>
                <div className="text-center p-2 bg-bg-base rounded-lg">
                  <div className="text-lg font-bold text-text-primary">{bugs.length}</div>
                  <div className="text-[10px] text-text-muted">Total</div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 pt-2 border-t border-bg-border text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <GitBranch size={11} /> {project.currentVersion}
                </span>
                <span className="flex items-center gap-1">
                  <FolderOpen size={11} /> {ENVIRONMENT_LABELS[project.environment]}
                </span>
                {qaLead && (
                  <span className="flex items-center gap-1 ml-auto">
                    <Users size={11} /> {qaLead.name}
                  </span>
                )}
                {project.repoLink && (
                  <a
                    href={project.repoLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hover:text-brand transition-colors"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
