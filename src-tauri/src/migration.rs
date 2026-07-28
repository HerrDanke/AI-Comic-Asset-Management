use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::constants::CURRENT_DATA_VERSION;
use crate::commands::{CharacterData, ProjectMeta, VersionSnapshot, Version, Trait};

// ============ 数据迁移 ============

/// 旧版完整快照（用于兼容）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LegacyVersionSnapshot {
    pub name: String,
    pub role: String,
    pub positive_prompt: String,
    pub negative_prompt: String,
    pub chinese_description: String,
    pub classic_scenes: String,
    pub notes: String,
    pub traits: Vec<Trait>,
    pub images: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LegacyVersion {
    pub id: String,
    pub timestamp: String,
    pub label: String,
    pub change_type: String,
    pub snapshot: LegacyVersionSnapshot,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LegacyCharacterData {
    pub id: String,
    pub name: String,
    pub role: String,
    pub color: String,
    pub images: Vec<String>,
    pub positive_prompt: String,
    pub negative_prompt: String,
    pub chinese_description: String,
    pub classic_scenes: String,
    pub notes: String,
    pub traits: Vec<Trait>,
    pub versions: Vec<LegacyVersion>,
    pub created_at: String,
    pub updated_at: String,
}

/// 迁移角色数据到最新版本
pub fn migrate_character_data(mut character: CharacterData) -> CharacterData {
    // 检查是否需要迁移（通过检查第一个版本的快照结构）
    if character.versions.is_empty() {
        return character;
    }

    // 如果已经有 is_full_snapshot 字段，说明已经是新版
    if character.versions[0].snapshot.is_full_snapshot || !character.versions[0].snapshot.is_full_snapshot {
        // 简单检查：新版有 is_full_snapshot 字段
        // 由于 serde 的 default，旧数据也会有一个值
        // 这里我们通过检查 diffs 字段来判断
    }

    // 迁移逻辑：将旧版完整快照转换为 diff 模式
    let mut migrated_versions = Vec::new();
    let versions = character.versions.clone();

    for (i, version) in versions.iter().enumerate() {
        if i == 0 {
            // 第一个版本保持完整快照
            migrated_versions.push(version.clone());
        } else {
            // 后续版本转换为 diff
            let prev = &versions[i - 1];
            let mut diffs = Vec::new();

            if version.snapshot.name != prev.snapshot.name {
                diffs.push(crate::commands::VersionDiff {
                    field: "name".to_string(),
                    old_value: prev.snapshot.name.clone(),
                    new_value: version.snapshot.name.clone(),
                });
            }
            if version.snapshot.role != prev.snapshot.role {
                diffs.push(crate::commands::VersionDiff {
                    field: "role".to_string(),
                    old_value: prev.snapshot.role.clone(),
                    new_value: version.snapshot.role.clone(),
                });
            }
            if version.snapshot.positive_prompt != prev.snapshot.positive_prompt {
                diffs.push(crate::commands::VersionDiff {
                    field: "positivePrompt".to_string(),
                    old_value: prev.snapshot.positive_prompt.clone(),
                    new_value: version.snapshot.positive_prompt.clone(),
                });
            }
            if version.snapshot.negative_prompt != prev.snapshot.negative_prompt {
                diffs.push(crate::commands::VersionDiff {
                    field: "negativePrompt".to_string(),
                    old_value: prev.snapshot.negative_prompt.clone(),
                    new_value: version.snapshot.negative_prompt.clone(),
                });
            }
            if version.snapshot.chinese_description != prev.snapshot.chinese_description {
                diffs.push(crate::commands::VersionDiff {
                    field: "chineseDescription".to_string(),
                    old_value: prev.snapshot.chinese_description.clone(),
                    new_value: version.snapshot.chinese_description.clone(),
                });
            }
            if version.snapshot.classic_scenes != prev.snapshot.classic_scenes {
                diffs.push(crate::commands::VersionDiff {
                    field: "classicScenes".to_string(),
                    old_value: prev.snapshot.classic_scenes.clone(),
                    new_value: version.snapshot.classic_scenes.clone(),
                });
            }
            if version.snapshot.notes != prev.snapshot.notes {
                diffs.push(crate::commands::VersionDiff {
                    field: "notes".to_string(),
                    old_value: prev.snapshot.notes.clone(),
                    new_value: version.snapshot.notes.clone(),
                });
            }

            let prev_traits = prev.snapshot.traits.iter().map(|t| &t.content).cloned().collect::<Vec<_>>().join(", ");
            let curr_traits = version.snapshot.traits.iter().map(|t| &t.content).cloned().collect::<Vec<_>>().join(", ");
            if prev_traits != curr_traits {
                diffs.push(crate::commands::VersionDiff {
                    field: "traits".to_string(),
                    old_value: prev_traits,
                    new_value: curr_traits,
                });
            }

            let prev_images = prev.snapshot.images.join(", ");
            let curr_images = version.snapshot.images.join(", ");
            if prev_images != curr_images {
                diffs.push(crate::commands::VersionDiff {
                    field: "images".to_string(),
                    old_value: prev_images,
                    new_value: curr_images,
                });
            }

            migrated_versions.push(Version {
                id: version.id.clone(),
                timestamp: version.timestamp.clone(),
                label: version.label.clone(),
                change_type: version.change_type.clone(),
                snapshot: VersionSnapshot {
                    name: version.snapshot.name.clone(),
                    role: version.snapshot.role.clone(),
                    positive_prompt: version.snapshot.positive_prompt.clone(),
                    negative_prompt: version.snapshot.negative_prompt.clone(),
                    chinese_description: version.snapshot.chinese_description.clone(),
                    classic_scenes: version.snapshot.classic_scenes.clone(),
                    notes: version.snapshot.notes.clone(),
                    traits: version.snapshot.traits.clone(),
                    images: version.snapshot.images.clone(),
                    diffs: if diffs.is_empty() { None } else { Some(diffs) },
                    is_full_snapshot: false,
                },
            });
        }
    }

    character.versions = migrated_versions;
    character
}

/// 检查并迁移项目数据
pub fn migrate_project_data(project_dir: &PathBuf) -> Result<(), String> {
    let project_file = project_dir.join("project.json");
    if !project_file.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&project_file).map_err(|e| e.to_string())?;
    let mut project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // 检查版本号
    if project.updated_at == CURRENT_DATA_VERSION {
        return Ok(()); // 已是最新
    }

    // 迁移角色数据
    let characters_dir = project_dir.join("characters");
    if characters_dir.exists() {
        for entry in fs::read_dir(&characters_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let char_dir = entry.path();
            if char_dir.is_dir() {
                let char_file = char_dir.join("character.json");
                if char_file.exists() {
                    let content = fs::read_to_string(&char_file).map_err(|e| e.to_string())?;
                    if let Ok(character) = serde_json::from_str::<CharacterData>(&content) {
                        let migrated = migrate_character_data(character);
                        let json = serde_json::to_string_pretty(&migrated).map_err(|e| e.to_string())?;
                        fs::write(&char_file, json).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
    }

    // 更新项目版本号
    project.updated_at = CURRENT_DATA_VERSION.to_string();
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    Ok(())
}
