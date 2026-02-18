// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // Database initialization is temporarily disabled to resolve build issues.
            println!("[TAURI_SETUP] Skipping database initialization.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // All commands are now pointing to placeholder functions
            commands::get_equipments,
            commands::get_equipment,
            commands::get_parameters,
            commands::get_parameters_for_component,
            commands::get_components,
            commands::get_pid_svg,
            commands::get_alarms,
            commands::get_procedures,
            commands::get_log_entries,
            commands::add_log_entry,
            commands::get_log_entries_for_node,
            commands::search_documents,
            commands::add_component_and_document,
            commands::get_annotations_for_node,
            commands::add_annotation,
            commands::get_documents_for_component,
            commands::get_local_visual_database,
            commands::sync_database
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}
