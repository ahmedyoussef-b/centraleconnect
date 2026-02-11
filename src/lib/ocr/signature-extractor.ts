
import { FreeOCREngine } from './tesseract-free';

/**
 * Extraction de signatures manuscrites - 100% open source
 */
export class SignatureExtractor {
  private ocrEngine = new FreeOCREngine();
  
  constructor() {
    this.ocrEngine.initialize('fra');
  }
  
  async extract(image: HTMLImageElement): Promise<Signature[]> {
    // 1. Extrait le texte de l'image
    const ocrResult = await this.ocrEngine.recognize(image);
    
    // 2. Analyse le texte pour trouver des signatures
    return this.parseSignatures(ocrResult.rawText);
  }
  
  private parseSignatures(text: string): Signature[] {
    const signatures: Signature[] = [];
    
    // Modèle de correspondance pour les signatures
    const pattern = /([A-ZÀ-ÿ][a-zà-ÿ]+ [A-ZÀ-ÿ][a-zà-ÿ]+)\s*\((\d{2}\/\d{2}\/\d{4})\)/g;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      signatures.push({
        name: match[1].trim(),
        date: match[2].trim(),
        signature: match[0].trim()
      });
    }
    
    return signatures;
  }
}

export interface Signature {
  name: string;      // 'Jean Dupont'
  date: string;      // '11/02/2026'
  signature: string; // 'Jean Dupont (11/02/2026)'
}
