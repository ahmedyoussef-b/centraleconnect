#[tauri::command]
pub fn get_pid_svg(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    use std::fs;
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| format!("failed to resolve resource: {}", &path))?;

    fs::read_to_string(resource_path)
        .map_err(|e| e.to_string())
}
