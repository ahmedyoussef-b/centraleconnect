// src/types/db.ts
export type LogEntryType = 'AUTO' | 'MANUAL' | 'DOCUMENT_ADDED';

export interface FunctionalNode {
  id: string;
  external_id: string;
  name: string;
  type: string;
  description?: string;
  parentId?: string;
  coordinates?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  parameters?: string[];
  equipmentId?: string;
  criticality?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'normal' | 'warning' | 'critical' | 'maintenance';
  ui?: {
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

// AMÉLIORATION: Types plus complets pour l'analyse d'image
export interface Anomaly {
  type: string;
  severity: 'CRITIQUE' | 'URGENT' | 'AVERTISSEMENT' | 'INFO';
  confidence: number;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description?: string;
}

export interface AnalysisMetadata {
  modelName?: string;
  modelVersion?: string;
  processingTime?: number;
  timestamp?: string;
  confidence?: number;
}

export interface DocumentAnalysis {
  anomalies?: Anomaly[];
  metadata?: AnalysisMetadata;
  summary?: string;
  ocrText?: string;
  tags?: string[];
}

export interface User {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

// AMÉLIORATION: Type Document plus complet
export interface Document {
  id: number;
  equipmentId: string;
  imageData: string; // Base64
  description?: string;
  createdAt: string;
  perceptualHash?: string | null;
  
  // Analyse
  analysis?: DocumentAnalysis;
  
  // Annotations
  annotations?: Annotation[];
  
  // Métadonnées utilisateur
  createdBy?: User;
  
  // OCR
  ocrText?: string;
  
  // Statut
  status?: 'pending' | 'analyzed' | 'reviewed' | 'archived';
  
  // Tags pour recherche
  tags?: string[];
  
  // Pour la traçabilité
  version?: number;
  validatedBy?: string;
  validatedAt?: string;
}

// Type pour la création d'un document (sans les champs auto-générés)
export interface DocumentCreateInput {
  equipmentId: string;
  imageData: string;
  description?: string;
  createdBy?: User;
  tags?: string[];
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
export const createAnomaly = (
  type: string,
  severity: Anomaly['severity'] = 'AVERTISSEMENT',
  confidence: number = 85
): Anomaly => ({
  type,
  severity,
  confidence,
  description: `${type} détectée`
});
