
export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';

export interface Equipment {
    id: string;
    name: string;
    description: string;
    type: string;
}

export interface Parameter {
    id?: number;
    equipment_id: string;
    name: string;
    unit: string;
    min_value: number | null;
    max_value: number | null;
    nominal_value: number | null;
}

export interface Alarm {
    id?: number;
    equipment_id: string;
    code: string;
    description: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
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
