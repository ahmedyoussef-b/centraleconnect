
// src/lib/procedures-service.ts
import type { Procedure, ProcedureStep } from '@/types/db';

// Cache et promesse de chargement
let proceduresCache: Procedure[] | null = null;
let loadingPromise: Promise<Procedure[]> | null = null;

/**
 * Parse les steps d'une procédure en gérant tous les cas d'erreur
 */
function parseProcedureSteps(stepsData: any): ProcedureStep[] {
    if (!stepsData) return [];
    if (Array.isArray(stepsData)) return stepsData; // Already JSON
    if (typeof stepsData !== 'string') return [];
    
    try {
        const parsed = JSON.parse(stepsData);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("[Procedures] Échec du parsing JSON des étapes:", e, "Data:", stepsData);
        return []; // Retourner un tableau vide en cas d'erreur pour éviter les plantages
    }
}


/**
 * Récupère toutes les procédures avec garantie de résolution
 */
async function fetchProcedures(): Promise<Procedure[]> {
    if (proceduresCache) return proceduresCache;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
            
            let rawProcedures: any[];

            if (isTauri) {
                console.log('[Procedures] Fetching from Tauri backend...');
                const { getProcedures: getProceduresTauri } = await import('@/lib/tauri-client');
                rawProcedures = await getProceduresTauri();
            } else {
                console.log('[Procedures] Fetching from Web API...');
                const response = await fetch('/api/procedures');
                if (!response.ok) {
                    throw new Error(`Failed to fetch procedures from web API: ${response.statusText}`);
                }
                rawProcedures = await response.json();
            }
            
            const parsedProcedures = rawProcedures.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                version: p.version,
                category: p.category,
                // The web API returns JSON directly, Tauri returns a string.
                // This logic handles both cases.
                steps: parseProcedureSteps(p.steps),
            }));
            
            proceduresCache = parsedProcedures;
            return parsedProcedures;
        } catch (error) {
            console.error('[Procedures] Erreur fatale lors de la récupération des procédures:', error);
            return []; // Garantir la résolution
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
    return fetchProcedures();
}

/**
 * Récupère une procédure par son ID
 */
export async function getProcedureById(id: string): Promise<Procedure | undefined> {
    if (!id) return undefined;
    const procedures = await getProcedures();
    return procedures.find(p => p.id === id);
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
