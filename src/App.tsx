import { useEffect } from 'react';
import { useProjectStore } from './stores/projectStore';
import { useCharacterStore } from './stores/characterStore';
import { useSettingsStore } from './stores/settingsStore';
import { ProjectSidebar } from './components/ProjectSidebar';
import { CharacterList } from './components/CharacterList';
import { CharacterEditor } from './components/CharacterEditor';
import { Topbar } from './components/Topbar';

function App() {
  const { loadProjects, activeProjectId, activeCharacterId } = useProjectStore();
  const { loadCharacter, undo, redo } = useCharacterStore();
  const { saveInterval, blurSaveEnabled } = useSettingsStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (activeCharacterId) {
      loadCharacter(activeCharacterId);
    }
  }, [activeProjectId, activeCharacterId, loadCharacter]);

  // 定期自动保存（根据用户设置）
  useEffect(() => {
    if (saveInterval <= 0) return;
    const interval = setInterval(async () => {
      const { isDirty: dirty, character } = useCharacterStore.getState();
      if (dirty && character) {
        await useCharacterStore.getState().save(false);
      }
    }, saveInterval);
    return () => clearInterval(interval);
  }, [saveInterval]);

  // 窗口失焦时自动保存
  useEffect(() => {
    if (!blurSaveEnabled) return;
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const { isDirty: dirty, character } = useCharacterStore.getState();
        if (dirty && character) {
          await useCharacterStore.getState().save(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [blurSaveEnabled]);

  // 全局快捷键
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        await undo();
      } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        await redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <CharacterList />
        <CharacterEditor />
      </div>
    </div>
  );
}

export default App;