import { create } from 'zustand';
import { SETTINGS_KEY } from '../constants';

export type SaveInterval = 10000 | 30000 | 60000 | 0; // 0 = 手动

interface SettingsState {
  saveInterval: SaveInterval;
  blurSaveEnabled: boolean;
  setSaveInterval: (interval: SaveInterval) => void;
  setBlurSaveEnabled: (enabled: boolean) => void;
}

function loadSettings(): { saveInterval: SaveInterval; blurSaveEnabled: boolean } {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        saveInterval: parsed.saveInterval ?? 30000,
        blurSaveEnabled: parsed.blurSaveEnabled ?? true,
      };
    }
  } catch (e) {
    console.error('加载设置失败:', e);
  }
  return { saveInterval: 30000, blurSaveEnabled: true };
}

function saveSettings(settings: { saveInterval: SaveInterval; blurSaveEnabled: boolean }) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('保存设置失败:', e);
  }
}

const initialSettings = loadSettings();

export const useSettingsStore = create<SettingsState>((set) => ({
  saveInterval: initialSettings.saveInterval,
  blurSaveEnabled: initialSettings.blurSaveEnabled,

  setSaveInterval: (interval) => {
    set({ saveInterval: interval });
    saveSettings({ saveInterval: interval, blurSaveEnabled: useSettingsStore.getState().blurSaveEnabled });
  },

  setBlurSaveEnabled: (enabled) => {
    set({ blurSaveEnabled: enabled });
    saveSettings({ saveInterval: useSettingsStore.getState().saveInterval, blurSaveEnabled: enabled });
  },
}));
