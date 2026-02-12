
// src/lib/vision/fault-detector.ts
import { FreeObjectDetector } from './tflite-free';

// User-defined types from your prompt
export type VisualAnomalyType = 
  | 'FUITES'           // Liquide, gaz, vapeur
  | 'CORROSION'        // Rouille, oxydation
  | 'FISSURES'         // Fissures, cassures
  | 'SURCHAUFFE'       // Points chauds (si thermique)
  | 'DEFORMATION'      // Déformation mécanique
  | 'USURE_ANORMALE'   // Traces d'usure excessive
  | 'POSITION_INCORRECTE' // Vanne mal positionnée
  | 'OBSTRUCTION'      // Filtre bouché, accès bloqué
  | 'ETIQUETAGE'       // Étiquette manquante/illisible
  | 'PROPRETE'         // Nettoyage requis
  | 'AUTRE';

export interface VisualAnomalyDetection {
  type: VisualAnomalyType;
  boundingBox: [number, number, number, number]; // x,y,w,h
  confidence: number;
  
  severity: 'INFO' | 'AVERTISSEMENT' | 'URGENT' | 'CRITIQUE';
  
  suggestedAction?: string;
  suggestedProcedure?: string;
  
  similarPastIncidents?: {
    date: string;
    resolution: string;
    imageId: string;
  }[];
}


/**
 * Détection d'anomalies visuelles - 100% open source
 * Modèle entraîné sur des images d'anomalies industrielles
 */
export class FaultDetector {
  private detector: FreeObjectDetector;
  
  constructor() {
    this.detector = new FreeObjectDetector();
  }
  
  async initialize(): Promise<void> {
    // Charger un modèle spécialement entraîné pour les défauts
    await this.detector.loadModel('/models/fault-detector.tflite');
  }
  
  async detect(image: HTMLImageElement): Promise<VisualAnomalyDetection[]> {
    const detections = await this.detector.detect(image);
    
    return detections
      .filter((d: any) => d.score > 0.6) // Filter with a threshold
      .map((d: any) => ({
        type: this.mapFaultType(d.className),
        confidence: d.score * 100,
        boundingBox: [d.bbox.x, d.bbox.y, d.bbox.width, d.bbox.height],
        severity: this.calculateSeverity(d.score),
        suggestedAction: this.getSuggestedAction(this.mapFaultType(d.className)),
      }));
  }
  
  private mapFaultType(className: string): VisualAnomalyType {
    const mapping: Record<string, VisualAnomalyType> = {
      'leak': 'FUITES',
      'crack': 'FISSURES',
      'vibration': 'USURE_ANORMALE', // vibration isn't visual, map to wear
      'overheat': 'SURCHAUFFE',
      'corrosion': 'CORROSION'
    };
    return mapping[className] || 'AUTRE';
  }
  
  private calculateSeverity(score: number): VisualAnomalyDetection['severity'] {
    if (score > 0.95) return 'CRITIQUE';
    if (score > 0.85) return 'URGENT';
    if (score > 0.70) return 'AVERTISSEMENT';
    return 'INFO';
  }

  private getSuggestedAction(type: VisualAnomalyType): string {
    switch(type) {
        case 'FUITES': return 'Isoler le circuit et inspecter le joint.';
        case 'FISSURES': return 'Demander une inspection par ultrasons.';
        case 'CORROSION': return 'Planifier un traitement de surface et une inspection de l\'intégrité.';
        case 'SURCHAUFFE': return 'Vérifier la ventilation et les points de lubrification.';
        case 'USURE_ANORMALE': return 'Vérifier l\'alignement et la lubrification des paliers.';
        default: return 'Inspection manuelle requise.';
    }
  }
}
