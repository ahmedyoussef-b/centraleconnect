// src/types/db.ts
export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';
export interface FunctionalNode {
  id: string;                              // Identifiant unique
  external_id: string;                     // Format: B2.LUB.TPF
  name: string;                            // Nom lisible
  type: string;                            // Type: 'pump', 'valve', 'sensor', etc.
  description?: string;                    // Description optionnelle
  parentId?: string;                       // Nœud parent hiérarchique
  coordinates?: {                          // Position dans le schéma
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  parameters?: string[];                   // Paramètres SCADA associés
  equipmentId?: string;                    // Lien vers l'équipement
  criticality?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'normal' | 'warning' | 'critical' | 'maintenance';
  ui?: {                                   // Propriétés d'affichage
    color?: string;
    icon?: string;
    shape?: 'circle' | 'rectangle' | 'triangle' | 'custom';
  };
}
export interface Component {
  id: string;
  name: string;
  type: string;
  description: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  equipmentId?: string;
  externalId?: string;
  maxResponseTime?: number;
  isValidated?: boolean;
  ui?: {
    path: string;
    color: string;
    hoverEffect?: 'pulse' | 'glow';
    criticalityX?: number;
    criticalityY?: number;
  };
  alarms?: any[];
  procedures?: any[];
}

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
  coordinates?: any;
  svgLayer?: string;
  fireZone?: string;
  linkedParameters?: any;
  status?: string;
  version: number;
  isImmutable: boolean;
  approvedBy?: string;
  approvedAt?: string;
  commissioningDate?: string;
  checksum?: string;
  nominalData?: any;
}

export interface Parameter {
  id?: number;
  equipmentId: string;
  name: string;
  unit?: string;
  nominalValue?: number | null;
  minSafe?: number | null;
  maxSafe?: number | null;
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
  timestamp: string;
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
  timestamp: string;
  xPos: number;
  yPos: number;
}

export interface Document {
  id: number;
  equipmentId: string;
  imageData: string;
  ocrText?: string;
  description?: string;
  createdAt: string;
  perceptualHash?: string | null;
  // Fields for VisualEvidenceCard compatibility
  analysis?: {
    anomalies?: {
      type: string;
      severity: string;
      confidence: number;
    }[];
  };
  annotations?: any[];
  createdBy?: {
      name: string;
  }
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

export interface AlarmEvent {
  id: number;
  timestamp: string;
  isActive: boolean;
  details?: string | null;
  alarmCode: string;
}

export interface ScadaData {
  id: number;
  timestamp: string;
  value: number;
  equipmentId: string;
}
