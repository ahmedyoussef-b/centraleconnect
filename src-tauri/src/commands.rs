// src-tauri/src/commands.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use tauri_plugin_sql::{Db, Error};
use std::fs;

// --- Data Models ---
// These structs should mirror the ones in `src/types/db.ts`
// `serde(rename_all = "camelCase")` handles the serialization from Rust's snake_case to JS's camelCase
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
pub struct Parameter {
    pub id: i32,
    pub equipment_id: String,
    pub name: String,
    pub unit: Option<String>,
    pub nominal_value: Option<f64>,
    pub min_safe: Option<f64>,
    pub max_safe: Option<f64>,
    pub alarm_high: Option<f64>,
    pub alarm_low: Option<f64>,
    pub standard_ref: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Component {
    pub id: String,
    pub name: String,
    pub equipment_id: String,
    pub manufacturer: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncData {
    pub equipments: Vec<Equipment>,
    pub components: Vec<Component>,
    pub timestamp: String,
}


// This helper function gets a database connection from the app handle.
async fn get_db(app_handle: &tauri::AppHandle) -> Result<Db, String> {
    app_handle.db().await.map_err(|e| e.to_string())
}

// --- Tauri Commands ---

#[command]
pub async fn get_equipments(app_handle: tauri::AppHandle) -> Result<Vec<Equipment>, String> {
    let db = get_db(&app_handle).await?;
    // The `select` method from tauri-plugin-sql will automatically deserialize snake_case DB columns
    // into a struct, which we then serialize as camelCase for the frontend.
    db.select("SELECT * FROM equipments", &[]).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_equipment(id: String, app_handle: tauri::AppHandle) -> Result<Option<Equipment>, String> {
    let db = get_db(&app_handle).await?;
    let mut equipments: Vec<Equipment> = db.select("SELECT * FROM equipments WHERE external_id = $1", &[id.into()]).await.map_err(|e| e.to_string())?;
    Ok(equipments.pop())
}

#[command]
pub async fn get_components(app_handle: tauri::AppHandle) -> Result<Vec<Component>, String> {
     let db = get_db(&app_handle).await?;
     db.select("SELECT * FROM components", &[]).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_components_by_equipment(equipment_id: String, app_handle: tauri::AppHandle) -> Result<Vec<Component>, String> {
    let db = get_db(&app_handle).await?;
    db.select("SELECT * FROM components WHERE equipment_id = $1", &[equipment_id.into()]).await.map_err(|e| e.to_string())
}


#[command]
pub fn get_pid_svg(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| "Failed to resolve resource path".to_string())?;

    fs::read_to_string(&resource_path)
        .map_err(|e| e.to_string())
}

// --- Placeholder Commands ---
// These commands are kept as placeholders to avoid breaking the frontend tauri-client,
// but their logic needs to be implemented against the database.

#[command]
pub fn add_equipment(_equipment: Equipment) -> Result<Equipment, String> {
    println!("[RUST_COMMAND] 'add_equipment' is a placeholder and has not been implemented.");
    Err("Not implemented".to_string())
}

#[command]
pub fn provision_equipment(_equipment: Equipment) -> Result<Equipment, String> {
    println!("[RUST_COMMAND] 'provision_equipment' is a placeholder and has not been implemented.");
    Err("Not implemented".to_string())
}

#[command]
pub fn sync_data(_data: SyncData) -> Result<String, String> {
    println!("[RUST_COMMAND] 'sync_data' is a placeholder and has not been implemented.");
    Err("Not implemented".to_string())
}

#[command]
pub fn get_sync_data() -> Result<Option<SyncData>, String> {
    println!("[RUST_COMMAND] 'get_sync_data' is a placeholder and has not been implemented.");
    Ok(None)
}

#[command]
pub fn clear_sync_data() -> Result<String, String> {
    println!("[RUST_COMMAND] 'clear_sync_data' is a placeholder and has not been implemented.");
    Err("Not implemented".to_string())
}
