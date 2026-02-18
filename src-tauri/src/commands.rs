
use tauri::{command, AppHandle, State};
use std::fs;
use chrono::Utc;
use sha2::{Sha256, Digest};
use hex;

use crate::db::{DbState};
use crate::models::{
    Equipment, Parameter, Alarm, Procedure, LogEntry, NewLogEntry, Document, NewDocumentData, NewComponentData, Annotation, NewAnnotation,
    LocalVisualDbEntry, Component, PupitreData, SyncResult, RemoteEquipment
};

type CommandResult<T> = Result<T, String>;

// Helper to map rusqlite query errors
fn map_query_error<T>(e: rusqlite::Error) -> rusqlite::Error {
    eprintln!("DB Query Error: {}", e);
    e
}

#[command]
pub fn get_equipments(state: State<DbState>) -> CommandResult<Vec<Equipment>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT external_id, name, description, parent_id, type, subtype, system_code, sub_system, location, manufacturer, serial_number, tag_number, document_ref, coordinates, svg_layer, fire_zone, linked_parameters, status, version, is_immutable, approved_by, approved_at, commissioning_date, checksum, nominal_data FROM equipments ORDER BY name ASC")
        .map_err(|e| e.to_string())?;
    
    let equip_iter = stmt.query_map([], |row| {
        Ok(Equipment {
            external_id: row.get(0)?, name: row.get(1)?, description: row.get(2)?, parent_id: row.get(3)?, r#type: row.get(4)?, subtype: row.get(5)?, system_code: row.get(6)?, sub_system: row.get(7)?, location: row.get(8)?, manufacturer: row.get(9)?, serial_number: row.get(10)?, tag_number: row.get(11)?, document_ref: row.get(12)?, coordinates: row.get(13)?, svg_layer: row.get(14)?, fire_zone: row.get(15)?, linked_parameters: row.get(16)?, status: row.get(17)?, version: row.get(18)?, is_immutable: row.get(19)?, approved_by: row.get(20)?, approved_at: row.get(21)?, commissioning_date: row.get(22)?, checksum: row.get(23)?, nominal_data: row.get(24)?,
        })
    }).map_err(|e| e.to_string())?;

    equip_iter.map(|e| e.map_err(|err| err.to_string())).collect()
}


#[command]
pub fn get_equipment(state: State<DbState>, id: String) -> CommandResult<Option<Equipment>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT external_id, name, description, parent_id, type, subtype, system_code, sub_system, location, manufacturer, serial_number, tag_number, document_ref, coordinates, svg_layer, fire_zone, linked_parameters, status, version, is_immutable, approved_by, approved_at, commissioning_date, checksum, nominal_data FROM equipments WHERE external_id = ?1")
        .map_err(|e| e.to_string())?;
    
    let equip_iter = stmt.query_map([id], |row| {
        Ok(Equipment {
            external_id: row.get(0)?, name: row.get(1)?, description: row.get(2)?, parent_id: row.get(3)?, r#type: row.get(4)?, subtype: row.get(5)?, system_code: row.get(6)?, sub_system: row.get(7)?, location: row.get(8)?, manufacturer: row.get(9)?, serial_number: row.get(10)?, tag_number: row.get(11)?, document_ref: row.get(12)?, coordinates: row.get(13)?, svg_layer: row.get(14)?, fire_zone: row.get(15)?, linked_parameters: row.get(16)?, status: row.get(17)?, version: row.get(18)?, is_immutable: row.get(19)?, approved_by: row.get(20)?, approved_at: row.get(21)?, commissioning_date: row.get(22)?, checksum: row.get(23)?, nominal_data: row.get(24)?,
        })
    }).map_err(|e| e.to_string())?;

    match equip_iter.last() {
        Some(Ok(equip)) => Ok(Some(equip)),
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

#[command]
pub fn get_components(app_handle: tauri::AppHandle) -> CommandResult<Vec<Component>> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource("src/assets/master-data/pupitre-data.json")
        .ok_or_else(|| "Failed to resolve pupitre-data.json".to_string())?;
    let file_content = fs::read_to_string(resource_path).map_err(|e| e.to_string())?;
    let data: PupitreData = serde_json::from_str(&file_content).map_err(|e| e.to_string())?;
    Ok(data.components)
}

#[command]
pub fn get_pid_svg(app_handle: AppHandle, path: String) -> CommandResult<String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| format!("Could not resolve resource: {}", path))?;
    fs::read_to_string(&resource_path).map_err(|e| e.to_string())
}

#[command]
pub fn get_parameters(state: State<DbState>) -> CommandResult<Vec<Parameter>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, equipment_id, name, unit, nominal_value, min_safe, max_safe, alarm_high, alarm_low, standard_ref FROM parameters")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([], |row| {
        Ok(Parameter {
            id: row.get(0)?, equipment_id: row.get(1)?, name: row.get(2)?, unit: row.get(3)?, nominal_value: row.get(4)?, min_safe: row.get(5)?, max_safe: row.get(6)?, alarm_high: row.get(7)?, alarm_low: row.get(8)?, standard_ref: row.get(9)?,
        })
    }).map_err(map_query_error)?;
    
    iter.map(|p| p.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_parameters_for_component(state: State<DbState>, equipment_id: String) -> CommandResult<Vec<Parameter>> {
     let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, equipment_id, name, unit, nominal_value, min_safe, max_safe, alarm_high, alarm_low, standard_ref FROM parameters WHERE equipment_id = ?1")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([equipment_id], |row| {
        Ok(Parameter {
            id: row.get(0)?, equipment_id: row.get(1)?, name: row.get(2)?, unit: row.get(3)?, nominal_value: row.get(4)?, min_safe: row.get(5)?, max_safe: row.get(6)?, alarm_high: row.get(7)?, alarm_low: row.get(8)?, standard_ref: row.get(9)?,
        })
    }).map_err(map_query_error)?;
    
    iter.map(|p| p.map_err(|e| e.to_string())).collect()
}


#[command]
pub fn get_alarms(state: State<DbState>) -> CommandResult<Vec<Alarm>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT code, equipment_id, severity, description, parameter, reset_procedure, standard_ref FROM alarms")
        .map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Alarm {
            code: row.get(0)?, equipment_id: row.get(1)?, severity: row.get(2)?, description: row.get(3)?, parameter: row.get(4)?, reset_procedure: row.get(5)?, standard_ref: row.get(6)?,
        })
    }).map_err(map_query_error)?;

    iter.map(|a| a.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_procedures(state: State<DbState>) -> CommandResult<Vec<Procedure>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, description, version, category, steps FROM procedures")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([], |row| {
        Ok(Procedure {
            id: row.get(0)?, name: row.get(1)?, description: row.get(2)?, version: row.get(3)?, category: row.get(4)?, steps: row.get(5)?,
        })
    }).map_err(map_query_error)?;
    
    iter.map(|p| p.map_err(|e| e.to_string())).collect()
}

fn get_last_signature(conn: &rusqlite::Connection) -> rusqlite::Result<String> {
    let mut stmt = conn.prepare("SELECT signature FROM log_entries ORDER BY id DESC LIMIT 1")?;
    let mut rows = stmt.query_map([], |row| row.get(0))?;
    
    match rows.next() {
        Some(Ok(signature_opt)) => Ok(signature_opt.unwrap_or_else(|| "GENESIS".to_string())),
        Some(Err(e)) => Err(e),
        None => Ok("GENESIS".to_string()),
    }
}

#[command]
pub fn add_log_entry(state: State<DbState>, entry: NewLogEntry) -> CommandResult<()> {
    let conn = state.local.lock().unwrap();
    let previous_signature = get_last_signature(&conn).map_err(|e| e.to_string())?;
    
    let timestamp = Utc::now().to_rfc3339();
    let equipment_id_str = entry.equipment_id.as_deref().unwrap_or("");

    let data_to_hash = format!(
        "{}|{}|{}|{}|{}|{}",
        previous_signature,
        timestamp,
        entry.r#type,
        entry.source,
        entry.message,
        equipment_id_str
    );

    let mut hasher = Sha256::new();
    hasher.update(data_to_hash.as_bytes());
    let result = hasher.finalize();
    let signature = hex::encode(result);

    conn.execute(
        "INSERT INTO log_entries (timestamp, type, source, message, equipment_id, signature) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            timestamp,
            entry.r#type,
            entry.source,
            entry.message,
            entry.equipment_id,
            signature,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}


#[command]
pub fn get_log_entries(state: State<DbState>) -> CommandResult<Vec<LogEntry>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, timestamp, type, source, message, equipment_id, signature FROM log_entries ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(LogEntry {
            id: row.get(0)?, timestamp: row.get(1)?, r#type: row.get(2)?, source: row.get(3)?, message: row.get(4)?, equipment_id: row.get(5)?, signature: row.get(6)?,
        })
    }).map_err(map_query_error)?;

    iter.map(|l| l.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_log_entries_for_node(state: State<DbState>, equipment_id: String) -> CommandResult<Vec<LogEntry>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, timestamp, type, source, message, equipment_id, signature FROM log_entries WHERE equipment_id = ?1 ORDER BY id DESC")
        .map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([equipment_id], |row| {
        Ok(LogEntry {
            id: row.get(0)?, timestamp: row.get(1)?, r#type: row.get(2)?, source: row.get(3)?, message: row.get(4)?, equipment_id: row.get(5)?, signature: row.get(6)?,
        })
    }).map_err(map_query_error)?;

    iter.map(|l| l.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn search_documents(state: State<DbState>, query: String, equipment_id: Option<String>) -> CommandResult<Vec<Document>> {
    let conn = state.local.lock().unwrap();
    let mut sql = "SELECT id, equipment_id, image_data, description, created_at, perceptual_hash, ocr_text, analysis, annotations, created_by, status, tags, version, validated_by, validated_at FROM documents WHERE 1=1".to_string();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if !query.is_empty() {
        sql.push_str(" AND (description LIKE ? OR ocr_text LIKE ?)");
        let q = format!("%{}%", query);
        params.push(Box::new(q.clone()));
        params.push(Box::new(q));
    }
    if let Some(eq_id) = equipment_id {
        sql.push_str(" AND equipment_id = ?");
        params.push(Box::new(eq_id));
    }
    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let iter = stmt.query_map(&params_ref[..], |row| {
        Ok(Document {
            id: row.get(0)?, equipment_id: row.get(1)?, image_data: row.get(2)?, description: row.get(3)?, created_at: row.get(4)?, perceptual_hash: row.get(5)?, ocr_text: row.get(6)?, analysis: row.get(7)?, annotations: row.get(8)?, created_by: row.get(9)?, status: row.get(10)?, tags: row.get(11)?, version: row.get(12)?, validated_by: row.get(13)?, validated_at: row.get(14)?,
        })
    }).map_err(map_query_error)?;

    iter.map(|d| d.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn add_component_and_document(state: State<DbState>, component: NewComponentData, document: NewDocumentData) -> CommandResult<()> {
    let conn = state.local.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR IGNORE INTO equipments (external_id, name, type) VALUES (?1, ?2, ?3)",
        rusqlite::params![component.external_id, component.name, component.r#type],
    ).map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO documents (equipment_id, image_data, ocr_text, description, perceptual_hash) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            component.external_id,
            document.image_data,
            document.ocr_text,
            document.description,
            document.perceptual_hash,
        ],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn get_annotations_for_node(state: State<DbState>, external_id: String) -> CommandResult<Vec<Annotation>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, equipment_id, text, operator, timestamp, x_pos, y_pos FROM annotations WHERE equipment_id = ?1 ORDER BY timestamp DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([external_id], |row| {
        Ok(Annotation {
            id: row.get(0)?, equipment_id: row.get(1)?, text: row.get(2)?, operator: row.get(3)?, timestamp: row.get(4)?, x_pos: row.get(5)?, y_pos: row.get(6)?,
        })
    }).map_err(map_query_error)?;
    
    iter.map(|a| a.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn add_annotation(state: State<DbState>, annotation: NewAnnotation) -> CommandResult<()> {
    let conn = state.local.lock().unwrap();
    conn.execute(
        "INSERT INTO annotations (equipment_id, text, operator, x_pos, y_pos) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            annotation.equipment_id,
            annotation.text,
            annotation.operator,
            annotation.x_pos,
            annotation.y_pos,
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn get_documents_for_component(state: State<DbState>, equipment_id: String) -> CommandResult<Vec<Document>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, equipment_id, image_data, description, created_at, perceptual_hash, ocr_text, analysis, annotations, created_by, status, tags, version, validated_by, validated_at FROM documents WHERE equipment_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([equipment_id], |row| {
        Ok(Document {
            id: row.get(0)?, equipment_id: row.get(1)?, image_data: row.get(2)?, description: row.get(3)?, created_at: row.get(4)?, perceptual_hash: row.get(5)?, ocr_text: row.get(6)?, analysis: row.get(7)?, annotations: row.get(8)?, created_by: row.get(9)?, status: row.get(10)?, tags: row.get(11)?, version: row.get(12)?, validated_by: row.get(13)?, validated_at: row.get(14)?,
        })
    }).map_err(map_query_error)?;
    
    iter.map(|d| d.map_err(|e| e.to_string())).collect()
}

#[command]
pub fn get_local_visual_database(state: State<DbState>) -> CommandResult<Vec<LocalVisualDbEntry>> {
    let conn = state.local.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT d.id, d.equipment_id, e.name, d.description, d.image_data, d.perceptual_hash
         FROM documents d JOIN equipments e ON d.equipment_id = e.external_id
         WHERE d.perceptual_hash IS NOT NULL"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map([], |row| {
        Ok(LocalVisualDbEntry {
            document_id: row.get(0)?, equipment_id: row.get(1)?, equipment_name: row.get(2)?, description: row.get(3)?, image_data: row.get(4)?, perceptual_hash: row.get(5)?,
        })
    }).map_err(map_query_error)?;

    iter.map(|e| e.map_err(|e| e.to_string())).collect()
}

#[command]
pub async fn sync_database(state: tauri::State<'_, DbState>) -> CommandResult<SyncResult> {
    println!("[Sync] Starting sync with remote PostgreSQL database...");

    let remote_equipments: Vec<RemoteEquipment> = sqlx::query_as(
        r#"
        SELECT 
            external_id, name, description, parent_id, "type", subtype, system_code, sub_system,
            location, manufacturer, serial_number, tag_number, document_ref, coordinates,
            svg_layer, fire_zone, linked_parameters, status, version, is_immutable,
            approved_by, approved_at, commissioning_date, checksum, nominal_data
        FROM "Equipment"
        "#,
    )
    .fetch_all(&state.remote)
    .await
    .map_err(|e| {
        eprintln!("[Sync Error] Failed to fetch from remote: {}", e);
        e.to_string()
    })?;
    
    println!("[Sync] Fetched {} equipments from remote.", remote_equipments.len());
    
    let conn = state.local.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    let mut upserted_count = 0;
    
    for equip in remote_equipments {
        let res = tx.execute(
            r#"
            INSERT INTO equipments (
                external_id, name, description, parent_id, type, subtype, system_code, sub_system, location,
                manufacturer, serial_number, tag_number, document_ref, coordinates, svg_layer, fire_zone,
                linked_parameters, status, version, is_immutable, approved_by, approved_at, commissioning_date,
                checksum, nominal_data
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25
            ) ON CONFLICT(external_id) DO UPDATE SET
                name=excluded.name, description=excluded.description, parent_id=excluded.parent_id, type=excluded.type,
                subtype=excluded.subtype, system_code=excluded.system_code, sub_system=excluded.sub_system,
                location=excluded.location, manufacturer=excluded.manufacturer, serial_number=excluded.serial_number,
                tag_number=excluded.tag_number, document_ref=excluded.document_ref, coordinates=excluded.coordinates,
                svg_layer=excluded.svg_layer, fire_zone=excluded.fire_zone, linked_parameters=excluded.linked_parameters,
                status=excluded.status, version=excluded.version, is_immutable=excluded.is_immutable,
                approved_by=excluded.approved_by, approved_at=excluded.approved_at,
                commissioning_date=excluded.commissioning_date, checksum=excluded.checksum, nominal_data=excluded.nominal_data
            "#,
            rusqlite::params![
                equip.external_id, equip.name, equip.description, equip.parent_id, equip.r#type, equip.subtype, equip.system_code, equip.sub_system,
                equip.location, equip.manufacturer, equip.serial_number, equip.tag_number, equip.document_ref, equip.coordinates,
                equip.svg_layer, equip.fire_zone, equip.linked_parameters, equip.status, equip.version, equip.is_immutable,
                equip.approved_by, 
                equip.approved_at.map(|dt| dt.to_rfc3339()),
                equip.commissioning_date.map(|dt| dt.to_rfc3339()),
                equip.checksum, equip.nominal_data
            ],
        ).map_err(|e| e.to_string())?;

        if res > 0 {
            upserted_count += 1;
        }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    
    println!("[Sync] Sync complete. Upserted {} records into local SQLite DB.", upserted_count);
    
    Ok(SyncResult {
        synced: upserted_count as i32,
        cleaned: true,
    })
}
