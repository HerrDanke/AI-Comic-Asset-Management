// 性格特征
export interface Trait {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 版本快照
export interface VersionSnapshot {
  name: string;
  role: string;
  positivePrompt: string;
  negativePrompt: string;
  chineseDescription: string;
  classicScenes: string;
  notes: string;
  traits: Trait[];
  images: string[];
}

// 版本
export interface Version {
  id: string;
  timestamp: string;
  label: string;
  changeType: 'auto' | 'manual';
  snapshot: VersionSnapshot;
}

// 角色数据
export interface CharacterData {
  id: string;
  name: string;
  role: string;
  color: string;
  images: string[];
  positivePrompt: string;
  negativePrompt: string;
  chineseDescription: string;
  classicScenes: string;
  notes: string;
  traits: Trait[];
  versions: Version[];
  createdAt: string;
  updatedAt: string;
}

// 项目元数据
export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  characterIds: string[];
}

// 导出文件结构
export interface ProjectExport {
  version: string;
  exportedAt: string;
  project: ProjectMeta;
  characters: CharacterData[];
}

// 变更差异
export interface VersionDiff {
  field: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'removed' | 'modified';
}
