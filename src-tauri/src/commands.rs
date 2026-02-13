// src-tauri/src/commands.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use tauri_plugin_sql::{Db, Error, Value, TauriSql};
use std::fs;
use sha2::{Sha256, Digest};

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
    #[serde(rename = "type")]
    #[serde(skip_serializing_if = "Option::is_none")]
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


// This helper function gets a database connection from the app handle.
async fn get_db(app_handle: &tauri::AppHandle) -> Result<Db, String> {
    app_handle.db().await.map_err(|e| e.to_string())
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

// --- Tauri Commands ---

#[command]
pub async fn get_equipments(app_handle: tauri::AppHandle) -> Result<Vec<Equipment>, String> {
    let db = get_db(&app_handle).await?;
    db.select("SELECT * FROM equipments", &[]).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_equipment(id: String, app_handle: tauri::AppHandle) -> Result<Option<Equipment>, String> {
    let db = get_db(&app_handle).await?;
    let mut equipments: Vec<Equipment> = db.select("SELECT * FROM equipments WHERE external_id = $1", &[id.into()]).await.map_err(|e| e.to_string())?;
    Ok(equipments.pop())
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

    fs::read_to_string(&resource_path)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_alarms(app_handle: tauri::AppHandle) -> Result<Vec<Alarm>, String> {
    let db = get_db(&app_handle).await?;
    db.select("SELECT code, equipment_id, severity, description, parameter, reset_procedure, standard_ref FROM alarms", &[]).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_procedures(app_handle: tauri::AppHandle) -> Result<Vec<Procedure>, String> {
    let db = get_db(&app_handle).await?;
    db.select("SELECT id, name, description, version, steps, category FROM procedures", &[]).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_log_entries(app_handle: tauri::AppHandle) -> Result<Vec<LogEntry>, String> {
    let db = get_db(&app_handle).await?;
    db.select("SELECT * FROM log_entries ORDER BY timestamp DESC", &[])
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn add_log_entry(entry: NewLogEntry, app_handle: tauri::AppHandle) -> Result<(), String> {
    let db = get_db(&app_handle).await?;

    let last_entry: Result<Vec<LogEntry>, Error> = db
        .select("SELECT id, timestamp, type, source, message, equipment_id, signature FROM log_entries ORDER BY timestamp DESC LIMIT 1", &[])
        .await;

    let previous_signature = match last_entry {
        Ok(entries) => entries.get(0).map_or("GENESIS".to_string(), |e| e.signature.clone()),
        Err(_) => "GENESIS".to_string(),
    };

    let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let signature = create_entry_signature(&entry, &timestamp, &previous_signature);

    db.execute(
        "INSERT INTO log_entries (timestamp, type, source, message, equipment_id, signature) VALUES ($1, $2, $3, $4, $5, $6)",
        &[
            timestamp.into(),
            entry.type_field.into(),
            entry.source.into(),
            entry.message.into(),
            entry.equipment_id.into(),
            signature.into(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn get_log_entries_for_node(equipment_id: String, app_handle: tauri::AppHandle) -> Result<Vec<LogEntry>, String> {
    let db = get_db(&app_handle).await?;
    db.select(
        "SELECT * FROM log_entries WHERE equipment_id = $1 ORDER BY timestamp DESC",
        &[equipment_id.into()],
    )
    .await
    .map_err(|e| e.to_string())
}


#[command]
pub async fn search_documents(query: String, equipment_id: Option<String>, app_handle: tauri::AppHandle) -> Result<Vec<Document>, String> {
    let db = get_db(&app_handle).await?;
    let mut params: Vec<Value> = vec![];
    let mut conditions: Vec<String> = vec![];

    if !query.is_empty() {
        conditions.push("(ocr_text LIKE $1 OR description LIKE $1)".to_string());
        params.push(format!("%{}%", query).into());
    }

    if let Some(eid) = equipment_id {
        if !eid.is_empty() {
            let param_index = params.len() + 1;
            conditions.push(format!("equipment_id = ${}", param_index));
            params.push(eid.into());
        }
    }

    let where_clause = if conditions.is_empty() {
        "1 = 1".to_string() // Return all if no query/filters
    } else {
        conditions.join(" AND ")
    };
    
    let sql_query = format!("SELECT id, equipment_id, image_data, ocr_text, description, created_at, perceptual_hash FROM documents WHERE {} ORDER BY created_at DESC", where_clause);

    db.select(&sql_query, &params)
    .await
    .map_err(|e| e.to_string())
}
