
import type { Database as DbInstance } from '@tauri-apps/api/sql';
import type { Equipment, LogEntry, LogEntryType } from '@/types/db';


let db: DbInstance | null = null;
let dbInitializationPromise: Promise<DbInstance> | null = null;

// This function gets the DB instance, handling the Tauri-specific import.
async function getDbInstance(): Promise<DbInstance> {
  if (db) {
    return db;
  }
  
  // If another call is already initializing, wait for it to complete.
  if (dbInitializationPromise) {
    return dbInitializationPromise;
  }

  // This check is crucial.
  if (typeof window === 'undefined' || !window.__TAURI__) {
    throw new Error("Database can only be accessed in a Tauri environment.");
  }
  
  // Create a new promise to initialize the database.
  dbInitializationPromise = (async () => {
    try {
      // By dynamically importing the module name as a variable,
      // we ensure it's only imported at runtime within the Tauri environment.
      const moduleName = 'tauri-plugin-sql';
      const { default: Database } = await import(moduleName);
      const loadedDb = await Database.load('sqlite:ccpp.db');
      db = loadedDb;
      return db;
    } finally {
      // Clear the promise once it's resolved or rejected.
      dbInitializationPromise = null;
    }
  })();
  
  return dbInitializationPromise;
}


const SEED_SQL = `
CREATE TABLE IF NOT EXISTS equipments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    min_value REAL,
    max_value REAL,
    nominal_value REAL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(id)
);

CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
    UNIQUE(equipment_id, code)
);

CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    equipment_id TEXT,
    signature TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipments(id)
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('PHOTO_ID_PLATE', 'MANUAL_PAGE', 'P&ID_SNIPPET')),
    description TEXT,
    image_data TEXT,
    ocr_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO equipments (id, name, description, type) VALUES
('TG1', 'Turbine à Gaz 1', 'Turbine à gaz principale 1', 'GAS_TURBINE'),
('TG2', 'Turbine à Gaz 2', 'Turbine à gaz principale 2', 'GAS_TURBINE'),
('TV', 'Turbine à Vapeur', 'Turbine à vapeur du cycle combiné', 'STEAM_TURBINE'),
('CR1', 'Chaudière de Récupération 1', 'Chaudière associée à la TG1', 'HRSG'),
('CR2', 'Chaudière de Récupération 2', 'Chaudière associée à la TG2', 'HRSG');

INSERT OR IGNORE INTO parameters (equipment_id, name, unit, min_value, max_value, nominal_value) VALUES
('TG1', 'Vitesse de rotation', 'tr/min', 2800, 3200, 3000),
('TG1', 'Température échappement', '°C', 550, 650, 620),
('TG1', 'Puissance active', 'MW', 0, 150, 130),
('TG1', 'Pression compresseur', 'bar', 10, 20, 15),
('TV', 'Pression vapeur HP', 'bar', 100, 140, 120),
('TV', 'Température vapeur HP', '°C', 500, 580, 565),
('TV', 'Puissance active', 'MW', 0, 200, 180);

INSERT OR IGNORE INTO alarms (equipment_id, code, description, severity) VALUES
('TG1', 'TG1-VIB-HIGH', 'Vibration palier avant élevée', 'WARNING'),
('TG1', 'TG1-TEMP-EXH-HIGH', 'Température échappement > 650°C', 'CRITICAL'),
('TG1', 'TG1-FLAME-OUT', 'Perte de flamme en chambre de combustion', 'CRITICAL'),
('CR1', 'CR1-LVL-BALLON-LOW', 'Niveau bas ballon HP', 'WARNING'),
('CR1', 'CR1-PRESS-VAP-HIGH', 'Pression vapeur surchauffée HP trop haute', 'CRITICAL');
`;

let isInitialized = false;

async function createEntrySignature(
  entryData: {
    timestamp: string;
    type: LogEntryType;
    source: string;
    message: string;
    equipment_id: string | null;
  },
  previousSignature: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${previousSignature}|${entryData.timestamp}|${entryData.type}|${entryData.source}|${entryData.message}|${
      entryData.equipment_id ?? ''
    }`
  );
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function initializeDatabase() {
    if (isInitialized) {
        return;
    }
    const db = await getDbInstance();

    try {
        await db.execute(SEED_SQL);
        
        const result: {count: number}[] = await db.select("SELECT count(*) as count FROM log_entries");
        
        if (result[0].count === 0) {
            await addLogEntry({
                type: 'AUTO',
                source: 'SYSTEM',
                message: 'Initialisation et remplissage de la base de données.',
            });
        }
        
        await addLogEntry({
            type: 'AUTO',
            source: 'SYSTEM',
            message: 'Application démarrée.',
        });

        console.log('Database initialized successfully.');
        isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

export async function getEquipments(): Promise<Equipment[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    return await db.select('SELECT * FROM equipments');
}

export async function getLogEntries(): Promise<LogEntry[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    return await db.select('SELECT * FROM log_entries ORDER BY timestamp DESC');
}

export async function addLogEntry(entry: {
    type: LogEntryType;
    source: string;
    message: string;
    equipment_id?: string;
}): Promise<void> {
    const db = await getDbInstance();

    const lastEntry: { signature: string }[] = await db.select(
        'SELECT signature FROM log_entries ORDER BY id DESC LIMIT 1'
    );
    const previousSignature = lastEntry.length > 0 && lastEntry[0].signature ? lastEntry[0].signature : 'GENESIS';

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const newEntryData = {
        type: entry.type,
        source: entry.source,
        message: entry.message,
        equipment_id: entry.equipment_id || null,
        timestamp: timestamp
    };
    
    const signature = await createEntrySignature(newEntryData, previousSignature);

    await db.execute(
        'INSERT INTO log_entries (timestamp, type, source, message, equipment_id, signature) VALUES (?, ?, ?, ?, ?, ?)',
        [timestamp, newEntryData.type, newEntryData.source, newEntryData.message, newEntryData.equipment_id, signature]
    );
}


export async function addEquipmentAndDocument(
    equipment: Omit<Equipment, 'description'> & { description?: string },
    document: { imageData: string; ocrText: string; description: string }
): Promise<void> {
    const db = await getDbInstance();
    
    await db.execute(
        'INSERT INTO equipments (id, name, description, type) VALUES (?, ?, ?, ?)',
        [equipment.id, equipment.name, equipment.description ?? '', equipment.type]
    );

    await db.execute(
        'INSERT INTO documents (equipment_id, type, description, image_data, ocr_text) VALUES (?, ?, ?, ?, ?)',
        [equipment.id, 'PHOTO_ID_PLATE', document.description, document.imageData, document.ocrText]
    );
    
    await addLogEntry({
        type: 'DOCUMENT_ADDED',
        source: 'Opérateur 1',
        message: `Nouvel équipement '${equipment.id}' ajouté via caméra.`,
        equipment_id: equipment.id,
    });
}
