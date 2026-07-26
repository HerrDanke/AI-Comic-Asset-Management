import { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useCharacterStore } from '../stores/characterStore';

export function CharacterList() {
  const { characters, activeCharacterId, switchCharacter, createCharacter, deleteCharacter } = useProjectStore();
  const { syncFromStore } = useCharacterStore();
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = searchQuery.trim()
    ? characters.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : characters;

  const handleSelect = (id: string) => {
    switchCharacter(id);
    syncFromStore();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定删除该角色吗？此操作不可撤销。')) {
      await deleteCharacter(id);
    }
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-bg-secondary border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">角色列表</h2>
          <button
            onClick={createCharacter}
            className="px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover"
          >
            + 添加
          </button>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索角色..."
          className="w-full px-3 py-1.5 text-xs rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCharacters.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted">
            {searchQuery ? '无匹配角色' : '暂无角色'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCharacters?.map(char => (
              <div
                key={char.id}
                onClick={() => handleSelect(char.id)}
                className={`group relative p-3 rounded-md cursor-pointer transition-colors ${
                  char.id === activeCharacterId
                    ? 'bg-accent/20 border border-accent/30'
                    : 'hover:bg-bg-tertiary border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ backgroundColor: char.color }}
                  >
                    {char.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {char.name}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {char.role || '未设置定位'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, char.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all"
                    title="删除角色"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
