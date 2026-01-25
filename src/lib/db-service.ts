
import type { Database as DbInstance } from '@tauri-apps/api/sql';
import type { Equipment, LogEntry } from '@/types/db';


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
      // The problematic import is now inside a function that's only called on the client.
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
    type TEXT NOT NULL CHECK(type IN ('AUTO', 'MANUAL')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    equipment_id TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipments(id)
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

export async function initializeDatabase() {
    if (isInitialized) {
        return;
    }
    const db = await getDbInstance();

    try {
        await db.execute(SEED_SQL);
        
        const result: {count: number}[] = await db.select("SELECT count(*) as count FROM log_entries WHERE message = 'Initialisation et remplissage de la base de données.'");
        
        if (result[0].count === 0) {
            await db.execute("INSERT INTO log_entries (type, source, message) VALUES (?, ?, ?)", ['AUTO', 'SYSTEM', 'Initialisation et remplissage de la base de données.']);
        }
        
        await db.execute("INSERT INTO log_entries (type, source, message) VALUES (?, ?, ?)", ['AUTO', 'SYSTEM', 'Application démarrée.']);

        console.log('Database initialized successfully.');
        isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        // Re-throw the error to be caught by the caller
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
    // Order by most recent
    return await db.select('SELECT * FROM log_entries ORDER BY timestamp DESC');
}

export async function addLogEntry(entry: {
    type: 'MANUAL';
    source: string;
    message: string;
    equipment_id?: string;
}): Promise<void> {
    const db = await getDbInstance();
    await db.execute(
        'INSERT INTO log_entries (type, source, message, equipment_id) VALUES (?, ?, ?, ?)',
        [entry.type, entry.source, entry.message, entry.equipment_id || null]
    );
}
