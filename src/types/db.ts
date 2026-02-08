export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';

export interface Equipment {
    externalId: string;
    name: string;
    description?: string;
    parentId?: string;
    type?: string;
    subtype?: string;
    systemCode?: string;
    subSystem?: string;
    location?: string;
    manufacturer?: string;
    serialNumber?: string;
    tagNumber?: string;
    documentRef?: string;
    coordinates?: any; // JSON
    svgLayer?: string;
    fireZone?: string;
    linkedParameters?: any; // JSON
    status?: string;
    version: number;
    isImmutable: boolean;
    approvedBy?: string;
    approvedAt?: string; // ISO Date String
    checksum?: string;
    nominalData?: any; // JSON
}

export interface Parameter {
    id?: number;
    equipmentId: string;
    name: string;
    unit?: string;
    dataType?: 'TEXT' | 'NUMERIC' | 'BOOLEAN';
    nominalValue?: number | null;
    minSafe?: number | null;
    maxSafe?: number | null;
    warningHigh?: number | null;
    alarmHigh?: number | null;
    alarmLow?: number | null;
    standardRef?: string;
}

export interface Alarm {
    code: string;
    equipmentId: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    description: string;
    parameter?: string;
    resetProcedure?: string;
    standardRef?: string;
}

export interface LogEntry {
    id: number;
    timestamp: string; // ISO Date String
    type: LogEntryType;
    source: string;
    message: string;
    equipmentId: string | null;
    signature: string | null;
}

export type ProcedureStepType = 'check' | 'scada_check' | 'instruction' | 'group';

export interface ProcedureStep {
    id: string;
    title: string;
    type: ProcedureStepType;
    details?: string;
    steps?: ProcedureStep[];
    validation?: {
        componentId: string;
        parameterKey: string;
        condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
        value?: number | string;
        values?: (number|string)[];
    };
}

export interface Procedure {
    id: string;
    name: string;
    description: string;
    version: string;
    category?: string;
    steps: ProcedureStep[];
}

export interface Annotation {
    id: number;
    equipmentId: string;
    text: string;
    operator: string;
    timestamp: string; // ISO Date String
    xPos: number; // Percentage
    yPos: number; // Percentage
}

export interface Document {
    id: number;
    equipmentId: string;
    imageData: string; // Base64 or data URL
    ocrText: string;
    description: string;
    createdAt: string; // ISO Date String
}

export interface SynopticItem {
    externalId: string;
    name: string;
    type: string;
    parentId?: string;
    groupPath: string;
    elementId: string;
    level: number;
    approvedBy?: string;
    approvalDate?: string;
}
