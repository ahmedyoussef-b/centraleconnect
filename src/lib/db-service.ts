
import { invoke } from '@tauri-apps/api/tauri';
import type { 
  Equipment,
  LogEntry, 
  LogEntryType, 
  Parameter, 
  Annotation,
  Document
} from '@/types/db';

// Client-side data imports
import equipmentComponentsData from '@/assets/master-data/components.json';
import equipmentPidAssetsData from '@/assets/master-data/pid-assets.json';
import equipmentB0Data from '@/assets/master-data/B0.json';
import equipmentB1Data from '@/assets/master-data/B1.json';
import equipmentB2Data from '@/assets/master-data/B2.json';
import equipmentB3Data from '@/assets/master-data/B3.json';
import equipmentTG1Data from '@/assets/master-data/TG1.json';
import equipmentTG2Data from '@/assets/master-data/TG2.json';
import allParameterData from '@/assets/master-data/parameters.json';


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
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS alarms (
    code TEXT PRIMARY KEY NOT NULL,
    severity TEXT CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')) NOT NULL,
    description TEXT NOT NULL,
    parameter TEXT,
    reset_procedure TEXT,
    standard_ref TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    signature TEXT UNIQUE NOT NULL,
    equipment_id TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS alarm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  is_active BOOLEAN NOT NULL,
  details TEXT,
  alarm_code TEXT NOT NULL,
  FOREIGN KEY (alarm_code) REFERENCES alarms(code) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS scada_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  value REAL NOT NULL,
  equipment_id TEXT NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_data TEXT NOT NULL,
    ocr_text TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    perceptual_hash TEXT,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
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

// --- Client-side Data Simulation ---
let clientSideEquipments: Equipment[] | null = null;
let clientSideParameters: Parameter[] | null = null;

function getClientSideData() {
    if (clientSideEquipments && clientSideParameters) {
        return { equipments: clientSideEquipments, parameters: clientSideParameters };
    }

    const allEquipmentsMap = new Map<string, any>();
    const detailedData = [...equipmentB0Data, ...equipmentB1Data, ...equipmentB2Data, ...equipmentB3Data, ...equipmentPidAssetsData.nodes, ...equipmentComponentsData, ...equipmentTG1Data, ...equipmentTG2Data];

    for (const item of detailedData as any[]) {
        const id = item.externalId || item.tag;
        if (!id) continue;
        
        const existing = allEquipmentsMap.get(id) || { externalId: id };
        
        const mergedItem = {
            ...existing,
            name: item.name || item.label_fr || existing.name || 'N/A',
            description: item.description || existing.description,
            type: item.type || existing.type,
            subtype: item.subtype || existing.subtype,
            parentId: item.parentId || item.parent_id || existing.parentId,
            systemCode: item.systemCode || item.system || existing.systemCode,
            subSystem: item.subsystem || existing.subSystem,
            location: item.location || existing.location,
            manufacturer: item.manufacturer || existing.manufacturer,
            serialNumber: item.serialNumber || existing.serialNumber,
            documentRef: item.document || existing.documentRef,
            coordinates: JSON.stringify(item.coordinates) || existing.coordinates,
            svgLayer: item.svg_layer || existing.svgLayer,
            fireZone: item.fire_zone || existing.fireZone,
            linkedParameters: JSON.stringify(item.linked_parameters) || existing.linkedParameters,
            status: item.status || existing.status || 'UNKNOWN',
            approvedBy: item.approved_by || item.approvedBy || existing.approvedBy,
            approvedAt: item.approved_at || item.approval_date || existing.approvedAt ? new Date(item.approved_at || item.approval_date || existing.approvedAt).toISOString() : undefined,
            parameters: item.parameters || existing.parameters,
        };
        allEquipmentsMap.set(id, mergedItem);
    }

    const finalEquipments: Equipment[] = [];
    const finalParameters: Parameter[] = [];

    for (const equip of Array.from(allEquipmentsMap.values())) {
        const { parameters, ...equipData } = equip;
        finalEquipments.push({ ...equipData, externalId: equip.externalId, version: 1, isImmutable: false });

        if(equip.parameters && Array.isArray(equip.parameters)) {
            for(const param of equip.parameters as any[]) {
                if (param.name) {
                    finalParameters.push({
                      equipmentId: equip.externalId,
                      name: param.name,
                      unit: param.unit,
                      nominalValue: typeof param.value === 'number' ? param.value : null,
                      minSafe: typeof param.min === 'number' ? param.min : null,
                      maxSafe: typeof param.max === 'number' ? param.max : null,
                    });
                }
            }
        }
    }
    
    for (const param of allParameterData as any[]) {
        finalParameters.push({
            equipmentId: param.componentTag,
            name: param.name,
            unit: param.unit,
            nominalValue: param.nominalValue,
            minSafe: param.minSafe,
            maxSafe: param.maxSafe,
            alarmHigh: param.alarmHigh,
            alarmLow: param.alarmLow,
            standardRef: param.standardRef,
        });
    }
    
    clientSideEquipments = finalEquipments;
    clientSideParameters = finalParameters;

    return { equipments: clientSideEquipments, parameters: clientSideParameters };
}
// --- End Client-side Data Simulation ---


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
  await invoke('plugin:sql|execute', { db, query: 'PRAGMA foreign_keys = ON;' });
  await invoke('plugin:sql|execute', { db, query: CREATE_TABLES_SQL });
  
  const logResult: { count: number }[] = await invoke('plugin:sql|select', { db, query: 'SELECT count(*) as count FROM log_entries' });
  if (logResult[0].count === 0) {
      console.warn("Database is empty. Please run 'npm run db:seed' to populate it with master data.");
  }
  
  isInitialized = true;
  console.log('✅ Database connection initialized.');
}

export async function getEquipments(): Promise<Equipment[]> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        await initializeDatabase();
        const db = await invoke('plugin:sql|load', { db: DB_NAME });
        const nodes: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM equipments' });
        return nodes.map(node => ({
            ...node,
            externalId: node.external_id,
            parentId: node.parent_id,
            systemCode: node.system_code,
            subSystem: node.sub_system,
            serialNumber: node.serial_number,
            tagNumber: node.tag_number,
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
    return Promise.resolve(getClientSideData().equipments);
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
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
            parentId: node.parent_id,
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
    const equipments = getClientSideData().equipments;
    return Promise.resolve(equipments.find(e => e.externalId === id) || null);
}

export async function getParametersForComponent(equipmentId: string): Promise<Parameter[]> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        await initializeDatabase();
        const db = await invoke('plugin:sql|load', { db: DB_NAME });
        return invoke('plugin:sql|select', { 
            db, 
            query: 'SELECT * FROM parameters WHERE equipment_id = $1 ORDER BY name',
            values: [equipmentId]
        });
    }
    const allParams = getClientSideData().parameters;
    return Promise.resolve(allParams.filter(p => p.equipmentId === equipmentId));
}

export async function getParameters(): Promise<Parameter[]> {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    await initializeDatabase();
    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    return invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' });
  }
  return Promise.resolve(getClientSideData().parameters);
}


export async function getAssistantContextData(): Promise<any> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        await initializeDatabase();
        const db = await invoke('plugin:sql|load', { db: DB_NAME });
        const [equipments, parameters, alarms] = await Promise.all([
            getEquipments(),
            invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' }),
            invoke('plugin:sql|select', { db, query: 'SELECT * FROM alarms' }),
        ]);
        return { equipments, parameters, alarms };
    }
    // For web, we can provide a subset of data or mock it if needed
    const { equipments, parameters } = getClientSideData();
    const alarmsData = (await import('@/assets/master-data/alarms.json')).default;
    return Promise.resolve({ equipments, parameters, alarms: alarmsData });
}

export async function getLogEntries(): Promise<LogEntry[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
  await initializeDatabase();
  const db = await invoke('plugin:sql|load', { db: DB_NAME });
  const entries: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT * FROM log_entries ORDER BY timestamp DESC' });
  return entries.map(e => ({...e, equipmentId: e.equipment_id}));
}

export async function getLogEntriesForNode(equipmentId: string): Promise<LogEntry[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
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
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.log('[WEB MODE] Log Entry (not saved):', entry);
    return Promise.resolve();
  }
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
  if (typeof window === 'undefined' || !window.__TAURI__) {
      console.log('[WEB MODE] Add Component (not saved):', component);
      return Promise.resolve();
  }
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
    if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
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
    if (typeof window === 'undefined' || !window.__TAURI__) {
        console.log('[WEB MODE] Add Annotation (not saved):', annotation);
        return Promise.resolve();
    }
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
  if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
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

export async function getLocalVisualDatabase(): Promise<any[]> {
    if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
    await initializeDatabase();
    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    const query = `
        SELECT
            d.id as documentId,
            d.image_data as imageData,
            d.description as description,
            d.perceptual_hash as perceptualHash,
            e.external_id as equipmentId,
            e.name as equipmentName
        FROM documents d
        JOIN equipments e ON d.equipment_id = e.external_id
        WHERE d.perceptual_hash IS NOT NULL
    `;
    const results: any[] = await invoke('plugin:sql|select', { db, query });
    return results;
}

export async function syncWithRemote(): Promise<{ synced: number; cleaned: boolean }> {
    if (typeof window === 'undefined' || !window.__TAURI__) {
        console.warn("Sync is only available in the Tauri environment.");
        return { synced: 0, cleaned: false };
    }

    const response = await fetch('/api/sync/data');
    if (!response.ok) {
        throw new Error(`Échec de la récupération des données de synchronisation: ${response.statusText}`);
    }
    const data = await response.json();
    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    
    let totalSynced = 0;
    
    // Step 1: Update local database within a transaction
    const txId = await invoke('plugin:sql|begin', { db });
    try {
        const tableNames = ['documents', 'parameters', 'alarms', 'log_entries', 'procedures', 'synoptic_items', 'equipments'];
        for (const tableName of tableNames) {
            await invoke('plugin:sql|execute', { db, query: `DELETE FROM ${tableName};` });
        }
        
        for (const equip of data.equipments || []) {
            await invoke('plugin:sql|execute', { db, query: 'INSERT INTO equipments (external_id, name, description, parent_id, type, subtype, system_code, sub_system, location, manufacturer, serial_number, document_ref, checksum) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', values: [equip.externalId, equip.name, equip.description, equip.parentId, equip.type, equip.subtype, equip.systemCode, equip.subSystem, equip.location, equip.manufacturer, equip.serialNumber, equip.documentRef, equip.checksum] });
            totalSynced++;
        }
        for (const doc of data.documents || []) {
            await invoke('plugin:sql|execute', { db, query: 'INSERT INTO documents (id, equipment_id, image_data, ocr_text, description, created_at, perceptual_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [doc.id, doc.equipmentId, doc.imageData, doc.ocrText, doc.description, doc.createdAt, doc.perceptualHash] });
            totalSynced++;
        }
        for (const log of data.logEntries || []) {
             await invoke('plugin:sql|execute', { db, query: 'INSERT INTO log_entries (id, timestamp, type, source, message, equipment_id, signature) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [log.id, log.timestamp, log.type, log.source, log.message, log.equipmentId, log.signature] });
             totalSynced++;
        }
        for (const param of data.parameters || []) {
            await invoke('plugin:sql|execute', { db, query: 'INSERT INTO parameters (id, name, unit, nominal_value, min_safe, max_safe, alarm_high, alarm_low, standard_ref, equipment_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', values: [param.id, param.name, param.unit, param.nominalValue, param.minSafe, param.maxSafe, param.alarmHigh, param.alarmLow, param.standardRef, param.equipmentId] });
            totalSynced++;
        }
        for (const alarm of data.alarms || []) {
            await invoke('plugin:sql|execute', { db, query: 'INSERT INTO alarms (code, severity, description, parameter, reset_procedure, standard_ref, equipment_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [alarm.code, alarm.severity, alarm.description, alarm.parameter, alarm.resetProcedure, alarm.standardRef, alarm.equipmentId] });
            totalSynced++;
        }
        for (const proc of data.procedures || []) {
            await invoke('plugin:sql|execute', { db, query: 'INSERT INTO procedures (id, name, description, version, steps) VALUES ($1, $2, $3, $4, $5)', values: [proc.id, proc.name, proc.description, proc.version, proc.steps] });
            totalSynced++;
        }
        for (const item of data.synopticItems || []) {
            await invoke('plugin:sql|execute', { db, query: 'INSERT INTO synoptic_items (external_id, name, type, parent_id, group_path, element_id, level, approved_by, approval_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', values: [item.externalId, item.name, item.type, item.parentId, item.groupPath, item.elementId, item.level, item.approvedBy, item.approvalDate] });
            totalSynced++;
        }

        await invoke('plugin:sql|commit', { db });
    } catch (e) {
        console.error("Local database transaction failed, rolling back:", e);
        await invoke('plugin:sql|rollback', { db });
        throw e;
    }

    // Step 2: Clean up remote database
    console.log('Local DB synced. Triggering remote DB cleanup...');
    let cleaned = false;
    try {
        const cleanupResponse = await fetch('/api/sync/clear', { method: 'POST' });
        if (!cleanupResponse.ok) {
            console.error(`Failed to clear remote database: ${cleanupResponse.statusText}`);
        } else {
            console.log('Remote DB cleanup successful.');
            cleaned = true;
        }
    } catch (e) {
        console.error("Error during remote cleanup:", e);
    }
    
    return { synced: totalSynced, cleaned };
}


// Ensure database is initialized on load
if (typeof window !== 'undefined' && window.__TAURI__) {
  initializeDatabase().catch(console.error);
}
