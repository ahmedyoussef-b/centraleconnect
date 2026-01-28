import { invoke } from '@tauri-apps/api/tauri';
import type { 
  Equipment,
  LogEntry, 
  LogEntryType, 
  Parameter, 
  Alarm,
  Annotation,
  Document,
  SynopticItem
} from '@/types/db';

// Import JSON data which will be bundled by the build process
import componentsData from '@/assets/master-data/components.json';
import parameterData from '@/assets/master-data/parameters.json';
import alarmData from '@/assets/master-data/alarms.json';
import manifest from '@/assets/master-data/manifest.json';
import pidAssetsData from '@/assets/master-data/pid-assets.json';
import groupsData from '@/assets/master-data/groups.json';
import b0Data from '@/assets/master-data/B0.json';
import b1Data from '@/assets/master-data/B1.json';
import b2Data from '@/assets/master-data/B2.json';
import b3Data from '@/assets/master-data/B3.json';

const DB_NAME = 'ccpp.db';
let isInitialized = false;

const CREATE_TABLES_SQL = `
BEGIN;

CREATE TABLE IF NOT EXISTS equipments (
    externalId TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parentId TEXT,
    type TEXT,
    subtype TEXT,
    systemCode TEXT,
    subSystem TEXT,
    location TEXT,
    manufacturer TEXT,
    serialNumber TEXT,
    tagNumber TEXT UNIQUE,
    documentRef TEXT,
    coordinates TEXT,
    svgLayer TEXT,
    fireZone TEXT,
    linkedParameters TEXT,
    status TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    isImmutable BOOLEAN NOT NULL DEFAULT 0,
    approvedBy TEXT,
    approvedAt TEXT,
    checksum TEXT UNIQUE,
    nominalData TEXT,
    FOREIGN KEY (parentId) REFERENCES equipments(externalId)
);

CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipmentId TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    dataType TEXT NOT NULL DEFAULT 'TEXT',
    nominalValue REAL,
    minSafe REAL,
    maxSafe REAL,
    warningHigh REAL,
    alarmHigh REAL,
    alarmLow REAL,
    standardRef TEXT,
    FOREIGN KEY (equipmentId) REFERENCES equipments(externalId),
    UNIQUE(equipmentId, name)
);

CREATE TABLE IF NOT EXISTS alarms (
    code TEXT PRIMARY KEY NOT NULL,
    equipmentId TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')) NOT NULL,
    description TEXT NOT NULL,
    parameter TEXT,
    resetProcedure TEXT,
    standardRef TEXT,
    FOREIGN KEY (equipmentId) REFERENCES equipments(externalId)
);

CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    equipmentId TEXT,
    signature TEXT UNIQUE NOT NULL,
    FOREIGN KEY (equipmentId) REFERENCES equipments(externalId)
);

CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipmentId TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    xPos REAL NOT NULL,
    yPos REAL NOT NULL,
    FOREIGN KEY (equipmentId) REFERENCES equipments(externalId)
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipmentId TEXT NOT NULL,
    imageData TEXT NOT NULL,
    ocrText TEXT,
    description TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (equipmentId) REFERENCES equipments(externalId)
);

CREATE TABLE IF NOT EXISTS procedures (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT,
    steps TEXT
);

CREATE TABLE IF NOT EXISTS scada_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  equipmentId TEXT NOT NULL,
  value REAL NOT NULL,
  FOREIGN KEY (equipmentId) REFERENCES equipments(externalId)
);

CREATE TABLE IF NOT EXISTS alarm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alarmCode TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  isActive BOOLEAN NOT NULL,
  details TEXT,
  FOREIGN KEY (alarmCode) REFERENCES alarms(code)
);

CREATE TABLE IF NOT EXISTS synoptic_items (
    externalId TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    type TEXT,
    parentId TEXT,
    groupPath TEXT,
    elementId TEXT,
    level INTEGER,
    approvedBy TEXT,
    approvalDate TEXT
);

COMMIT;
`;

async function createEntrySignature(
  entryData: Omit<LogEntry, 'id' | 'signature'>,
  previousSignature: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${previousSignature}|${entryData.timestamp}|${entryData.type}|${entryData.source}|${entryData.message}|${entryData.equipmentId ?? ''}`
  );
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function seedDatabase(db: any): Promise<void> {
    const equipResult: { count: number }[] = await invoke('plugin:sql|select', { db, query: 'SELECT count(*) as count FROM equipments' });
    if (equipResult[0].count > 0) {
        console.log('Database already seeded.');
        return;
    }

    console.log('🌱 Seeding database...');

    // Seed Equipments from multiple sources
    const allEquipments = new Map<string, any>();

    // Process high-level components first
    for (const eq of componentsData as any[]) {
      allEquipments.set(eq.tag, {
        externalId: eq.tag,
        name: eq.name,
        type: eq.type,
        subtype: eq.subtype,
        manufacturer: eq.manufacturer,
        serialNumber: eq.serialNumber,
        location: eq.location,
        tagNumber: eq.tag,
      });
    }

    // Merge and add detailed data from B*.json files
    const detailedData = [...b0Data, ...b1Data, ...b2Data, ...b3Data, ...pidAssetsData.nodes];
    for (const item of detailedData as any[]) {
      const id = item.external_id || item.tag;
      if (!id) continue;
      
      const existing = allEquipments.get(id) || { externalId: id };
      
      allEquipments.set(id, {
        ...existing,
        name: item.name || item.label_fr || existing.name,
        description: item.description || existing.description,
        type: item.type || existing.type,
        subtype: item.subtype || existing.subtype,
        systemCode: item.system || existing.systemCode,
        subSystem: item.subsystem || existing.subSystem,
        location: item.location || existing.location,
        tagNumber: item.tag || existing.tagNumber || id,
        documentRef: item.document || existing.documentRef,
        coordinates: JSON.stringify(item.coordinates) || existing.coordinates,
        svgLayer: item.svg_layer || existing.svgLayer,
        fireZone: item.fire_zone || existing.fireZone,
        linkedParameters: JSON.stringify(item.linked_parameters) || existing.linkedParameters,
        status: item.status || existing.status,
        approvedBy: item.approved_by || existing.approvedBy,
        approvedAt: item.approved_at || item.approval_date || existing.approvedAt,
        parameters: item.parameters || existing.parameters, // Store temporarily
      });
    }

    for (const equip of Array.from(allEquipments.values())) {
        await invoke('plugin:sql|execute', {
            db,
            query: 'INSERT INTO equipments (externalId, name, description, type, subtype, systemCode, subSystem, location, manufacturer, serialNumber, tagNumber, documentRef, coordinates, svgLayer, fireZone, linkedParameters, status, approvedBy, approvedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)',
            values: [equip.externalId, equip.name, equip.description, equip.type, equip.subtype, equip.systemCode, equip.subSystem, equip.location, equip.manufacturer, equip.serialNumber, equip.tagNumber, equip.documentRef, equip.coordinates, equip.svgLayer, equip.fireZone, equip.linkedParameters, equip.status, equip.approvedBy, equip.approvedAt]
        });

        // Seed nested parameters from B*.json
        if(equip.parameters && Array.isArray(equip.parameters)) {
            for(const param of equip.parameters) {
                await invoke('plugin:sql|execute', {
                    db,
                    query: 'INSERT OR IGNORE INTO parameters (equipmentId, name, unit, nominalValue, minSafe, maxSafe, alarmHigh, alarmLow) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    values: [equip.externalId, param.name, param.unit, param.value, param.min, param.max, null, null]
                });
            }
        }
    }

    // Seed standalone parameters
    for (const param of parameterData as any[]) {
        await invoke('plugin:sql|execute', {
            db,
            query: 'INSERT OR IGNORE INTO parameters (equipmentId, name, unit, nominalValue, minSafe, maxSafe, alarmHigh, alarmLow, standardRef) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            values: [param.componentTag, param.name, param.unit, param.nominalValue, param.minSafe, param.maxSafe, param.alarmHigh, param.alarmLow, param.standardRef]
        });
    }

    // Seed Alarms
    for (const alarm of alarmData as any[]) {
      await invoke('plugin:sql|execute', {
        db,
        query: 'INSERT OR IGNORE INTO alarms (code, equipmentId, severity, description, parameter, resetProcedure, standardRef) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        values: [alarm.code, alarm.componentTag, alarm.severity, alarm.message, alarm.parameter, alarm.reset_procedure, alarm.standardRef]
      });
    }

    // Seed Synoptic Items
    for (const item of groupsData as any[]) {
        await invoke('plugin:sql|execute', {
            db,
            query: 'INSERT INTO synoptic_items (externalId, name, type, parentId, groupPath, elementId, level, approvedBy, approvalDate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            values: [item.external_id, item.name, item.type, item.parent_id, item.group_path, item.element_id, item.level, item.approved_by, item.approval_date]
        });
    }

    console.log('✅ Database seeded successfully.');
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
    // Seed database before adding first log entry
    await seedDatabase(db);

    await addLogEntry({
      type: 'AUTO',
      source: 'SYSTEM',
      message: 'Premier démarrage du journal de bord. Base de données initialisée.',
    });
    await addLogEntry({
        type: 'AUTO',
        source: 'SYSTEM',
        message: `Intégrité des fichiers maîtres v${manifest.version || '1.0.0'} vérifiée.`,
    });
  }
  
  await addLogEntry({
      type: 'AUTO',
      source: 'SYSTEM',
      message: 'Application démarrée.',
  });

  console.log('✅ Database initialized successfully.');
  isInitialized = true;
}

export async function getFunctionalNodes(): Promise<Equipment[]> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return [];

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const nodes: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM equipments' });
    return nodes.map(node => ({
        ...node,
        coordinates: JSON.parse(node.coordinates || '{}'),
        linkedParameters: JSON.parse(node.linkedParameters || '[]'),
    }));
}

export async function getFunctionalNodeById(id: string): Promise<Equipment | null> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return null;
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const result: any[] = await invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM equipments WHERE externalId = $1 LIMIT 1',
    values: [id]
  });
  if (result.length === 0) return null;
  const node = result[0];
  return {
    ...node,
    coordinates: JSON.parse(node.coordinates || '{}'),
    linkedParameters: JSON.parse(node.linkedParameters || '[]'),
  };
}

export async function getParametersForComponent(tag: string): Promise<Parameter[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM parameters WHERE equipmentId = $1 ORDER BY name',
    values: [tag]
  });
}

export async function getAssistantContextData(): Promise<any> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return {};

    const [equipments, parameters, alarms] = await Promise.all([
        getFunctionalNodes(), // This now gets all equipments
        invoke('plugin:sql|load', { db: DB_NAME }).then(db => invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' })),
        invoke('plugin:sql|load', { db: DB_NAME }).then(db => invoke('plugin:sql|select', { db, query: 'SELECT * FROM alarms' })),
    ]);
    return { equipments, parameters, alarms };
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
    query: 'SELECT * FROM log_entries WHERE equipmentId = $1 ORDER BY timestamp DESC',
    values: [nodeId]
  });
}

export async function addLogEntry(entry: {
  type: LogEntryType;
  source: string;
  message: string;
  equipmentId?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI__) return;

  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const lastEntry: { signature: string }[] = await invoke('plugin:sql|select', {
    db,
    query: 'SELECT signature FROM log_entries ORDER BY timestamp DESC LIMIT 1'
  });
  
  const previousSignature = lastEntry[0]?.signature ?? 'GENESIS';
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newEntryData = { ...entry, timestamp: timestamp };

  const signature = await createEntrySignature(newEntryData, previousSignature);

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO log_entries (timestamp, type, source, message, equipmentId, signature) VALUES ($1, $2, $3, $4, $5, $6)',
    values: [timestamp, entry.type, entry.source, entry.message, entry.equipmentId || null, signature],
  });
}

export async function addComponentAndDocument(
  component: Pick<Equipment, 'externalId' | 'name' | 'type'>,
  document: { imageData: string; ocrText: string; description: string }
): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI__) return;

  const db = await invoke('plugin:sql|load', { db: DB_NAME });

  const existing: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT 1 FROM equipments WHERE externalId = $1', values: [component.externalId]});
  if (existing.length > 0) {
      throw new Error(`L'équipement avec l'ID '${component.externalId}' existe déjà.`);
  }

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO equipments (externalId, name, type, tagNumber) VALUES ($1, $2, $3, $4)',
    values: [component.externalId, component.name, component.type, component.externalId]
  });

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO documents (equipmentId, imageData, ocrText, description, createdAt) VALUES ($1, $2, $3, $4, $5)',
    values: [component.externalId, document.imageData, document.ocrText, document.description, new Date().toISOString()]
  });

  await addLogEntry({
    type: 'DOCUMENT_ADDED',
    source: 'Provisioning',
    message: `Nouvel équipement '${component.externalId}' ajouté via caméra.`,
    equipmentId: component.externalId,
  });
}

export async function getAnnotationsForNode(externalId: string): Promise<Annotation[]> {
    await initializeDatabase();
    if (typeof window === 'undefined' || !window.__TAURI__) return [];

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    return invoke('plugin:sql|select', { 
        db, 
        query: 'SELECT * FROM annotations WHERE equipmentId = $1 ORDER BY timestamp DESC',
        values: [externalId]
    });
}

export async function addAnnotation(annotation: {
  equipmentId: string;
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
        query: 'INSERT INTO annotations (equipmentId, text, operator, timestamp, xPos, yPos) VALUES ($1, $2, $3, $4, $5, $6)',
        values: [annotation.equipmentId, annotation.text, annotation.operator, timestamp, annotation.x_pos, annotation.y_pos]
    });

    await addLogEntry({
      type: 'MANUAL',
      source: annotation.operator,
      message: `Annotation ajoutée sur le P&ID de ${annotation.equipmentId}: "${annotation.text}"`,
      equipmentId: annotation.equipmentId,
    });
}

export async function getDocumentsForComponent(tag: string): Promise<Document[]> {
  await initializeDatabase();
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM documents WHERE equipmentId = $1 ORDER BY createdAt DESC',
    values: [tag]
  });
}

// Ensure database is initialized on load
if (typeof window !== 'undefined' && window.__TAURI__) {
  initializeDatabase().catch(console.error);
}
