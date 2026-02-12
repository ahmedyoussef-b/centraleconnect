// src/lib/component-service.ts
import type { Component } from '@/types/db';

export async function getComponents(): Promise<Component[]> {
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;

    if (isTauri) {
        const { getComponents: getComponentsTauri } = await import('@/lib/tauri-client');
        return getComponentsTauri();
    } else {
        const response = await fetch('/api/components');
        if (!response.ok) {
            console.error("Failed to fetch components from web API");
            return [];
        }
        return response.json();
    }
}

export async function getComponentById(
  id: string
): Promise<Component | undefined> {
  const components = await getComponents();
  return components.find((c) => c.id === id);
}
