import { useState } from 'react';
import { useCharacterStore } from '../stores/characterStore';
import { Version } from '../types';

interface VersionHistoryProps {
  onClose: () => void;
}

export function VersionHistory({ onClose }: VersionHistoryProps) {
  const { character, restoreVersion, deleteVersion } = useCharacterStore();
  
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);

  if (!character) return null;

  const handleRestore = async (versionId: string) => {
    if (confirm('确定恢复到该版本吗？当前状态将被覆盖。')) {
      await restoreVersion(versionId);
      setSelectedVersion(null);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (confirm('确定删除该版本吗？')) {
      await deleteVersion(versionId);
      if (selectedVersion?.id === versionId) {
        setSelectedVersion(null);
      }
      if (compareVersion?.id === versionId) {
        setCompareVersion(null);
      }
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeLabel = (type: string) => {
    return type === 'auto' ? '🔄 自动' : '📸 手动';
  };

  const compareSnapshots = (v1: Version, v2: Version) => {
    const fields = ['name', 'role', 'positivePrompt', 'negativePrompt', 'chineseDescription', 'classicScenes', 'notes'] as const;
    const changes: { field: string; oldVal: string; newVal: string }[] = [];

    for (const field of fields) {
      if (v1.snapshot[field] !== v2.snapshot[field]) {
        changes.push({
          field,
          oldVal: v1.snapshot[field] || '(空)',
          newVal: v2.snapshot[field] || '(空)',
        });
      }
    }

    // 比较traits
    const v1Traits = v1.snapshot.traits.map(t => t.content).join(', ');
    const v2Traits = v2.snapshot.traits.map(t => t.content).join(', ');
    if (v1Traits !== v2Traits) {
      changes.push({ field: '性格特征', oldVal: v1Traits || '(空)', newVal: v2Traits || '(空)' });
    }

    return changes;
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">版本历史</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareVersion(null);
            }}
            className={`px-2 py-1 text-xs rounded ${
              compareMode ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            对比模式
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 版本列表 */}
      <div className="flex-1 overflow-y-auto">
        {character.versions.length === 0 ? (
          <div className="p-4 text-center text-sm text-text-muted">暂无版本历史</div>
        ) : (
          <div className="p-2 space-y-1">
            {character.versions.map(version => (
              <div
                key={version.id}
                onClick={() => {
                  if (compareMode) {
                    if (!compareVersion) {
                      setCompareVersion(version);
                    } else {
                      // 交换，让较新的版本在后面
                      if (new Date(version.timestamp) > new Date(compareVersion.timestamp)) {
                        setSelectedVersion(compareVersion);
                        setCompareVersion(version);
                      } else {
                        setSelectedVersion(version);
                      }
                    }
                  } else {
                    setSelectedVersion(selectedVersion?.id === version.id ? null : version);
                  }
                }}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedVersion?.id === version.id || compareVersion?.id === version.id
                    ? 'bg-accent/20 border border-accent/30'
                    : 'hover:bg-bg-tertiary border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-primary">{version.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {formatDate(version.timestamp)} · {getChangeTypeLabel(version.changeType)}
                    </div>
                  </div>
                  {!compareMode && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(version.id); }}
                        className="p-1 rounded hover:bg-green-500/20 text-green-400"
                        title="恢复此版本"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
                          <path d="M3 21v-5h5" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 版本详情/对比 */}
      {selectedVersion && !compareMode && (
        <div className="border-t border-border p-4">
          <h4 className="text-xs font-semibold text-text-muted mb-2">版本详情</h4>
          <div className="text-xs text-text-secondary space-y-1 mb-3">
            <div><span className="text-text-muted">名称:</span> {selectedVersion.snapshot.name || '(空)'}</div>
            <div><span className="text-text-muted">定位:</span> {selectedVersion.snapshot.role || '(空)'}</div>
            <div><span className="text-text-muted">特征:</span> {selectedVersion.snapshot.traits.length} 个</div>
            <div><span className="text-text-muted">图片:</span> {selectedVersion.snapshot.images.length} 张</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleRestore(selectedVersion.id)}
              className="flex-1 px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover"
            >
              恢复此版本
            </button>
            <button
              onClick={() => handleDelete(selectedVersion.id)}
              className="px-3 py-1.5 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 对比结果 */}
      {compareMode && selectedVersion && compareVersion && (
        <div className="border-t border-border p-4">
          <h4 className="text-xs font-semibold text-text-muted mb-2">版本对比</h4>
          <div className="text-xs space-y-2">
            {compareSnapshots(selectedVersion, compareVersion).map((change, idx) => (
              <div key={idx} className="p-2 rounded bg-bg-tertiary">
                <div className="text-accent mb-1">{change.field}</div>
                <div className="text-red-400 line-through">{change.oldVal}</div>
                <div className="text-green-400">{change.newVal}</div>
              </div>
            ))}
            {compareSnapshots(selectedVersion, compareVersion).length === 0 && (
              <div className="text-text-muted">两个版本无差异</div>
            )}
          </div>
          <button
            onClick={() => handleRestore(compareVersion.id)}
            className="w-full mt-3 px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent-hover"
          >
            恢复到后者版本
          </button>
        </div>
      )}

      {compareMode && !compareVersion && (
        <div className="border-t border-border p-4 text-center text-xs text-text-muted">
          选择两个版本进行对比
        </div>
      )}
    </div>
  );
}
