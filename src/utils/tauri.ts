import { invoke } from '@tauri-apps/api/core';
import {
  CharacterData,
  CharacterSummary,
  ProjectMeta,
} from '../types';

// ══════════════════════════════════════════════════════════════
// 写入队列：按资源分桶，防止 JSON 文件并发写入竞争
// ══════════════════════════════════════════════════════════════
const resourceQueues = new Map<string, Promise<any>>();

function getQueue(key: string): Promise<any> {
  let queue = resourceQueues.get(key);
  if (!queue) {
    queue = Promise.resolve();
    resourceQueues.set(key, queue);
  }
  return queue;
}

function enqueue<T>(task: () => Promise<T>, resourceKey: string = 'global'): Promise<T> {
  const queue = getQueue(resourceKey);
  const run = queue.then(task, task);
  const newQueue = run.catch(() => {});
  resourceQueues.set(resourceKey, newQueue);
  return run;
}

function getCharacterResourceKey(projectId: string, characterId?: string): string {
  return characterId ? `char:${projectId}:${characterId}` : `project:${projectId}`;
}

// ══════════════════════════════════════════════════════════════
// 项目操作
// ══════════════════════════════════════════════════════════════

export async function getAppDataDir(): Promise<string> {
  return invoke<string>('get_app_data_dir_tauri');
}

export async function listProjects(): Promise<ProjectMeta[]> {
  return invoke<ProjectMeta[]>('list_projects');
}

export async function createProject(name: string, description: string): Promise<ProjectMeta> {
  return enqueue(() => invoke<ProjectMeta>('create_project', { name, description }));
}

export async function deleteProject(projectId: string): Promise<void> {
  return enqueue(() => invoke<void>('delete_project', { projectId }));
}

export async function getProject(projectId: string): Promise<ProjectMeta> {
  return invoke<ProjectMeta>('get_project', { projectId });
}

export async function updateProject(project: ProjectMeta): Promise<void> {
  return enqueue(() => invoke<void>('update_project', { project }));
}

// ══════════════════════════════════════════════════════════════
// 角色操作
// ══════════════════════════════════════════════════════════════

export async function listCharacters(projectId: string): Promise<CharacterData[]> {
  return invoke<CharacterData[]>('list_characters', { projectId });
}

export async function listCharacterSummaries(projectId: string): Promise<CharacterSummary[]> {
  return invoke<CharacterSummary[]>('list_character_summaries', { projectId });
}

export async function getCharacter(projectId: string, characterId: string): Promise<CharacterData> {
  return invoke<CharacterData>('get_character', { projectId, characterId });
}

export async function saveCharacter(projectId: string, character: CharacterData): Promise<void> {
  return enqueue(() => invoke<void>('save_character', { projectId, character }), getCharacterResourceKey(projectId, character.id));
}

export async function createCharacter(projectId: string): Promise<CharacterData> {
  return enqueue(() => invoke<CharacterData>('create_character', { projectId }), getCharacterResourceKey(projectId));
}

export async function deleteCharacter(projectId: string, characterId: string): Promise<void> {
  return enqueue(() => invoke<void>('delete_character', { projectId, characterId }), getCharacterResourceKey(projectId, characterId));
}

// ══════════════════════════════════════════════════════════════
// 图片操作
// ══════════════════════════════════════════════════════════════

export async function saveImage(
  projectId: string,
  characterId: string,
  srcPath: string
): Promise<string> {
  return enqueue(() => invoke<string>('save_image', { projectId, characterId, srcPath }), getCharacterResourceKey(projectId, characterId));
}

export async function deleteImage(
  projectId: string,
  characterId: string,
  imageName: string
): Promise<void> {
  return enqueue(() => invoke<void>('delete_image', { projectId, characterId, imageName }), getCharacterResourceKey(projectId, characterId));
}

export async function getImageData(
  projectId: string,
  characterId: string,
  imageName: string
): Promise<string> {
  return invoke<string>('get_image_data', { projectId, characterId, imageName });
}

export async function getThumbnailData(
  projectId: string,
  characterId: string,
  imageName: string
): Promise<string> {
  return invoke<string>('get_thumbnail_data', { projectId, characterId, imageName });
}

// ══════════════════════════════════════════════════════════════
// 导入/导出
// ══════════════════════════════════════════════════════════════

export async function exportProject(projectId: string, exportPath: string): Promise<void> {
  return enqueue(() => invoke<void>('export_project', { projectId, exportPath }));
}

export async function importProject(importPath: string, mode: string, targetProjectId?: string): Promise<ProjectMeta> {
  return enqueue(() => invoke<ProjectMeta>('import_project', { importPath, mode, targetProjectId }));
}
