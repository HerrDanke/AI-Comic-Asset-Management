import { useEffect } from 'react';
import { useProjectStore } from './stores/projectStore';
import { useCharacterStore } from './stores/characterStore';
import { ProjectSidebar } from './components/ProjectSidebar';
import { CharacterList } from './components/CharacterList';
import { CharacterEditor } from './components/CharacterEditor';
import { Topbar } from './components/Topbar';

function App() {
  const { loadProjects, activeProjectId } = useProjectStore();
  const { syncFromStore } = useCharacterStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    syncFromStore();
  }, [activeProjectId, syncFromStore]);

  // 定期自动保存（每30秒）
  useEffect(() => {
    const interval = setInterval(async () => {
      const { isDirty: dirty, character } = useCharacterStore.getState();
      if (dirty && character) {
        await useCharacterStore.getState().save(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 窗口失焦时自动保存
  useEffect(() => {
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
  }, []);

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