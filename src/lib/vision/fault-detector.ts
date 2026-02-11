// src/lib/vision/fault-detector.ts
import { FreeObjectDetector } from './tflite-free';

/**
 * Détection de défauts visuels - 100% open source
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
  
  async detect(image: HTMLImageElement): Promise<Fault[]> {
    const detections = await this.detector.detect(image);
    
    return detections
      .filter(d => d.score > 0.7) // Seulement les détections fiables
      .map(d => ({
        faultType: this.mapFaultType(d.className),
        confidence: d.score * 100,
        boundingBox: d.bbox,
        severity: this.calculateSeverity(d.score)
      }));
  }
  
  private mapFaultType(className: string): string {
    const mapping: Record<string, string> = {
      'leak': 'LEAK',
      'crack': 'CRACK',
      'vibration': 'VIBRATION',
      'overheat': 'OVERHEAT',
      'corrosion': 'CORROSION'
    };
    return mapping[className] || 'UNKNOWN';
  }
  
  private calculateSeverity(confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (confidence > 0.9) return 'HIGH';
    if (confidence > 0.75) return 'MEDIUM';
    return 'LOW';
  }
}

export interface Fault {
  faultType: string;      // 'LEAK', 'CRACK', etc.
  confidence: number;     // 0-100
  boundingBox: any;       // {x, y, width, height}
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}
