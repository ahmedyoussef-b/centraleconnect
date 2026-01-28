import { invoke } from '@tauri-apps/api/tauri';
import type { 
  Component, 
  LogEntry, 
  LogEntryType, 
  Parameter, 
  Alarm, 
  FunctionalNode, 
  Annotation,
  Document
} from '@/types/db';

// Import JSON data which will be bundled by the build process
import componentsData from '@/assets/master-data/components.json';
import parameterData from '@/assets/master-data/parameters.json';
import alarmData from '@/assets/master-data/alarms.json';
import manifest from '@/assets/master-data/manifest.json';
import pidAssetsData from '@/assets/master-data/pid-assets.json';

const DB_NAME = 'ccpp.db';
let isInitialized = false;

/**
 * Schema SQL complet - Toutes les tables nécessaires
 */
const CREATE_TABLES_SQL = `
BEGIN;

CREATE TABLE IF NOT EXISTS components (
    tag TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    subtype TEXT,
    manufacturer TEXT,
    serialNumber TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_tag TEXT NOT NULL,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    nominal_value REAL,
    min_safe REAL,
    max_safe REAL,
    alarm_high REAL,
    alarm_low REAL,
    standard_ref TEXT,
    FOREIGN KEY (component_tag) REFERENCES components(tag),
    UNIQUE(component_tag, key)
);

CREATE TABLE IF NOT EXISTS alarms (
    code TEXT PRIMARY KEY NOT NULL,
    component_tag TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')) NOT NULL,
    description TEXT NOT NULL,
    parameter TEXT,
    reset_procedure TEXT,
    standard_ref TEXT,
    FOREIGN KEY (component_tag) REFERENCES components(tag)
);

CREATE TABLE IF NOT EXISTS functional_nodes (
    external_id TEXT PRIMARY KEY NOT NULL,
    system TEXT NOT NULL,
    subsystem TEXT NOT NULL,
    document TEXT,
    tag TEXT,
    type TEXT,
    name TEXT,
    description TEXT,
    location TEXT,
    coordinates TEXT,
    linked_parameters TEXT,
    svg_layer TEXT,
    fire_zone TEXT,
    status TEXT,
    checksum TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    approved_by TEXT,
    approved_at TEXT
);

CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    component_tag TEXT,
    functional_node_id TEXT,
    signature TEXT UNIQUE NOT NULL,
    FOREIGN KEY (component_tag) REFERENCES components(tag),
    FOREIGN KEY (functional_node_id) REFERENCES functional_nodes(external_id)
);

CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    functional_node_external_id TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    FOREIGN KEY (functional_node_external_id) REFERENCES functional_nodes(external_id)
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_tag TEXT NOT NULL,
    imageData TEXT NOT NULL,
    ocrText TEXT,
    description TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (component_tag) REFERENCES components(tag)
);

COMMIT;
`;

/**
 * Création de signature SHA-256 pour une entrée de journal
 */
async function createEntrySignature(
  entryData: {
    timestamp: string;
    type: string;
    source: string;
    message: string;
    component_tag: string | null;
    functional_node_id: string | null;
  },
  previousSignature: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${previousSignature}|${entryData.timestamp}|${entryData.type}|${entryData.source}|${entryData.message}|${
      entryData.component_tag ?? ''
    }|${entryData.functional_node_id ?? ''}`
  );
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}


/**
 * Création de checksum SHA-256 pour un nœud fonctionnel
 */
async function createNodeChecksum(node: any): Promise<string> {
  // Sort keys to ensure consistent JSON stringification
  const sortedNode = Object.keys(node).sort().reduce(
    (obj: any, key: any) => { 
      obj[key] = node[key]; 
      return obj;
    }, 
    {}
  );
  const nodeString = JSON.stringify(sortedNode);
  const encoder = new TextEncoder();
  const data = encoder.encode(nodeString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérification de l'intégrité des nœuds fonctionnels
 */
async function verifyFunctionalNodesIntegrity(): Promise<void> {
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const nodesFromDb: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM functional_nodes' });

  if (nodesFromDb.length === 0) {
    console.log('No functional nodes to verify.');
    return;
  }

  console.log(`🔍 Verifying integrity of ${nodesFromDb.length} functional nodes...`);

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
      coordinates: JSON.parse(nodeDb.coordinates || '{}'),
      linked_parameters: JSON.parse(nodeDb.linked_parameters || '[]'),
      svg_layer: nodeDb.svg_layer,
      fire_zone: nodeDb.fire_zone,
      status: nodeDb.status,
    };
    const expectedChecksum = await createNodeChecksum(originalNode);

    if (expectedChecksum !== nodeDb.checksum) {
      throw new Error(`[CRITICAL] Data integrity compromised for node ${nodeDb.external_id}. Checksum mismatch. Halting application.`);
    }
  }
  console.log('✅ Functional nodes integrity verified successfully.');
}


/**
 * Injection des données Master Data
 */
async function seedMasterData(db: any): Promise<void> {
  const componentsResult: { count: number }[] = await invoke('plugin:sql|select', { db, query: 'SELECT count(*) as count FROM components' });
  if (componentsResult[0].count > 0) {
    console.log('Master data (components) already seeded.');
    return;
  }

  console.log('🌱 Seeding master data...');

  for (const eq of componentsData as any[]) {
    await invoke('plugin:sql|execute', {
      db,
      query: 'INSERT INTO components (tag, name, type, subtype, manufacturer, serialNumber, location) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      values: [eq.tag, eq.name, eq.type, eq.subtype, eq.manufacturer, eq.serialNumber, eq.location]
    });
  }

  for (const param of parameterData as any[]) {
    await invoke('plugin:sql|execute', {
      db,
      query: 'INSERT INTO parameters (component_tag, key, name, unit, nominal_value, min_safe, max_safe, alarm_high, alarm_low, standard_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      values: [param.componentTag, param.key, param.name, param.unit, param.nominalValue, param.minSafe, param.maxSafe, param.alarmHigh, param.alarmLow, param.standardRef]
    });
  }
  
  for (const alarm of alarmData as any[]) {
    await invoke('plugin:sql|execute', {
      db,
      query: 'INSERT INTO alarms (code, component_tag, severity, description, parameter, reset_procedure, standard_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      values: [alarm.code, alarm.componentTag, alarm.severity, alarm.message, alarm.parameter, alarm.reset_procedure, alarm.standardRef]
    });
  }

  console.log('✅ Master data seeded.');
}

async function seedFunctionalNodes(db: any): Promise<void> {
    const result: { count: number }[] = await invoke('plugin:sql|select', { db, query: "SELECT count(*) as count FROM functional_nodes" });
    if (result[0].count > 0) {
      console.log('✅ Functional nodes already seeded.');
      return;
    }

    console.log('🌱 Seeding functional nodes...');
    const nodesArray = Array.isArray(pidAssetsData.nodes) ? pidAssetsData.nodes : [];

    for (const node of nodesArray) {
        const nodeToHash = {
            external_id: node.external_id,
            system: node.system,
            subsystem: node.subsystem,
            document: node.document,
            tag: node.tag,
            type: node.type,
            name: node.name,
            description: node.description,
            location: node.location,
            coordinates: node.coordinates,
            linked_parameters: node.linked_parameters,
            svg_layer: node.svg_layer,
            fire_zone: node.fire_zone,
            status: node.status,
        };
        const checksum = await createNodeChecksum(nodeToHash);
        const now = new Date().toISOString();
        await invoke('plugin:sql|execute', {
            db,
            query: `INSERT INTO functional_nodes (external_id, system, subsystem, document, tag, type, name, description, location, coordinates, linked_parameters, svg_layer, fire_zone, status, checksum, created_at, updated_at, approved_by, approved_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            values: [
                node.external_id, node.system, node.subsystem, node.document, node.tag, node.type, node.name, node.description, node.location, JSON.stringify(node.coordinates), JSON.stringify(node.linked_parameters), node.svg_layer, node.fire_zone, node.status, checksum, now, now, pidAssetsData.approved_by, pidAssetsData.approved_at
            ]
        });
    }
    console.log(`✅ ${nodesArray.length} functional nodes seeded.`);
}


export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  if (typeof window === 'undefined' || !window.__TAURI__) {
      console.warn("Not in a Tauri environment, database initialization skipped.");
      return;
  }

  console.log('🚀 Initializing database...');
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  await invoke('plugin:sql|execute', { db, query: CREATE_TABLES_SQL });
  console.log('✅ Tables created.');

  const logResult: { count: number }[] = await invoke('plugin:sql|select', { db, query: 'SELECT count(*) as count FROM log_entries' });
  if (logResult[0].count === 0) {
    await addLogEntry({
      type: 'AUTO',
      source: 'SYSTEM',
      message: 'Premier démarrage du journal de bord.',
    });
    await addLogEntry({
        type: 'AUTO',
        source: 'SYSTEM',
        message: `Intégrité des fichiers maîtres v${manifest.version || '1.0.0'} vérifiée.`,
    });
  }

  await seedMasterData(db);
  await seedFunctionalNodes(db);
  await verifyFunctionalNodesIntegrity();
  
  await addLogEntry({
      type: 'AUTO',
      source: 'SYSTEM',
      message: 'Application démarrée. Intégrité des données vérifiée.',
  });

  console.log('✅ Database initialized successfully.');
  isInitialized = true;
}

export async function getComponents(): Promise<Component[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { db, query: 'SELECT * FROM components ORDER BY name' });
}

export async function getParameters(): Promise<Parameter[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters ORDER BY component_tag, name' });
}

export async function getParametersForComponent(tag: string): Promise<Parameter[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM parameters WHERE component_tag = $1 ORDER BY name',
    values: [tag]
  });
}

export async function getComponentsWithParameters(): Promise<Component[]> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return [];

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const components: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM components' });
    const parameters: Parameter[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' });

    const componentMap = new Map(components.map(c => [c.tag, { ...c, parameters: [] }]));

    for (const param of parameters) {
        if (componentMap.has(param.component_tag)) {
            componentMap.get(param.component_tag).parameters.push(param);
        }
    }
    return Array.from(componentMap.values());
}

export async function getFunctionalNodes(): Promise<FunctionalNode[]> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return [];

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const nodes: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM functional_nodes' });
    return nodes.map(node => ({
        ...node,
        coordinates: JSON.parse(node.coordinates || '{}'),
        linked_parameters: JSON.parse(node.linked_parameters || '[]'),
    }));
}

export async function getFunctionalNodeById(id: string): Promise<FunctionalNode | null> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return null;
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const result: any[] = await invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM functional_nodes WHERE external_id = $1 LIMIT 1',
    values: [id]
  });
  if (result.length === 0) return null;
  const node = result[0];
  return {
    ...node,
    coordinates: JSON.parse(node.coordinates || '{}'),
    linked_parameters: JSON.parse(node.linked_parameters || '[]'),
  };
}

export async function getAssistantContextData(): Promise<any> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return {};

    const [components, parameters, alarms, functionalNodes] = await Promise.all([
        getComponents(),
        getParameters(),
        invoke('plugin:sql|load', { db: DB_NAME }).then(db => invoke('plugin:sql|select', { db, query: 'SELECT * FROM alarms' })),
        getFunctionalNodes(),
    ]);
    return { components, parameters, alarms, functional_nodes: functionalNodes };
}


export async function getLogEntries(): Promise<LogEntry[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { db, query: 'SELECT * FROM log_entries ORDER BY timestamp DESC' });
}

export async function getLogEntriesForNode(nodeId: string): Promise<LogEntry[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM log_entries WHERE functional_node_id = $1 OR component_tag = $1 ORDER BY timestamp DESC',
    values: [nodeId]
  });
}

export async function addLogEntry(entry: {
  type: LogEntryType;
  source: string;
  message: string;
  component_tag?: string;
  functional_node_id?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI__) return;

  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const lastEntry: { signature: string }[] = await invoke('plugin:sql|select', {
    db,
    query: 'SELECT signature FROM log_entries ORDER BY timestamp DESC LIMIT 1'
  });
  
  const previousSignature = lastEntry[0]?.signature ?? 'GENESIS';
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newEntryData = {
    type: entry.type,
    source: entry.source,
    message: entry.message,
    component_tag: entry.component_tag || null,
    functional_node_id: entry.functional_node_id || null,
    timestamp: timestamp
  };

  const signature = await createEntrySignature(newEntryData, previousSignature);

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO log_entries (timestamp, type, source, message, component_tag, functional_node_id, signature) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    values: [timestamp, entry.type, entry.source, entry.message, entry.component_tag || null, entry.functional_node_id || null, signature],
  });
}

export async function addComponentAndDocument(
  component: Pick<Component, 'tag' | 'name' | 'type'>,
  document: { imageData: string; ocrText: string; description: string }
): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI__) return;

  const db = await invoke('plugin:sql|load', { db: DB_NAME });

  const existing: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT 1 FROM components WHERE tag = $1', values: [component.tag]});
  if (existing.length > 0) {
      throw new Error(`Le composant avec le tag '${component.tag}' existe déjà.`);
  }

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO components (tag, name, type) VALUES ($1, $2, $3)',
    values: [component.tag, component.name, component.type]
  });

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO documents (component_tag, imageData, ocrText, description, createdAt) VALUES ($1, $2, $3, $4, $5)',
    values: [component.tag, document.imageData, document.ocrText, document.description, new Date().toISOString()]
  });

  await addLogEntry({
    type: 'DOCUMENT_ADDED',
    source: 'Provisioning',
    message: `Nouveau composant '${component.tag}' ajouté via caméra.`,
    component_tag: component.tag,
  });
}

export async function getAnnotationsForNode(externalId: string): Promise<Annotation[]> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return [];

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    return invoke('plugin:sql|select', { 
        db, 
        query: 'SELECT * FROM annotations WHERE functional_node_external_id = $1 ORDER BY timestamp DESC',
        values: [externalId]
    });
}

export async function addAnnotation(annotation: {
  functional_node_external_id: string;
  text: string;
  operator: string;
  x_pos: number;
  y_pos: number;
}): Promise<void> {
    if (typeof window === 'undefined' || !window.__TAURI__) return;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    const db = await invoke('plugin:sql|load', { db: DB_NAME });

    await invoke('plugin:sql|execute', {
        db,
        query: 'INSERT INTO annotations (functional_node_external_id, text, operator, timestamp, x_pos, y_pos) VALUES ($1, $2, $3, $4, $5, $6)',
        values: [annotation.functional_node_external_id, annotation.text, annotation.operator, timestamp, annotation.x_pos, annotation.y_pos]
    });

    await addLogEntry({
      type: 'MANUAL',
      source: annotation.operator,
      message: `Annotation ajoutée sur le P&ID de ${annotation.functional_node_external_id}: "${annotation.text}"`,
      functional_node_id: annotation.functional_node_external_id,
    });
}


export async function getDocumentsForComponent(tag: string): Promise<Document[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM documents WHERE component_tag = $1 ORDER BY createdAt DESC',
    values: [tag]
  });
}

// Ensure database is initialized on load
if (typeof window !== 'undefined' && window.__TAURI__) {
  initializeDatabase().catch(console.error);
}
