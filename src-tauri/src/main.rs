
// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// All modules and state management have been temporarily removed for debugging.

fn main() {
    tauri::Builder::default()
        // The invoke_handler has been removed as there are no commands.
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}
