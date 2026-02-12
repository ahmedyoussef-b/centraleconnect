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
    
    // The `steps` are stored as a JSON string in the DB. We need to parse them.
    // Also, 'category' is not in the db, we infer it from the json for now.
    const proceduresData = (await import('@/assets/master-data/procedures.json')).default;
    const categoryMap = proceduresData.reduce((acc, p) => {
        acc[p.id] = p.category;
        return acc;
    }, {} as Record<string, string>);


    const parsedProcedures = rawProcedures.map((p: any) => ({
        ...p,
        steps: typeof p.steps === 'string' ? JSON.parse(p.steps) : p.steps,
        category: categoryMap[p.id] || 'Autres',
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
