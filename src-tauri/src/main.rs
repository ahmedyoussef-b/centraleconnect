// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

fn main() {
    tauri::Builder::default()
        // No more AppState management with mock data
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_equipments,
            commands::get_equipment,
            commands::add_equipment,
            commands::get_components,
            commands::get_components_by_equipment,
            commands::sync_data,
            commands::get_sync_data,
            commands::clear_sync_data,
            commands::provision_equipment,
            commands::get_pid_svg,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}
