use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;
use base64::Engine;

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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Version {
    pub id: String,
    pub timestamp: String,
    pub label: String,
    pub change_type: String, // "auto" or "manual"
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

fn get_app_data_dir() -> PathBuf {
    let home = dirs::home_dir().expect("无法获取用户主目录");
    let app_dir = home.join("AIComicCharacterDB");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("无法创建应用数据目录");
    }
    app_dir
}

fn get_projects_dir() -> PathBuf {
    let dir = get_app_data_dir().join("projects");
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("无法创建项目目录");
    }
    dir
}

fn get_project_dir(project_id: &str) -> PathBuf {
    let dir = get_projects_dir().join(project_id);
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("无法创建项目目录");
    }
    dir
}

fn get_characters_dir(project_id: &str) -> PathBuf {
    let dir = get_project_dir(project_id).join("characters");
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("无法创建角色目录");
    }
    dir
}

fn get_character_dir(project_id: &str, character_id: &str) -> PathBuf {
    let dir = get_characters_dir(project_id).join(character_id);
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("无法创建角色目录");
    }
    dir
}

fn get_images_dir(project_id: &str, character_id: &str) -> PathBuf {
    let dir = get_character_dir(project_id, character_id).join("images");
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("无法创建图片目录");
    }
    dir
}

fn now_string() -> String {
    chrono::Local::now().to_rfc3339()
}

// ============ Tauri 命令 ============

#[tauri::command]
pub fn get_app_data_dir_tauri() -> String {
    get_app_data_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectMeta>, String> {
    let projects_dir = get_projects_dir();
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
        updated_at: now,
        character_ids: Vec::new(),
    };

    let project_dir = get_project_dir(&project_id);
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(project_id: String) -> Result<(), String> {
    let project_dir = get_project_dir(&project_id);
    if project_dir.exists() {
        fs::remove_dir_all(&project_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_project(project_id: String) -> Result<ProjectMeta, String> {
    let project_file = get_project_dir(&project_id).join("project.json");
    let content = fs::read_to_string(&project_file).map_err(|e| e.to_string())?;
    let project: ProjectMeta = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub fn update_project(project: ProjectMeta) -> Result<(), String> {
    let mut project = project;
    project.updated_at = now_string();
    let project_file = get_project_dir(&project.id).join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_characters(project_id: String) -> Result<Vec<CharacterData>, String> {
    let characters_dir = get_characters_dir(&project_id);
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
pub fn get_character(project_id: String, character_id: String) -> Result<CharacterData, String> {
    let char_file = get_character_dir(&project_id, &character_id).join("character.json");
    let content = fs::read_to_string(&char_file).map_err(|e| e.to_string())?;
    let character: CharacterData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(character)
}

#[tauri::command]
pub fn save_character(project_id: String, mut character: CharacterData) -> Result<(), String> {
    character.updated_at = now_string();
    
    let char_dir = get_character_dir(&project_id, &character.id);
    let char_file = char_dir.join("character.json");
    let json = serde_json::to_string_pretty(&character).map_err(|e| e.to_string())?;
    fs::write(&char_file, json).map_err(|e| e.to_string())?;

    // 更新项目的角色列表
    let mut project = get_project(project_id.clone())?;
    if !project.character_ids.contains(&character.id) {
        project.character_ids.push(character.id);
        update_project(project)?;
    }

    Ok(())
}

#[tauri::command]
pub fn create_character(project_id: String) -> Result<CharacterData, String> {
    let character_id = Uuid::new_v4().to_string();
    let now = now_string();
    
    let character = CharacterData {
        id: character_id,
        name: "新角色".to_string(),
        role: String::new(),
        color: "#5b8def".to_string(),
        images: Vec::new(),
        positive_prompt: String::new(),
        negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry".to_string(),
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
            },
        }],
        created_at: now.clone(),
        updated_at: now,
    };

    save_character(project_id, character.clone())?;
    Ok(character)
}

#[tauri::command]
pub fn delete_character(project_id: String, character_id: String) -> Result<(), String> {
    let char_dir = get_character_dir(&project_id, &character_id);
    if char_dir.exists() {
        fs::remove_dir_all(&char_dir).map_err(|e| e.to_string())?;
    }

    // 更新项目的角色列表
    let mut project = get_project(project_id.clone())?;
    project.character_ids.retain(|id| id != &character_id);
    update_project(project)?;

    Ok(())
}

#[tauri::command]
pub fn save_image(project_id: String, character_id: String, src_path: String) -> Result<String, String> {
    let src = Path::new(&src_path);
    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let file_name = format!("img_{}.{}", Uuid::new_v4(), ext);
    
    let images_dir = get_images_dir(&project_id, &character_id);
    let dest_path = images_dir.join(&file_name);
    
    fs::copy(src, &dest_path).map_err(|e| e.to_string())?;
    
    Ok(file_name)
}

#[tauri::command]
pub fn delete_image(project_id: String, character_id: String, image_name: String) -> Result<(), String> {
    let images_dir = get_images_dir(&project_id, &character_id);
    let image_path = images_dir.join(&image_name);
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

#[tauri::command]
pub fn import_project(import_path: String, mode: String) -> Result<ProjectMeta, String> {
    let content = fs::read_to_string(&import_path).map_err(|e| e.to_string())?;
    let export: ProjectExport = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let new_project_id = if mode == "new" {
        Uuid::new_v4().to_string()
    } else {
        return Err("合并模式需要指定目标项目ID".to_string());
    };

    let now = now_string();
    let mut project = export.project;
    project.id = new_project_id.clone();
    project.created_at = now.clone();
    project.updated_at = now;

    // 创建项目目录
    let project_dir = get_project_dir(&new_project_id);
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    // 导入角色
    let mut new_character_ids = Vec::new();
    for mut character in export.characters {
        let new_char_id = Uuid::new_v4().to_string();
        character.id = new_char_id.clone();
        character.created_at = now_string();
        character.updated_at = now_string();
        
        // 保存角色
        let char_dir = get_character_dir(&new_project_id, &new_char_id);
        let char_file = char_dir.join("character.json");
        let json = serde_json::to_string_pretty(&character).map_err(|e| e.to_string())?;
        fs::write(&char_file, json).map_err(|e| e.to_string())?;
        
        new_character_ids.push(new_char_id);
    }

    // 更新项目角色列表
    project.character_ids = new_character_ids;
    let project_file = project_dir.join("project.json");
    let json = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    fs::write(&project_file, json).map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
pub fn get_image_data(project_id: String, character_id: String, image_name: String) -> Result<String, String> {
    let images_dir = get_images_dir(&project_id, &character_id);
    let image_path = images_dir.join(&image_name);
    let data = fs::read(&image_path).map_err(|e| e.to_string())?;
    let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
    Ok(base64)
}
