// src/lib/tauri-client.ts
import { invoke } from '@tauri-apps/api/tauri';

// Types (alignés avec les structures Rust)
export interface Equipment {
  externalId: string;
  name: string;
  systemCode?: string;
  status?: string;
  // Les autres champs sont optionnels car la requête peut ne pas tout retourner
  [key: string]: any; 
}

export interface Parameter {
  id: string;
  name: string;
  value: number;
  unit: string;
}

export interface Component {
  id: string;
  name: string;
  equipmentId: string; // Correspond à equipment_id en Rust, sérialisé en camelCase
  manufacturer: string;
}

export interface SyncData {
  equipments: Equipment[];
  components: Component[];
  timestamp: string;
}

// ===== ÉQUIPEMENTS =====
export async function getEquipments(): Promise<Equipment[]> {
  return await invoke('get_equipments');
}

export async function getEquipment(id: string): Promise<Equipment | null> {
  return await invoke('get_equipment', { id });
}

export async function addEquipment(equipment: Equipment): Promise<Equipment> {
  return await invoke('add_equipment', { equipment });
}

export async function provisionEquipment(equipment: Equipment): Promise<Equipment> {
  return await invoke('provision_equipment', { equipment });
}

// ===== COMPOSANTS =====
export async function getComponents(): Promise<Component[]> {
  return await invoke('get_components');
}

export async function getComponentsByEquipment(equipmentId: string): Promise<Component[]> {
  return await invoke('get_components_by_equipment', { equipmentId });
}

// ===== SYNCHRONISATION =====
export async function syncData(data: SyncData): Promise<string> {
  return await invoke('sync_data', { data });
}

export async function getSyncData(): Promise<SyncData | null> {
  return await invoke('get_sync_data');
}

export async function clearSyncData(): Promise<string> {
  return await invoke('clear_sync_data');
}
