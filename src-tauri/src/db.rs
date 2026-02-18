use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;
use tauri::AppHandle;
use thiserror::Error;

// --- Custom Error Type ---
#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database connection failed: {0}")]
    Connection(#[from] rusqlite::Error),
    #[error("Tauri path resolution failed: {0}")]
    TauriPath(String),
    #[error("Filesystem error: {0}")]
    Io(#[from] std::io::Error),
}

// --- Database State ---
pub struct DbState(pub Mutex<Connection>);

const CREATE_TABLES_SQL: &str = r#"
BEGIN;
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
    tag_number TEXT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    nominal_value REAL,
    min_safe REAL,
    max_safe REAL,
    alarm_high REAL,
    alarm_low REAL,
    standard_ref TEXT,
    FOREIGN KEY(equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS alarms (
    code TEXT PRIMARY KEY NOT NULL,
    equipment_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    parameter TEXT,
    reset_procedure TEXT,
    standard_ref TEXT,
    FOREIGN KEY(equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS procedures (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    version TEXT NOT NULL,
    category TEXT,
    steps TEXT
);
CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    equipment_id TEXT,
    signature TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    image_data TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    perceptual_hash TEXT,
    ocr_text TEXT,
    analysis TEXT,
    annotations TEXT,
    created_by TEXT,
    status TEXT,
    tags TEXT,
    version INTEGER,
    validated_by TEXT,
    validated_at TEXT,
    FOREIGN KEY(equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    FOREIGN KEY(equipment_id) REFERENCES equipments(external_id)
);
COMMIT;
"#;

pub fn init_database(app: &AppHandle) -> Result<DbState, DbError> {
    let app_dir = app.path_resolver().app_data_dir()
        .ok_or_else(|| DbError::TauriPath("Failed to resolve app data directory".to_string()))?;
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }

    let db_path = app_dir.join("ccpp.db");
    let conn = Connection::open(db_path)?;
    conn.execute_batch(CREATE_TABLES_SQL)?;

    println!("✅ Database initialized successfully.");
    Ok(DbState(Mutex::new(conn)))
}
