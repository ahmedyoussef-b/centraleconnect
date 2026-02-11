// src/lib/vision/pid-analyzer.ts
import { FreeOpenCVService } from './opencv-free';

// These interfaces are based on the user's example output
interface PIDComponent {
  type: string;
  boundingBox: {x: number, y: number, width: number, height: number};
  identifier: string;
}

interface Flow {
  from: string;
  to: string;
  direction: string;
  type: string;
}

interface Label {
  text: string;
  position: {x: number, y: number};
}

export interface PIDAnalysis {
  components: PIDComponent[];
  flows: Flow[];
  labels: Label[];
  confidence: number;
}


/**
 * Analyse de schémas P&ID - 100% open source
 */
export class PIDAnalyzer {
  private cvService = new FreeOpenCVService();

  async analyze(imageData: ImageData): Promise<PIDAnalysis> {
    await this.cvService.initialize();

    const components = await this.detectComponents(imageData);
    const flows = this.detectFlows(imageData, components);
    const labels = await this.extractLabels(imageData);

    return {
      components,
      flows,
      labels,
      confidence: this.calculateConfidence(components, flows, labels)
    };
  }

  private async detectComponents(imageData: ImageData): Promise<PIDComponent[]> {
    console.warn('[PIDAnalyzer] detectComponents is a placeholder.');
    const contours = this.cvService.detectContours(imageData);

    const componentPromises = contours.map(async (contour, index) => ({
      type: this.classifyComponent(contour),
      boundingBox: contour.boundingBox,
      identifier: await this.extractIdentifier(contour, imageData, index)
    }));

    return Promise.all(componentPromises);
  }

  private classifyComponent(contour: any): string {
    const aspectRatio = contour.boundingBox.width / contour.boundingBox.height;
    if (aspectRatio > 0.8 && aspectRatio < 1.2) return 'VALVE';
    if (aspectRatio > 1.5) return 'PUMP';
    return 'TANK';
  }

  private async extractIdentifier(contour: any, imageData: ImageData, index: number): Promise<string> {
    console.warn('[PIDAnalyzer] extractIdentifier is a placeholder using mock OCR.');
    // In a real implementation, this would use OCR on a cropped portion of the image.
    return index === 0 ? "V-101" : "P-205";
  }

  private detectFlows(imageData: ImageData, components: PIDComponent[]): Flow[] {
    console.warn('[PIDAnalyzer] detectFlows is a placeholder.');
     // Mock logic to connect the two detected components
     if (components.length >= 2) {
         return [{ from: 'V-101', to: 'P-205', direction: 'RIGHT', type: 'STEAM' }];
     }
     return [];
  }

  private async extractLabels(imageData: ImageData): Promise<Label[]> {
    console.warn('[PIDAnalyzer] extractLabels is a placeholder.');
    // Mock OCR on the whole image to find labels
    return [{ text: 'STEAM INLET', position: { x: 180, y: 100 } }];
  }

  private calculateConfidence(components: PIDComponent[], flows: Flow[], labels: Label[]): number {
    console.warn('[PIDAnalyzer] calculateConfidence is a placeholder.');
    if (components.length > 0 || flows.length > 0 || labels.length > 0) {
        return 85.5; // Mock confidence
    }
    return 0;
  }
}
