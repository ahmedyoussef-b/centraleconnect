// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod scada;

use dotenv::dotenv;
use std::sync::Mutex;
use rusqlite::{Connection, params};
use serde::Deserialize;

pub struct DbState {
    pub db: Mutex<Connection>,
}

// Structs pour désérialiser les fichiers JSON de seeding
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AlarmSeed {
    code: String,
    componentTag: String,
    severity: String,
    message: String,
    parameter: Option<String>,
    reset_procedure: Option<String>,
    standardRef: Option<String>,
}

#[derive(Deserialize)]
struct ProcedureSeed {
    id: String,
    name: String,
    description: Option<String>,
    version: String,
    category: Option<String>,
    steps: serde_json::Value,
}

/// Remplit la base de données locale avec les données de référence si elle est vide.
fn seed_database(conn: &Connection, app_handle: &tauri::AppHandle) -> Result<(), String> {
    // Vérifie si la table des alarmes est vide pour décider de lancer le seeding
    let is_empty: bool = conn.query_row("SELECT COUNT(code) FROM alarms", [], |row| row.get(0)).unwrap_or(0) == 0;
    
    if !is_empty {
        println!("[DB Seeder] Database already contains data. Skipping seed.");
        return Ok(());
    }

    println!("[DB Seeder] Database is empty. Seeding from assets...");

    // --- Seed Alarms ---
    let alarms_path = app_handle.path_resolver().resolve_resource("src/assets/master-data/alarms.json")
        .ok_or_else(|| "Failed to resolve alarms.json".to_string())?;
    let alarms_content = std::fs::read_to_string(alarms_path).map_err(|e| e.to_string())?;
    let alarms_data: Vec<AlarmSeed> = serde_json::from_str(&alarms_content).map_err(|e| format!("Failed to parse alarms.json: {}", e))?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    {
        let mut stmt = tx.prepare("INSERT INTO alarms (code, equipment_id, severity, description, parameter, reset_procedure, standard_ref) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").map_err(|e| e.to_string())?;
        for alarm in alarms_data {
            stmt.execute(params![
                alarm.code,
                alarm.componentTag,
                alarm.severity,
                alarm.message,
                alarm.parameter,
                alarm.reset_procedure,
                alarm.standardRef,
            ]).map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    println!("[DB Seeder] Alarms seeded successfully.");

    // --- Seed Procedures ---
    let procedures_path = app_handle.path_resolver().resolve_resource("src/assets/master-data/procedures.json")
        .ok_or_else(|| "Failed to resolve procedures.json".to_string())?;
    let procedures_content = std::fs::read_to_string(procedures_path).map_err(|e| e.to_string())?;
    let procedures_data: Vec<ProcedureSeed> = serde_json::from_str(&procedures_content).map_err(|e| format!("Failed to parse procedures.json: {}", e))?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    {
        let mut stmt = tx.prepare("INSERT INTO procedures (id, name, description, version, category, steps) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").map_err(|e| e.to_string())?;
        for proc in procedures_data {
            let steps_json = serde_json::to_string(&proc.steps).unwrap_or_else(|_| "[]".to_string());
            stmt.execute(params![
                proc.id,
                proc.name,
                proc.description,
                proc.version,
                proc.category,
                steps_json
            ]).map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    println!("[DB Seeder] Procedures seeded successfully.");
    
    println!("[DB Seeder] Seeding complete.");
    Ok(())
}


fn main() {
    dotenv().ok(); // Charge les variables du fichier .env

    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle.path_resolver().app_data_dir().expect("Failed to get app data dir");
            if !app_dir.exists() {
                std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
            }
            let db_path = app_dir.join("ccpp.db");

            let conn = Connection::open(&db_path)
                .map_err(|e| format!("Failed to open database: {}", e)).unwrap();
            
            let create_tables_sql = "BEGIN;
CREATE TABLE IF NOT EXISTS equipments (
    external_id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,
    type TEXT,
    subtype TEXT,
    system_code TEXT,
    sub_system TEXT,
    location TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    document_ref TEXT,
    coordinates TEXT,
    svg_layer TEXT,
    fire_zone TEXT,
    linked_parameters TEXT,
    status TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    is_immutable BOOLEAN NOT NULL DEFAULT 0,
    approved_by TEXT,
    approved_at TEXT,
    commissioning_date TEXT,
    checksum TEXT UNIQUE,
    nominal_data TEXT
);
CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    nominal_value REAL,
    min_safe REAL,
    max_safe REAL,
    alarm_high REAL,
    alarm_low REAL,
    standard_ref TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS alarms (
    code TEXT PRIMARY KEY NOT NULL,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')) NOT NULL,
    description TEXT NOT NULL,
    parameter TEXT,
    reset_procedure TEXT,
    standard_ref TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    signature TEXT UNIQUE NOT NULL,
    equipment_id TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS alarm_events (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  is_active BOOLEAN NOT NULL,
  details TEXT,
  alarm_code TEXT NOT NULL,
  FOREIGN KEY (alarm_code) REFERENCES alarms(code) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS scada_data (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  value REAL NOT NULL,
  equipment_id TEXT NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY,
    image_data TEXT NOT NULL,
    ocr_text TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    perceptual_hash TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  steps TEXT,
  category TEXT
);
CREATE TABLE IF NOT EXISTS synoptic_items (
    external_id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    type TEXT,
    parent_id TEXT,
    group_path TEXT,
    element_id TEXT,
    level INTEGER,
    approved_by TEXT,
    approval_date TEXT
);
COMMIT;";
            conn.execute_batch(create_tables_sql).expect("Failed to create tables");
            conn.execute("PRAGMA foreign_keys = ON;", []).expect("Failed to enable foreign keys");

            // Seed the database from assets
            if let Err(e) = seed_database(&conn, &app_handle) {
                eprintln!("[ERROR] Error seeding database: {}", e);
            }

            app.manage(DbState { db: Mutex::new(conn) });

            // SCADA loop has been postponed to a future version.
            // let app_handle_clone = app_handle.clone();
            // tauri::async_runtime::spawn(async move {
            //     scada::run_scada_loop(app_handle_clone).await;
            // });
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
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}
