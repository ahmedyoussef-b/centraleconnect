// src/lib/tauri-client.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { Equipment, Component, Alarm, Procedure as ProcedureType } from '@/types/db';

// Re-export main types for consistency
export type { Equipment, Component, Alarm };

// Tauri-specific types where needed
export type Procedure = Omit<ProcedureType, 'steps'> & { steps: string };


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
