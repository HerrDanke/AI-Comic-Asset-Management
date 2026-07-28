pub mod commands;
pub mod constants;
pub mod migration;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_data_dir_tauri,
            commands::list_projects,
            commands::create_project,
            commands::delete_project,
            commands::get_project,
            commands::update_project,
            commands::list_characters,
            commands::list_character_summaries,
            commands::get_character,
            commands::save_character,
            commands::create_character,
            commands::delete_character,
            commands::save_image,
            commands::delete_image,
            commands::export_project,
            commands::import_project,
            commands::get_image_data,
            commands::get_thumbnail_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
