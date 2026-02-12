
import type { Procedure, ProcedureStep } from '@/types/db';

let proceduresCache: Procedure[] | null = null;

async function fetchProcedures(): Promise<Procedure[]> {
    if (proceduresCache) {
        return proceduresCache;
    }

    const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
    let rawProcedures: any[] = [];

    if (isTauri) {
        const { getProcedures: getProceduresTauri } = await import('@/lib/tauri-client');
        rawProcedures = await getProceduresTauri();
    } else {
        const response = await fetch('/api/procedures');
        if (!response.ok) {
            console.error("Failed to fetch procedures from web API");
            return [];
        }
        rawProcedures = await response.json();
    }
    
    // Correction de la logique de parsing pour être plus robuste
    const parsedProcedures = rawProcedures.map((p: any) => {
        let parsedSteps: ProcedureStep[] = [];
        
        // Gère les données venant de Tauri (stringified JSON) et de l'API web (objet JSON)
        let stepsData = p.steps;

        if (typeof stepsData === 'string' && stepsData) {
            try {
                // Tentative de parser la chaîne
                const parsed = JSON.parse(stepsData);
                if (Array.isArray(parsed)) {
                    parsedSteps = parsed;
                }
            } catch (e) {
                console.error(`[Procedures Service] Impossible de parser les étapes JSON pour la procédure ${p.id}:`, stepsData, e);
                // Laisser parsedSteps comme un tableau vide en cas d'erreur de parsing
            }
        } else if (Array.isArray(stepsData)) {
            // Si c'est déjà un tableau (cas de l'API web), on l'utilise directement
            parsedSteps = stepsData;
        }

        return {
            ...p,
            steps: parsedSteps, // Garantit que `steps` est toujours un tableau
            category: p.category || 'Autres',
        };
    });
    
    proceduresCache = parsedProcedures;
    return parsedProcedures;
}

export async function getProcedures(): Promise<Procedure[]> {
    return await fetchProcedures();
}

export async function getProcedureById(id: string): Promise<Procedure | undefined> {
    const procedures = await fetchProcedures();
    return procedures.find(p => p.id === id);
}
