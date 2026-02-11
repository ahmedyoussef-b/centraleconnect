// src/lib/vision/equipment-detector.ts

// Mock implementation, TensorFlow.js dependencies will not be used for now.
// import * as tf from '@tensorflow/tfjs';
// import { loadGraphModel } from '@tensorflow/tfjs-converter';

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

/**
 * Détection d'équipements industriels - Simulation
 * Ce module simule la détection d'équipements pour permettre le développement sans
 * nécessiter le téléchargement et la configuration d'un modèle de Machine Learning.
 */
export class EquipmentDetector {
  private model: any | null = null; // Mock model
  
  async initialize(): Promise<void> {
    console.warn("[Detector] Using MOCK EquipmentDetector. No real model will be loaded.");
    this.model = { loaded: true }; // Simulate a loaded model
  }
  
  async detect(image: HTMLImageElement): Promise<EquipmentDetection[]> {
    if (!this.model) throw new Error('Model not loaded. Call initialize() first.');
    
    console.warn("[Detector] detect() is returning MOCK data.");

    // Simuler la détection des équipements que vous avez fournis en exemple
    return [
      {
        equipmentType: "TG1",
        confidence: 94.2,
        boundingBox: {
          x: 120,
          y: 85,
          width: 240,
          height: 320
        }
      },
      {
        equipmentType: "CR1",
        confidence: 88.7,
        boundingBox: {
          x: 450,
          y: 150,
          width: 180,
          height: 210
        }
      }
    ];
  }
}
