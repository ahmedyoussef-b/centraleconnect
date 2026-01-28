
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
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
    parameter?: string;
    reset_procedure?: string;
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
    id: number;
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
