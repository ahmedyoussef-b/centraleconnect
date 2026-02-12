// src-tauri/tauri-client.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { Equipment, Component, Alarm, Procedure as ProcedureType, LogEntry, LogEntryType, Document } from '@/types/db';

// Re-export main types for consistency
export type { Equipment, Component, Alarm, LogEntry, Document };

// Tauri-specific types where needed
export type Procedure = Omit<ProcedureType, 'steps'> & { steps: string };

export type NewLogEntry = {
    type: LogEntryType;
    source: string;
    message: string;
    equipmentId?: string;
}

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

// ===== DOCUMENTS / VISUAL SEARCH =====
export async function searchDocuments(query?: string, equipmentId?: string): Promise<Document[]> {
  return await invoke('search_documents', { query: query || '', equipmentId });
}
