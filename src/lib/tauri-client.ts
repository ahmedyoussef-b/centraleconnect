// src/lib/tauri-client.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { Equipment, Component } from '@/types/db';

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
