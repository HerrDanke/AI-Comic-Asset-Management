import { create } from 'zustand';
import { CharacterSummary, ProjectMeta } from '../types';
import * as api from '../utils/tauri';

interface ProjectState {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  characterSummaries: CharacterSummary[];
  activeCharacterId: string | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  switchProject: (id: string) => Promise<void>;

  loadCharacterSummaries: (projectId: string) => Promise<void>;
  createCharacter: () => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  deleteCharacters: (ids: string[]) => Promise<void>;
  switchCharacter: (id: string | null) => void;

  reorderCharacters: (fromIndex: number, toIndex: number) => Promise<void>;

  exportProject: (exportPath: string) => Promise<void>;
  importProject: (importPath: string, mode: string, targetProjectId?: string) => Promise<void>;

  getActiveProject: () => ProjectMeta | null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  characterSummaries: [],
  activeCharacterId: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await api.listProjects();
      set({ projects, isLoading: false });

      if (projects.length === 0) return;

      const { activeProjectId } = get();
      if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
        set({ activeProjectId: projects[0].id });
        await get().loadCharacterSummaries(projects[0].id);
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  createProject: async (name, description) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.createProject(name, description);
      set(state => ({
        projects: [project, ...state.projects],
        activeProjectId: project.id,
        characterSummaries: [],
        activeCharacterId: null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteProject(id);
      set(state => {
        const projects = state.projects.filter(p => p.id !== id);
        const activeProjectId = state.activeProjectId === id
          ? (projects[0]?.id || null)
          : state.activeProjectId;
        return { projects, activeProjectId, isLoading: false };
      });

      const { activeProjectId } = get();
      if (activeProjectId) {
        await get().loadCharacterSummaries(activeProjectId);
      } else {
        set({ characterSummaries: [], activeCharacterId: null });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  switchProject: async (id) => {
    set({ activeProjectId: id, isLoading: true });
    await get().loadCharacterSummaries(id);
    set({ isLoading: false });
  },

  loadCharacterSummaries: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const summaries = await api.listCharacterSummaries(projectId);
      set({ characterSummaries: summaries, isLoading: false });

      if (summaries.length > 0) {
        set({ activeCharacterId: summaries[0].id });
      } else {
        set({ activeCharacterId: null });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  createCharacter: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    set({ isLoading: true, error: null });
    try {
      const character = await api.createCharacter(activeProjectId);
      set(state => ({
        characterSummaries: [
          { id: character.id, name: character.name, role: character.role, color: character.color, updatedAt: character.updatedAt },
          ...state.characterSummaries,
        ],
        activeCharacterId: character.id,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  deleteCharacter: async (id) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    set({ isLoading: true, error: null });
    try {
      await api.deleteCharacter(activeProjectId, id);
      set(state => {
        const summaries = state.characterSummaries.filter(c => c.id !== id);
        const activeCharacterId = state.activeCharacterId === id
          ? (summaries[0]?.id || null)
          : state.activeCharacterId;
        return { characterSummaries: summaries, activeCharacterId, isLoading: false };
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  deleteCharacters: async (ids) => {
    const { activeProjectId } = get();
    if (!activeProjectId || ids.length === 0) return;

    set({ isLoading: true, error: null });
    try {
      for (const id of ids) {
        await api.deleteCharacter(activeProjectId, id);
      }
      set(state => {
        const summaries = state.characterSummaries.filter(c => !ids.includes(c.id));
        const activeCharacterId = ids.includes(state.activeCharacterId || '')
          ? (summaries[0]?.id || null)
          : state.activeCharacterId;
        return { characterSummaries: summaries, activeCharacterId, isLoading: false };
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  switchCharacter: (id) => {
    set({ activeCharacterId: id });
  },

  reorderCharacters: async (fromIndex, toIndex) => {
    const { characterSummaries, activeProjectId } = get();
    if (!activeProjectId || fromIndex === toIndex) return;

    const newSummaries = [...characterSummaries];
    const [moved] = newSummaries.splice(fromIndex, 1);
    newSummaries.splice(toIndex, 0, moved);

    set({ characterSummaries: newSummaries });

    try {
      const { projects } = get();
      const project = projects.find(p => p.id === activeProjectId);
      if (project) {
        const updatedProject = {
          ...project,
          characterIds: newSummaries.map(c => c.id),
          updatedAt: new Date().toISOString(),
        };
        await api.updateProject(updatedProject);
        set(state => ({
          projects: state.projects.map(p =>
            p.id === activeProjectId ? updatedProject : p
          ),
        }));
      }
    } catch (error) {
      console.error('保存角色顺序失败:', error);
      await get().loadCharacterSummaries(activeProjectId);
    }
  },

  exportProject: async (exportPath) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    set({ isLoading: true, error: null });
    try {
      await api.exportProject(activeProjectId, exportPath);
      set({ isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  importProject: async (importPath, mode, targetProjectId) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.importProject(importPath, mode, targetProjectId);
      if (mode === 'new') {
        set(state => ({
          projects: [project, ...state.projects],
          activeProjectId: project.id,
          isLoading: false,
        }));
        await get().loadCharacterSummaries(project.id);
      } else {
        await get().loadProjects();
        set({ activeProjectId: project.id, isLoading: false });
        await get().loadCharacterSummaries(project.id);
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find(p => p.id === activeProjectId) || null;
  },
}));
