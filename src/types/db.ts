
export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';

export interface Component {
    id: string;
    name: string;
    description: string;
    type: string;
    parameters?: Parameter[];
}

export interface Parameter {
    id?: number;
    component_id: string;
    name: string;
    unit: string;
    min_value: number | null;
    max_value: number | null;
    nominal_value: number | null;
}

export interface Alarm {
    id?: number;
    component_id: string;
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
    component_id: string | null;
    signature: string | null;
}
