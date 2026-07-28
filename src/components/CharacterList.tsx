import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useCharacterStore } from '../stores/characterStore';

interface Character {
  id: string;
  name: string;
  role: string;
  color: string;
}

export function CharacterList() {
  const { characterSummaries, activeCharacterId, switchCharacter, createCharacter, deleteCharacter, reorderCharacters, deleteCharacters } = useProjectStore();
  const { loadCharacter } = useCharacterStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    draggedId: null as string | null,
    itemHeight: 0,
    itemWidth: 0,
  });

  const filteredCharacters = searchQuery.trim()
    ? characterSummaries.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : characterSummaries;

  const handleSelect = (id: string) => {
    if (dragState.current.isDragging) return;
    switchCharacter(id);
    loadCharacter(id);
  };

  // 搜索历史
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setSearchHistory(prev => {
        const filtered = prev.filter(q => q !== searchQuery.trim());
        return [searchQuery.trim(), ...filtered].slice(0, 10);
      });
    }
  }, [searchQuery]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定删除该角色吗？此操作不可撤销。')) {
      await deleteCharacter(id);
    }
  };

  const getDropTargetId = useCallback((clientY: number, draggedId: string | null): string | null => {
    let closestId: string | null = null;
    let closestDistance = Infinity;

    itemRefs.current.forEach((el, id) => {
      if (id === draggedId) return;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - midY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = id;
      }
    });

    return closestId;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, char: Character) => {
    if (searchQuery.trim()) return;
    if (e.button !== 0) return;

    const el = itemRefs.current.get(char.id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragState.current = {
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      draggedId: char.id,
      itemHeight: rect.height,
      itemWidth: rect.width,
    };

    e.preventDefault();
  }, [searchQuery]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragState.current;
      if (!state.draggedId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;

      if (!state.isDragging) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        state.isDragging = true;
        setDraggedId(state.draggedId);
        setDragOffset({ x: dx, y: dy });
      }

      state.currentX = e.clientX;
      state.currentY = e.clientY;
      setDragOffset({ x: dx, y: dy });

      const targetId = getDropTargetId(e.clientY, state.draggedId);
      setDragOverId(targetId);
    };

    const handleMouseUp = async () => {
      const state = dragState.current;
      if (!state.draggedId) return;

      if (state.isDragging && dragOverId && dragOverId !== state.draggedId) {
        const fromIndex = characterSummaries.findIndex(c => c.id === state.draggedId);
        const toIndex = characterSummaries.findIndex(c => c.id === dragOverId);
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
          await reorderCharacters(fromIndex, toIndex);
        }
      }

      state.isDragging = false;
      state.draggedId = null;
      setDraggedId(null);
      setDragOverId(null);
      setDragOffset({ x: 0, y: 0 });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragOverId, characterSummaries, getDropTargetId, reorderCharacters]);

  return (
    <aside className="w-72 flex-shrink-0 bg-bg-secondary border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">角色列表</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                isMultiSelectMode ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
              title="多选模式"
            >
              {isMultiSelectMode ? '✓ 多选' : '○ 多选'}
            </button>
            <button
              onClick={createCharacter}
              className="px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover"
            >
              + 添加
            </button>
          </div>
        </div>
        
        {/* 搜索框 + 历史 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchHistory(true)}
            onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
            placeholder="搜索角色..."
            className="w-full px-3 py-1.5 text-xs rounded-md bg-bg-primary border border-border text-text-primary placeholder:text-text-muted"
          />
          {showSearchHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
              {searchHistory.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSearchQuery(query); setShowSearchHistory(false); }}
                  className="w-full px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary text-left"
                >
                  {query}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 批量操作栏 */}
        {isMultiSelectMode && selectedIds.size > 0 && (
          <div className="mt-2 p-2 bg-bg-tertiary rounded flex items-center justify-between">
            <span className="text-xs text-text-secondary">已选 {selectedIds.size} 个</span>
            <button
              onClick={async () => {
                if (confirm(`确定删除选中的 ${selectedIds.size} 个角色吗？`)) {
                  await deleteCharacters(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }
              }}
              className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              批量删除
            </button>
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 relative">
        {filteredCharacters.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted">
            {searchQuery ? '无匹配角色' : '暂无角色'}
          </div>
        ) : (
          <div className="space-y-1 relative">
            {filteredCharacters.map((char) => {
              const isDragged = draggedId === char.id;
              const isDragOver = dragOverId === char.id;
              const isSelected = selectedIds.has(char.id);

              return (
                <div
                  key={char.id}
                  ref={(el) => { if (el) itemRefs.current.set(char.id, el); }}
                  onMouseDown={(e) => handleMouseDown(e, char)}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(char.id)) next.delete(char.id);
                        else next.add(char.id);
                        return next;
                      });
                    } else {
                      handleSelect(char.id);
                    }
                  }}
                  className="group relative p-3 rounded-md cursor-pointer select-none"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(74, 158, 255, 0.3)'
                      : char.id === activeCharacterId
                        ? 'rgba(74, 158, 255, 0.2)'
                        : undefined,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isSelected
                      ? 'rgba(74, 158, 255, 0.6)'
                      : char.id === activeCharacterId
                        ? 'rgba(74, 158, 255, 0.3)'
                        : 'transparent',
                    transform: isDragged
                      ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.02)`
                      : isDragOver
                        ? 'scale(0.98)'
                        : 'scale(1)',
                    opacity: isDragged ? 0.9 : 1,
                    boxShadow: isDragged
                      ? '0 8px 25px rgba(0, 0, 0, 0.3)'
                      : isDragOver
                        ? '0 0 0 2px rgba(74, 158, 255, 0.5)'
                        : 'none',
                    transition: isDragged ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
                    zIndex: isDragged ? 100 : 1,
                    position: 'relative' as const,
                  }}
                >
                  {isDragOver && (
                    <div className="absolute -top-1 left-2 right-2 h-1 bg-accent rounded-full" />
                  )}

                  <div className="flex items-center gap-3 pointer-events-none">
                    {isMultiSelectMode && (
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-accent border-accent' : 'border-text-muted'
                        }`}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div
                      className="flex-shrink-0 cursor-grab active:cursor-grabbing text-text-muted/40 hover:text-text-muted transition-colors p-1"
                      title="拖拽排序"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </div>

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
                    {!isMultiSelectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(e, char.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all pointer-events-auto"
                        title="删除角色"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
