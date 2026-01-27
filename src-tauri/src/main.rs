// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn get_pid_svg(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    use std::fs;
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| format!("failed to resolve resource: {}", &path))?;

    fs::read_to_string(resource_path)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_pid_svg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
