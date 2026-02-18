use serde::{Serialize, Deserialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Equipment {
    pub external_id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    #[sqlx(rename = "type")]
    pub r#type: Option<String>,
    pub subtype: Option<String>,
    pub system_code: Option<String>,
    pub sub_system: Option<String>,
    pub location: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub tag_number: Option<String>,
    pub document_ref: Option<String>,
    pub coordinates: Option<String>,
    pub svg_layer: Option<String>,
    pub fire_zone: Option<String>,
    pub linked_parameters: Option<String>,
    pub status: Option<String>,
    pub version: i32,
    pub is_immutable: bool,
    pub approved_by: Option<String>,
    pub approved_at: Option<String>,
    pub commissioning_date: Option<String>,
    pub checksum: Option<String>,
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
pub struct Alarm {
    pub code: String,
    pub equipment_id: String,
    pub severity: String,
    pub description: String,
    pub parameter: Option<String>,
    pub reset_procedure: Option<String>,
    pub standard_ref: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Procedure {
    pub id: String,
    pub name: String,
    pub description: String,
    pub version: String,
    pub category: Option<String>,
    pub steps: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: i32,
    pub timestamp: String,
    pub r#type: String,
    pub source: String,
    pub message: String,
    pub equipment_id: Option<String>,
    pub signature: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewLogEntry {
    pub r#type: String,
    pub source: String,
    pub message: String,
    pub equipment_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: i32,
    pub equipment_id: String,
    pub image_data: String,
    pub description: Option<String>,
    pub created_at: String,
    pub perceptual_hash: Option<String>,
    pub ocr_text: Option<String>,
    pub analysis: Option<Value>,
    pub annotations: Option<Value>,
    pub created_by: Option<Value>,
    pub status: Option<String>,
    pub tags: Option<Value>,
    pub version: Option<i32>,
    pub validated_by: Option<String>,
    pub validated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewComponentData {
    pub external_id: String,
    pub name: String,
    pub r#type: String,
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
    pub id: i32,
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
    pub document_id: i32,
    pub equipment_id: String,
    pub equipment_name: String,
    pub description: Option<String>,
    pub image_data: String,
    pub perceptual_hash: Option<String>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct PupitreData {
    pub components: Vec<Component>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub synced: i32,
    pub cleaned: bool,
}
