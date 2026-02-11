// src/lib/vision/equipment-detector.ts
import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

export interface EquipmentDetection {
  equipmentType: string;    // 'TG1', 'CR1', etc.
  confidence: number;       // 0-100%
  boundingBox: {           // Pour localisation sur P&ID
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Classes d'équipements spécifiques aux centrales
const EQUIPMENT_CLASSES: { [key: number]: string } = {
  0: 'TG1', 1: 'TG2', 2: 'TV', 3: 'CR1', 4: 'CR2', 5: 'HRSG', 6: 'POMPE_CIRCULATION',
  7: 'VANNE_REGULATION', 8: 'CHAUDIERE', 9: 'CONDUCTEUR', 10: 'BOUTON_EMERGENCE'
};

/**
 * Détection d'équipements industriels
 * Modèle entraîné sur des images de centrales électriques
 */
export class EquipmentDetector {
  private model: tf.GraphModel | null = null;
  
  async initialize(modelUrl: string = '/models/equipment-detector/model.json'): Promise<void> {
    if (this.model) {
        console.log('[Detector] Model already loaded.');
        return;
    }
    console.log('[Detector] Loading model from:', modelUrl);
    try {
        this.model = await loadGraphModel(modelUrl);
        console.log('[Detector] Model loaded successfully.');
    } catch(e) {
        console.error('[Detector] Failed to load model', e);
        throw new Error("Le modèle de détection d'équipement n'a pas pu être chargé.");
    }
  }
  
  async detect(image: HTMLImageElement): Promise<EquipmentDetection[]> {
    if (!this.model) throw new Error('Le modèle de détection n\'a pas été initialisé. Appelez initialize() d\'abord.');
    
    console.log('[Detector] Starting detection...');
    
    // Prétraitement pour environnement industriel
    const tensor = tf.browser.fromPixels(image)
      .resizeBilinear([300, 300]) // Common size for COCO-SSD
      .toFloat()
      .expandDims(0);
    
    // Inférence
    const predictions = await this.model.executeAsync(tensor) as tf.Tensor[];
    
    // Nettoyer les tenseurs de l'entrée
    tensor.dispose();
    
    // Parser les résultats
    const results = this.parsePredictions(predictions, image.width, image.height);
    
    // Nettoyer les tenseurs de sortie
    predictions.forEach(t => t.dispose());

    console.log(`[Detector] Detection finished. Found ${results.length} objects.`);
    return results;
  }
  
  private parsePredictions(predictions: tf.Tensor[], imageWidth: number, imageHeight: number): EquipmentDetection[] {
    // La structure de sortie dépend du modèle. On suppose ici une structure commune de type SSD.
    // [boxes, classes, scores, num_detections]
    const boxes = predictions[0].dataSync();
    const classes = predictions[1].dataSync();
    const scores = predictions[2].dataSync();
    const numDetections = predictions[3].dataSync()[0];

    const detections: EquipmentDetection[] = [];

    for (let i = 0; i < numDetections; i++) {
        const score = scores[i];
        if (score > 0.6) { // Seuil de confiance
            const classId = classes[i];
            
            // Les coordonnées sont normalisées [ymin, xmin, ymax, xmax]
            const ymin = boxes[i * 4] * imageHeight;
            const xmin = boxes[i * 4 + 1] * imageWidth;
            const ymax = boxes[i * 4 + 2] * imageHeight;
            const xmax = boxes[i * 4 + 3] * imageWidth;
            
            detections.push({
              equipmentType: EQUIPMENT_CLASSES[classId] || 'INCONNU',
              confidence: score * 100,
              boundingBox: {
                y: ymin,
                x: xmin,
                height: ymax - ymin,
                width: xmax - xmin,
              }
            });
        }
    }
    return detections;
  }
}
