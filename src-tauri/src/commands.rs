use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use base64::Engine;

use crate::constants::{MAX_IMAGE_SIZE, VALID_IMAGE_EXTENSIONS};

// ============ 数据模型 ============

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub description: String,
    pub cover_image: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub character_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Trait {
    pub id: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VersionDiff {
    pub field: String,
    pub old_value: String,
    pub new_value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VersionSnapshot {
    pub name: String,
    pub role: String,
    pub positive_prompt: String,
    pub negative_prompt: String,
    pub chinese_description: String,
    pub classic_scenes: String,
    pub notes: String,
    pub traits: Vec<Trait>,
    pub images: Vec<String>,
    #[serde(default)]
    pub diffs: Option<Vec<VersionDiff>>,
    #[serde(default = "default_full_snapshot")]
    pub is_full_snapshot: bool,
}

fn default_full_snapshot() -> bool {
    true
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CharacterSummary {
    pub id: String,
    pub name: String,
    pub role: String,
    pub color: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Version {
    pub id: String,
    pub timestamp: String,
    pub label: String,
    pub change_type: String,
    pub snapshot: VersionSnapshot,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CharacterData {
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
    pub versions: Vec<Version>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectExport {
    pub version: String,
    pub exported_at: String,
    pub project: ProjectMeta,
    pub characters: Vec<CharacterData>,
}

// ============ 辅助函数 ============

fn get_app_data_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "无法获取用户主目录".to_string())?;
    let app_dir = home.join("AIComicCharacterDB");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| format!("无法创建应用数据目录: {}", e))?;
    }
    Ok(app_dir)
}

fn get_projects_dir() -> Result<PathBuf, String> {
    let dir = get_app_data_dir()?.join("projects");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建项目目录: {}", e))?;
    }
    Ok(dir)
}

fn get_project_dir(project_id: &str) -> Result<PathBuf, String> {
    let dir = get_projects_dir()?.join(project_id);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建项目目录: {}", e))?;
    }
    Ok(dir)
}

fn get_characters_dir(project_id: &str) -> Result<PathBuf, String> {
    let dir = get_project_dir(project_id)?.join("characters");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建角色目录: {}", e))?;
    }
    Ok(dir)
}

fn get_character_dir(project_id: &str, character_id: &str) -> Result<PathBuf, String> {
    let dir = get_characters_dir(project_id)?.join(character_id);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建角色目录: {}", e))?;
    }
    Ok(dir)
}

fn get_images_dir(project_id: &str, character_id: &str) -> Result<PathBuf, String> {
    let dir = get_character_dir(project_id, character_id)?.join("images");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建图片目录: {}", e))?;
    }
    Ok(dir)
}

fn get_thumbnails_dir(project_id: &str, character_id: &str) -> Result<PathBuf, String> {
    let dir = get_character_dir(project_id, character_id)?.join("thumbnails");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("无法创建缩略图目录: {}", e))?;
    }
    Ok(dir)
}

fn now_string() -> String {
    chrono::Local::now().to_rfc3339()
}

// 从 UUID 生成鲜艳的颜色
fn generate_color() -> String {
    let id = Uuid::new_v4();
    let bytes = id.as_bytes();
    // 使用 UUID 的前3字节作为 RGB，确保颜色足够鲜艳
    let r = bytes[0];
    let g = bytes[1];
    let b = bytes[2];
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

/// 验证路径是否在预期目录内（防止路径遍历攻击）
fn validate_path_in_dir(base_dir: &Path, user_path: &str) -> Result<PathBuf, String> {
    let canonical_base = base_dir.canonicalize().map_err(|e| format!("无法解析基础目录: {}", e))?;
    let full_path = canonical_base.join(user_path);
    let canonical_full = full_path.canonicalize().map_err(|e| format!("无法解析路径: {}", e))?;
    
    if !canonical_full.starts_with(&canonical_base) {
        return Err("路径遍历攻击检测: 路径超出预期目录".to_string());
    }
    
    Ok(canonical_full)
}

/// 验证图片文件
fn validate_image_file(path: &Path) -> Result<(), String> {
    // 检查文件大小 (最大 10MB)
    let metadata = fs::metadata(path).map_err(|e| format!("无法读取文件元数据: {}", e))?;
    if metadata.len() > MAX_IMAGE_SIZE {
        return Err("文件大小超过 10MB 限制".to_string());
    }
    
    // 检查 MIME 类型
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    if !VALID_IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("不支持的图片格式: {}", ext));
    }
    
    Ok(())
}

/// 验证导入的 JSON 数据是否符合 ProjectExport schema
fn validate_import_schema(content: &str) -> Result<(), String> {
    let data: serde_json::Value = serde_json::from_str(content).map_err(|e| format!("JSON 解析失败: {}", e))?;
    
    // 检查必需字段
    if data.get("version").is_none() {
        return Err("缺少必需字段: version".to_string());
    }
    if data.get("exportedAt").is_none() {
        return Err("缺少必需字段: exportedAt".to_string());
    }
    if data.get("project").is_none() {
        return Err("缺少必需字段: project".to_string());
    }
    if data.get("characters").is_none() {
        return Err("缺少必需字段: characters".to_string());
    }
    
    // 验证 project 结构
    let project = data.get("project").unwrap();
    if project.get("id").is_none() {
        return Err("project 缺少必需字段: id".to_string());
    }
    if project.get("name").is_none() {
        return Err("project 缺少必需字段: name".to_string());
    }
    
    // 验证 characters 是数组
    let characters = data.get("characters").unwrap();
    if !characters.is_array() {
        return Err("characters 必须是数组".to_string());
    }
    
    Ok(())
}

// ============ Tauri 命令 ============

#[tauri::command]
pub fn get_app_data_dir_tauri() -> Result<String, String> {
    Ok(get_app_data_dir()?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectMeta>, String> {
    let projects_dir = get_projects_dir()?;
    let mut projects = Vec::new();

    for entry in fs::read_dir(&projects_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let project_file = path.join("project.json");
            if project_file.exists() {
                let content = fs::read_to_string(&project_file).map_err(|e| e.to_string())?;
                let project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;
                projects.push(project);
            }
        }
    }

    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(projects)
}

#[tauri::command]
pub fn create_project(name: String, description: String) -> Result<ProjectMeta, String> {
    let project_id = Uuid::new_v4().to_string();
    let now = now_string();

    let project = ProjectMeta {
        id: project_id.clone(),
        name,
        description,
        cover_image: None,
        created_at: now.clone(),
        updated_at: now.clone(),
        character_ids: Vec::new(),
    };

    let project_dir = get_project_dir(&project_id)?;
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn get_project(project_id: String) -> Result<ProjectMeta, String> {
    let project_file = get_project_dir(&project_id)?.join("project.json");
    let content = fs::read_to_string(&project_file).map_err(|e| e.to_string())?;
    let project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub fn update_project(project: ProjectMeta) -> Result<(), String> {
    let project_dir = get_project_dir(&project.id)?;
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_project(project_id: String) -> Result<(), String> {
    let project_dir = get_project_dir(&project_id)?;
    if project_dir.exists() {
        fs::remove_dir_all(&project_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_characters(project_id: String) -> Result<Vec<CharacterData>, String> {
    let characters_dir = get_characters_dir(&project_id)?;
    let mut characters = Vec::new();

    for entry in fs::read_dir(&characters_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let char_file = path.join("character.json");
            if char_file.exists() {
                let content = fs::read_to_string(&char_file).map_err(|e| e.to_string())?;
                let character: CharacterData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
                characters.push(character);
            }
        }
    }

    characters.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(characters)
}

#[tauri::command]
pub fn list_character_summaries(project_id: String) -> Result<Vec<CharacterSummary>, String> {
    let characters_dir = get_characters_dir(&project_id)?;
    let mut summaries = Vec::new();

    for entry in fs::read_dir(&characters_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            let char_file = path.join("character.json");
            if char_file.exists() {
                let content = fs::read_to_string(&char_file).map_err(|e| e.to_string())?;
                let character: CharacterData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
                summaries.push(CharacterSummary {
                    id: character.id,
                    name: character.name,
                    role: character.role,
                    color: character.color,
                    updated_at: character.updated_at,
                });
            }
        }
    }

    summaries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(summaries)
}

#[tauri::command]
pub fn get_character(project_id: String, character_id: String) -> Result<CharacterData, String> {
    let char_file = get_character_dir(&project_id, &character_id)?.join("character.json");
    let content = fs::read_to_string(&char_file).map_err(|e| e.to_string())?;
    let character: CharacterData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(character)
}

#[tauri::command]
pub fn save_character(project_id: String, character: CharacterData) -> Result<(), String> {
    let char_dir = get_character_dir(&project_id, &character.id)?;
    let char_file = char_dir.join("character.json");
    let json = serde_json::to_string_pretty(&character).map_err(|e| e.to_string())?;
    fs::write(&char_file, json).map_err(|e| e.to_string())?;

    // 更新项目 updated_at
    let mut project = get_project(project_id.clone())?;
    project.updated_at = now_string();
    update_project(project)?;

    Ok(())
}

#[tauri::command]
pub fn create_character(project_id: String) -> Result<CharacterData, String> {
    let character_id = Uuid::new_v4().to_string();
    let now = now_string();

    let character = CharacterData {
        id: character_id.clone(),
        name: "新角色".to_string(),
        role: String::new(),
        color: generate_color(),
        images: Vec::new(),
        positive_prompt: String::new(),
        negative_prompt: String::new(),
        chinese_description: String::new(),
        classic_scenes: String::new(),
        notes: String::new(),
        traits: Vec::new(),
        versions: vec![Version {
            id: Uuid::new_v4().to_string(),
            timestamp: now.clone(),
            label: "创建角色".to_string(),
            change_type: "auto".to_string(),
            snapshot: VersionSnapshot {
                name: "新角色".to_string(),
                role: String::new(),
                positive_prompt: String::new(),
                negative_prompt: String::new(),
                chinese_description: String::new(),
                classic_scenes: String::new(),
                notes: String::new(),
                traits: Vec::new(),
                images: Vec::new(),
                diffs: None,
                is_full_snapshot: true,
            },
        }],
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    save_character(project_id, character.clone())?;
    Ok(character)
}

#[tauri::command]
pub fn delete_character(project_id: String, character_id: String) -> Result<(), String> {
    let char_dir = get_character_dir(&project_id, &character_id)?;
    if char_dir.exists() {
        fs::remove_dir_all(&char_dir).map_err(|e| e.to_string())?;
    }

    let mut project = get_project(project_id.clone())?;
    project.character_ids.retain(|id| id != &character_id);
    update_project(project)?;

    Ok(())
}

#[tauri::command]
pub fn save_image(project_id: String, character_id: String, src_path: String) -> Result<String, String> {
    let src = Path::new(&src_path);
    
    // 验证文件
    validate_image_file(src)?;
    
    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let file_name = format!("img_{}.{}", Uuid::new_v4(), ext);

    let images_dir = get_images_dir(&project_id, &character_id)?;
    let dest_path = images_dir.join(&file_name);

    fs::copy(src, &dest_path).map_err(|e| e.to_string())?;

    Ok(file_name)
}

#[tauri::command]
pub fn delete_image(project_id: String, character_id: String, image_name: String) -> Result<(), String> {
    let images_dir = get_images_dir(&project_id, &character_id)?;
    
    // 路径遍历防护
    let image_path = validate_path_in_dir(&images_dir, &image_name)?;
    
    if image_path.exists() {
        fs::remove_file(&image_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn export_project(project_id: String, export_path: String) -> Result<(), String> {
    let project = get_project(project_id.clone())?;
    let characters = list_characters(project_id)?;

    let export = ProjectExport {
        version: "1.0".to_string(),
        exported_at: now_string(),
        project,
        characters,
    };

    let json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    fs::write(&export_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// ── 导入：支持新建（new）和合并（merge）两种模式 ──

#[tauri::command]
pub fn import_project(
    import_path: String,
    mode: String,
    target_project_id: Option<String>,
) -> Result<ProjectMeta, String> {
    let content = fs::read_to_string(&import_path).map_err(|e| e.to_string())?;
    
    // 验证导入文件结构
    validate_import_schema(&content)?;
    
    let export: ProjectExport = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    match mode.as_str() {
        "new" => import_as_new(export),
        "merge" => {
            let target_id = target_project_id.ok_or("合并模式需要提供目标项目ID")?;
            import_merge(export, target_id)
        }
        _ => Err(format!("未知的导入模式: {}", mode)),
    }
}

fn import_as_new(export: ProjectExport) -> Result<ProjectMeta, String> {
    let new_project_id = Uuid::new_v4().to_string();
    let now = now_string();
    let mut project = export.project;
    project.id = new_project_id.clone();
    project.created_at = now.clone();
    project.updated_at = now.clone();
    project.character_ids = Vec::new();

    let project_dir = get_project_dir(&new_project_id)?;
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    let mut new_character_ids = Vec::new();
    for mut character in export.characters {
        let new_char_id = Uuid::new_v4().to_string();
        character.id = new_char_id.clone();
        character.created_at = now_string();
        character.updated_at = now_string();

        let char_dir = get_character_dir(&new_project_id, &new_char_id)?;
        let char_file = char_dir.join("character.json");
        let json = serde_json::to_string_pretty(&character).map_err(|e| e.to_string())?;
        fs::write(&char_file, json).map_err(|e| e.to_string())?;

        new_character_ids.push(new_char_id);
    }

    project.character_ids = new_character_ids;
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    Ok(project)
}

fn import_merge(export: ProjectExport, target_project_id: String) -> Result<ProjectMeta, String> {
    let now = now_string();
    let mut project = get_project(target_project_id.clone())?;

    // 检测重名角色并重命名
    let existing_characters = list_characters(target_project_id.clone())?;
    let existing_names: Vec<String> = existing_characters.iter().map(|c| c.name.clone()).collect();

    for mut character in export.characters {
        let original_name = character.name.clone();
        let mut final_name = original_name.clone();
        let mut counter = 1;
        while existing_names.contains(&final_name) {
            final_name = format!("{} ({})", original_name, counter);
            counter += 1;
        }

        let new_char_id = Uuid::new_v4().to_string();
        character.id = new_char_id.clone();
        character.name = final_name;
        character.created_at = now_string();
        character.updated_at = now_string();

        let char_dir = get_character_dir(&target_project_id, &new_char_id)?;
        let char_file = char_dir.join("character.json");
        let json = serde_json::to_string_pretty(&character).map_err(|e| e.to_string())?;
        fs::write(&char_file, json).map_err(|e| e.to_string())?;

        project.character_ids.push(new_char_id);
    }

    project.updated_at = now;
    update_project(project.clone())?;

    Ok(project)
}

// ── 返回 data URL 格式（带 MIME 前缀） ──

#[tauri::command]
pub fn get_image_data(project_id: String, character_id: String, image_name: String) -> Result<String, String> {
    let images_dir = get_images_dir(&project_id, &character_id)?;
    
    // 路径遍历防护
    let image_path = validate_path_in_dir(&images_dir, &image_name)?;
    
    let data = fs::read(&image_path).map_err(|e| e.to_string())?;
    let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
    let ext = image_name.rsplit('.').next().unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        _ => "image/png",
    };
    Ok(format!("data:{};base64,{}", mime, base64))
}

// ── 缩略图 ──

#[tauri::command]
pub fn get_thumbnail_data(project_id: String, character_id: String, image_name: String) -> Result<String, String> {
    let thumbnails_dir = get_thumbnails_dir(&project_id, &character_id)?;
    let thumb_path = thumbnails_dir.join(&image_name);

    // 如果缩略图不存在，生成它
    if !thumb_path.exists() {
        let images_dir = get_images_dir(&project_id, &character_id)?;
        let image_path = validate_path_in_dir(&images_dir, &image_name)?;
        let img = image::open(&image_path).map_err(|e| e.to_string())?;
        let thumbnail = img.thumbnail(256, 256);
        thumbnail.save(&thumb_path).map_err(|e| e.to_string())?;
    }

    let data = fs::read(&thumb_path).map_err(|e| e.to_string())?;
    let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
    let ext = image_name.rsplit('.').next().unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        _ => "image/png",
    };
    Ok(format!("data:{};base64,{}", mime, base64))
}
