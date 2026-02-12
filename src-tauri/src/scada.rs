// src-tauri/src/scada.rs
use std::env;
use std::time::Duration;
use tokio::time;
use anyhow::Result;
use serde::Serialize;
use rand::Rng;
use chrono::Utc;

#[derive(Serialize, Clone, Debug)]
struct ScadaDataPoint {
    timestamp: String,
    source: String,
    values: ScadaValues,
}

#[derive(Serialize, Clone, Debug)]
struct ScadaValues {
    #[serde(rename = "TG1")]
    tg1: f64,
    #[serde(rename = "TG2")]
    tg2: f64,
    #[serde(rename = "TV")]
    tv: f64,
}

/// Publie les données SCADA sur le canal Ably.
async fn publish_to_ably(client: &ably::AblyRealtime, data: &ScadaDataPoint) -> Result<()> {
    let channel = client.channels().get("scada:data");
    channel.publish("update", data).await?;
    Ok(())
}

/// Mode Démo : génère des données synthétiques et les publie.
async fn demo_mode(ably_client: ably::AblyRealtime) -> Result<()> {
    println!("[SCADA] Running in DEMO mode.");
    let mut interval = time::interval(Duration::from_secs(2));
    let mut rng = rand::thread_rng();

    // Valeurs de base et fluctuations
    let mut tg1_base = 132.0;
    let mut tg2_base = 135.0;
    let mut tv_base = 180.0;

    loop {
        interval.tick().await;

        // Simuler des fluctuations réalistes
        tg1_base += rng.gen_range(-0.5..0.5);
        tg2_base += rng.gen_range(-0.5..0.5);
        tv_base += rng.gen_range(-1.0..1.0);

        // S'assurer que les valeurs restent dans une plage plausible
        tg1_base = tg1_base.clamp(120.0, 145.0);
        tg2_base = tg2_base.clamp(125.0, 150.0);
        tv_base = tv_base.clamp(160.0, 200.0);

        let data = ScadaDataPoint {
            timestamp: Utc::now().to_rfc3339(),
            source: "DEMO".to_string(),
            values: ScadaValues {
                tg1: tg1_base + rng.gen_range(-0.2..0.2),
                tg2: tg2_base + rng.gen_range(-0.2..0.2),
                tv: tv_base + rng.gen_range(-0.5..0.5),
            }
        };
        
        if let Err(e) = publish_to_ably(&ably_client, &data).await {
            eprintln!("[SCADA DEMO] Failed to publish to Ably: {}", e);
        }
    }
}

/// Mode OPC UA : se connecte au serveur et publie les données réelles (placeholder).
async fn opcua_mode(ably_client: ably::AblyRealtime) -> Result<()> {
    println!("[SCADA] Running in OPCUA mode.");
    println!("[SCADA] NOTE: OPC UA mode is not yet fully implemented.");
    println!("[SCADA] It will run in demo mode as a fallback for now.");
    // Pour l'instant, on lance le mode démo en fallback.
    demo_mode(ably_client).await
}

/// Point d'entrée principal de la boucle SCADA.
pub async fn run_scada_loop(app_handle: tauri::AppHandle) {
    println!("[SCADA] Initializing SCADA loop...");

    let ably_api_key = env::var("ABLY_API_KEY");
    if ably_api_key.is_err() {
        eprintln!("[SCADA] ABLY_API_KEY not found in .env file. Real-time features will be disabled.");
        return;
    }
    
    let ably_client = match ably::AblyRealtime::new(ably_api_key.unwrap()) {
        Ok(client) => client,
        Err(e) => {
            eprintln!("[SCADA] Failed to initialize Ably client: {}", e);
            return;
        }
    };

    let scada_mode = env::var("SCADA_MODE").unwrap_or_else(|_| "DEMO".to_string());

    let result = match scada_mode.as_str() {
        "OPCUA" => opcua_mode(ably_client).await,
        _ => demo_mode(ably_client).await,
    };

    if let Err(e) = result {
        eprintln!("[SCADA] SCADA loop failed: {}", e);
    }
}
