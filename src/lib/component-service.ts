// src/lib/component-service.ts
import type { Component } from '@/types/db';

export async function getComponents(): Promise<Component[]> {
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;

    if (isTauri) {
        const { getComponents: getComponentsTauri } = await import('@/lib/tauri-client');
        return getComponentsTauri();
    } 

    console.warn('[Service] Not in Tauri environment. Web API fallback is disabled for getComponents.');
    return [];
}

export async function getComponentById(
  id: string
): Promise<Component | undefined> {
  const components = await getComponents();
  return components.find((c) => c.id === id);
}
