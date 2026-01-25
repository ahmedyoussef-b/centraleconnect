
import type { Database as DbInstance } from '@tauri-apps/api/sql';
import type { Equipment, LogEntry, LogEntryType, Parameter, Alarm } from '@/types/db';

// Import JSON data which will be bundled by the build process
import equipmentData from './master-data/equipments.json';
import parameterData from './master-data/parameters.json';
import alarmData from './master-data/alarms.json';
import manifest from './master-data/manifest.json';


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
      // Dynamically import the tauri-plugin-sql module.
      // This ensures it's only imported at runtime within the Tauri environment.
      const { default: Database } = await import('tauri-plugin-sql');
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

const CREATE_TABLES_SQL = `
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

async function computeCombinedChecksum(data: any[]): Promise<string> {
    // Sort keys in each object to ensure consistent stringification
    const replacer = (key: any, value: any) =>
      value instanceof Object && !(value instanceof Array) ? 
      Object.keys(value)
      .sort()
      .reduce((sorted: any, key: any) => {
        sorted[key] = value[key];
        return sorted 
      }, {}) :
      value;

    const combinedString = data.map(item => JSON.stringify(item, replacer)).join('');
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(combinedString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `sha256:${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
}


async function seedMasterData(db: DbInstance) {
    // Seed equipments
    for (const eq of (equipmentData as Equipment[])) {
        await db.execute(
            "INSERT OR IGNORE INTO equipments (id, name, description, type) VALUES (?, ?, ?, ?)",
            [eq.id, eq.name, eq.description, eq.type]
        );
    }
    // Seed parameters
    for (const param of (parameterData as Parameter[])) {
         await db.execute(
            "INSERT OR IGNORE INTO parameters (equipment_id, name, unit, min_value, max_value, nominal_value) VALUES (?, ?, ?, ?, ?, ?)",
            [param.equipment_id, param.name, param.unit, param.min_value, param.max_value, param.nominal_value]
        );
    }
    // Seed alarms
    for (const alarm of (alarmData as Alarm[])) {
         await db.execute(
            "INSERT OR IGNORE INTO alarms (equipment_id, code, description, severity) VALUES (?, ?, ?, ?)",
            [alarm.equipment_id, alarm.code, alarm.description, alarm.severity]
        );
    }
}

export async function initializeDatabase() {
    if (isInitialized) {
        return;
    }
    const db = await getDbInstance();

    try {
        await db.execute(CREATE_TABLES_SQL);
        
        // 1. Verify master data integrity before any operation
        const dataToCheck = [equipmentData, parameterData, alarmData];
        const computedChecksum = await computeCombinedChecksum(dataToCheck);

        if (computedChecksum !== manifest.checksum) {
            const errorMessage = `Vérification de l'intégrité des données maîtres a échoué. Attendu: ${manifest.checksum}, Calculé: ${computedChecksum}. Le contenu a peut-être été altéré.`;
            console.error(errorMessage);
            // In a real app, you might want a more graceful failure.
            // Here we prevent the app from starting with corrupted data.
            throw new Error(errorMessage);
        }

        const logResult: {count: number}[] = await db.select("SELECT count(*) as count FROM log_entries");
        if (logResult[0].count === 0) {
             await addLogEntry({
                type: 'AUTO',
                source: 'SYSTEM',
                message: 'Premier démarrage du journal de bord.',
            });
             await addLogEntry({
                type: 'AUTO',
                source: 'SYSTEM',
                message: `Intégrité des données maîtres v${manifest.version} vérifiée (checksum: ${manifest.checksum.substring(0, 15)}...).`,
            });
        }

        // 2. Seed master data only if the equipments table is empty
        const result: {count: number}[] = await db.select("SELECT count(*) as count FROM equipments");
        if (result[0].count === 0) {
            await seedMasterData(db);

            await addLogEntry({
                type: 'AUTO',
                source: 'SYSTEM',
                message: 'Base de données initialisée avec les données maîtres.',
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
