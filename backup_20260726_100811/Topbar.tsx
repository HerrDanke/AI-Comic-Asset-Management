import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useCharacterStore } from '../stores/characterStore';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';

export function Topbar() {
  const { activeProjectId, getActiveProject, createProject, exportProject, importProject, error: storeError } = useProjectStore();
  const { character, isDirty, createVersionSnapshot } = useCharacterStore();
  
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  const project = getActiveProject();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setLocalError(null);
    try {
      await createProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      setShowNewProject(false);
    } catch (err) {
      console.error('创建项目失败:', err);
      setLocalError(String(err));
    }
  };

  const handleExport = async () => {
    if (!activeProjectId) return;
    
    const filePath = await saveDialog({
      title: '导出项目',
      defaultPath: `${project?.name || 'project'}_export.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    
    if (filePath) {
      await exportProject(filePath);
    }
  };

  const handleImport = async () => {
    const filePath = await openDialog({
      title: '导入项目',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });
    
    if (filePath && typeof filePath === 'string') {
      await importProject(filePath);
    }
  };

  const handleManualSnapshot = async () => {
    if (character) {
      await createVersionSnapshot('手动快照', 'manual');
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent/20 text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-text-primary">AI漫剧角色库</h1>
          <p className="text-xs text-text-muted">
            {project ? project.name : '请选择或创建项目'}
            {isDirty && <span className="ml-2 text-yellow-500">● 未保存</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNewProject(true)}
          className="px-3 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          + 新建项目
        </button>
        
        <button
          onClick={handleImport}
          className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border transition-colors"
        >
          导入
        </button>
        
        <button
          onClick={handleExport}
          disabled={!activeProjectId}
          className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border transition-colors disabled:opacity-50"
        >
          导出
        </button>

        <button
          onClick={handleManualSnapshot}
          disabled={!character}
          className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border transition-colors disabled:opacity-50"
          title="创建手动版本快照"
        >
          📸 快照
        </button>
      </div>

      {/* 新建项目对话框 */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 p-6 rounded-lg bg-bg-secondary border border-border">
            <h2 className="text-sm font-semibold text-text-primary mb-4">新建项目</h2>
            {(localError || storeError) && (
              <div className="mb-3 p-2 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/30">
                错误: {localError || storeError}
              </div>
            )}
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="项目名称"
              className="w-full px-3 py-2 mb-3 text-sm rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted"
            />
            <textarea
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="项目描述（可选）"
              rows={3}
              className="w-full px-3 py-2 mb-4 text-sm rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewProject(false)}
                className="px-4 py-2 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 text-xs rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
