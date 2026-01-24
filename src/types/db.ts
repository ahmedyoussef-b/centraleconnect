
export interface Equipment {
    id: string;
    name: string;
    description: string;
    type: string;
}

export interface LogEntry {
    id: number;
    timestamp: string;
    type: 'AUTO' | 'MANUAL';
    source: string;
    message: string;
    equipment_id: string | null;
}
