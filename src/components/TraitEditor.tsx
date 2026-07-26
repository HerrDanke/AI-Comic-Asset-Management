import { useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';

export function TraitEditor() {
  const { character, addTrait, editTrait, deleteTrait } = useCharacterStore();
  
  const [newTrait, setNewTrait] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = async () => {
    if (!newTrait.trim()) return;
    await addTrait(newTrait.trim());
    setNewTrait('');
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditValue(content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editValue.trim()) return;
    await editTrait(editingId, editValue.trim());
    setEditingId(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除该性格特征吗？')) {
      await deleteTrait(id);
    }
  };

  if (!character) return null;

  return (
    <div>
      {/* 添加新特征 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTrait}
          onChange={(e) => setNewTrait(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="添加性格特征（如：聪慧绝顶、招牌式促狭微笑）..."
          className="flex-1 px-3 py-2 text-sm rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted focus:border-accent"
        />
        <button
          onClick={handleAdd}
          disabled={!newTrait.trim()}
          className="px-4 py-2 text-sm rounded-md bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {/* 特征列表 */}
      <div className="flex flex-wrap gap-2">
        {character.traits.length === 0 ? (
          <div className="w-full py-4 text-center text-sm text-text-muted">
            暂无性格特征，在上方添加
          </div>
        ) : (
          character.traits.map(trait => (
            <div
              key={trait.id}
              className="group relative flex items-center gap-2 px-3 py-2 rounded-md bg-bg-primary border border-border hover:border-accent/50 transition-colors"
            >
              {editingId === trait.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                    className="w-48 px-2 py-1 text-sm rounded bg-bg-secondary border border-accent text-text-primary"
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 rounded hover:bg-green-500/20 text-green-400"
                    title="保存"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                    title="取消"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="text-sm text-text-primary cursor-pointer max-w-[200px] truncate"
                    onClick={() => handleEdit(trait.id, trait.content)}
                    title="点击编辑"
                  >
                    {trait.content}
                  </span>
                  <button
                    onClick={() => handleDelete(trait.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
                    title="删除"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
