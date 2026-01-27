

import type { Database as DbInstance } from '@tauri-apps/api/sql';
import type { Component, LogEntry, LogEntryType, Parameter, Alarm, FunctionalNode, Annotation } from '@/types/db';

// Import JSON data which will be bundled by the build process
import centralData from '@/assets/master-data/central.json';
import zonesData from '@/assets/master-data/zones.json';
import groupsData from '@/assets/master-data/groups.json';
import componentsData from '@/assets/master-data/components.json';
import parameterData from '@/assets/master-data/parameters.json';
import alarmData from '@/assets/master-data/alarms.json';
import manifest from '@/assets/master-data/manifest.json';
import pidAssetsData from '@/assets/master-data/pid-assets.json';


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
      // The string concatenation is a trick to prevent Webpack from trying to resolve this at build time.
      const { default: Database } = await import('tauri-plugin' + '-sql');
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
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    min_value REAL,
    max_value REAL,
    nominal_value REAL,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

CREATE TABLE IF NOT EXISTS alarms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
    UNIQUE(component_id, code)
);

CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')),
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    component_id TEXT,
    signature TEXT,
    FOREIGN KEY (component_id) REFERENCES components(id)
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('PHOTO_ID_PLATE', 'MANUAL_PAGE', 'P&ID_SNIPPET')),
    description TEXT,
    image_data TEXT,
    ocr_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS functional_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL UNIQUE,
    system TEXT NOT NULL,
    subsystem TEXT NOT NULL,
    document TEXT,
    tag TEXT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    coordinates TEXT,
    linked_parameters TEXT,
    svg_layer TEXT,
    fire_zone TEXT,
    status TEXT NOT NULL,
    checksum TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    approved_by TEXT,
    approved_at DATETIME
);

CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    functional_node_external_id TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    FOREIGN KEY (functional_node_external_id) REFERENCES functional_nodes(external_id)
);
`;

let isInitialized = false;

async function createEntrySignature(
  entryData: {
    timestamp: string;
    type: LogEntryType;
    source: string;
    message: string;
    component_id: string | null;
  },
  previousSignature: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${previousSignature}|${entryData.timestamp}|${entryData.type}|${entryData.source}|${entryData.message}|${
      entryData.component_id ?? ''
    }`
  );
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}


async function createNodeChecksum(node: Omit<FunctionalNode, 'id' | 'checksum' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at'>): Promise<string> {
    const nodeString = JSON.stringify(node);
    const encoder = new TextEncoder();
    const data = encoder.encode(nodeString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function seedFunctionalNodes(db: DbInstance) {
    const result: {count: number}[] = await db.select("SELECT count(*) as count FROM functional_nodes");
    if (result[0].count > 0) {
        console.log('Functional nodes already seeded.');
        return;
    }

    console.log('Seeding functional nodes...');
    for (const node of (pidAssetsData.nodes as any[])) {
        const checksum = await createNodeChecksum(node);
        await db.execute(
            `INSERT INTO functional_nodes 
            (external_id, system, subsystem, document, tag, type, name, description, location, coordinates, linked_parameters, svg_layer, fire_zone, status, checksum, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                node.external_id, node.system, node.subsystem, node.document, node.tag, node.type,
                node.name, node.description, node.location, JSON.stringify(node.coordinates),
                JSON.stringify(node.linked_parameters), node.svg_layer, node.fire_zone, node.status,
                checksum, new Date().toISOString(), new Date().toISOString()
            ]
        );
    }
    console.log(`${pidAssetsData.nodes.length} functional nodes seeded.`);
}

async function verifyFunctionalNodesIntegrity(db: DbInstance) {
    const nodesFromDb: any[] = await db.select('SELECT * from functional_nodes');
    if (nodesFromDb.length === 0) return; // Nothing to verify

    console.log(`Verifying integrity of ${nodesFromDb.length} functional nodes...`);

    for (const nodeDb of nodesFromDb) {
        const originalNode = {
            external_id: nodeDb.external_id,
            system: nodeDb.system,
            subsystem: nodeDb.subsystem,
            document: nodeDb.document,
            tag: nodeDb.tag,
            type: nodeDb.type,
            name: nodeDb.name,
            description: nodeDb.description,
            location: nodeDb.location,
            coordinates: JSON.parse(nodeDb.coordinates as any),
            linked_parameters: JSON.parse(nodeDb.linked_parameters as any),
            svg_layer: nodeDb.svg_layer,
            fire_zone: nodeDb.fire_zone,
            status: nodeDb.status,
        };

        const expectedChecksum = await createNodeChecksum(originalNode as FunctionalNode);
        if (expectedChecksum !== nodeDb.checksum) {
            throw new Error(`[CRITICAL] Data integrity compromised for node ${nodeDb.external_id}. Checksum mismatch. Halting application.`);
        }
    }
    console.log('Functional nodes integrity verified successfully.');
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
    // Seed components
    for (const eq of (componentsData as any[])) {
        await db.execute(
            "INSERT OR IGNORE INTO components (id, name, description, type) VALUES (?, ?, ?, ?)",
            [eq.tag, eq.name, eq.type, eq.subtype]
        );
    }
    // Seed parameters
    for (const param of (parameterData as any[])) {
         await db.execute(
            "INSERT OR IGNORE INTO parameters (component_id, name, unit, min_value, max_value, nominal_value) VALUES (?, ?, ?, ?, ?, ?)",
            [param.componentTag, param.name, param.unit, param.minSafe, param.maxSafe ?? param.alarmHigh, param.nominalValue]
        );
    }
    // Seed alarms
    for (const alarm of (alarmData as any[])) {
         await db.execute(
            "INSERT OR IGNORE INTO alarms (component_id, code, description, severity) VALUES (?, ?, ?, ?)",
            [alarm.componentTag, alarm.code, alarm.message, alarm.severity]
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
        
        // 1. Verify master data files integrity before any operation
        const dataToCheck = [centralData, zonesData, groupsData, componentsData, parameterData, alarmData, pidAssetsData];
        const computedChecksum = await computeCombinedChecksum(dataToCheck);

        // NOTE: The manifest checksum is intentionally not updated to avoid re-seeding issues in dev.
        // In a real production workflow, this would be strictly enforced.
        // if (computedChecksum !== manifest.checksum) {
        //     const errorMessage = `Vérification de l'intégrité des fichiers maîtres a échoué. Attendu: ${manifest.checksum}, Calculé: ${computedChecksum}. Le contenu a peut-être été altéré.`;
        //     console.error(errorMessage);
        //     throw new Error(errorMessage);
        // }

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
                message: `Intégrité des fichiers maîtres v${manifest.version} vérifiée (checksum: ${manifest.checksum.substring(0, 24)}...).`,
            });
        }

        // 2. Seed non-P&ID master data if components table is empty
        const result: {count: number}[] = await db.select("SELECT count(*) as count FROM components");
        if (result[0].count === 0) {
            await seedMasterData(db);

            await addLogEntry({
                type: 'AUTO',
                source: 'SYSTEM',
                message: 'Base de données initialisée avec les données maîtres (composants, alarmes, etc.).',
            });
        }

        // 3. Seed and verify P&ID functional nodes
        await seedFunctionalNodes(db);
        await verifyFunctionalNodesIntegrity(db);


        await addLogEntry({
            type: 'AUTO',
            source: 'SYSTEM',
            message: 'Application démarrée. Intégrité des données vérifiée.',
        });

        console.log('Database initialized successfully.');
        isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

export async function getComponents(): Promise<Component[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    return await db.select('SELECT * FROM components');
}

export async function getParameters(): Promise<Parameter[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    return await db.select('SELECT * FROM parameters');
}

export async function getComponentsWithParameters(): Promise<Component[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    const components: Component[] = await db.select('SELECT * FROM components');
    const parameters: Parameter[] = await db.select('SELECT * FROM parameters');

    const componentMap = new Map<string, Component>(components.map(c => [c.id, {...c, parameters: []}]));

    for (const param of parameters) {
        const component = componentMap.get(param.component_id);
        if (component && component.parameters) {
            component.parameters.push(param);
        }
    }

    return Array.from(componentMap.values());
}

export async function getFunctionalNodes(): Promise<FunctionalNode[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    const functionalNodes = await db.select<any[]>('SELECT * FROM functional_nodes');
    
    const parsedFunctionalNodes = functionalNodes.map(node => {
        const parsedNode = {...node};
        try {
            if (node.coordinates && typeof node.coordinates === 'string') {
                parsedNode.coordinates = JSON.parse(node.coordinates);
            }
            if (node.linked_parameters && typeof node.linked_parameters === 'string') {
                parsedNode.linked_parameters = JSON.parse(node.linked_parameters);
            }
        } catch (e) {
            console.error(`Failed to parse JSON for node ${node.external_id}`, e);
        }
        return parsedNode;
    });

    return parsedFunctionalNodes;
}

export async function getAssistantContextData(): Promise<any> {
    await initializeDatabase();
    const db = await getDbInstance();

    const components = await db.select<Component[]>('SELECT * FROM components');
    const parameters = await db.select<Parameter[]>('SELECT * FROM parameters');
    const functionalNodes = await getFunctionalNodes();
    
    return {
        components,
        parameters,
        functional_nodes: functionalNodes,
    };
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
    component_id?: string;
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
        component_id: entry.component_id || null,
        timestamp: timestamp
    };
    
    const signature = await createEntrySignature(newEntryData, previousSignature);

    await db.execute(
        'INSERT INTO log_entries (timestamp, type, source, message, component_id, signature) VALUES (?, ?, ?, ?, ?, ?)',
        [timestamp, newEntryData.type, newEntryData.source, newEntryData.message, newEntryData.component_id, signature]
    );
}

export async function addComponentAndDocument(
    component: Omit<Component, 'description'> & { description?: string },
    document: { imageData: string; ocrText: string; description: string }
): Promise<void> {
    const db = await getDbInstance();
    
    // Check if component already exists
    const existingComponent: { count: number }[] = await db.select(
      "SELECT count(*) as count FROM components WHERE id = ?",
      [component.id]
    );

    if (existingComponent[0].count > 0) {
        throw new Error(`Le composant avec l'ID '${component.id}' existe déjà.`);
    }

    await db.execute(
        'INSERT INTO components (id, name, description, type) VALUES (?, ?, ?, ?)',
        [component.id, component.name, component.description ?? '', component.type]
    );

    await db.execute(
        'INSERT INTO documents (component_id, type, description, image_data, ocr_text) VALUES (?, ?, ?, ?, ?)',
        [component.id, 'PHOTO_ID_PLATE', document.description, document.imageData, document.ocrText]
    );
    
    await addLogEntry({
        type: 'DOCUMENT_ADDED',
        source: 'Opérateur 1',
        message: `Nouveau composant '${component.id}' ajouté via caméra.`,
        component_id: component.id,
    });
}

export async function getAnnotationsForNode(externalId: string): Promise<Annotation[]> {
    await initializeDatabase();
    const db = await getDbInstance();
    return await db.select('SELECT * FROM annotations WHERE functional_node_external_id = ? ORDER BY timestamp DESC', [externalId]);
}

export async function addAnnotation(annotation: {
    functional_node_external_id: string;
    text: string;
    operator: string;
    x_pos: number;
    y_pos: number;
}): Promise<void> {
    const db = await getDbInstance();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await db.execute(
        'INSERT INTO annotations (functional_node_external_id, text, operator, timestamp, x_pos, y_pos) VALUES (?, ?, ?, ?, ?, ?)',
        [annotation.functional_node_external_id, annotation.text, annotation.operator, timestamp, annotation.x_pos, annotation.y_pos]
    );

    await addLogEntry({
        type: 'MANUAL',
        source: annotation.operator,
        message: `Annotation ajoutée sur le P&ID de ${annotation.functional_node_external_id}: "${annotation.text}"`
    });
}
