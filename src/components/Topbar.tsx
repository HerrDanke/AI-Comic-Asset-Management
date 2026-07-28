import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useCharacterStore } from '../stores/characterStore';
import { useSettingsStore, SaveInterval } from '../stores/settingsStore';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';

export function Topbar() {
  const { activeProjectId, projects, getActiveProject, createProject, exportProject, importProject, error: storeError } = useProjectStore();
  const { character, isDirty, createVersionSnapshot, canUndo, canRedo, undo, redo } = useCharacterStore();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { saveInterval, blurSaveEnabled, setSaveInterval, setBlurSaveEnabled } = useSettingsStore();

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

  // ── 导入：先选择文件，再选择模式 ──
  const handleImportSelect = async () => {
    const filePath = await openDialog({
      title: '导入项目',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });

    if (filePath && typeof filePath === 'string') {
      setImportFilePath(filePath);
      setShowImportOptions(true);
    }
  };

  const handleImportAsNew = async () => {
    if (!importFilePath) return;
    try {
      await importProject(importFilePath, 'new');
      setShowImportOptions(false);
      setImportFilePath(null);
    } catch (err) {
      console.error('导入失败:', err);
      setLocalError(String(err));
    }
  };

  const handleImportMerge = async (targetProjectId: string) => {
    if (!importFilePath) return;
    try {
      await importProject(importFilePath, 'merge', targetProjectId);
      setShowImportOptions(false);
      setImportFilePath(null);
    } catch (err) {
      console.error('合并失败:', err);
      setLocalError(String(err));
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
          onClick={handleImportSelect}
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

        <button
          onClick={undo}
          disabled={!canUndo()}
          className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border transition-colors disabled:opacity-50"
          title="撤销 (Ctrl+Z)"
        >
          ↩️ 撤销
        </button>

        <button
          onClick={redo}
          disabled={!canRedo()}
          className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border transition-colors disabled:opacity-50"
          title="重做 (Ctrl+Y)"
        >
          ↪️ 重做
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border transition-colors"
          title="设置"
        >
          ⚙️ 设置
        </button>
      </div>

      {/* 设置对话框 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 p-6 rounded-lg bg-bg-secondary border border-border">
            <h2 className="text-sm font-semibold text-text-primary mb-4">设置</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted block mb-2">自动保存间隔</label>
                <select
                  value={saveInterval}
                  onChange={(e) => setSaveInterval(Number(e.target.value) as SaveInterval)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-bg-primary border border-border text-text-primary"
                >
                  <option value={10000}>10 秒</option>
                  <option value={30000}>30 秒</option>
                  <option value={60000}>60 秒</option>
                  <option value={0}>手动</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-text-muted">失焦时自动保存</label>
                <button
                  onClick={() => setBlurSaveEnabled(!blurSaveEnabled)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    blurSaveEnabled
                      ? 'bg-accent/20 border-accent/30 text-accent'
                      : 'bg-bg-tertiary border-border text-text-secondary'
                  }`}
                >
                  {blurSaveEnabled ? '已开启' : '已关闭'}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 导入选项对话框 */}
      {showImportOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[480px] p-6 rounded-lg bg-bg-secondary border border-border">
            <h2 className="text-sm font-semibold text-text-primary mb-4">选择导入方式</h2>

            <div className="space-y-3">
              {/* 作为新项目 */}
              <button
                onClick={handleImportAsNew}
                className="w-full p-4 rounded-lg bg-bg-primary border border-border hover:border-accent/50 text-left transition-colors"
              >
                <div className="text-sm font-medium text-text-primary">作为新项目导入</div>
                <div className="text-xs text-text-muted mt-1">创建一个独立的项目副本</div>
              </button>

              {/* 合并到现有项目 */}
              {projects.length > 0 && (
                <div className="p-4 rounded-lg bg-bg-primary border border-border">
                  <div className="text-sm font-medium text-text-primary mb-2">合并到现有项目</div>
                  <div className="text-xs text-text-muted mb-2">重名角色将自动重命名</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleImportMerge(p.id)}
                        className="w-full px-3 py-2 text-xs rounded bg-bg-secondary hover:bg-accent/20 text-text-secondary hover:text-text-primary text-left transition-colors"
                      >
                        {p.name} ({p.characterIds.length} 个角色)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShowImportOptions(false); setImportFilePath(null); }}
                className="px-4 py-2 text-xs rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
