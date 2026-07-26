import { useProjectStore } from '../stores/projectStore';

export function ProjectSidebar() {
  const { projects, activeProjectId, switchProject, deleteProject } = useProjectStore();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定删除该项目吗？此操作不可撤销。')) {
      await deleteProject(id);
    }
  };

  return (
    <aside className="w-52 flex-shrink-0 bg-bg-secondary border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">项目列表</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted">
            暂无项目
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => switchProject(project.id)}
                className={`group relative p-3 rounded-md cursor-pointer transition-colors ${
                  project.id === activeProjectId
                    ? 'bg-accent/20 border border-accent/30'
                    : 'hover:bg-bg-tertiary border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {project.characterIds.length} 个角色
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
                    title="删除项目"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
