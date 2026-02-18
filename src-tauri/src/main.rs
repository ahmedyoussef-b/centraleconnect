
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;
mod models;
mod commands;
mod scada;

use dotenv::dotenv;
use tauri::Manager;

#[tokio::main]
async fn main() {
    dotenv().ok(); // This loads the .env file

    let context = tauri::generate_context!();
    
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            app_handle.manage(tokio::runtime::Handle::current());
            
            // Spawn an async task to initialize the databases
            // because the setup hook itself cannot be async.
            tokio::spawn(async move {
                let db_state = db::init_database(&app_handle).await
                    .expect("Failed to initialize database");
                app_handle.manage(db_state);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
        .run(context)
        .expect("Erreur lors du lancement de l'application Tauri");
}
