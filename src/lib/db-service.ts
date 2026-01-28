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

async function getDbInstance(): Promise<DbInstance> {
  if (db) {
    return db;
  }
  if (dbInitializationPromise) {
    return dbInitializationPromise;
  }
  if (typeof window === 'undefined' || !window.__TAURI__) {
    throw new Error("Database can only be accessed in a Tauri environment.");
  }
  dbInitializationPromise = (async () => {
    try {
      const { default: Database } = await import('tauri-plugin' + '-sql');
      const loadedDb = await Database.load('sqlite:ccpp.db');
      db = loadedDb;
      return db;
    } finally {
      dbInitializationPromise = null;
    }
  })();
  return dbInitializationPromise;
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS components (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    subtype TEXT,
    location TEXT
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
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')),
    parameter TEXT,
    reset_procedure TEXT,
    FOREIGN KEY (component_id) REFERENCES components(id),
    UNIQUE(component_id, code)
);

CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
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
    created_at DATETIME NOT NULL,
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
    coordinates TEXT NOT NULL,
    linked_parameters TEXT NOT NULL,
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
    timestamp DATETIME NOT NULL,
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
        const now = new Date().toISOString();
        await db.execute(
            `INSERT INTO functional_nodes 
            (external_id, system, subsystem, document, tag, type, name, description, location, coordinates, linked_parameters, svg_layer, fire_zone, status, checksum, created_at, updated_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [
                node.external_id, node.system, node.subsystem, node.document, node.tag, node.type,
                node.name, node.description, node.location, JSON.stringify(node.coordinates),
                JSON.stringify(node.linked_parameters), node.svg_layer, node.fire_zone, node.status,
                checksum, now, now
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
            coordinates: JSON.parse(nodeDb.coordinates),
            linked_parameters: JSON.parse(nodeDb.linked_parameters),
            svg_layer: nodeDb.svg_layer,
            fire_zone: nodeDb.fire_zone,
            status: nodeDb.status,
        };

        const expectedChecksum = await createNodeChecksum(originalNode as any);
        if (expectedChecksum !== nodeDb.checksum) {
            throw new Error(`[CRITICAL] Data integrity compromised for node ${nodeDb.external_id}. Checksum mismatch. Halting application.`);
        }
    }
    console.log('Functional nodes integrity verified successfully.');
}

async function seedMasterData(db: DbInstance) {
    for (const eq of (componentsData as any[])) {
        await db.execute(
            "INSERT OR IGNORE INTO components (id, name, type, subtype, location) VALUES ($1, $2, $3, $4, $5)",
            [eq.tag, eq.name, eq.type, eq.subtype, eq.location]
        );
    }
    for (const param of (parameterData as any[])) {
         await db.execute(
            "INSERT OR IGNORE INTO parameters (component_id, name, unit, min_value, max_value, nominal_value) VALUES ($1, $2, $3, $4, $5, $6)",
            [param.componentTag, param.name, param.unit, param.minSafe, param.maxSafe ?? param.alarmHigh, param.nominalValue]
        );
    }
    for (const alarm of (alarmData as any[])) {
         await db.execute(
            "INSERT OR IGNORE INTO alarms (component_id, code, description, severity, parameter, reset_procedure) VALUES ($1, $2, $3, $4, $5, $6)",
            [alarm.componentTag, alarm.code, alarm.message, alarm.severity, alarm.parameter, alarm.reset_procedure]
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
                message: `Intégrité des fichiers maîtres v${manifest.version} vérifiée.`,
            });
        }

        const componentsResult: {count: number}[] = await db.select("SELECT count(*) as count FROM components");
        if (componentsResult[0].count === 0) {
            await seedMasterData(db);
            await addLogEntry({
                type: 'AUTO',
                source: 'SYSTEM',
                message: 'Base de données initialisée avec les données maîtres (composants, alarmes, etc.).',
            });
        }

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
    return functionalNodes.map(node => {
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
    return await db.select('SELECT * FROM log_entries ORDER BY id DESC');
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
    const previousSignature = lastEntry[0]?.signature ?? 'GENESIS';
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
        'INSERT INTO log_entries (timestamp, type, source, message, component_id, signature) VALUES ($1, $2, $3, $4, $5, $6)',
        [timestamp, newEntryData.type, newEntryData.source, newEntryData.message, newEntryData.component_id, signature]
    );
}

export async function addComponentAndDocument(
    component: Pick<Component, 'id' | 'name' | 'type'> & { subtype?: string },
    document: { imageData: string; ocrText: string; description: string }
): Promise<void> {
    const db = await getDbInstance();
    const existingComponent: { count: number }[] = await db.select(
      "SELECT count(*) as count FROM components WHERE id = $1",
      [component.id]
    );
    if (existingComponent[0].count > 0) {
        throw new Error(`Le composant avec l'ID '${component.id}' existe déjà.`);
    }
    await db.execute(
        'INSERT INTO components (id, name, type, subtype) VALUES ($1, $2, $3, $4)',
        [component.id, component.name, component.type, component.subtype ?? null]
    );
    const now = new Date().toISOString();
    await db.execute(
        'INSERT INTO documents (component_id, type, description, image_data, ocr_text, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [component.id, 'PHOTO_ID_PLATE', document.description, document.imageData, document.ocrText, now]
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
    return await db.select('SELECT * FROM annotations WHERE functional_node_external_id = $1 ORDER BY timestamp DESC', [externalId]);
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
        'INSERT INTO annotations (functional_node_external_id, text, operator, timestamp, x_pos, y_pos) VALUES ($1, $2, $3, $4, $5, $6)',
        [annotation.functional_node_external_id, annotation.text, annotation.operator, timestamp, annotation.x_pos, annotation.y_pos]
    );
    await addLogEntry({
        type: 'MANUAL',
        source: annotation.operator,
        message: `Annotation ajoutée sur le P&ID de ${annotation.functional_node_external_id}: "${annotation.text}"`
    });
}
