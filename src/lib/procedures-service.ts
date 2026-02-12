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
    // Cache
    if (proceduresCache) {
        console.log('[Procedures] Cache hit');
        return proceduresCache;
    }

    // Évite les appels concurrents
    if (loadingPromise) {
        console.log('[Procedures] Déjà en cours');
        return loadingPromise;
    }
    
    // NOUVEAU: Timeout global pour TOUTE la fonction
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<Procedure[]>((_, reject) => {
        timeoutId = setTimeout(() => {
            console.warn('[Procedures] TIMEOUT GLOBAL - retour tableau vide');
            reject(new Error('Timeout global'));
        }, 10000); // 10 secondes max
    });

    const fetchPromise = (async (): Promise<Procedure[]> => {
        try {
            const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
            console.log('[Procedures] Mode:', isTauri ? 'Tauri' : 'Web API');
            
            let rawProcedures: any[] = [];

            if (isTauri) {
                try {
                    const { getProcedures: getProceduresTauri } = await import('@/lib/tauri-client');
                    
                    // Timeout spécifique Tauri
                    const tauriTimeout = new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout Tauri')), 5000);
                    });
                    
                    rawProcedures = await Promise.race([
                        getProceduresTauri(),
                        tauriTimeout
                    ]) as any[];
                    
                } catch (tauriError) {
                    console.error('[Procedures] Erreur Tauri:', tauriError);
                    // Fallback API web
                    try {
                        const response = await fetch('/api/procedures');
                        if (response.ok) {
                            rawProcedures = await response.json();
                        }
                    } catch (fetchError) {
                        console.error('[Procedures] Fallback échoué:', fetchError);
                    }
                }
            } else {
                // Mode web
                try {
                    const controller = new AbortController();
                    const webTimeout = setTimeout(() => controller.abort(), 5000);
                    
                    const response = await fetch('/api/procedures', {
                        signal: controller.signal
                    });
                    
                    clearTimeout(webTimeout);
                    
                    if (response.ok) {
                        rawProcedures = await response.json();
                    }
                } catch (fetchError) {
                    console.error('[Procedures] Erreur API web:', fetchError);
                }
            }

            // TOUJOURS retourner un tableau, même vide
            if (!Array.isArray(rawProcedures)) {
                console.warn('[Procedures] Pas un tableau, retour tableau vide');
                return [];
            }

            console.log(`[Procedures] ${rawProcedures.length} procédures reçues`);

            const parsedProcedures: Procedure[] = [];

            for (const p of rawProcedures) {
                try {
                    if (!p || typeof p !== 'object') continue;

                    const procedure: Procedure = {
                        id: p.id || `temp-${Date.now()}-${parsedProcedures.length}`,
                        name: p.name || p.title || 'Procédure sans titre',
                        description: p.description || '',
                        version: p.version || '1.0.0',
                        category: p.category || 'Général',
                        steps: parseProcedureSteps(p.steps)
                    };

                    parsedProcedures.push(procedure);
                } catch (procError) {
                    console.error(`[Procedures] Erreur procédure:`, procError);
                }
            }
            
            console.log(`[Procedures] ${parsedProcedures.length} valides`);
            
            proceduresCache = parsedProcedures;
            return parsedProcedures;
            
        } catch (error) {
            console.error('[Procedures] Erreur fatale:', error);
            return []; // ← CRITIQUE: TOUJOURS retourner []
        } finally {
            clearTimeout(timeoutId!);
            loadingPromise = null;
        }
    })();

    // Race entre le fetch et le timeout global
    loadingPromise = Promise.race([fetchPromise, timeoutPromise])
        .catch(() => {
            console.warn('[Procedures] Race perdue, retour []');
            return []; // ← GARANTIE ABSOLUE
        });

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
        return []; // ← JAMAIS DE REJET
    }
}

/**
 * Récupère une procédure par son ID
 */
export async function getProcedureById(id: string): Promise<Procedure | undefined> {
    if (!id) return undefined;
    try {
        const procedures = await getProcedures(); // ← utilise getProcedures() pas fetchProcedures()
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