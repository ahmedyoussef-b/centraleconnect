
// src-tauri/src/commands.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use std::fs;
use sha2::{Sha256, Digest};
use crate::DbState;
use rusqlite::{params, Connection, Result as RusqliteResult};

// --- Data Models ---
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Equipment {
    pub external_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub type_field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manufacturer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub serial_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_ref: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coordinates: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub svg_layer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fire_zone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_parameters: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    pub version: i32,
    pub is_immutable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commissioning_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nominal_data: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ComponentUI {
    path: String,
    color: String,
    #[serde(rename = "criticalityX")]
    criticality_x: i32,
    #[serde(rename = "criticalityY")]
    criticality_y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Component {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub type_field: String,
    pub description: String,
    pub criticality: String,
    pub ui: ComponentUI,
}

#[derive(Debug, Serialize, Deserialize)]
struct PupitreData {
    components: Vec<Component>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Alarm {
    pub code: String,
    pub equipment_id: String,
    pub severity: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reset_procedure: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub standard_ref: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Procedure {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub steps: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: i64,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub type_field: String,
    pub source: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub equipment_id: Option<String>,
    pub signature: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewLogEntry {
    #[serde(rename = "type")]
    pub type_field: String,
    pub source: String,
    pub message: String,
    pub equipment_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: i64,
    pub equipment_id: String,
    pub image_data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ocr_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub perceptual_hash: Option<String>,
}

fn create_entry_signature(
    entry_data: &NewLogEntry,
    timestamp: &str,
    previous_signature: &str,
) -> String {
    let equipment_id_str = entry_data.equipment_id.as_deref().unwrap_or("");
    let data_string = format!(
        "{}|{}|{}|{}|{}|{}",
        previous_signature,
        timestamp,
        &entry_data.type_field,
        &entry_data.source,
        &entry_data.message,
        equipment_id_str
    );
    let mut hasher = Sha256::new();
    hasher.update(data_string.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

// --- Row Mappers ---

fn map_row_to_equipment(row: &rusqlite::Row) -> RusqliteResult<Equipment> {
    Ok(Equipment {
        external_id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        parent_id: row.get(3)?,
        type_field: row.get(4)?,
        subtype: row.get(5)?,
        system_code: row.get(6)?,
        sub_system: row.get(7)?,
        location: row.get(8)?,
        manufacturer: row.get(9)?,
        serial_number: row.get(10)?,
        document_ref: row.get(11)?,
        coordinates: row.get(12)?,
        svg_layer: row.get(13)?,
        fire_zone: row.get(14)?,
        linked_parameters: row.get(15)?,
        status: row.get(16)?,
        version: row.get(17)?,
        is_immutable: row.get(18)?,
        approved_by: row.get(19)?,
        approved_at: row.get(20)?,
        commissioning_date: row.get(21)?,
        checksum: row.get(22)?,
        nominal_data: row.get(23)?,
    })
}

fn map_row_to_alarm(row: &rusqlite::Row) -> RusqliteResult<Alarm> {
    Ok(Alarm {
        code: row.get(0)?,
        severity: row.get(1)?,
        description: row.get(2)?,
        parameter: row.get(3)?,
        reset_procedure: row.get(4)?,
        standard_ref: row.get(5)?,
        equipment_id: row.get(6)?,
    })
}

fn map_row_to_procedure(row: &rusqlite::Row) -> RusqliteResult<Procedure> {
    Ok(Procedure {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        version: row.get(3)?,
        steps: row.get(4)?,
        category: row.get(5)?,
    })
}

fn map_row_to_log_entry(row: &rusqlite::Row) -> RusqliteResult<LogEntry> {
    Ok(LogEntry {
        id: row.get(0)?,
        timestamp: row.get(1)?,
        type_field: row.get(2)?,
        source: row.get(3)?,
        message: row.get(4)?,
        signature: row.get(5)?,
        equipment_id: row.get(6)?,
    })
}

fn map_row_to_document(row: &rusqlite::Row) -> RusqliteResult<Document> {
    Ok(Document {
        id: row.get(0)?,
        equipment_id: row.get(1)?,
        image_data: row.get(2)?,
        ocr_text: row.get(3)?,
        description: row.get(4)?,
        created_at: row.get(5)?,
        perceptual_hash: row.get(6)?,
    })
}

// --- Tauri Commands ---

#[command]
pub fn get_equipments(state: tauri::State<DbState>) -> Result<Vec<Equipment>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM equipments").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], map_row_to_equipment).map_err(|e| e.to_string())?;
    iter.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_equipment(id: String, state: tauri::State<DbState>) -> Result<Option<Equipment>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM equipments WHERE external_id = ?1").map_err(|e| e.to_string())?;
    let mut iter = stmt.query_map(params![id], map_row_to_equipment).map_err(|e| e.to_string())?;
    
    if let Some(equip_result) = iter.next() {
        Ok(Some(equip_result.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[command]
pub fn get_components(app_handle: tauri::AppHandle) -> Result<Vec<Component>, String> {
    let resource_path = app_handle
        .path_resolver()
        .resolve_resource("src/assets/master-data/pupitre-data.json")
        .ok_or_else(|| "Failed to resolve pupitre-data.json".to_string())?;
    let file_content = fs::read_to_string(resource_path).map_err(|e| e.to_string())?;
    let data: PupitreData = serde_json::from_str(&file_content).map_err(|e| e.to_string())?;
    Ok(data.components)
}

#[command]
pub fn get_pid_svg(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| "Failed to resolve resource path".to_string())?;
    fs::read_to_string(&resource_path).map_err(|e| e.to_string())
}

#[command]
pub fn get_alarms(state: tauri::State<DbState>) -> Result<Vec<Alarm>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT code, severity, description, parameter, reset_procedure, standard_ref, equipment_id FROM alarms").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], map_row_to_alarm).map_err(|e| e.to_string())?;
    iter.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_procedures(state: tauri::State<DbState>) -> Result<Vec<Procedure>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, description, version, steps, category FROM procedures").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], map_row_to_procedure).map_err(|e| e.to_string())?;
    iter.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_log_entries(state: tauri::State<DbState>) -> Result<Vec<LogEntry>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, timestamp, type, source, message, signature, equipment_id FROM log_entries ORDER BY timestamp DESC").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], map_row_to_log_entry).map_err(|e| e.to_string())?;
    iter.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn add_log_entry(entry: NewLogEntry, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    
    let previous_signature: String = conn.query_row(
        "SELECT signature FROM log_entries ORDER BY timestamp DESC LIMIT 1",
        [],
        |row| row.get(0),
    ).unwrap_or("GENESIS".to_string());

    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let signature = create_entry_signature(&entry, &timestamp, &previous_signature);

    conn.execute(
        "INSERT INTO log_entries (timestamp, type, source, message, equipment_id, signature) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            timestamp,
            entry.type_field,
            entry.source,
            entry.message,
            entry.equipment_id,
            signature,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub fn get_log_entries_for_node(equipment_id: String, state: tauri::State<DbState>) -> Result<Vec<LogEntry>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, timestamp, type, source, message, signature, equipment_id FROM log_entries WHERE equipment_id = ?1 ORDER BY timestamp DESC").map_err(|e| e.to_string())?;
    let iter = stmt.query_map(params![equipment_id], map_row_to_log_entry).map_err(|e| e.to_string())?;
    iter.map(|r| r.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn search_documents(query: String, equipment_id: Option<String>, state: tauri::State<DbState>) -> Result<Vec<Document>, String> {
    let conn = state.db.lock().unwrap();
    let mut sql_params: Vec<rusqlite::types::Value> = vec![];
    let mut conditions: Vec<String> = vec![];
    
    let mut sql = "SELECT id, equipment_id, image_data, ocr_text, description, created_at, perceptual_hash FROM documents WHERE ".to_string();

    if !query.is_empty() {
        conditions.push("(ocr_text LIKE ? OR description LIKE ?)".to_string());
        let like_query = format!("%{}%", query);
        sql_params.push(like_query.clone().into());
        sql_params.push(like_query.into());
    }

    if let Some(eid) = equipment_id {
        if !eid.is_empty() {
            conditions.push("equipment_id = ?".to_string());
            sql_params.push(eid.into());
        }
    }

    if conditions.is_empty() {
        sql.push_str("1=1");
    } else {
        sql.push_str(&conditions.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map(rusqlite::params_from_iter(sql_params), map_row_to_document).map_err(|e| e.to_string())?;
    
    rows.map(|r| r.map_err(|e| e.to_string())).collect()
}
