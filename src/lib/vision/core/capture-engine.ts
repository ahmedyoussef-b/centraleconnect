// src/lib/vision/core/capture-engine.ts
'use client';

import { EquipmentDetector, type EquipmentDetection } from '../detection/equipment-detector';
import { FaultDetector, type VisualAnomalyDetection } from '../detection/anomaly-detector';
import { performIndustrialOCR, type OCRExtractionResult } from '../detection/ocr-processor';
import { computePHash } from './hasher';
import { addLogEntry } from '@/lib/db-service';

// --- Type Definitions ---

// Based on the Prisma schema provided for VisualEvidence
export interface VisualEvidence {
  id: string;
  type: 'PHOTO' | 'VIDEO';
  blob: Blob;
  sha256: string;
  phash?: string;
  context: {
    equipmentId?: string;
    location?: string;
    userId: string;
    timestamp: Date;
  };
  analysis: {
    equipment: EquipmentDetection[];
    anomalies: VisualAnomalyDetection[];
    ocr: OCRExtractionResult;
    confidence: number; // Overall confidence
  } | null;
  signature: string; // For chain of trust
}

/**
 * Orchestrates the entire process of capturing and analyzing an image.
 * This engine is responsible for image optimization, hashing, running AI models,
 * contextualizing results, and saving the final evidence.
 */
export class CaptureEngine {
  private equipmentDetector = new EquipmentDetector();
  private faultDetector = new FaultDetector();
  private isInitialized = false;

  /**
   * Initializes the AI models required for analysis.
   * This should be called once before processing images.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    console.log('[CaptureEngine] Initializing analysis models...');
    
    // Note: We are using the existing TF.js and Tesseract.js models
    // from the project instead of TFLite for consistency.
    await Promise.all([
      this.equipmentDetector.initialize(),
      this.faultDetector.initialize(),
      // Tesseract.js is initialized on-the-fly by its wrapper.
    ]);
    
    this.isInitialized = true;
    console.log('[CaptureEngine] All models initialized.');
  }

  /**
   * Processes a given image file through the full analysis pipeline.
   * @param file The image file (from an <input> or a camera capture).
   * @returns A structured VisualEvidence object.
   */
  async processImage(file: File | Blob): Promise<VisualEvidence> {
    if (!this.isInitialized) {
        throw new Error("CaptureEngine is not initialized. Please call initialize() first.");
    }
    
    // 1. Image Optimization (Placeholder)
    const optimizedBlob = await this.optimizeImage(file);
    const imageUrl = URL.createObjectURL(optimizedBlob);

    // 2. Hashing (Integrity & Deduplication)
    const [sha256, phash] = await Promise.all([
        this.computeSHA256(optimizedBlob),
        computePHash(imageUrl)
    ]);
    console.log(`[CaptureEngine] Hashes computed. SHA256: ${sha256.substring(0,10)}..., p-hash: ${phash}`);


    // 3. Duplicate Check (Placeholder)
    const existing = await this.findDuplicate(phash);
    if (existing) {
      console.log(`[CaptureEngine] Duplicate found for phash ${phash}. Merging results.`);
      // return this.mergeWithExisting(existing, optimizedBlob);
      // For now, we continue to process for demonstration purposes.
    }

    // 4. Parallel Analysis
    console.log('[CaptureEngine] Starting parallel analysis...');
    const imageElement = await this.blobToImage(optimizedBlob);

    const [equipment, anomalies, ocr] = await Promise.all([
      this.equipmentDetector.detect(imageElement),
      this.faultDetector.detect(imageElement),
      this.extractText(imageUrl)
    ]);
    console.log('[CaptureEngine] Analysis complete.', { equipment, anomalies, ocr: ocr.rawText.substring(0, 50) + '...'});
    
    // 5. Contextual Inference (Placeholder)
    const context = await this.inferContext({
      equipment,
      // location: await this.getCurrentLocation(),
      // user: await this.getCurrentUser()
    });
    
    // 6. Save Evidence (Placeholder)
    const evidence = await this.saveEvidence({
      blob: optimizedBlob,
      sha256,
      phash,
      analysis: { equipment, anomalies, ocr, confidence: this.calculateOverallConfidence(equipment, anomalies, ocr) },
      context: { userId: 'Operator1', timestamp: new Date(), ...context }
    });

    // 7. Trigger Business Logic (Placeholder)
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITIQUE' && a.confidence > 80);
    if (criticalAnomalies.length > 0) {
      console.warn(`[CaptureEngine] CRITICAL ANOMALY DETECTED: ${criticalAnomalies[0].type}`);
      await this.createEmergencyWorkOrder(evidence);
    }
    
    URL.revokeObjectURL(imageUrl);
    return evidence;
  }

  // --- Pipeline Steps ---

  private async optimizeImage(blob: Blob): Promise<Blob> {
    console.log('[CaptureEngine] Step 1: Optimizing image (placeholder).');
    // Placeholder: In a real scenario, this would involve resizing the image
    // and compressing it using canvas to reduce its size.
    return blob;
  }

  private async computeSHA256(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async findDuplicate(phash: string): Promise<VisualEvidence | null> {
    console.log(`[CaptureEngine] Step 3: Checking for duplicates with p-hash: ${phash} (placeholder).`);
    // Placeholder: This would query the database (local or remote)
    // for an entry with a similar perceptual hash.
    return null;
  }

  private async extractText(imageUrl: string): Promise<OCRExtractionResult> {
    // We use the existing wrapper which handles Tesseract.js internally.
    return performIndustrialOCR(imageUrl, { zone: 'UNKNOWN' });
  }

  private async inferContext(analysisData: { equipment: EquipmentDetection[] }): Promise<Partial<VisualEvidence['context']>> {
    console.log('[CaptureEngine] Step 5: Inferring context (placeholder).');
    // Placeholder: Logic to determine the primary equipment from detections.
    const primaryEquipment = analysisData.equipment.sort((a,b) => b.confidence - a.confidence)[0];
    return {
      equipmentId: primaryEquipment?.equipmentType, // Simplified for demo
    };
  }

  private async saveEvidence(data: Omit<VisualEvidence, 'id' | 'signature' | 'type'> & { blob: Blob }): Promise<VisualEvidence> {
    console.log('[CaptureEngine] Step 6: Saving evidence (placeholder).');
    // Placeholder: This would save the VisualEvidence metadata to the database
    // and the blob to a local file store (Tauri) or cloud storage (Web).
    const evidence: VisualEvidence = {
      id: `VE-${Date.now()}`,
      type: 'PHOTO',
      signature: 'UNSIGNED_PLACEHOLDER', // Signature would be calculated based on previous entry
      ...data,
    };
    
    // Log the creation event
    await addLogEntry({
        type: 'DOCUMENT_ADDED',
        source: 'CaptureEngine',
        message: `Nouvelle preuve visuelle créée pour ${data.context.equipmentId || 'équipement inconnu'}.`,
        equipmentId: data.context.equipmentId
    });

    return evidence;
  }

  private async createEmergencyWorkOrder(evidence: VisualEvidence): Promise<void> {
    console.warn(`[CaptureEngine] Step 7: Creating emergency work order for evidence ${evidence.id} (placeholder).`);
    // Placeholder: This would integrate with a maintenance or ticketing system API.
  }

  // --- Utility Methods ---

  private async blobToImage(blob: Blob): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    return new Promise((resolve, reject) => {
        img.onload = () => {
            // No need to revoke here, it will be done after all analyses
            resolve(img);
        }
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
  }

  private calculateOverallConfidence(equipment: EquipmentDetection[], anomalies: VisualAnomalyDetection[], ocr: OCRExtractionResult): number {
      const confidences = [
          ...equipment.map(e => e.confidence),
          ...anomalies.map(a => a.confidence),
          ocr.confidence
      ];
      if (confidences.length === 0) return 0;
      return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}
