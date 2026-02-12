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

// --- Mode de Simulation Amélioré ---

struct PlantSimulator {
    tg1_power: f64,
    tg2_power: f64,
    tv_power: f64,
    tg1_target: f64,
    tg2_target: f64,
    rng: rand::rngs::ThreadRng,
}

impl PlantSimulator {
    fn new() -> Self {
        Self {
            tg1_power: 130.0,
            tg2_power: 135.0,
            tv_power: (130.0 + 135.0) * 0.65, // La puissance de la TV est corrélée
            tg1_target: 130.0,
            tg2_target: 135.0,
            rng: rand::thread_rng(),
        }
    }

    /// Simule un pas de temps et met à jour l'état de la centrale.
    fn step(&mut self) {
        // --- Simulation des rampes et de l'inertie ---
        // Se rapproche de la cible à chaque pas (crée l'effet de rampe/inertie)
        self.tg1_power += (self.tg1_target - self.tg1_power) * 0.1;
        self.tg2_power += (self.tg2_target - self.tg2_power) * 0.1;
        
        // --- Ajout de bruit réaliste ---
        self.tg1_power += self.rng.gen_range(-0.1..0.1);
        self.tg2_power += self.rng.gen_range(-0.1..0.1);
        
        // --- Corrélation physique : la TV dépend des TG ---
        // Modèle simple : la puissance de la TV est un ratio de la somme des TG, avec une inertie propre.
        let target_tv_power = (self.tg1_power + self.tg2_power) * 0.65; // ~65% de rendement du cycle vapeur
        self.tv_power += (target_tv_power - self.tv_power) * 0.08; // La TV a plus d'inertie
        self.tv_power += self.rng.gen_range(-0.2..0.2);

        // Contraintes physiques (clamp)
        self.tg1_power = self.tg1_power.clamp(120.0, 150.0);
        self.tg2_power = self.tg2_power.clamp(120.0, 150.0);
        self.tv_power = self.tv_power.clamp(150.0, 200.0);
    }
    
    /// Définit de nouvelles cibles de puissance pour simuler des transitoires.
    fn set_new_targets(&mut self) {
        self.tg1_target = self.rng.gen_range(125.0..148.0);
        self.tg2_target = self.rng.gen_range(125.0..148.0);
        println!("[SCADA SIM] Nouvelles cibles - TG1: {:.1} MW, TG2: {:.1} MW", self.tg1_target, self.tg2_target);
    }

    /// Récupère l'état actuel sous forme de HashMap pour la publication.
    fn get_values(&self) -> HashMap<String, f64> {
        let mut values = HashMap::new();
        values.insert("TG1".to_string(), self.tg1_power);
        values.insert("TG2".to_string(), self.tg2_power);
        values.insert("TV".to_string(), self.tv_power);
        values
    }
}


/// Mode Démo : génère des données synthétiques et les publie.
async fn demo_mode(ably_client: ably::AblyRealtime) -> Result<()> {
    println!("[SCADA] Exécution en mode DEMO (Simulateur Intelligent).");
    
    let mut simulation_interval = time::interval(Duration::from_secs(2));
    let mut target_change_interval = time::interval(Duration::from_secs(20));
    let mut simulator = PlantSimulator::new();

    loop {
        tokio::select! {
            _ = simulation_interval.tick() => {
                simulator.step();
                let data = ScadaDataPoint {
                    timestamp: Utc::now().to_rfc3339(),
                    source: "DEMO".to_string(),
                    values: ScadaValues { values: simulator.get_values() },
                };
                
                if let Err(e) = publish_to_ably(&ably_client, &data).await {
                    eprintln!("[SCADA DEMO] Échec de la publication sur Ably: {}", e);
                }
            }
            _ = target_change_interval.tick() => {
                simulator.set_new_targets();
            }
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
