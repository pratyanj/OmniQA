import { create } from 'zustand';
import type { WorkflowTemplate } from '@/types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

function authHeaders() {
  const token = localStorage.getItem('qa_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface WorkflowState {
  workflows: WorkflowTemplate[];
  loading: boolean;
  error: string | null;
  projectWorkflowCache: Record<string, WorkflowTemplate | null>; // projectId → workflow

  // Actions
  fetchWorkflows: () => Promise<void>;
  fetchProjectWorkflow: (projectId: string) => Promise<WorkflowTemplate | null>;
  createWorkflow: (payload: Partial<WorkflowTemplate>) => Promise<WorkflowTemplate>;
  updateWorkflow: (id: string, payload: Partial<WorkflowTemplate>) => Promise<WorkflowTemplate>;
  deleteWorkflow: (id: string) => Promise<void>;
  assignWorkflow: (projectId: string, workflowId: string) => Promise<void>;

  // Helpers
  getWorkflowById: (id: string) => WorkflowTemplate | undefined;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  loading: false,
  error: null,
  projectWorkflowCache: {},

  fetchWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/workflows`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch workflows');
      const data: WorkflowTemplate[] = await res.json();
      set({ workflows: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchProjectWorkflow: async (projectId: string) => {
    try {
      const res = await fetch(`${API}/projects/${projectId}/workflow`, { headers: authHeaders() });
      if (res.status === 404 || res.status === 204) {
        set(s => ({ projectWorkflowCache: { ...s.projectWorkflowCache, [projectId]: null } }));
        return null;
      }
      if (!res.ok) return null;
      const wf: WorkflowTemplate = await res.json();
      set(s => ({ projectWorkflowCache: { ...s.projectWorkflowCache, [projectId]: wf } }));
      return wf;
    } catch {
      return null;
    }
  },

  createWorkflow: async (payload) => {
    const res = await fetch(`${API}/workflows`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create workflow');
    }
    const wf: WorkflowTemplate = await res.json();
    set(s => ({ workflows: [...s.workflows, wf] }));
    return wf;
  },

  updateWorkflow: async (id, payload) => {
    const res = await fetch(`${API}/workflows/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update workflow');
    }
    const wf: WorkflowTemplate = await res.json();
    set(s => ({ workflows: s.workflows.map(w => (w.id === id ? wf : w)) }));
    return wf;
  },

  deleteWorkflow: async (id) => {
    const res = await fetch(`${API}/workflows/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete workflow');
    set(s => ({ workflows: s.workflows.filter(w => w.id !== id) }));
  },

  assignWorkflow: async (projectId, workflowId) => {
    const res = await fetch(`${API}/projects/${projectId}/workflow`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ workflow_id: workflowId }),
    });
    if (!res.ok) throw new Error('Failed to assign workflow');
    // Invalidate cache for this project
    set(s => {
      const cache = { ...s.projectWorkflowCache };
      delete cache[projectId];
      return { projectWorkflowCache: cache };
    });
  },

  getWorkflowById: (id) => get().workflows.find(w => w.id === id),
}));
