// src/lib/vision/trend-analyzer.ts
import { FreeOpenCVService } from './opencv-free';

// --- Interfaces for this module ---

interface Trend {
  type: string;          // 'LEAK', 'CORROSION', etc.
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;    // 0-100
  description: string;
}

export interface TrendAnalysis {
  trends: Trend[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

interface Difference {
  timestamp: string;
  difference: number;
  confidence: number;
}


/**
 * Analyse des tendances temporelles - 100% open source
 */
export class TrendAnalyzer {
  private cvService = new FreeOpenCVService();
  
  async analyze(currentImage: ImageData, historicalImages: ImageData[]): Promise<TrendAnalysis> {
    await this.cvService.initialize();
    
    // 1. Comparer l'image actuelle avec les images historiques
    const differences = this.compareImages(currentImage, historicalImages);
    
    // 2. Analyser les tendances
    return this.analyzeTrends(differences);
  }
  
  private compareImages(current: ImageData, historical: ImageData[]): Difference[] {
    return historical.map(image => {
      // @ts-ignore - compareImages is added to the mock
      const diff = this.cvService.compareImages(current, image);
      return {
        timestamp: new Date().toISOString(),
        difference: diff,
        confidence: this.calculateConfidence(diff)
      };
    });
  }
  
  private analyzeTrends(differences: Difference[]): TrendAnalysis {
    // Analyser les tendances sur les images historiques
    const trends: Trend[] = [];
    
    // Exemple: détection de fuites croissantes
    const leakDifferences = differences.filter(d => 
      d.difference > 0.3 && d.difference < 0.8
    );
    
    if (leakDifferences.length > 2) {
      trends.push({
        type: 'LEAK',
        severity: 'MEDIUM',
        confidence: 85,
        description: 'Fuite détectée avec tendance croissante'
      });
    }
    
    return {
      trends,
      overallRisk: this.calculateOverallRisk(trends),
      recommendation: this.generateRecommendation(trends)
    };
  }

  private calculateConfidence(difference: number): number {
    return Math.min(100, difference * 100);
  }

  private calculateOverallRisk(trends: Trend[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (trends.some(t => t.severity === 'HIGH')) return 'HIGH';
    if (trends.some(t => t.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  private generateRecommendation(trends: Trend[]): string {
    if (trends.length === 0) {
      return 'Aucune tendance anormale détectée. Continuer la surveillance standard.';
    }
    const highRiskTrend = trends.find(t => t.severity === 'HIGH');
    if (highRiskTrend) {
      return `Action immédiate requise pour ${highRiskTrend.type}. Vérifier l'équipement.`;
    }
    return `Surveillance accrue recommandée pour: ${trends.map(t => t.type).join(', ')}.`;
  }
}
