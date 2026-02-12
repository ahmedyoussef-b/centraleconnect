// src-tauri/src/commands.rs
use serde::{Serialize, Deserialize};
use tauri::command;
use std::sync::Mutex;
use std::fs;

// ===== MODÈLES DE DONNÉES =====
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Equipment {
    pub id: String,
    pub name: String,
    pub zone: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<Vec<Parameter>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Parameter {
    pub id: String,
    pub name: String,
    pub value: f64,
    pub unit: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub equipment_id: String,
    pub manufacturer: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncData {
    pub equipments: Vec<Equipment>,
    pub components: Vec<Component>,
    pub timestamp: String,
}

// ===== ÉTAT DE L'APPLICATION (MÉMOIRE) =====
pub struct AppState {
    pub equipments: Mutex<Vec<Equipment>>,
    pub components: Mutex<Vec<Component>>,
    pub sync_data: Mutex<Option<SyncData>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            equipments: Mutex::new(vec![]),
            components: Mutex::new(vec![]),
            sync_data: Mutex::new(None),
        }
    }
}

// ===== COMMANDES TAURI =====

/// Récupérer tous les équipements
#[command]
pub fn get_equipments(state: tauri::State<'_, AppState>) -> Result<Vec<Equipment>, String> {
    match state.equipments.lock() {
        Ok(guard) => Ok(guard.clone()),
        Err(_) => Err("Impossible de verrouiller l'état".to_string()),
    }
}

/// Récupérer un équipement par ID
#[command]
pub fn get_equipment(id: String, state: tauri::State<'_, AppState>) -> Result<Option<Equipment>, String> {
    match state.equipments.lock() {
        Ok(guard) => Ok(guard.iter().find(|e| e.id == id).cloned()),
        Err(_) => Err("Impossible de verrouiller l'état".to_string()),
    }
}

/// Ajouter un équipement
#[command]
pub fn add_equipment(equipment: Equipment, state: tauri::State<'_, AppState>) -> Result<Equipment, String> {
    match state.equipments.lock() {
        Ok(mut guard) => {
            guard.push(equipment.clone());
            Ok(equipment)
        },
        Err(_) => Err("Impossible d'ajouter l'équipement".to_string()),
    }
}

/// Récupérer tous les composants
#[command]
pub fn get_components(state: tauri::State<'_, AppState>) -> Result<Vec<Component>, String> {
    match state.components.lock() {
        Ok(guard) => Ok(guard.clone()),
        Err(_) => Err("Impossible de verrouiller l'état".to_string()),
    }
}

/// Récupérer les composants d'un équipement
#[command]
pub fn get_components_by_equipment(equipment_id: String, state: tauri::State<'_, AppState>) -> Result<Vec<Component>, String> {
    match state.components.lock() {
        Ok(guard) => Ok(guard.iter()
            .filter(|c| c.equipment_id == equipment_id)
            .cloned()
            .collect()),
        Err(_) => Err("Impossible de verrouiller l'état".to_string()),
    }
}

/// Synchroniser les données
#[command]
pub fn sync_data(data: SyncData, state: tauri::State<'_, AppState>) -> Result<String, String> {
    // Sauvegarder les données synchronisées
    match state.sync_data.lock() {
        Ok(mut guard) => {
            *guard = Some(data.clone());
            
            // Mettre à jour les équipements et composants
            if let Ok(mut equipments) = state.equipments.lock() {
                *equipments = data.equipments;
            }
            
            if let Ok(mut components) = state.components.lock() {
                *components = data.components;
            }
            
            Ok("Synchronisation réussie".to_string())
        },
        Err(_) => Err("Erreur de synchronisation".to_string()),
    }
}

/// Obtenir les données synchronisées
#[command]
pub fn get_sync_data(state: tauri::State<'_, AppState>) -> Result<Option<SyncData>, String> {
    match state.sync_data.lock() {
        Ok(guard) => Ok(guard.clone()),
        Err(_) => Err("Impossible de récupérer les données".to_string()),
    }
}

/// Effacer les données synchronisées
#[command]
pub fn clear_sync_data(state: tauri::State<'_, AppState>) -> Result<String, String> {
    match state.sync_data.lock() {
        Ok(mut guard) => {
            *guard = None;
            Ok("Données effacées".to_string())
        },
        Err(_) => Err("Impossible d'effacer les données".to_string()),
    }
}

/// Provisionner un nouvel équipement
#[command]
pub fn provision_equipment(equipment: Equipment, state: tauri::State<'_, AppState>) -> Result<Equipment, String> {
    // Simule l'ajout d'un équipement provisionné
    match state.equipments.lock() {
        Ok(mut guard) => {
            let mut new_equipment = equipment;
            if new_equipment.id.is_empty() {
                new_equipment.id = format!("PROV-{}", chrono::Utc::now().timestamp());
            }
            guard.push(new_equipment.clone());
            Ok(new_equipment)
        },
        Err(_) => Err("Erreur de provisionnement".to_string()),
    }
}

#[command]
pub fn get_pid_svg(app_handle: tauri::AppHandle, path: String) -> Result<String, String> {
    let resource_path = app_handle.path_resolver()
        .resolve_resource(&path)
        .ok_or_else(|| "Failed to resolve resource path".to_string())?;

    fs::read_to_string(&resource_path)
        .map_err(|e| e.to_string())
}
