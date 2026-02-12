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
    
    const parsedProcedures = rawProcedures.map((p: any) => ({
        ...p,
        // The `steps` are stored as a JSON string in the SQLite DB, but as a JSON object from the API.
        steps: typeof p.steps === 'string' ? JSON.parse(p.steps) : p.steps,
        // The category now comes directly from the DB/API. We just provide a fallback.
        category: p.category || 'Autres',
    }));
    
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
