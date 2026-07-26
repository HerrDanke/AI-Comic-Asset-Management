import { create } from 'zustand';
import { CharacterData, Trait, Version } from '../types';
import { useProjectStore } from './projectStore';
import * as api from '../utils/tauri';

interface CharacterState {
  // 当前编辑的角色（从projectStore同步）
  character: CharacterData | null;
  
  // 编辑状态
  isDirty: boolean;
  isSaving: boolean;
  
  // 字段编辑
  updateField: (field: keyof CharacterData, value: string) => void;
  
  // 特征操作
  addTrait: (content: string) => Promise<void>;
  editTrait: (traitId: string, content: string) => Promise<void>;
  deleteTrait: (traitId: string) => Promise<void>;
  
  // 图片操作
  uploadImage: (srcPath: string) => Promise<void>;
  deleteImage: (imageName: string) => Promise<void>;
  
  // 版本操作
  createVersionSnapshot: (label: string, changeType?: 'auto' | 'manual') => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
  
  // 保存
  save: () => Promise<void>;
  
  // 重置（从store同步）
  syncFromStore: () => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  isDirty: false,
  isSaving: false,

  updateField: (field, value) => {
    const { character } = get();
    if (!character) return;
    
    const updatedCharacter = { ...character, [field]: value };
    
    set({
      character: updatedCharacter,
      isDirty: true,
    });
    
    // 同步更新 projectStore.characters 数组
    const { characters, activeCharacterId } = useProjectStore.getState();
    if (characters.find(c => c.id === activeCharacterId)) {
      useProjectStore.setState({
        characters: characters.map(c => 
          c.id === activeCharacterId ? updatedCharacter : c
        ),
      });
    }
  },

  addTrait: async (content) => {
    const { character } = get();
    if (!character || !content.trim()) return;
    
    const now = new Date().toISOString();
    const newTrait: Trait = {
      id: crypto.randomUUID(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    };
    
    set(state => ({
      character: state.character ? {
        ...state.character,
        traits: [newTrait, ...state.character.traits],
      } : null,
      isDirty: true,
    }));
    
    await get().save();
    await get().createVersionSnapshot(`添加性格特征: ${content.slice(0, 20)}...`);
  },

  editTrait: async (traitId, content) => {
    const { character } = get();
    if (!character || !content.trim()) return;
    
    set(state => ({
      character: state.character ? {
        ...state.character,
        traits: state.character.traits.map(t =>
          t.id === traitId ? { ...t, content: content.trim(), updatedAt: new Date().toISOString() } : t
        ),
      } : null,
      isDirty: true,
    }));
    
    await get().save();
    await get().createVersionSnapshot(`修改性格特征: ${content.slice(0, 20)}...`);
  },

  deleteTrait: async (traitId) => {
    const { character } = get();
    if (!character) return;
    
    const trait = character.traits.find(t => t.id === traitId);
    
    set(state => ({
      character: state.character ? {
        ...state.character,
        traits: state.character.traits.filter(t => t.id !== traitId),
      } : null,
      isDirty: true,
    }));
    
    await get().save();
    if (trait) {
      await get().createVersionSnapshot(`删除性格特征: ${trait.content.slice(0, 20)}...`);
    }
  },

  uploadImage: async (srcPath) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    
    console.log('[uploadImage] 开始上传:', srcPath, '角色ID:', character.id);
    
    try {
      const imageName = await api.saveImage(activeProjectId, character.id, srcPath);
      console.log('[uploadImage] 保存成功:', imageName);
      
      set(state => ({
        character: state.character ? {
          ...state.character,
          images: [...state.character.images, imageName],
        } : null,
        isDirty: true,
      }));
      
      console.log('[uploadImage] 更新后图片列表:', get().character?.images);
      
      await get().save();
      console.log('[uploadImage] 保存到磁盘完成');
      await get().createVersionSnapshot('添加参考图片');
    } catch (error) {
      console.error('上传图片失败:', error);
    }
  },

  deleteImage: async (imageName) => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    
    try {
      await api.deleteImage(activeProjectId, character.id, imageName);
      
      set(state => ({
        character: state.character ? {
          ...state.character,
          images: state.character.images.filter(img => img !== imageName),
        } : null,
        isDirty: true,
      }));
      
      await get().save();
      await get().createVersionSnapshot('删除参考图片');
    } catch (error) {
      console.error('删除图片失败:', error);
    }
  },

  createVersionSnapshot: async (label, changeType = 'auto') => {
    const { character } = get();
    if (!character) return;
    
    // 自动版本只保留最近50个
    let versions = [...character.versions];
    
    if (changeType === 'auto') {
      const autoVersions = versions.filter(v => v.changeType === 'auto');
      if (autoVersions.length >= 50) {
        // 找到最旧的自动版本并删除
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
        name: character.name,
        role: character.role,
        positivePrompt: character.positivePrompt,
        negativePrompt: character.negativePrompt,
        chineseDescription: character.chineseDescription,
        classicScenes: character.classicScenes,
        notes: character.notes,
        traits: [...character.traits],
        images: [...character.images],
      },
    };
    
    set(state => ({
      character: state.character ? {
        ...state.character,
        versions: [newVersion, ...versions],
      } : null,
    }));
    
    await get().save();
  },

  restoreVersion: async (versionId) => {
    const { character } = get();
    if (!character) return;
    
    const version = character.versions.find(v => v.id === versionId);
    if (!version) return;
    
    // 先创建当前状态的快照
    await get().createVersionSnapshot('恢复前自动快照');
    
    // 恢复快照
    set(state => ({
      character: state.character ? {
        ...state.character,
        name: version.snapshot.name,
        role: version.snapshot.role,
        positivePrompt: version.snapshot.positivePrompt,
        negativePrompt: version.snapshot.negativePrompt,
        chineseDescription: version.snapshot.chineseDescription,
        classicScenes: version.snapshot.classicScenes,
        notes: version.snapshot.notes,
        traits: [...version.snapshot.traits],
        images: [...version.snapshot.images],
      } : null,
      isDirty: true,
    }));
    
    await get().save();
  },

  deleteVersion: async (versionId) => {
    const { character } = get();
    if (!character) return;
    
    set(state => ({
      character: state.character ? {
        ...state.character,
        versions: state.character.versions.filter(v => v.id !== versionId),
      } : null,
      isDirty: true,
    }));
    
    await get().save();
  },

  save: async () => {
    const { character } = get();
    const { activeProjectId } = useProjectStore.getState();
    if (!character || !activeProjectId) return;
    
    set({ isSaving: true });
    
    try {
      await api.saveCharacter(activeProjectId, character);
      set({ isDirty: false, isSaving: false });
    } catch (error) {
      set({ isSaving: false });
      console.error('保存失败:', error);
    }
  },

  syncFromStore: async () => {
    const { activeProjectId } = useProjectStore.getState();
    const { activeCharacterId } = useProjectStore.getState();
    
    if (!activeCharacterId || !activeProjectId) {
      set({ character: null, isDirty: false });
      return;
    }
    
    try {
      // 从磁盘重新加载最新数据，确保获取最新状态
      const character = await api.getCharacter(activeProjectId, activeCharacterId);
      set({ character, isDirty: false });
      console.log('[syncFromStore] 角色已同步:', character.name, '图片数:', character.images.length);
    } catch (error) {
      console.error('[syncFromStore] 同步失败:', error);
      // 回退到从内存中获取
      const { characters } = useProjectStore.getState();
      const character = characters.find(c => c.id === activeCharacterId) || null;
      set({ character, isDirty: false });
    }
  },
}));
