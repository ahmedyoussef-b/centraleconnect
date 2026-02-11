// src/lib/ocr/safety-label-detector.ts
import { FreeOCREngine } from './tesseract-free';

/**
 * Détection d'étiquettes de sécurité - 100% open source
 */
export class SafetyLabelDetector {
  private ocrEngine = new FreeOCREngine();
  private safetyLabels: Record<string, Omit<SafetyLabel, 'detectedAt' | 'confidence'>> = SAFETY_LABELS_DB;
  
  constructor() {
    this.ocrEngine.initialize('fra');
  }
  
  async detect(image: HTMLImageElement): Promise<SafetyLabel[]> {
    // 1. Extrait le texte de l'image
    const ocrResult = await this.ocrEngine.recognize(image);
    
    // 2. Recherche les étiquettes de sécurité dans le texte
    return this.findSafetyLabels(ocrResult.rawText);
  }
  
  private findSafetyLabels(text: string): SafetyLabel[] {
    const foundLabels: SafetyLabel[] = [];
    
    // Rechercher toutes les étiquettes connues
    Object.values(this.safetyLabels).forEach(label => {
      if (text.toUpperCase().includes(label.keyword)) {
        foundLabels.push({
          ...label,
          detectedAt: new Date().toISOString(),
          confidence: this.calculateConfidence(text, label.keyword)
        });
      }
    });
    
    return foundLabels;
  }
  
  private calculateConfidence(text: string, keyword: string): number {
    // Calcul de la confiance basé sur la position et la clarté
    return Math.min(100, text.indexOf(keyword) * 0.5 + 50);
  }
}

// Base de données des étiquettes de sécurité
const SAFETY_LABELS_DB: Record<string, Omit<SafetyLabel, 'detectedAt' | 'confidence'>> = {
  'HAUTE_TENSION': {
    type: 'ELECTRICAL',
    keyword: 'HAUTE TENSION',
    description: 'Risque d\'électrocution',
    requiredAction: 'Porter des EPI spécifiques',
    severity: 'HIGH'
  },
  'RISQUE_EXPLOSION': {
    type: 'CHEMICAL',
    keyword: 'RISQUE D\'EXPLOSION',
    description: 'Matériaux inflammables présents',
    requiredAction: 'Interdiction de fumer',
    severity: 'HIGH'
  },
  'TEMPERATURE_ELEVEE': {
    type: 'THERMAL',
    keyword: 'TEMPÉRATURE ÉLEVÉE',
    description: 'Surface chaude',
    requiredAction: 'Porter des gants isolants',
    severity: 'MEDIUM'
  }
};

export interface SafetyLabel {
  type: string;          // 'ELECTRICAL', 'CHEMICAL', etc.
  keyword: string;       // Mot-clé détecté
  description: string;   // Description de l'étiquette
  requiredAction: string; // Action requise
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detectedAt?: string;    // Date de détection
  confidence?: number;    // 0-100
}