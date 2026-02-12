// src-tauri/src/commands.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use tauri_plugin_sql::{Db, Error};
use std::fs;

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

// This helper function gets a database connection from the app handle.
async fn get_db(app_handle: &tauri::AppHandle) -> Result<Db, String> {
    app_handle.db().await.map_err(|e| e.to_string())
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
