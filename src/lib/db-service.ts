

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

// This SQL schema is now managed in Rust (main.rs)
// const CREATE_TABLES_SQL = `...`;


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

  // Database is now initialized in Rust at startup. This function is just a formality.
  isInitialized = true;
  console.log('✅ Database connection is managed by the Rust backend.');
}

export async function getEquipments(): Promise<Equipment[]> {
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (isTauri) {
        const { getEquipments: getEquipmentsTauri } = await import('@/lib/tauri-client');
        return getEquipmentsTauri();
    }
    
    console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getEquipments.');
    return [];
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        const tauriClient = await import('@/lib/tauri-client');
        const equip = await tauriClient.getEquipment(id);
        return equip as Equipment | null;
    }
    
    console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getEquipmentById.');
    return null;
}

export async function getParametersForComponent(equipmentId: string): Promise<Parameter[]> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        // This command needs to be created in Rust
        return invoke('get_parameters_for_component', { equipmentId });
    }
    console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getParametersForComponent.');
    return [];
}

export async function getParameters(): Promise<Parameter[]> {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    // This command needs to be created in Rust
    return invoke('get_parameters');
  }
  console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getParameters.');
  return [];
}


export async function getAssistantContextData(): Promise<any> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        const { getEquipments, getAlarms } = await import('@/lib/tauri-client');
        // `getParameters` needs to be created as a command
        const [equipments, parameters, alarms] = await Promise.all([
            getEquipments(),
            invoke('get_parameters'),
            getAlarms(),
        ]);
        return { equipments, parameters, alarms };
    }
    console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getAssistantContextData.');
    return { equipments: [], parameters: [], alarms: [] };
}

export async function getLogEntries(): Promise<LogEntry[]> {
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;
  if (isTauri) {
      const { getLogEntries: getLogEntriesTauri } = await import('@/lib/tauri-client');
      return getLogEntriesTauri();
  }
  console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getLogEntries.');
  return [];
}

export async function getLogEntriesForNode(equipmentId: string): Promise<LogEntry[]> {
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;
  if (isTauri) {
      const { getLogEntriesForNode: getForNodeTauri } = await import('@/lib/tauri-client');
      return getForNodeTauri(equipmentId);
  }
  
  console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getLogEntriesForNode.');
  return [];
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
  
  console.error('[Service] addLogEntry is only available in a Tauri environment.');
  throw new Error("addLogEntry is not available in web mode.");
}

export async function addComponentAndDocument(
  component: { externalId: string; name: string; type: string; },
  document: { imageData: string; ocrText: string; description: string; perceptualHash: string; }
): Promise<void> {
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    
    if (!isTauri) {
        throw new Error("addComponentAndDocument is only available in the Tauri environment.");
    }
    
    console.log('[PROVISION_FLOW_LOCAL] Saving to local Tauri database via command...');
    // This command needs to be created in Rust and added to the handler
    await invoke('add_component_and_document', { component, document });
}


export async function getAnnotationsForNode(externalId: string): Promise<Annotation[]> {
    if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
    // This command needs to be created in Rust
    const annotations: any[] = await invoke('get_annotations_for_node', { externalId });
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
        console.warn('[Service] addAnnotation is only available in a Tauri environment.');
        return;
    }
    
    // This command needs to be created in Rust
    await invoke('add_annotation', { annotation });

    await addLogEntry({
      type: 'MANUAL',
      source: annotation.operator,
      message: `Annotation ajoutée sur le P&ID de ${annotation.equipmentId}: "${annotation.text}"`,
      equipmentId: annotation.equipmentId,
    });
}

export async function getDocumentsForComponent(equipmentId: string): Promise<Document[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getDocumentsForComponent.');
    return [];
  }
  // This command needs to be created in Rust
  const docs: any[] = await invoke('get_documents_for_component', { equipmentId });
  return docs.map(d => ({
    ...d,
    equipmentId: d.equipment_id,
    imageData: d.image_data,
    ocrText: d.ocr_text,
    createdAt: d.created_at,
  }));
}

export async function getLocalVisualDatabase(): Promise<any[]> {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getLocalVisualDatabase.');
      return [];
    }
    console.log('[DB_SERVICE] Querying local visual database via command.');
    // This command needs to be created in Rust
    return await invoke('get_local_visual_database');
}

export async function syncWithRemote(): Promise<{ synced: number; cleaned: boolean }> {
    if (typeof window === 'undefined' || !window.__TAURI__) {
        console.warn("Sync is only available in the Tauri environment.");
        return { synced: 0, cleaned: false };
    }
    
    console.log('[SYNC_FLOW] Starting remote-to-local synchronization via Rust backend.');
    
    // The entire sync logic is now in the Rust backend.
    const result: { synced: number, cleaned: boolean } = await invoke('sync_database');
    
    console.log(`[SYNC_FLOW] Local database synced. ${result.synced} records considered.`);
    
    return result;
}

export async function searchDocuments(query: { text?: string, equipmentId?: string }): Promise<Document[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  if (isTauri) {
      const { searchDocuments: searchDocumentsTauri } = await import('@/lib/tauri-client');
      return searchDocumentsTauri(query.text, query.equipmentId);
  }
  
  console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for searchDocuments.');
  return [];
}


// Ensure database is initialized on load
if (typeof window !== 'undefined' && window.__TAURI__) {
  initializeDatabase().catch(console.error);
}
