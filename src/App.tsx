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

  // 初始化：加载项目列表
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 当活动角色变化时，同步到characterStore
  useEffect(() => {
    syncFromStore();
  }, [activeProjectId, syncFromStore]);

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
