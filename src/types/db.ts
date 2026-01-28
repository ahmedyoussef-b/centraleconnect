
export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';

export interface Component {
    tag: string;
    name: string;
    type: string;
    subtype?: string;
    manufacturer?: string;
    serialNumber?: string;
    location?: string;
}

export interface Parameter {
    id?: number;
    component_tag: string;
    key: string;
    name: string;
    unit: string;
    nominal_value: number | null;
    min_safe: number | null;
    max_safe: number | null;
    alarm_high: number | null;
    alarm_low: number | null;
    standard_ref: string | null;
}

export interface Alarm {
    code: string;
    component_tag: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    description: string;
    parameter?: string;
    reset_procedure?: string;
    standard_ref?: string;
}

export interface LogEntry {
    id: number;
    timestamp: string;
    type: LogEntryType;
    source: string;
    message: string;
    component_tag: string | null;
    functional_node_id: string | null;
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
    steps: ProcedureStep[];
}

export interface FunctionalNode {
    external_id: string;
    system: string;
    subsystem: string;
    document: string | null;
    tag: string | null;
    type: string;
    name: string;
    description: string | null;
    location: string | null;
    coordinates: any;
    linked_parameters: any;
    svg_layer: string | null;
    fire_zone: string | null;
    status: string;
    checksum: string;
    created_at: string;
    updated_at: string;
    approved_by: string | null;
    approved_at: string | null;
  }

export interface Annotation {
    id: number;
    functional_node_external_id: string;
    text: string;
    operator: string;
    timestamp: string;
    x_pos: number; // Percentage
    y_pos: number; // Percentage
}

export interface Document {
    id: number;
    component_tag: string;
    imageData: string;
    ocrText: string;
    description: string;
    createdAt: string;
}
