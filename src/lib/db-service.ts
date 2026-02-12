




import { invoke } from '@tauri-apps/api/tauri';
import type { 
  Equipment,
  LogEntry, 
  LogEntryType, 
  Parameter, 
  Annotation,
  Document,
  AlarmEvent,
  ScadaData
} from '@/types/db';

// Client-side data imports
import equipmentComponentsData from '@/assets/master-data/components.json';
import equipmentPidAssetsData from '@/assets/master-data/pid-assets.json';
import equipmentB0Data from '@/assets/master-data/B0.json';
import equipmentB1Data from '@/assets/master-data/B1.json';
import equipmentB2Data from '@/assets/master-data/B2.json';
import equipmentB3Data from '@/assets/master-data/B3.json';
import equipmentC0Data from '@/assets/master-data/C0.json';
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
    commissioning_date TEXT,
    checksum TEXT UNIQUE,
    nominal_data TEXT
);
CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    nominal_value REAL,
    min_safe REAL,
    max_safe REAL,
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
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('AUTO', 'MANUAL', 'DOCUMENT_ADDED')) NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    signature TEXT UNIQUE NOT NULL,
    equipment_id TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS alarm_events (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  is_active BOOLEAN NOT NULL,
  details TEXT,
  alarm_code TEXT NOT NULL,
  FOREIGN KEY (alarm_code) REFERENCES alarms(code) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS scada_data (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  value REAL NOT NULL,
  equipment_id TEXT NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY,
    timestamp TEXT NOT NULL,
    text TEXT NOT NULL,
    operator TEXT NOT NULL,
    x_pos REAL NOT NULL,
    y_pos REAL NOT NULL,
    equipment_id TEXT NOT NULL,
    FOREIGN KEY (equipment_id) REFERENCES equipments(external_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY,
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
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (isTauri) {
        const { getEquipments: getEquipmentsTauri } = await import('@/lib/tauri-client');
        return getEquipmentsTauri();
    }
    
    // For web, fetch from the API route
    const response = await fetch('/api/equipments');
    if (!response.ok) {
        throw new Error('Failed to fetch equipments for web');
    }
    return await response.json();
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        const tauriClient = await import('@/lib/tauri-client');
        const equip = await tauriClient.getEquipment(id);
        // The type from tauri-client might be simpler, ensure it's compatible
        // For now we assume it is.
        return equip as Equipment | null;
    }
    // Web version would need a specific API route like /api/equipments/[id]
    // For now, we filter from the full list.
    const equipments = await getEquipments();
    return equipments.find(e => e.externalId === id) || null;
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
    const response = await fetch(`/api/parameters?equipmentId=${equipmentId}`); // This API route doesn't exist yet, but should
    if(!response.ok) return [];
    return await response.json();
}

export async function getParameters(): Promise<Parameter[]> {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    await initializeDatabase();
    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    return invoke('plugin:sql|select', { db, query: 'SELECT * FROM parameters' });
  }
  // This is a placeholder, should fetch from an API route
  return Promise.resolve(allParameterData as Parameter[]);
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
    const equipments = await getEquipments();
    const alarmsData = (await import('@/assets/master-data/alarms.json')).default;
    // Parameters would need an API route
    return Promise.resolve({ equipments, parameters: allParameterData, alarms: alarmsData });
}

export async function getLogEntries(): Promise<LogEntry[]> {
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;
  if (isTauri) {
      const { getLogEntries: getLogEntriesTauri } = await import('@/lib/tauri-client');
      return getLogEntriesTauri();
  }
  // Fallback to web API
  const response = await fetch('/api/logbook');
  if (!response.ok) {
    console.error("Failed to fetch log entries from web API");
    return [];
  }
  const entries: any[] = await response.json();
  // The API returns Date objects, which need to be converted to strings for consistency with Tauri.
  return entries.map(e => ({...e, timestamp: e.timestamp.toString()}));
}

export async function getLogEntriesForNode(equipmentId: string): Promise<LogEntry[]> {
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;
  if (isTauri) {
      const { getLogEntriesForNode: getForNodeTauri } = await import('@/lib/tauri-client');
      return getForNodeTauri(equipmentId);
  }
  
  const response = await fetch(`/api/logbook?equipmentId=${equipmentId}`);
  if (!response.ok) {
    console.error("Failed to fetch log entries for node from web API");
    return [];
  }
  const entries: any[] = await response.json();
  return entries.map(e => ({...e, timestamp: e.timestamp.toString()}));
}

export async function addLogEntry(entry: {
  type: LogEntryType;
  source: string;
  message: string;
  equipmentId?: string;
}): Promise<void> {
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;
  if (isTauri) {
      const { addLogEntry: addLogEntryTauri } = await import('@/lib/tauri-client');
      await addLogEntryTauri(entry);
      return;
  }
  
  // Web version
  const response = await fetch('/api/logbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });

  if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to add log entry via web API: ${response.statusText}`);
  }
}

export async function addComponentAndDocument(
  component: { externalId: string; name: string; type: string; },
  document: { imageData: string; ocrText: string; description: string; perceptualHash: string; }
): Promise<void> {
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (!isTauri) {
        throw new Error("addComponentAndDocument is only available in the Tauri environment for direct local database access.");
    }
    
    console.log('[PROVISION_FLOW_LOCAL] Saving to local Tauri database with data:', { component, document: {...document, imageData: '...omitted...'} });
    await initializeDatabase();
    const db = await invoke('plugin:sql|load', { db: DB_NAME });

    console.log(`[PROVISION_FLOW_LOCAL] Checking for existing equipment with ID: ${component.externalId}`);
    const existing: any[] = await invoke('plugin:sql|select', { db, query: 'SELECT 1 FROM equipments WHERE external_id = $1', values: [component.externalId]});
    if (existing.length > 0) {
        console.error(`[PROVISION_FLOW_LOCAL] Conflict: Equipment ID '${component.externalId}' already exists.`);
        throw new Error(`L'équipement avec l'ID '${component.externalId}' existe déjà.`);
    }

    // Transaction
    const txId = await invoke('plugin:sql|begin', { db });
    console.log(`[PROVISION_FLOW_LOCAL] Started transaction.`);
    try {
        // 1. Insert equipment
        await invoke('plugin:sql|execute', {
            db,
            query: 'INSERT INTO equipments (external_id, name, type, version, is_immutable) VALUES ($1, $2, $3, 1, 0)',
            values: [component.externalId, component.name, component.type]
        });
        console.log(`[PROVISION_FLOW_LOCAL_TX] Inserted equipment: ${component.externalId}`);

        // 2. Insert document
        await invoke('plugin:sql|execute', {
            db,
            query: 'INSERT INTO documents (equipment_id, image_data, ocr_text, description, created_at, perceptual_hash) VALUES ($1, $2, $3, $4, $5, $6)',
            values: [component.externalId, document.imageData, document.ocrText, document.description, new Date().toISOString(), document.perceptualHash]
        });
        console.log(`[PROVISION_FLOW_LOCAL_TX] Inserted document for ${component.externalId}`);


        // 3. Insert log entry
        const lastEntry: { signature: string }[] = await invoke('plugin:sql|select', {
            db,
            query: 'SELECT signature FROM log_entries ORDER BY timestamp DESC LIMIT 1'
        });
        const previousSignature = lastEntry[0]?.signature ?? 'GENESIS';
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const logMessage = `Nouvel équipement '${component.externalId}' ajouté via provisionnement local.`;
        const newEntryData = { type: 'DOCUMENT_ADDED' as LogEntryType, source: 'Provisioning Local', message: logMessage, equipmentId: component.externalId, timestamp };
        const signature = await createEntrySignature(newEntryData, previousSignature);

        await invoke('plugin:sql|execute', {
            db,
            query: 'INSERT INTO log_entries (timestamp, type, source, message, equipment_id, signature) VALUES ($1, $2, $3, $4, $5, $6)',
            values: [timestamp, 'DOCUMENT_ADDED', 'Provisioning Local', logMessage, component.externalId, signature],
        });
        console.log(`[PROVISION_FLOW_LOCAL_TX] Inserted log entry for ${component.externalId}`);

        await invoke('plugin:sql|commit', { db });
        console.log(`[PROVISION_FLOW_LOCAL] Transaction committed successfully.`);

    } catch (e) {
        await invoke('plugin:sql|rollback', { db });
        console.error("[PROVISION_FLOW_LOCAL] Transaction failed, rolling back:", e);
        if (e instanceof Error) {
            throw new Error(`Erreur de base de données locale: ${e.message}`);
        }
        throw new Error("Une erreur inconnue est survenue lors de la sauvegarde locale.");
    }
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
    console.log('[DB_SERVICE] Querying local visual database.');
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
    console.log(`[DB_SERVICE] Found ${results.length} entries in local visual DB.`);
    return results;
}

export async function syncWithRemote(): Promise<{ synced: number; cleaned: boolean }> {
    if (typeof window === 'undefined' || !window.__TAURI__) {
        console.warn("Sync is only available in the Tauri environment.");
        return { synced: 0, cleaned: false };
    }
    
    console.log('[SYNC_FLOW] Starting remote-to-local synchronization.');

    const response = await fetch('/api/sync/data');
    if (!response.ok) {
        throw new Error(`Échec de la récupération des données de synchronisation: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('[SYNC_FLOW] Fetched data from remote server.', { recordCounts: { equipments: data.equipments?.length, documents: data.documents?.length, logs: data.logEntries?.length, parameters: data.parameters?.length, alarms: data.alarms?.length } });
    
    const db = await invoke('plugin:sql|load', { db: DB_NAME });
    
    let totalSynced = 0;
    
    console.log('[SYNC_FLOW] Starting local database transaction.');
    const txId = await invoke('plugin:sql|begin', { db });
    try {
        if (data.equipments?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.equipments.length} equipments...`);
            for (const equip of data.equipments) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO equipments (external_id, name, description, parent_id, type, subtype, system_code, sub_system, location, manufacturer, serial_number, document_ref, checksum) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', values: [equip.externalId, equip.name, equip.description, equip.parentId, equip.type, equip.subtype, equip.systemCode, equip.subSystem, equip.location, equip.manufacturer, equip.serialNumber, equip.documentRef, equip.checksum] });
                totalSynced++;
            }
        }

        if (data.documents?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.documents.length} documents...`);
            for (const doc of data.documents) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO documents (id, equipment_id, image_data, ocr_text, description, created_at, perceptual_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [doc.id, doc.equipmentId, doc.imageData, doc.ocrText, doc.description, doc.createdAt, doc.perceptualHash] });
                totalSynced++;
            }
        }
        
        if (data.logEntries?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.logEntries.length} log entries...`);
            for (const log of data.logEntries) {
                 await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO log_entries (id, timestamp, type, source, message, equipment_id, signature) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [log.id, log.timestamp, log.type, log.source, log.message, log.equipmentId, log.signature] });
                 totalSynced++;
            }
        }
        
        if (data.parameters?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.parameters.length} parameters...`);
            for (const param of data.parameters) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO parameters (id, name, unit, nominal_value, min_safe, max_safe, alarm_high, alarm_low, standard_ref, equipment_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', values: [param.id, param.name, param.unit, param.nominalValue, param.minSafe, param.maxSafe, param.alarmHigh, param.alarmLow, param.standardRef, param.equipmentId] });
                totalSynced++;
            }
        }

        if (data.alarms?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.alarms.length} alarms...`);
            for (const alarm of data.alarms) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO alarms (code, severity, description, parameter, reset_procedure, standard_ref, equipment_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [alarm.code, alarm.severity, alarm.description, alarm.parameter, alarm.resetProcedure, alarm.standardRef, alarm.equipmentId] });
                totalSynced++;
            }
        }

        if (data.procedures?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.procedures.length} procedures...`);
            for (const proc of data.procedures) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO procedures (id, name, description, version, steps) VALUES ($1, $2, $3, $4, $5)', values: [proc.id, proc.name, proc.description, proc.version, proc.steps] });
                totalSynced++;
            }
        }

        if (data.synopticItems?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.synopticItems.length} synoptic items...`);
            for (const item of data.synopticItems) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO synoptic_items (external_id, name, type, parent_id, group_path, element_id, level, approved_by, approval_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', values: [item.externalId, item.name, item.type, item.parentId, item.groupPath, item.elementId, item.level, item.approvedBy, item.approvalDate] });
                totalSynced++;
            }
        }

        if (data.annotations?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.annotations.length} annotations...`);
            for (const item of data.annotations as Annotation[]) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO annotations (id, timestamp, text, operator, x_pos, y_pos, equipment_id) VALUES ($1, $2, $3, $4, $5, $6, $7)', values: [item.id, item.timestamp, item.text, item.operator, item.xPos, item.yPos, item.equipmentId] });
                totalSynced++;
            }
        }

        if (data.alarmEvents?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.alarmEvents.length} alarm events...`);
            for (const item of data.alarmEvents as AlarmEvent[]) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO alarm_events (id, timestamp, is_active, details, alarm_code) VALUES ($1, $2, $3, $4, $5)', values: [item.id, item.timestamp, item.isActive, item.details, item.alarmCode] });
                totalSynced++;
            }
        }

        if (data.scadaData?.length > 0) {
            console.log(`[SYNC_FLOW] Syncing ${data.scadaData.length} SCADA data points...`);
            for (const item of data.scadaData as ScadaData[]) {
                await invoke('plugin:sql|execute', { db, query: 'INSERT OR IGNORE INTO scada_data (id, timestamp, value, equipment_id) VALUES ($1, $2, $3, $4)', values: [item.id, item.timestamp, item.value, item.equipmentId] });
                totalSynced++;
            }
        }


        await invoke('plugin:sql|commit', { db });
        console.log(`[SYNC_FLOW] Local transaction committed. ${totalSynced} records considered for sync.`);
    } catch (e) {
        console.error("Local database transaction failed, rolling back:", e);
        await invoke('plugin:sql|rollback', { db });
        throw e;
    }

    // Step 2: Clean up remote database
    console.log('[SYNC_FLOW] Triggering remote DB cleanup...');
    let cleaned = false;
    try {
        const cleanupResponse = await fetch('/api/sync/clear', { method: 'POST' });
        if (!cleanupResponse.ok) {
            console.error(`[SYNC_FLOW] Failed to clear remote database: ${cleanupResponse.statusText}`);
        } else {
            console.log('[SYNC_FLOW] Remote DB cleanup successful.');
            cleaned = true;
        }
    } catch (e) {
        console.error("[SYNC_FLOW] Error during remote cleanup:", e);
    }
    
    return { synced: totalSynced, cleaned };
}

export async function searchDocuments(query: { text?: string, equipmentId?: string }): Promise<Document[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  if (isTauri) {
      const { searchDocuments: searchDocumentsTauri } = await import('@/lib/tauri-client');
      return searchDocumentsTauri(query.text, query.equipmentId);
  }
  
  const url = new URL('/api/search', window.location.origin);
  if (query.text) url.searchParams.append('text', query.text);
  if (query.equipmentId) url.searchParams.append('equipmentId', query.equipmentId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error("Failed to search documents from web API");
    return [];
  }
  return response.json();
}


// Ensure database is initialized on load
if (typeof window !== 'undefined' && window.__TAURI__) {
  initializeDatabase().catch(console.error);
}
