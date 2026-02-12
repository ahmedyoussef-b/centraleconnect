
import type { Procedure } from '@/types/db';

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
        let finalSteps: any[] = [];
        if (typeof p.steps === 'string' && p.steps && p.steps !== 'null') {
            try {
                const parsed = JSON.parse(p.steps);
                if (Array.isArray(parsed)) {
                    finalSteps = parsed;
                }
            } catch (e) {
                console.error(`Failed to parse steps for procedure ${p.id}:`, p.steps, e);
                // Laisser finalSteps comme un tableau vide en cas d'erreur
            }
        } else if (Array.isArray(p.steps)) {
            // Gérer le cas où les données sont déjà un objet (API web)
            finalSteps = p.steps;
        }

        return {
            ...p,
            steps: finalSteps,
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
