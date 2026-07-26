import { create } from 'zustand';
import { CharacterData, ProjectMeta } from '../types';
import * as api from '../utils/tauri';

interface ProjectState {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  characters: CharacterData[];
  activeCharacterId: string | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  switchProject: (id: string) => Promise<void>;

  loadCharacters: (projectId: string) => Promise<void>;
  createCharacter: () => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  switchCharacter: (id: string | null) => void;
  refreshActiveCharacter: () => Promise<void>;

  reorderCharacters: (fromIndex: number, toIndex: number) => Promise<void>;

  exportProject: (exportPath: string) => Promise<void>;
  importProject: (importPath: string, mode: string, targetProjectId?: string) => Promise<void>;

  getActiveProject: () => ProjectMeta | null;
  getActiveCharacter: () => CharacterData | null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  characters: [],
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
        await get().loadCharacters(projects[0].id);
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
        characters: [],
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
        await get().loadCharacters(activeProjectId);
      } else {
        set({ characters: [], activeCharacterId: null });
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  switchProject: async (id) => {
    set({ activeProjectId: id, isLoading: true });
    await get().loadCharacters(id);
    set({ isLoading: false });
  },

  loadCharacters: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const characters = await api.listCharacters(projectId);
      set({ characters, isLoading: false });

      if (characters.length > 0) {
        set({ activeCharacterId: characters[0].id });
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
        characters: [character, ...state.characters],
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
        const characters = state.characters.filter(c => c.id !== id);
        const activeCharacterId = state.activeCharacterId === id
          ? (characters[0]?.id || null)
          : state.activeCharacterId;
        return { characters, activeCharacterId, isLoading: false };
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  switchCharacter: (id) => {
    set({ activeCharacterId: id });
  },

  refreshActiveCharacter: async () => {
    const { activeProjectId, activeCharacterId } = get();
    if (!activeProjectId || !activeCharacterId) return;

    try {
      const character = await api.getCharacter(activeProjectId, activeCharacterId);
      set(state => ({
        characters: state.characters.map(c =>
          c.id === character.id ? character : c
        ),
      }));
    } catch (error) {
      console.error('刷新角色失败:', error);
    }
  },

  // ── 拖拽重排序角色 ──
  reorderCharacters: async (fromIndex, toIndex) => {
    const { characters, activeProjectId } = get();
    if (!activeProjectId || fromIndex === toIndex) return;

    // 创建新数组并执行移动
    const newCharacters = [...characters];
    const [moved] = newCharacters.splice(fromIndex, 1);
    newCharacters.splice(toIndex, 0, moved);

    // 立即更新本地状态（乐观更新）
    set({ characters: newCharacters });

    // 同步到后端：更新项目的 characterIds 顺序
    try {
      const { projects } = get();
      const project = projects.find(p => p.id === activeProjectId);
      if (project) {
        const updatedProject = {
          ...project,
          characterIds: newCharacters.map(c => c.id),
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
      // 失败时回滚（重新加载角色）
      await get().loadCharacters(activeProjectId);
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

  // ── 支持 new / merge 两种导入模式 ──
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
        await get().loadCharacters(project.id);
      } else {
        // 合并模式：刷新项目列表和角色
        await get().loadProjects();
        set({ activeProjectId: project.id, isLoading: false });
        await get().loadCharacters(project.id);
      }
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find(p => p.id === activeProjectId) || null;
  },

  getActiveCharacter: () => {
    const { characters, activeCharacterId } = get();
    return characters.find(c => c.id === activeCharacterId) || null;
  },
}));