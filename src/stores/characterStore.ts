import { create } from 'zustand';
import { CharacterData, Trait, Version } from '../types';
import { useProjectStore } from './projectStore';
import * as api from '../utils/tauri';

interface CharacterState {
  character: CharacterData | null;
  isDirty: boolean;
  isSaving: boolean;

  updateField: (field: keyof CharacterData, value: string) => void;

  addTrait: (content: string) => Promise<void>;
  editTrait: (traitId: string, content: string) => Promise<void>;
  deleteTrait: (traitId: string) => Promise<void>;

  uploadImage: (srcPath: string) => Promise<void>;
  deleteImage: (imageName: string) => Promise<void>;

  createVersionSnapshot: (label: string, changeType?: 'auto' | 'manual') => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;

  save: (silent?: boolean) => Promise<void>;
  syncFromStore: () => Promise<void>;
  syncToProjectStore: () => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  isDirty: false,
  isSaving: false,

  // ── 字段编辑（只改本地状态，不再直接改 projectStore） ──
  updateField: (field, value) => {
    const { character } = get();
    if (!character) return;
    set({ character: { ...character, [field]: value }, isDirty: true });
  },

  // ── 性格特征操作：先静默保存，再创建版本快照 ──
  addTrait: async (content) => {
    const { character } = get();
    if (!character || !content.trim()) return;
    const now = new Date().toISOString();
    const newTrait: Trait = { id: crypto.randomUUID(), content: content.trim(), createdAt: now, updatedAt: now };
    set(state => ({ character: state.character ? { ...state.character, traits: [newTrait, ...state.character.traits] } : null, isDirty: true }));
    await get().save(true);
    await get().createVersionSnapshot(`添加性格特征: ${content.slice(0, 20)}...`);
  },

  editTrait: async (traitId, content) => {
    const { character } = get();
    if (!character || !content.trim()) return;
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
    set(state => ({ character: state.character ? { ...state.character, traits: state.character.traits.filter(t => t.id !== traitId) } : null, isDirty: true }));
    await get().save(true);
    if (trait) await get().createVersionSnapshot(`删除性格特征: ${trait.content.slice(0, 20)}...`);
  },

  // ── 图片操作 ──
  uploadImage: async (srcPath) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    try {
      const imageName = await api.saveImage(activeProjectId, character.id, srcPath);
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
      await api.deleteImage(activeProjectId, character.id, imageName);
      set(state => ({ character: state.character ? { ...state.character, images: state.character.images.filter(img => img !== imageName) } : null, isDirty: true }));
      await get().save(true);
      await get().createVersionSnapshot('删除参考图片');
    } catch (error) { console.error('删除图片失败:', error); }
  },

  // ── 版本控制 ──
  createVersionSnapshot: async (label, changeType = 'auto') => {
    const { character } = get();
    if (!character) return;
    let versions = [...character.versions];
    if (changeType === 'auto') {
      const autoVersions = versions.filter(v => v.changeType === 'auto');
      if (autoVersions.length >= 50) {
        const oldestAuto = autoVersions[autoVersions.length - 1];
        versions = versions.filter(v => v.id !== oldestAuto.id);
      }
    }
    const newVersion: Version = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      label,
      changeType,
      snapshot: {
        name: character.name, role: character.role,
        positivePrompt: character.positivePrompt, negativePrompt: character.negativePrompt,
        chineseDescription: character.chineseDescription, classicScenes: character.classicScenes,
        notes: character.notes,
        traits: character.traits.map(t => ({ ...t })),
        images: [...character.images],
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
        name: version.snapshot.name, role: version.snapshot.role,
        positivePrompt: version.snapshot.positivePrompt, negativePrompt: version.snapshot.negativePrompt,
        chineseDescription: version.snapshot.chineseDescription, classicScenes: version.snapshot.classicScenes,
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

  // ── 保存：写盘成功后明确同步回 projectStore ──
  save: async (silent = false) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    if (!silent) set({ isSaving: true });
    try {
      await api.saveCharacter(activeProjectId, character);
      set({ isDirty: false });
      get().syncToProjectStore();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      if (!silent) set({ isSaving: false });
    }
  },

  // ── 同步：从 projectStore 写盘成功后更新其 characters 数组 ──
  syncToProjectStore: () => {
    const { character } = get();
    if (!character) return;
    const { characters, activeCharacterId } = useProjectStore.getState();
    const idx = characters.findIndex(c => c.id === activeCharacterId);
    if (idx === -1) return;
    const updated = [...characters];
    updated[idx] = { ...character };
    useProjectStore.setState({ characters: updated });
  },

  // ── 同步：从磁盘读取最新数据 ──
  syncFromStore: async () => {
    const { activeProjectId, activeCharacterId } = useProjectStore.getState();
    if (!activeCharacterId || !activeProjectId) { set({ character: null, isDirty: false }); return; }
    try {
      const character = await api.getCharacter(activeProjectId, activeCharacterId);
      set({ character, isDirty: false });
    } catch (error) {
      console.error('[syncFromStore] 同步失败:', error);
      const { characters } = useProjectStore.getState();
      const character = characters.find(c => c.id === activeCharacterId) || null;
      set({ character, isDirty: false });
    }
  },
}));
