import { create } from 'zustand';
import { CharacterData, ProjectMeta } from '../types';
import * as api from '../utils/tauri';

interface ProjectState {
  // 项目列表
  projects: ProjectMeta[];
  activeProjectId: string | null;
  
  // 角色列表
  characters: CharacterData[];
  activeCharacterId: string | null;
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  
  // 项目操作
  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  switchProject: (id: string) => Promise<void>;
  
  // 角色操作
  loadCharacters: (projectId: string) => Promise<void>;
  createCharacter: () => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  switchCharacter: (id: string | null) => void;
  refreshActiveCharacter: () => Promise<void>;
  
  // 导入/导出
  exportProject: (exportPath: string) => Promise<void>;
  importProject: (importPath: string) => Promise<void>;
  
  // 工具
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
      
      // 如果没有项目，不做任何操作
      if (projects.length === 0) return;
      
      // 如果有活动项目，保持它；否则选择第一个
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
        return {
          projects,
          activeProjectId,
          isLoading: false,
        };
      });
      
      // 如果删除的是当前项目，加载新项目的角色
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
        return {
          characters,
          activeCharacterId,
          isLoading: false,
        };
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

  importProject: async (importPath) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.importProject(importPath, 'new');
      set(state => ({
        projects: [project, ...state.projects],
        activeProjectId: project.id,
        isLoading: false,
      }));
      await get().loadCharacters(project.id);
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
