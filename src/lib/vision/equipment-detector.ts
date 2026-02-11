// src/lib/vision/equipment-detector.ts
import * as tf from '@tensorflow/tfjs';
import { loadGraphModel, GraphModel } from '@tensorflow/tfjs-converter';

export interface EquipmentDetection {
  equipmentType: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const EQUIPMENT_CLASSES: { [key: number]: string } = {
  1: 'TG1', 2: 'TG2', 3: 'TV', 4: 'CR1', 5: 'CR2', 6: 'HRSG', 
  7: 'POMPE_CIRCULATION', 8: 'VANNE_REGULATION', 9: 'CHAUDIERE',
  10: 'CONDUCTEUR', 11: 'BOUTON_EMERGENCE'
};

const CONFIDENCE_THRESHOLD = 0.6; // 60%

/**
 * Détection d'équipements industriels - 100% open source
 * Ce service est optimisé pour être robuste et gérer les erreurs.
 * En cas d'échec de chargement du modèle, il bascule sur une simulation.
 */
export class EquipmentDetector {
  private model: GraphModel | { mock: boolean } | null = null;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    try {
      console.log("[Detector] Tentative de chargement du modèle TensorFlow.js...");
      this.model = await loadGraphModel('/models/equipment-detector/model.json');
      console.log("[Detector] Modèle TensorFlow.js chargé avec succès.");
    } catch (error) {
      console.warn("[Detector] AVERTISSEMENT : Le chargement du modèle a échoué. L'application va utiliser un mode de simulation pour la détection d'équipements.", error);
      this.model = { mock: true }; // Fallback to mock mode
    } finally {
        this.isInitializing = false;
    }
  }

  async detect(image: HTMLImageElement): Promise<EquipmentDetection[]> {
    if (!this.model) {
      await this.initialize();
    }
    
    // Si le modèle est une simulation
    if (this.model && 'mock' in this.model) {
      console.warn("[Detector] Exécution en mode simulation. Retour de données factices.");
      return this.getMockDetections();
    }

    // Si le modèle est un vrai modèle TF
    if (this.model) {
        return tf.tidy(() => {
            console.log("[Detector] Démarrage de la détection...");
            const tensor = tf.browser.fromPixels(image).resizeBilinear([640, 640]).expandDims(0);
            const predictions = this.model!.execute(tensor) as tf.Tensor[];
            const parsed = this.parsePredictions(predictions);
            console.log(`[Detector] Détection terminée. ${parsed.length} objets trouvés.`);
            return parsed;
        });
    }
    
    return [];
  }

  private getMockDetections(): EquipmentDetection[] {
    return [
      {
        equipmentType: "TG1",
        confidence: 94.2,
        boundingBox: { x: 0.15, y: 0.2, width: 0.3, height: 0.5 }
      },
      {
        equipmentType: "CR1",
        confidence: 88.7,
        boundingBox: { x: 0.6, y: 0.4, width: 0.25, height: 0.3 }
      }
    ];
  }

  private parsePredictions(predictions: tf.Tensor[]): EquipmentDetection[] {
    // La structure de sortie dépend du modèle. Format commun: [boxes, scores, classes, num_detections]
    const boxes = predictions[4].dataSync();   // Format [y1, x1, y2, x2] normalisé
    const scores = predictions[1].dataSync();  // Scores de confiance
    const classes = predictions[2].dataSync(); // Index des classes
    const numDetections = predictions[0].dataSync()[0];

    const detections: EquipmentDetection[] = [];

    for (let i = 0; i < numDetections && i < scores.length; i++) {
      const score = scores[i];
      if (score > CONFIDENCE_THRESHOLD) {
        const classIndex = classes[i];
        const className = EQUIPMENT_CLASSES[classIndex] || 'UNKNOWN';

        const [y1, x1, y2, x2] = [
            boxes[i * 4],
            boxes[i * 4 + 1],
            boxes[i * 4 + 2],
            boxes[i * 4 + 3],
        ];
        
        detections.push({
          equipmentType: className,
          confidence: score * 100,
          boundingBox: {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y2 - y1
          }
        });
      }
    }
    return detections;
  }
}
