import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '@/types';
import { SEED_PROJECTS } from '@/data/seed';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;

  getProjectById: (id: string) => Project | undefined;
  setSelectedProject: (id: string | null) => void;
  addProject: (p: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getActiveProjects: () => Project[];
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: SEED_PROJECTS,
      selectedProjectId: null,

      getProjectById: (id) => get().projects.find(p => p.id === id),
      setSelectedProject: (id) => set({ selectedProjectId: id }),

      addProject: (p) =>
        set(s => ({
          projects: [
            ...s.projects,
            {
              ...p,
              id: `p_${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateProject: (id, updates) =>
        set(s => ({
          projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p),
        })),

      deleteProject: (id) =>
        set(s => ({ projects: s.projects.filter(p => p.id !== id) })),

      getActiveProjects: () =>
        get().projects.filter(p => p.status === 'active'),
    }),
    { name: 'qa-projects' }
  )
);
