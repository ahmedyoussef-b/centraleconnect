// src-tauri/src/scada.rs
use std::env;
use std::time::Duration;
use tokio::time;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use rand::Rng;
use chrono::Utc;
use tauri::Manager;
use std::collections::HashMap;
use opcua::types::NodeId;
use std::str::FromStr;
use tokio_stream::StreamExt;

// --- Structures de Données ---

#[derive(Serialize, Clone, Debug)]
struct ScadaValues {
    #[serde(flatten)]
    values: HashMap<String, f64>,
}

#[derive(Serialize, Clone, Debug)]
struct ScadaDataPoint {
    timestamp: String,
    source: String,
    values: ScadaValues,
}

#[derive(Deserialize, Debug, Clone)]
struct MappingEntry {
    external_id: String,
    scada_tag_candidate: String,
}

#[derive(Deserialize, Debug)]
struct ScadaMappingFile {
    mappings: Vec<MappingEntry>,
}

// --- Publication Ably ---

/// Publie les données SCADA sur le canal Ably.
async fn publish_to_ably(client: &ably::AblyRealtime, data: &ScadaDataPoint) -> Result<()> {
    let channel = client.channels().get("scada:data");
    //println!("[SCADA] Publication sur Ably: {:?}", data);
    channel.publish("update", data).await?;
    Ok(())
}

// --- Logique des Modes ---

/// Charge et parse le fichier de mapping JSON.
fn load_scada_mapping(app_handle: &tauri::AppHandle) -> Result<ScadaMappingFile> {
    let resource_path = app_handle
        .path_resolver()
        .resolve_resource("scada-mapping.json")
        .ok_or_else(|| anyhow::anyhow!("Impossible de résoudre le chemin vers scada-mapping.json"))?;
    
    let file_content = std::fs::read_to_string(resource_path)?;
    serde_json::from_str(&file_content).map_err(Into::into)
}

/// Mode Démo : génère des données synthétiques et les publie.
async fn demo_mode(ably_client: ably::AblyRealtime) -> Result<()> {
    println!("[SCADA] Exécution en mode DEMO.");
    let mut interval = time::interval(Duration::from_secs(2));
    let mut rng = rand::thread_rng();

    let mut values = HashMap::new();
    values.insert("TG1".to_string(), 132.0);
    values.insert("TG2".to_string(), 135.0);
    values.insert("TV".to_string(), 180.0);

    loop {
        interval.tick().await;

        for (key, val) in values.iter_mut() {
            let fluctuation = if key == "TV" { 1.0 } else { 0.5 };
            *val += rng.gen_range(-fluctuation..fluctuation);
            if key == "TG1" { *val = val.clamp(120.0, 145.0); }
            if key == "TG2" { *val = val.clamp(125.0, 150.0); }
            if key == "TV" { *val = val.clamp(160.0, 200.0); }
        }

        let data = ScadaDataPoint {
            timestamp: Utc::now().to_rfc3339(),
            source: "DEMO".to_string(),
            values: ScadaValues { values: values.clone() },
        };
        
        if let Err(e) = publish_to_ably(&ably_client, &data).await {
            eprintln!("[SCADA DEMO] Échec de la publication sur Ably: {}", e);
        }
    }
}


/// Mode OPC UA : se connecte au serveur et publie les données réelles.
async fn opcua_mode(app_handle: tauri::AppHandle, ably_client: ably::AblyRealtime) -> Result<()> {
    println!("[SCADA] Exécution en mode OPCUA.");
    
    let server_url = env::var("OPCUA_SERVER_URL")
        .map_err(|_| anyhow::anyhow!("OPCUA_SERVER_URL non défini dans .env"))?;

    let mapping = match load_scada_mapping(&app_handle) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("[SCADA OPCUA] Erreur de chargement du mapping: {}. Basculement en mode DEMO.", e);
            return demo_mode(ably_client).await;
        }
    };
    
    let node_map: HashMap<String, String> = mapping.mappings.into_iter()
        .map(|entry| (entry.scada_tag_candidate, entry.external_id))
        .collect();

    // Boucle de reconnexion automatique
    loop {
        println!("[SCADA OPCUA] Tentative de connexion à {}...", server_url);
        
        // --- GESTION DE LA SÉCURITÉ (À ACTIVER EN PRODUCTION) ---
        // let client_certificate = std::fs::read(env::var("OPCUA_CERT_PATH")?)?;
        // let private_key = std::fs::read(env::var("OPCUA_KEY_PATH")?)?;
        // let client = opcua::Client::new_with_certificates(&server_url, &client_certificate, &private_key, "urn:mon-app", "CentraleConnect")?;
        let client = opcua::Client::new(&server_url);

        let mut client = match client {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[SCADA OPCUA] Erreur création client: {}. Nouvel essai dans 10s.", e);
                time::sleep(Duration::from_secs(10)).await;
                continue;
            }
        };

        if let Err(e) = client.connect().await {
            eprintln!("[SCADA OPCUA] Échec de connexion: {}. Nouvel essai dans 10s.", e);
            time::sleep(Duration::from_secs(10)).await;
            continue;
        }

        println!("[SCADA OPCUA] Connecté avec succès.");
        
        let mut subscription = match client.subscription().await {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[SCADA OPCUA] Échec création souscription: {}. Reconnexion...", e);
                continue;
            }
        };

        // Souscrire à chaque NodeId du fichier de mapping
        for (node_id_str, _) in &node_map {
            let node_id = match NodeId::from_str(node_id_str) {
                Ok(id) => id,
                Err(e) => {
                    eprintln!("[SCADA OPCUA] NodeId invalide '{}': {}", node_id_str, e);
                    continue;
                }
            };
            
            let monitored_item = match subscription.monitor(&node_id, 1000.0).await {
                Ok(item) => item,
                Err(e) => {
                    eprintln!("[SCADA OPCUA] Échec souscription à {}: {}", node_id_str, e);
                    continue;
                }
            };

            let mut stream = monitored_item.stream();
            let ably_clone = ably_client.clone();
            let node_map_clone = node_map.clone();
            let opc_node_id_str_clone = node_id_str.clone();

            tokio::spawn(async move {
                while let Some(value) = stream.next().await {
                    if let Some(variant) = value.value() {
                        if let Some(internal_id) = node_map_clone.get(&opc_node_id_str_clone) {
                            let numeric_value: f64 = match variant {
                                opcua::types::Variant::Float(f) => *f as f64,
                                opcua::types::Variant::Double(d) => *d,
                                opcua::types::Variant::Int64(i) => *i as f64,
                                _ => continue,
                            };
                            
                            let mut values = HashMap::new();
                            values.insert(internal_id.clone(), numeric_value);
                            
                            let data_point = ScadaDataPoint {
                                timestamp: Utc::now().to_rfc3339(),
                                source: "OPCUA".to_string(),
                                values: ScadaValues { values },
                            };
                            
                            if let Err(e) = publish_to_ably(&ably_clone, &data_point).await {
                                eprintln!("[SCADA OPCUA WORKER] Échec publication Ably: {}", e);
                            }
                        }
                    }
                }
                println!("[SCADA OPCUA WORKER] Stream terminé pour {}.", opc_node_id_str_clone);
            });
        }
        
        println!("[SCADA OPCUA] Toutes les souscriptions sont actives.");

        // Boucle de maintien de la session
        loop {
            if client.session_state() != opcua::SessionState::Connected {
                eprintln!("[SCADA OPCUA] Session perdue. Reconnexion...");
                break;
            }
            time::sleep(Duration::from_secs(5)).await;
        }
    }
}


/// Point d'entrée principal de la boucle SCADA.
pub async fn run_scada_loop(app_handle: tauri::AppHandle) {
    println!("[SCADA] Initialisation de la boucle SCADA...");

    let ably_api_key = env::var("ABLY_API_KEY");
    if ably_api_key.is_err() {
        eprintln!("[SCADA] ABLY_API_KEY non trouvé dans le fichier .env. Les fonctionnalités temps réel seront désactivées.");
        return;
    }
    
    let ably_client = match ably::AblyRealtime::new(ably_api_key.unwrap()) {
        Ok(client) => client,
        Err(e) => {
            eprintln!("[SCADA] Échec de l'initialisation du client Ably: {}", e);
            return;
        }
    };

    let scada_mode = env::var("SCADA_MODE").unwrap_or_else(|_| "DEMO".to_string());

    let result = match scada_mode.as_str() {
        "OPCUA" => opcua_mode(app_handle, ably_client).await,
        _ => demo_mode(ably_client).await,
    };

    if let Err(e) = result {
        eprintln!("[SCADA] La boucle SCADA a échoué: {}", e);
    }
}
