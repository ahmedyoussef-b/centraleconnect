import proceduresData from '@/assets/master-data/procedures.json';
import type { Procedure } from '@/types/db';

export function getProcedures(): Procedure[] {
    return proceduresData as Procedure[];
}

export function getProcedureById(id: string): Procedure | undefined {
    return (proceduresData as Procedure[]).find(p => p.id === id);
}
