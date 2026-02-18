
// src-tauri/src/commands.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use std::fs;
use sha2::{Sha256, Digest};

// --- Data Models (kept for type consistency with frontend) ---
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
pub struct Parameter {
    pub id: i64,
    pub equipment_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nominal_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_safe: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_safe: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alarm_high: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alarm_low: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub standard_ref: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewComponentData {
    pub external_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub type_field: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewDocumentData {
    pub image_data: String,
    pub ocr_text: String,
    pub description: String,
    pub perceptual_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    pub id: i64,
    pub equipment_id: String,
    pub text: String,
    pub operator: String,
    pub timestamp: String,
    pub x_pos: f64,
    pub y_pos: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewAnnotation {
    pub equipment_id: String,
    pub text: String,
    pub operator: String,
    pub x_pos: f64,
    pub y_pos: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalVisualDbEntry {
    pub document_id: i64,
    pub equipment_id: String,
    pub equipment_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub image_data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub perceptual_hash: Option<String>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    synced: i32,
    cleaned: bool,
}

// --- Tauri Commands (Placeholder Implementations) ---

#[command]
pub fn get_equipments() -> Result<Vec<Equipment>, String> {
    println!("[RUST_CMD_STUB] get_equipments called");
    Ok(Vec::new())
}

#[command]
pub fn get_equipment(_id: String) -> Result<Option<Equipment>, String> {
    println!("[RUST_CMD_STUB] get_equipment called");
    Ok(None)
}

#[command]
pub fn get_parameters() -> Result<Vec<Parameter>, String> {
    println!("[RUST_CMD_STUB] get_parameters called");
    Ok(Vec::new())
}

#[command]
pub fn get_parameters_for_component(_equipment_id: String) -> Result<Vec<Parameter>, String> {
    println!("[RUST_CMD_STUB] get_parameters_for_component called");
    Ok(Vec::new())
}

#[command]
pub fn get_components(app_handle: tauri::AppHandle) -> Result<Vec<Component>, String> {
    println!("[RUST_CMD] get_components called (reading from JSON)");
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
    println!("[RUST_CMD] get_pid_svg called (reading from file)");
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| "Failed to resolve resource path".to_string())?;
    fs::read_to_string(&resource_path).map_err(|e| e.to_string())
}

#[command]
pub fn get_alarms() -> Result<Vec<Alarm>, String> {
    println!("[RUST_CMD_STUB] get_alarms called");
    Ok(Vec::new())
}

#[command]
pub fn get_procedures() -> Result<Vec<Procedure>, String> {
    println!("[RUST_CMD_STUB] get_procedures called");
    Ok(Vec::new())
}

#[command]
pub fn get_log_entries() -> Result<Vec<LogEntry>, String> {
    println!("[RUST_CMD_STUB] get_log_entries called");
    Ok(Vec::new())
}

#[command]
pub fn add_log_entry(_entry: NewLogEntry) -> Result<(), String> {
    println!("[RUST_CMD_STUB] add_log_entry called");
    Ok(())
}

#[command]
pub fn get_log_entries_for_node(_equipment_id: String) -> Result<Vec<LogEntry>, String> {
    println!("[RUST_CMD_STUB] get_log_entries_for_node called");
    Ok(Vec::new())
}

#[command]
pub fn search_documents(_query: String, _equipment_id: Option<String>) -> Result<Vec<Document>, String> {
    println!("[RUST_CMD_STUB] search_documents called");
    Ok(Vec::new())
}

#[command]
pub fn add_component_and_document(_component: NewComponentData, _document: NewDocumentData) -> Result<(), String> {
    println!("[RUST_CMD_STUB] add_component_and_document called");
    Ok(())
}

#[command]
pub fn get_annotations_for_node(_external_id: String) -> Result<Vec<Annotation>, String> {
    println!("[RUST_CMD_STUB] get_annotations_for_node called");
    Ok(Vec::new())
}

#[command]
pub fn add_annotation(_annotation: NewAnnotation) -> Result<(), String> {
    println!("[RUST_CMD_STUB] add_annotation called");
    Ok(())
}

#[command]
pub fn get_documents_for_component(_equipment_id: String) -> Result<Vec<Document>, String> {
    println!("[RUST_CMD_STUB] get_documents_for_component called");
    Ok(Vec::new())
}

#[command]
pub fn get_local_visual_database() -> Result<Vec<LocalVisualDbEntry>, String> {
    println!("[RUST_CMD_STUB] get_local_visual_database called");
    Ok(Vec::new())
}

#[command]
pub fn sync_database() -> Result<SyncResult, String> {
    println!("[RUST_CMD_STUB] sync_database called");
    Ok(SyncResult { synced: 0, cleaned: false })
}
