// src-tauri/tauri-client.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { Equipment, Component, Alarm, Procedure as ProcedureType, LogEntry, LogEntryType, Document, Parameter, Annotation } from '@/types/db';

// Re-export main types for consistency
export type { Equipment, Component, Alarm, LogEntry, Document, Parameter, Annotation };

// Tauri-specific types where needed
export type Procedure = Omit<ProcedureType, 'steps'> & { steps: string };

export type NewLogEntry = {
    type: LogEntryType;
    source: string;
    message: string;
    equipmentId?: string;
};

export type NewComponentData = {
    externalId: string;
    name: string;
    type: string;
};
  
export type NewDocumentData = {
    imageData: string;
    ocrText: string;
    description: string;
    perceptualHash: string;
};

export type NewAnnotation = {
    equipmentId: string;
    text: string;
    operator: string;
    xPos: number;
    yPos: number;
};
  
export type LocalVisualDbEntry = {
    documentId: number;
    equipmentId: string;
    equipmentName: string;
    description?: string | null;
    imageData: string;
    perceptualHash?: string | null;
};
  
export type SyncResult = {
    synced: number;
    cleaned: boolean;
};


// ===== ÉQUIPEMENTS (depuis la base de données) =====
export async function getEquipments(): Promise<Equipment[]> {
  return await invoke('get_equipments');
}

export async function getEquipment(id: string): Promise<Equipment | null> {
  return await invoke('get_equipment', { id });
}


// ===== COMPOSANTS (depuis pupitre-data.json pour la vue synoptique) =====
export async function getComponents(): Promise<Component[]> {
  return await invoke('get_components');
}

// ===== PARAMETERS =====
export async function getParameters(): Promise<Parameter[]> {
    return await invoke('get_parameters');
}

export async function getParametersForComponent(equipmentId: string): Promise<Parameter[]> {
    return await invoke('get_parameters_for_component', { equipmentId });
}

// ===== ALARMS =====
export async function getAlarms(): Promise<Alarm[]> {
    return await invoke('get_alarms');
}

// ===== PROCEDURES =====
export async function getProcedures(): Promise<Procedure[]> {
    return await invoke('get_procedures');
}

// ===== LOGBOOK =====
export async function getLogEntries(): Promise<LogEntry[]> {
    return await invoke('get_log_entries');
}

export async function addLogEntry(entry: NewLogEntry): Promise<void> {
    return await invoke('add_log_entry', { entry });
}

export async function getLogEntriesForNode(equipmentId: string): Promise<LogEntry[]> {
    return await invoke('get_log_entries_for_node', { equipmentId });
}

// ===== PROVISIONING =====
export async function addComponentAndDocument(component: NewComponentData, document: NewDocumentData): Promise<void> {
    return await invoke('add_component_and_document', { component, document });
}

// ===== ANNOTATIONS =====
export async function getAnnotationsForNode(externalId: string): Promise<Annotation[]> {
    return await invoke('get_annotations_for_node', { externalId });
}

export async function addAnnotation(annotation: NewAnnotation): Promise<void> {
    return await invoke('add_annotation', { annotation });
}

// ===== DOCUMENTS / VISUAL SEARCH =====
export async function searchDocuments(query?: string, equipmentId?: string): Promise<Document[]> {
  return await invoke('search_documents', { query: query || '', equipmentId });
}

export async function getDocumentsForComponent(equipmentId: string): Promise<Document[]> {
    return await invoke('get_documents_for_component', { equipmentId });
}
  
export async function getLocalVisualDatabase(): Promise<LocalVisualDbEntry[]> {
    return await invoke('get_local_visual_database');
}
  
// ===== SYNC =====
export async function syncDatabase(): Promise<SyncResult> {
    return await invoke('sync_database');
}
