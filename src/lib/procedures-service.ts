// src/lib/procedures-service.ts
import type { Procedure, ProcedureStep } from '@/types/db';

// Cache et promesse de chargement
let proceduresCache: Procedure[] | null = null;
let loadingPromise: Promise<Procedure[]> | null = null;

/**
 * Parse les steps d'une procédure en gérant tous les cas d'erreur
 */
function parseProcedureSteps(stepsData: any): ProcedureStep[] {
    if (Array.isArray(stepsData)) return stepsData;
    if (typeof stepsData !== 'string' || !stepsData) return [];
    
    try {
        const trimmed = stepsData.trim();
        if (trimmed === '') return [];
        
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error(`[Procedures] Erreur parsing JSON:`, e);
        return [];
    }
}

/**
 * Récupère toutes les procédures avec garantie de résolution
 */
async function fetchProcedures(): Promise<Procedure[]> {
    if (proceduresCache) {
        return proceduresCache;
    }
    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
            if (!isTauri) {
                console.warn('[Procedures] Not in Tauri environment, returning empty list. Web API is disabled.');
                return [];
            }
            
            const { getProcedures: getProceduresTauri } = await import('@/lib/tauri-client');
            const rawProcedures = await getProceduresTauri();
            
            if (!Array.isArray(rawProcedures)) {
                console.warn('[Procedures] Data from Tauri is not an array, returning empty.');
                return [];
            }
            
            const parsedProcedures: Procedure[] = rawProcedures.map(p => ({
                id: p.id || `temp-${Date.now()}`,
                name: p.name || 'Procédure sans titre',
                description: p.description || '',
                version: p.version || '1.0.0',
                category: p.category || 'Général',
                steps: parseProcedureSteps(p.steps)
            }));
            
            proceduresCache = parsedProcedures;
            return parsedProcedures;
        } catch (error) {
            console.error('[Procedures] Fatal error during fetch:', error);
            return []; // Always resolve with an empty array on error
        } finally {
            loadingPromise = null;
        }
    })();
    
    return loadingPromise;
}

/**
 * Récupère toutes les procédures - GARANTIE SANS BLOCAGE
 */
export async function getProcedures(): Promise<Procedure[]> {
    try {
        return await fetchProcedures();
    } catch (error) {
        console.error('[Procedures] Erreur getProcedures:', error);
        return []; // JAMAIS DE REJET
    }
}

/**
 * Récupère une procédure par son ID
 */
export async function getProcedureById(id: string): Promise<Procedure | undefined> {
    if (!id) return undefined;
    try {
        const procedures = await getProcedures();
        return procedures.find(p => p.id === id || p.id.toString() === id);
    } catch {
        return undefined;
    }
}

/**
 * Réinitialise le cache
 */
export function clearProceduresCache(): void {
    proceduresCache = null;
    loadingPromise = null;
    console.log('[Procedures] Cache réinitialisé');
}

/**
 * Recharge les procédures
 */
export async function reloadProcedures(): Promise<Procedure[]> {
    clearProceduresCache();
    return getProcedures();
}

export default {
    getProcedures,
    getProcedureById,
    clearProceduresCache,
    reloadProcedures
};
