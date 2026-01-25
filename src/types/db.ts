
export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';

export interface Equipment {
    id: string;
    name: string;
    description: string;
    type: string;
}

export interface LogEntry {
    id: number;
    timestamp: string;
    type: LogEntryType;
    source: string;
    message: string;
    equipment_id: string | null;
    signature: string | null;
}
