import { create } from 'zustand';
import { CharacterData, Trait, Version, VersionDiff } from '../types';
import { useProjectStore } from './projectStore';
import { useHistoryStore, Command } from './historyStore';
import { DIRTY_DEBOUNCE_MS, MAX_AUTO_VERSIONS } from '../constants';
import * as api from '../utils/tauri';

interface CharacterState {
  character: CharacterData | null;
  isDirty: boolean;
  isSaving: boolean;
  _dirtyTimer: number | null;

  updateField: (field: keyof CharacterData, value: string) => void;
  flushDirty: () => void;

  addTrait: (content: string) => Promise<void>;
  editTrait: (traitId: string, content: string) => Promise<void>;
  deleteTrait: (traitId: string) => Promise<void>;

  uploadImage: (srcPath: string) => Promise<void>;
  deleteImage: (imageName: string) => Promise<void>;

  createVersionSnapshot: (label: string, changeType?: 'auto' | 'manual') => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;

  save: (silent?: boolean) => Promise<void>;
  loadCharacter: (characterId: string) => Promise<void>;

  // Undo/Redo
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  restoreState: (character: CharacterData) => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  isDirty: false,
  isSaving: false,

  // ── 防抖定时器 ──
  _dirtyTimer: null as number | null,

  updateField: (field, value) => {
    const { character } = get();
    if (!character) return;
    
    const oldValue = character[field];
    
    // 记录历史命令
    const command: Command = {
      id: crypto.randomUUID(),
      type: 'updateField',
      field,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
    };
    useHistoryStore.getState().push(command);
    
    set({ character: { ...character, [field]: value } });
    const currentTimer = get()._dirtyTimer;
    if (currentTimer !== null) window.clearTimeout(currentTimer);
    const timer = window.setTimeout(() => {
      set({ isDirty: true });
    }, DIRTY_DEBOUNCE_MS) as unknown as number;
    set({ _dirtyTimer: timer });
  },

  addTrait: async (content) => {
    const { character } = get();
    if (!character || !content.trim()) return;
    const now = new Date().toISOString();
    const newTrait: Trait = { id: crypto.randomUUID(), content: content.trim(), createdAt: now, updatedAt: now };
    
    const command: Command = {
      id: crypto.randomUUID(),
      type: 'addTrait',
      newValue: newTrait,
      timestamp: Date.now(),
    };
    useHistoryStore.getState().push(command);
    
    set(state => ({ character: state.character ? { ...state.character, traits: [newTrait, ...state.character.traits] } : null, isDirty: true }));
    await get().save(true);
    await get().createVersionSnapshot(`添加性格特征: ${content.slice(0, 20)}...`);
  },

  editTrait: async (traitId, content) => {
    const { character } = get();
    if (!character || !content.trim()) return;
    const oldTrait = character.traits.find(t => t.id === traitId);
    
    const command: Command = {
      id: crypto.randomUUID(),
      type: 'editTrait',
      traitId,
      oldValue: oldTrait,
      newValue: content.trim(),
      timestamp: Date.now(),
    };
    useHistoryStore.getState().push(command);
    
    set(state => ({
      character: state.character ? {
        ...state.character,
        traits: state.character.traits.map(t => t.id === traitId ? { ...t, content: content.trim(), updatedAt: new Date().toISOString() } : t)
      } : null,
      isDirty: true,
    }));
    await get().save(true);
    await get().createVersionSnapshot(`修改性格特征: ${content.slice(0, 20)}...`);
  },

  deleteTrait: async (traitId) => {
    const { character } = get();
    if (!character) return;
    const trait = character.traits.find(t => t.id === traitId);
    
    const command: Command = {
      id: crypto.randomUUID(),
      type: 'deleteTrait',
      traitId,
      oldValue: trait,
      timestamp: Date.now(),
    };
    useHistoryStore.getState().push(command);
    
    set(state => ({ character: state.character ? { ...state.character, traits: state.character.traits.filter(t => t.id !== traitId) } : null, isDirty: true }));
    await get().save(true);
    if (trait) await get().createVersionSnapshot(`删除性格特征: ${trait.content.slice(0, 20)}...`);
  },

  uploadImage: async (srcPath) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    try {
      const imageName = await api.saveImage(activeProjectId, character.id, srcPath);
      
      const command: Command = {
        id: crypto.randomUUID(),
        type: 'addImage',
        imageName,
        timestamp: Date.now(),
      };
      useHistoryStore.getState().push(command);
      
      set(state => ({ character: state.character ? { ...state.character, images: [...state.character.images, imageName] } : null, isDirty: true }));
      await get().save(true);
      await get().createVersionSnapshot('添加参考图片');
    } catch (error) { console.error('上传图片失败:', error); }
  },

  deleteImage: async (imageName) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    try {
      const command: Command = {
        id: crypto.randomUUID(),
        type: 'deleteImage',
        imageName,
        timestamp: Date.now(),
      };
      useHistoryStore.getState().push(command);
      
      await api.deleteImage(activeProjectId, character.id, imageName);
      set(state => ({ character: state.character ? { ...state.character, images: state.character.images.filter(img => img !== imageName) } : null, isDirty: true }));
      await get().save(true);
      await get().createVersionSnapshot('删除参考图片');
    } catch (error) { console.error('删除图片失败:', error); }
  },

  createVersionSnapshot: async (label, changeType = 'auto') => {
    const { character } = get();
    if (!character) return;
    let versions = [...character.versions];
    if (changeType === 'auto') {
      const autoVersions = versions.filter(v => v.changeType === 'auto');
      if (autoVersions.length >= MAX_AUTO_VERSIONS) {
        const oldestAuto = autoVersions[autoVersions.length - 1];
        versions = versions.filter(v => v.id !== oldestAuto.id);
      }
    }

    const diffs: VersionDiff[] = [];
    const prevSnapshot = versions.length > 0 ? versions[0].snapshot : null;

    if (prevSnapshot && !prevSnapshot.isFullSnapshot) {
      const ps = prevSnapshot as unknown as Record<string, unknown>;
      const ch = character as unknown as Record<string, unknown>;
      const fields = ['name', 'role', 'positivePrompt', 'negativePrompt', 'chineseDescription', 'classicScenes', 'notes'] as const;
      for (const field of fields) {
        if (ps[field] !== ch[field]) {
          diffs.push({
            field,
            oldValue: String(ps[field] ?? ''),
            newValue: String(ch[field] ?? ''),
          });
        }
      }

      const prevTraits = prevSnapshot.traits.map(t => t.content).join(', ');
      const currTraits = character.traits.map(t => t.content).join(', ');
      if (prevTraits !== currTraits) {
        diffs.push({ field: 'traits', oldValue: prevTraits, newValue: currTraits });
      }

      const prevImages = prevSnapshot.images.join(', ');
      const currImages = character.images.join(', ');
      if (prevImages !== currImages) {
        diffs.push({ field: 'images', oldValue: prevImages, newValue: currImages });
      }
    }

    const isFullSnapshot = !prevSnapshot || prevSnapshot.isFullSnapshot === true;

    const newVersion: Version = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      label,
      changeType,
      snapshot: {
        name: character.name,
        role: character.role,
        positivePrompt: character.positivePrompt,
        negativePrompt: character.negativePrompt,
        chineseDescription: character.chineseDescription,
        classicScenes: character.classicScenes,
        notes: character.notes,
        traits: character.traits.map(t => ({ ...t })),
        images: [...character.images],
        diffs: diffs.length > 0 ? diffs : undefined,
        isFullSnapshot,
      },
    };
    set({ character: { ...character, versions: [newVersion, ...versions] } });
    await get().save(true);
  },

  restoreVersion: async (versionId) => {
    const { character } = get();
    if (!character) return;
    const version = character.versions.find(v => v.id === versionId);
    if (!version) return;
    await get().createVersionSnapshot('恢复前自动快照');
    set({
      character: {
        ...character,
        name: version.snapshot.name,
        role: version.snapshot.role,
        positivePrompt: version.snapshot.positivePrompt,
        negativePrompt: version.snapshot.negativePrompt,
        chineseDescription: version.snapshot.chineseDescription,
        classicScenes: version.snapshot.classicScenes,
        notes: version.snapshot.notes,
        traits: version.snapshot.traits.map(t => ({ ...t })),
        images: [...version.snapshot.images],
      },
      isDirty: true,
    });
    await get().save(true);
  },

  deleteVersion: async (versionId) => {
    const { character } = get();
    if (!character) return;
    set(state => ({ character: state.character ? { ...state.character, versions: state.character.versions.filter(v => v.id !== versionId) } : null, isDirty: true }));
    await get().save(true);
  },

  save: async (silent = false) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    get().flushDirty();
    if (!silent) set({ isSaving: true });
    try {
      await api.saveCharacter(activeProjectId, character);
      set({ isDirty: false });
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      if (!silent) set({ isSaving: false });
    }
  },

  flushDirty: () => {
    const { _dirtyTimer } = get();
    if (_dirtyTimer !== null) {
      window.clearTimeout(_dirtyTimer);
      set({ _dirtyTimer: null, isDirty: true });
    }
  },

  loadCharacter: async (characterId) => {
    const { activeProjectId } = useProjectStore.getState();
    if (!activeProjectId) {
      set({ character: null, isDirty: false });
      return;
    }
    try {
      const character = await api.getCharacter(activeProjectId, characterId);
      set({ character, isDirty: false });
      // 加载新角色时清空历史
      useHistoryStore.getState().clear();
    } catch (error) {
      console.error('[loadCharacter] 加载失败:', error);
      set({ character: null, isDirty: false });
    }
  },

  // ── Undo/Redo ──

  restoreState: (newCharacter) => {
    set({ character: newCharacter, isDirty: true });
  },

  undo: async () => {
    const command = useHistoryStore.getState().undo();
    if (!command) return;
    
    const { character } = get();
    if (!character) return;

    switch (command.type) {
      case 'updateField':
        if (command.field) {
          set({ character: { ...character, [command.field]: command.oldValue }, isDirty: true });
        }
        break;
      case 'addTrait':
        set({ character: { ...character, traits: character.traits.filter(t => t.id !== command.newValue?.id) }, isDirty: true });
        break;
      case 'editTrait':
        if (command.traitId && command.oldValue) {
          set({ character: { ...character, traits: character.traits.map(t => t.id === command.traitId ? command.oldValue : t) }, isDirty: true });
        }
        break;
      case 'deleteTrait':
        if (command.oldValue) {
          set({ character: { ...character, traits: [...character.traits, command.oldValue] }, isDirty: true });
        }
        break;
      case 'addImage':
        if (command.imageName) {
          set({ character: { ...character, images: character.images.filter(img => img !== command.imageName) }, isDirty: true });
        }
        break;
      case 'deleteImage':
        if (command.imageName) {
          set({ character: { ...character, images: [...character.images, command.imageName] }, isDirty: true });
        }
        break;
    }
  },

  redo: async () => {
    const command = useHistoryStore.getState().redo();
    if (!command) return;
    
    const { character } = get();
    if (!character) return;

    switch (command.type) {
      case 'updateField':
        if (command.field) {
          set({ character: { ...character, [command.field]: command.newValue }, isDirty: true });
        }
        break;
      case 'addTrait':
        if (command.newValue) {
          set({ character: { ...character, traits: [command.newValue, ...character.traits] }, isDirty: true });
        }
        break;
      case 'editTrait':
        if (command.traitId && command.newValue) {
          set({ character: { ...character, traits: character.traits.map(t => t.id === command.traitId ? { ...t, content: command.newValue } : t) }, isDirty: true });
        }
        break;
      case 'deleteTrait':
        if (command.traitId) {
          set({ character: { ...character, traits: character.traits.filter(t => t.id !== command.traitId) }, isDirty: true });
        }
        break;
      case 'addImage':
        if (command.imageName) {
          set({ character: { ...character, images: [...character.images, command.imageName] }, isDirty: true });
        }
        break;
      case 'deleteImage':
        if (command.imageName) {
          set({ character: { ...character, images: character.images.filter(img => img !== command.imageName) }, isDirty: true });
        }
        break;
    }
  },

  canUndo: () => useHistoryStore.getState().canUndo(),
  canRedo: () => useHistoryStore.getState().canRedo(),
}));
