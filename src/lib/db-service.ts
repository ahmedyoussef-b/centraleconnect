

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

export async function getEquipments(): Promise<Equipment[]> {
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
    
    if (isTauri) {
        const { getEquipments: getEquipmentsTauri } = await import('@/lib/tauri-client');
        return getEquipmentsTauri();
    }
    
    // Web Fallback
    try {
        console.log('[Service] Fetching equipments from web API...');
        const response = await fetch('/api/equipments');
        if (!response.ok) {
            throw new Error(`Failed to fetch equipments: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
    const allEquipments = await getEquipments();
    return allEquipments.find(e => e.externalId === id) || null;
}

export async function getParametersForComponent(equipmentId: string): Promise<Parameter[]> {
    if (typeof window !== 'undefined' && window.__TAURI__) {
        const { getParametersForComponent: getParamsTauri } = await import('@/lib/tauri-client');
        return getParamsTauri(equipmentId);
    }
    // Web fallback - not implemented for this service for now
    console.warn('[Service] getParametersForComponent is not available in web mode.');
    return [];
}

export async function getLogEntries(): Promise<LogEntry[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  if (isTauri) {
      const { getLogEntries: getLogEntriesTauri } = await import('@/lib/tauri-client');
      return getLogEntriesTauri();
  }
  
  // Web Fallback
  try {
    console.log('[Service] Fetching log entries from web API...');
    const response = await fetch('/api/logbook');
    if (!response.ok) {
        throw new Error(`Failed to fetch log entries from web API: ${response.statusText}`);
    }
    return await response.json();
  } catch(error) {
    console.error(error);
    return [];
  }
}

export async function addLogEntry(entry: {
  type: LogEntryType;
  source: string;
  message: string;
  equipmentId?: string;
}): Promise<void> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
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
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
    
    if (isTauri) {
        console.log('[PROVISION_FLOW_LOCAL] Saving to local Tauri database via command...');
        const { addComponentAndDocument: addTauri } = await import('@/lib/tauri-client');
        await addTauri(component, document);
        return;
    }

    // Web Fallback
    console.log('[PROVISION_FLOW_WEB] Saving to remote database via API...');
    const payload = { component, document };
    const response = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to provision via web API: ${response.statusText}`);
    }
}

// Functions below are not yet implemented with web fallback for simplicity

export async function getAssistantContextData(): Promise<any> {
    if (typeof window !== 'undefined' && !!window.__TAURI__) {
        const { getEquipments, getAlarms, getParameters } = await import('@/lib/tauri-client');
        const [equipments, parameters, alarms] = await Promise.all([
            getEquipments(),
            getParameters(),
            getAlarms(),
        ]);
        return { equipments, parameters, alarms };
    }
    console.warn('[Service] getAssistantContextData not available in web mode.');
    return { equipments: [], parameters: [], alarms: [] };
}


export async function getLogEntriesForNode(equipmentId: string): Promise<LogEntry[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  if (isTauri) {
      const { getLogEntriesForNode: getForNodeTauri } = await import('@/lib/tauri-client');
      return getForNodeTauri(equipmentId);
  }
  return [];
}


export async function getAnnotationsForNode(externalId: string): Promise<Annotation[]> {
    if (typeof window === 'undefined' || !window.__TAURI__) return Promise.resolve([]);
    const { getAnnotationsForNode: getTauri } = await import('@/lib/tauri-client');
    return getTauri(externalId);
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
    
    const { addAnnotation: addTauri } = await import('@/lib/tauri-client');
    await addTauri(annotation);
}

export async function getDocumentsForComponent(equipmentId: string): Promise<Document[]> {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    return [];
  }
  const { getDocumentsForComponent: getTauri } = await import('@/lib/tauri-client');
  return getTauri(equipmentId);
}

export async function getLocalVisualDatabase(): Promise<any[]> {
    if (typeof window === 'undefined' || !window.__TAURI__) {
      return [];
    }
    const { getLocalVisualDatabase: getTauri } = await import('@/lib/tauri-client');
    return getTauri();
}

export async function syncWithRemote(): Promise<{ synced: number; cleaned: boolean }> {
    if (typeof window === 'undefined' || !window.__TAURI__) {
        console.warn("Sync is only available in the Tauri environment.");
        return { synced: 0, cleaned: false };
    }
    
    const { syncDatabase } = await import('@/lib/tauri-client');
    return syncDatabase();
}

export async function searchDocuments(query?: string, equipmentId?: string): Promise<Document[]> {
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  
  if (isTauri) {
      const { searchDocuments: searchDocumentsTauri } = await import('@/lib/tauri-client');
      return searchDocumentsTauri(query, equipmentId);
  }
  
  // TODO: Implement web fallback for search
  return [];
}
