// src/lib/vision/environment-analyzer.ts

import type { EquipmentDetection } from './equipment-detector';

export interface EnvironmentAnalysis {
  zone: string;        // 'B0', 'B1', 'B2', 'B3','C0'
  confidence: number;  // 0-100
  features: string[];  // Caractéristiques détectées
}

/**
 * Analyse de l'environnement - 100% open source.
 * Détermine la zone fonctionnelle basée sur les équipements détectés dans une image.
 */
export class EnvironmentAnalyzer {
  
  /**
   * Analyze the detected equipments to determine the functional zone.
   * @param detections - An array of equipment detections from EquipmentDetector.
   * @returns An EnvironmentAnalysis object.
   */
  public analyze(detections: EquipmentDetection[]): EnvironmentAnalysis {
    const zone = this.determineZone(detections);
    
    return {
      zone,
      confidence: this.calculateConfidence(zone, detections),
      features: this.extractFeatures(detections)
    };
  }
  
  private determineZone(detections: EquipmentDetection[]): string {
    const zoneKeywords: Record<string, number> = {
      'B0': 0, 'B1': 0, 'B2': 0, 'B3': 0, 'C0': 0,
    };
    
    if (detections.length === 0) {
        return 'UNKNOWN';
    }

    detections.forEach(d => {
      // Simple mapping from equipment type to zone.
      // This would be more complex in a real scenario.
      if (d.equipmentType.includes('TG')) {
        zoneKeywords.B1++;
      } else if (d.equipmentType.includes('TV') || d.equipmentType.includes('CR')) {
        zoneKeywords.B2++;
      } else if (d.equipmentType.includes('HRSG') || d.equipmentType.includes('CHAUDIERE')) {
        zoneKeywords.B3++;
      } else if (d.equipmentType.includes('POMPE') || d.equipmentType.includes('VANNE')) {
        zoneKeywords.B0++;
      } else if (d.equipmentType.includes('BOUTON')) {
        zoneKeywords.C0++;
      }
    });
    
    // Return the zone with the highest score.
    const bestZone = Object.keys(zoneKeywords).reduce((a, b) => 
      zoneKeywords[a] > zoneKeywords[b] ? a : b
    );

    // If no specific equipment was detected, we can't determine a zone.
    if (zoneKeywords[bestZone] === 0) {
        return 'UNKNOWN';
    }
    
    return bestZone;
  }

  private calculateConfidence(zone: string, detections: EquipmentDetection[]): number {
    if (zone === 'UNKNOWN' || detections.length === 0) {
      return 0;
    }
    // Average confidence of detections that contributed to the winning zone.
    const relevantDetections = detections.filter(d => {
        if (zone === 'B1' && d.equipmentType.includes('TG')) return true;
        if (zone === 'B2' && (d.equipmentType.includes('TV') || d.equipmentType.includes('CR'))) return true;
        if (zone === 'B3' && (d.equipmentType.includes('HRSG') || d.equipmentType.includes('CHAUDIERE'))) return true;
        if (zone === 'B0' && (d.equipmentType.includes('POMPE') || d.equipmentType.includes('VANNE'))) return true;
        if (zone === 'C0' && d.equipmentType.includes('BOUTON')) return true;
        return false;
    });

    if (relevantDetections.length === 0) return 0;

    const totalConfidence = relevantDetections.reduce((acc, d) => acc + d.confidence, 0);
    return totalConfidence / relevantDetections.length;
  }

  private extractFeatures(detections: EquipmentDetection[]): string[] {
    // Simply return the list of detected equipment types.
    return [...new Set(detections.map(d => d.equipmentType))];
  }
}
