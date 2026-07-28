import { create } from 'zustand';
import { CharacterData } from '../types';
import { MAX_HISTORY_COMMANDS } from '../constants';

export interface Command {
  id: string;
  type: 'updateField' | 'addTrait' | 'editTrait' | 'deleteTrait' | 'addImage' | 'deleteImage';
  field?: keyof CharacterData;
  oldValue?: any;
  newValue?: any;
  traitId?: string;
  imageName?: string;
  timestamp: number;
}

interface HistoryState {
  past: Command[];
  future: Command[];
  limit: number;

  push: (command: Command) => void;
  undo: () => Command | null;
  redo: () => Command | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  limit: MAX_HISTORY_COMMANDS,

  push: (command) => {
    set(state => ({
      past: [...state.past, command].slice(-state.limit),
      future: [],
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;
    const command = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [command, ...future].slice(0, get().limit),
    });
    return command;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;
    const command = future[0];
    set({
      past: [...past, command].slice(-get().limit),
      future: future.slice(1),
    });
    return command;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
