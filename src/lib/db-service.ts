import { invoke } from '@tauri-apps/api/tauri';
import type { 
  Equipment,
  LogEntry, 
  LogEntryType, 
  Parameter, 
  Annotation,
  Document
} from '@/types/db';

const DB_NAME = 'ccpp.db';
let isInitialized = false;

// This SQL schema MUST be kept in sync with `prisma/schema.prisma`
const CREATE_TABLES_SQL = `
BEGIN;
CREATE TABLE IF NOT EXISTS equipments (
    external_id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,
    type TEXT,
    subtype TEXT,
    system_code TEXT,
    sub_system TEXT,
    location TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    document_ref TEXT,
    coordinates TEXT,
    svg_layer TEXT,
    fire_zone TEXT,
    linked_parameters TEXT,
    status TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    is_immutable BOOLEAN NOT NULL DEFAULT 0,
    approved_by TEXT,
    approved_at TEXT,
    checksum TEXT UNIQUE,
    nominal_data TEXT
);
CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT,
    data_type TEXT NOT NULL DEFAULT 'TEXT',
    nominal_value REAL,
    min_safe REAL,
    max_safe REAL,
    warning_high REAL,
    alarm_high REAL,
    alarm_low REAL,
    standard_ref TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS alarms (
    code TEXT PRIMARY KEY NOT NULL,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')) NOT NULL,
    description TEXT NOT NULL,
    parameter TEXT,
    reset_procedure TEXT,
    standard_ref TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    signature TEXT UNIQUE NOT NULL,
    equipment_id TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS alarm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  is_active BOOLEAN NOT NULL,
  details TEXT,
  alarm_code TEXT NOT NULL,
  FOREIGN KEY (alarm_code) REFERENCES alarms(code)
);
CREATE TABLE IF NOT EXISTS scada_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  value REAL NOT NULL,
  equipment_id TEXT NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_data TEXT NOT NULL,
    ocr_text TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id)
);
CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  steps TEXT
);
CREATE TABLE IF NOT EXISTS synoptic_items (
    external_id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    type TEXT,
    parent_id TEXT,
    group_path TEXT,
    element_id TEXT,
    level INTEGER,
    approved_by TEXT,
    approval_date TEXT
);
COMMIT;
`;

async function createEntrySignature(
  entryData: { timestamp: string; type: string; source: string; message: string; equipmentId: string | null; },
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


export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  if (typeof window === 'undefined' || !window.__TAURI__) {
      console.warn("Not in a Tauri environment, database initialization skipped.");
      return;
  }

  console.log('🚀 Initializing database connection...');
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  await invoke('plugin:sql|execute', { db, query: CREATE_TABLES_SQL });
  
  const logResult: { count: number }[] = await invoke('plugin:sql|select', { db, query: 'SELECT count(*) as count FROM log_entries' });
  if (logResult[0].count === 0) {
      console.warn("Database is empty. Please run 'npm run db:seed' to populate it with master data.");
  }
  
  isInitialized = true;
  console.log('✅ Database connection initialized.');
}

export async function getEquipments(): Promise<Equipment[]> {
    if (typeof window === 'undefined' || !window.__TAURI__) return [];
    await initializeDatabase();
    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const nodes: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM equipments' });
    return nodes.map(node => ({
        ...node,
        externalId: node.external_id,
        systemCode: node.system_code,
        subSystem: node.sub_system,
        serialNumber: node.serial_number,
        documentRef: node.document_ref,
        svgLayer: node.svg_layer,
        fireZone: node.fire_zone,
        linkedParameters: JSON.parse(node.linked_parameters || '[]'),
        isImmutable: !!node.is_immutable,
        approvedBy: node.approved_by,
        approvedAt: node.approved_at,
        nominalData: JSON.parse(node.nominal_data || '{}'),
        coordinates: JSON.parse(node.coordinates || '{}'),
    }));
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  if (typeof window === 'undefined' || !window.__TAURI__) return null;
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const result: any[] = await invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM equipments WHERE external_id = $1 LIMIT 1',
    values: [id]
  });
  if (result.length === 0) return null;
  const node = result[0];
   return {
        ...node,
        externalId: node.external_id,
        systemCode: node.system_code,
        subSystem: node.sub_system,
        serialNumber: node.serial_number,
        documentRef: node.document_ref,
        svgLayer: node.svg_layer,
        fireZone: node.fire_zone,
        linkedParameters: JSON.parse(node.linked_parameters || '[]'),
        isImmutable: !!node.is_immutable,
        approvedBy: node.approved_by,
        approvedAt: node.approved_at,
        nominalData: JSON.parse(node.nominal_data || '{}'),
        coordinates: JSON.parse(node.coordinates || '{}'),
    };
}

export async function getParametersForComponent(equipmentId: string): Promise<Parameter[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM parameters WHERE equipment_id = $1 ORDER BY name',
    values: [equipmentId]
  });
}

export async function getParameters(): Promise<Parameter[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  return invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' });
}


export async function getAssistantContextData(): Promise<any> {
    if (typeof window === 'undefined' || !window.__TAURI__) return {};
    await initializeDatabase();

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const [equipments, parameters, alarms] = await Promise.all([
        getEquipments(),
        invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' }),
        invoke('plugin:sql|select', { db, query: 'SELECT * FROM alarms' }),
    ]);
    return { equipments, parameters, alarms };
}

export async function getLogEntries(): Promise<LogEntry[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const entries: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM log_entries ORDER BY timestamp DESC' });
  return entries.map(e => ({...e, equipmentId: e.equipment_id}));
}

export async function getLogEntriesForNode(equipmentId: string): Promise<LogEntry[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const entries: any[] = await invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM log_entries WHERE equipment_id = $1 ORDER BY timestamp DESC',
    values: [equipmentId]
  });
  return entries.map(e => ({...e, equipmentId: e.equipment_id}));
}

export async function addLogEntry(entry: {
  type: LogEntryType;
  source: string;
  message: string;
  equipmentId?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI__) return;
  await initializeDatabase();

  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const lastEntry: { signature: string }[] = await invoke('plugin:sql|select', {
    db,
    query: 'SELECT signature FROM log_entries ORDER BY timestamp DESC LIMIT 1'
  });
  
  const previousSignature = lastEntry[0]?.signature ?? 'GENESIS';
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const newEntryData = { ...entry, equipmentId: entry.equipmentId || null, timestamp };

  const signature = await createEntrySignature(newEntryData, previousSignature);

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO log_entries (timestamp, type, source, message, equipment_id, signature) VALUES ($1, $2, $3, $4, $5, $6)',
    values: [timestamp, entry.type, entry.source, entry.message, entry.equipmentId || null, signature],
  });
}

export async function addComponentAndDocument(
  component: Pick<Equipment, 'externalId' | 'name' | 'type'>,
  document: { imageData: string; ocrText: string; description: string }
): Promise<void> {
  if (typeof window === 'undefined' || !window.__TAURI__) return;
  await initializeDatabase();

  const db = await invoke('plugin:sql|load', { db: DB_NAME });

  const existing: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT 1 FROM equipments WHERE external_id = $1', values: [component.externalId]});
  if (existing.length > 0) {
      throw new Error(`L'équipement avec l'ID '${component.externalId}' existe déjà.`);
  }

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO equipments (external_id, name, type) VALUES ($1, $2, $3)',
    values: [component.externalId, component.name, component.type]
  });

  await invoke('plugin:sql|execute', {
    db,
    query: 'INSERT INTO documents (equipment_id, image_data, ocr_text, description, created_at) VALUES ($1, $2, $3, $4, $5)',
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
    if (typeof window === 'undefined' || !window.__TAURI__) return [];
    await initializeDatabase();

    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const annotations: any[] = await invoke('plugin:sql|select', { 
        db, 
        query: 'SELECT * FROM annotations WHERE equipment_id = $1 ORDER BY timestamp DESC',
        values: [externalId]
    });
    return annotations.map(a => ({
      ...a,
      equipmentId: a.equipment_id,
      xPos: a.x_pos,
      yPos: a.y_pos,
    }));
}

export async function addAnnotation(annotation: {
  equipmentId: string;
  text: string;
  operator: string;
  xPos: number;
  yPos: number;
}): Promise<void> {
    if (typeof window === 'undefined' || !window.__TAURI__) return;
    await initializeDatabase();
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    const db = await invoke('plugin:sql|load', { db: DB_NAME });

    await invoke('plugin:sql|execute', {
        db,
        query: 'INSERT INTO annotations (equipment_id, text, operator, timestamp, x_pos, y_pos) VALUES ($1, $2, $3, $4, $5, $6)',
        values: [annotation.equipmentId, annotation.text, annotation.operator, timestamp, annotation.xPos, annotation.yPos]
    });

    await addLogEntry({
      type: 'MANUAL',
      source: annotation.operator,
      message: `Annotation ajoutée sur le P&ID de ${annotation.equipmentId}: "${annotation.text}"`,
      equipmentId: annotation.equipmentId,
    });
}

export async function getDocumentsForComponent(equipmentId: string): Promise<Document[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return [];
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const docs: any[] = await invoke('plugin:sql|select', { 
    db, 
    query: 'SELECT * FROM documents WHERE equipment_id = $1 ORDER BY created_at DESC',
    values: [equipmentId]
  });
  return docs.map(d => ({
    ...d,
    equipmentId: d.equipment_id,
    imageData: d.image_data,
    ocrText: d.ocr_text,
    createdAt: d.created_at,
  }));
}

// Ensure database is initialized on load
if (typeof window !== 'undefined' && window.__TAURI__) {
  initializeDatabase().catch(console.error);
}
