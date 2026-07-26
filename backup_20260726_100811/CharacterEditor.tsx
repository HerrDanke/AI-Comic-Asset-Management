import { useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { useProjectStore } from '../stores/projectStore';
import { TraitEditor } from './TraitEditor';
import { ImageGallery } from './ImageGallery';
import { VersionHistory } from './VersionHistory';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

export function CharacterEditor() {
  const { character, isDirty, updateField, createVersionSnapshot, save } = useCharacterStore();
  const { activeProjectId } = useProjectStore();
  
  const [showVersions, setShowVersions] = useState(false);

  // 自动保存（失焦时创建版本快照）
  const handleFieldBlur = async (field: string, value: string) => {
    if (!character) return;
    
    if (value !== (character as any)[field]) {
      await createVersionSnapshot(`修改${getFieldLabel(field)}`);
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: '角色名称',
      role: '角色定位',
      positivePrompt: '正向提示词',
      negativePrompt: '反向提示词',
      chineseDescription: '中文描述',
      classicScenes: '经典场景',
      notes: '备注',
    };
    return labels[field] || field;
  };

  const handleImageUpload = async () => {
    if (!activeProjectId) return;
    
    const filePath = await openDialog({
      title: '选择图片',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
      multiple: false,
    });
    
    if (filePath && typeof filePath === 'string') {
      const { uploadImage } = useCharacterStore.getState();
      await uploadImage(filePath);
    }
  };

  if (!character) {
    return (
      <main className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 opacity-50">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p className="text-sm">选择一个角色或创建新角色</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-bg-primary">
      {/* 顶部操作栏 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-bg-primary/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-semibold"
            style={{ backgroundColor: character.color }}
          >
            {character.name.charAt(0)}
          </div>
          <div>
            <input
              type="text"
              value={character.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={(e) => handleFieldBlur('name', e.target.value)}
              className="text-lg font-semibold bg-transparent border-none text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 rounded px-1 -ml-1"
              placeholder="角色名称"
            />
            <input
              type="text"
              value={character.role}
              onChange={(e) => updateField('role', e.target.value)}
              onBlur={(e) => handleFieldBlur('role', e.target.value)}
              className="block text-sm bg-transparent border-none text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50 rounded px-1 -ml-1"
              placeholder="角色定位"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVersions(!showVersions)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              showVersions
                ? 'bg-accent/20 border-accent/30 text-accent'
                : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            📜 历史 ({character.versions?.length ?? 0})
          </button>
          
          <button
            onClick={save}
            disabled={!isDirty}
            className="px-3 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 主编辑区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 图片画廊 */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">参考图片</h3>
              <button
                onClick={handleImageUpload}
                className="px-2 py-1 text-xs rounded bg-accent/20 text-accent hover:bg-accent/30"
              >
                + 上传
              </button>
            </div>
            <ImageGallery />
          </section>

          {/* 中文描述 */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">中文特征描述</h3>
            <textarea
              value={character.chineseDescription}
              onChange={(e) => updateField('chineseDescription', e.target.value)}
              onBlur={(e) => handleFieldBlur('chineseDescription', e.target.value)}
              rows={4}
              placeholder="输入角色的中文外貌特征描述..."
              className="w-full px-3 py-2 text-sm rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted resize-none focus:border-accent"
            />
          </section>

          {/* 正向提示词 */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">正向提示词</h3>
            <textarea
              value={character.positivePrompt}
              onChange={(e) => updateField('positivePrompt', e.target.value)}
              onBlur={(e) => handleFieldBlur('positivePrompt', e.target.value)}
              rows={6}
              placeholder="输入正向提示词（描述角色外貌、服装、武器、气质等）..."
              className="w-full px-3 py-2 text-sm font-mono rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted resize-none focus:border-accent"
            />
          </section>

          {/* 反向提示词 */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">反向提示词</h3>
            <textarea
              value={character.negativePrompt}
              onChange={(e) => updateField('negativePrompt', e.target.value)}
              onBlur={(e) => handleFieldBlur('negativePrompt', e.target.value)}
              rows={3}
              placeholder="输入反向提示词（排除不需要的元素）..."
              className="w-full px-3 py-2 text-sm font-mono rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted resize-none focus:border-accent"
            />
          </section>

          {/* 性格特征（评论式） */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">性格特征</h3>
            <TraitEditor />
          </section>

          {/* 经典场景 */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">经典场景</h3>
            <textarea
              value={character.classicScenes}
              onChange={(e) => updateField('classicScenes', e.target.value)}
              onBlur={(e) => handleFieldBlur('classicScenes', e.target.value)}
              rows={2}
              placeholder="输入经典场景描述..."
              className="w-full px-3 py-2 text-sm rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted resize-none focus:border-accent"
            />
          </section>

          {/* 备注 */}
          <section className="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">备注</h3>
            <textarea
              value={character.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              onBlur={(e) => handleFieldBlur('notes', e.target.value)}
              rows={3}
              placeholder="角色性格、关系、经典场景等补充信息..."
              className="w-full px-3 py-2 text-sm rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted resize-none focus:border-accent"
            />
          </section>
        </div>
      </div>

      {/* 版本历史 - 固定在底部 */}
      {showVersions && (
        <div className="flex-shrink-0 border-t border-border bg-bg-secondary shadow-2xl overflow-hidden"
             style={{ height: '40vh', maxHeight: '400px' }}>
          <VersionHistory onClose={() => setShowVersions(false)} />
        </div>
      )}
    </main>
  );
}
