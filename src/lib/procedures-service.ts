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
        // The `steps` can be a JSON string (Tauri/SQLite) or already an object (Web API/Prisma)
        // It can also be null if a procedure has no steps defined.
        steps: (typeof p.steps === 'string' && p.steps) ? JSON.parse(p.steps) : (p.steps || []),
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
