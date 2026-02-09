import componentsData from '@/assets/master-data/pupitre-data.json';
import type { Component } from '@/types/db';

export async function getComponents(): Promise<Component[]> {
  return componentsData.components as Component[];
}

export async function getComponentById(
  id: string
): Promise<Component | undefined> {
  const components = await getComponents();
  return components.find((c) => c.id === id);
}
