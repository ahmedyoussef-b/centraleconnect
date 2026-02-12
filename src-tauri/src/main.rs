// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
use commands::{AppState, get_equipments, get_equipment, add_equipment, 
               get_components, get_components_by_equipment, 
               sync_data, get_sync_data, clear_sync_data, 
               provision_equipment, get_pid_svg};

fn main() {
    // Données de démonstration
    let state = AppState::new();
    
    // Ajouter quelques équipements de test
    if let Ok(mut equipments) = state.equipments.lock() {
        equipments.push(commands::Equipment {
            id: "DF001".to_string(),
            name: "Turbine à gaz".to_string(),
            zone: "B1".to_string(),
            status: "opérationnel".to_string(),
            parameters: Some(vec![
                commands::Parameter {
                    id: "p1".to_string(),
                    name: "Pression".to_string(),
                    value: 12.5,
                    unit: "bar".to_string(),
                },
                commands::Parameter {
                    id: "p2".to_string(),
                    name: "Température".to_string(),
                    value: 450.0,
                    unit: "°C".to_string(),
                },
            ]),
        });
        
        equipments.push(commands::Equipment {
            id: "DF002".to_string(),
            name: "Pompe centrifuge".to_string(),
            zone: "B2".to_string(),
            status: "maintenance".to_string(),
            parameters: None,
        });
    }
    
    // Ajouter quelques composants de test
    if let Ok(mut components) = state.components.lock() {
        components.push(commands::Component {
            id: "C001".to_string(),
            name: "Roulement principal".to_string(),
            equipment_id: "DF001".to_string(),
            manufacturer: "SKF".to_string(),
        });
        
        components.push(commands::Component {
            id: "C002".to_string(),
            name: "Joint d'étanchéité".to_string(),
            equipment_id: "DF002".to_string(),
            manufacturer: "Parker".to_string(),
        });
    }

    tauri::Builder::default()
        .manage(state) // Partage l'état entre toutes les commandes
        .invoke_handler(tauri::generate_handler![
            get_equipments,
            get_equipment,
            add_equipment,
            get_components,
            get_components_by_equipment,
            sync_data,
            get_sync_data,
            clear_sync_data,
            provision_equipment,
            get_pid_svg,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}
