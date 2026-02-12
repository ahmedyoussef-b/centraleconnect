// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod scada;

use dotenv::dotenv;

fn main() {
    dotenv().ok(); // Charge les variables du fichier .env

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            // Lance la boucle SCADA dans une tâche de fond asynchrone
            tauri::async_runtime::spawn(async move {
                scada::run_scada_loop(app_handle).await;
            });
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_equipments,
            commands::get_equipment,
            commands::get_components,
            commands::get_pid_svg,
            commands::get_alarms,
            commands::get_procedures,
            commands::get_log_entries,
            commands::add_log_entry,
            commands::get_log_entries_for_node,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}
