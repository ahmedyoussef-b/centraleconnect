import { FreeOCREngine } from './tesseract-free';

/**
 * Extraction de paramètres opérationnels - 100% open source
 */
export class ParameterExtractor {
  private ocrEngine = new FreeOCREngine();
  
  constructor() {
    this.ocrEngine.initialize('fra');
  }
  
  async extract(image: HTMLImageElement): Promise<Parameter[]> {
    // 1. Extrait le texte de l'image
    const ocrResult = await this.ocrEngine.recognize(image);
    
    // 2. Analyse le texte pour trouver des paramètres
    return this.parseParameters(ocrResult.rawText);
  }
  
  private parseParameters(text: string): Parameter[] {
    const parameters: Parameter[] = [];
    const seen = new Set<string>();

    // Regex amélioré pour capturer des paires clé-valeur-unité
    // Prend en charge ':' ou '=', des espaces variables, et des unités complexes.
    const pattern = /([a-zA-Z_]+)\s*[:=]\s*([\d,.]+)\s*([a-zA-Z°%/³\w/]+)/gi;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim().toUpperCase();
      if (!seen.has(name)) {
        parameters.push({
          name: name,
          value: parseFloat(match[2].replace(',', '.')),
          unit: match[3].trim(),
          timestamp: new Date().toISOString()
        });
        seen.add(name);
      }
    }
    
    return parameters;
  }
}

export interface Parameter {
  name: string;      // 'PRESSURE', 'TEMPERATURE', etc.
  value: number;     // 12.5
  unit: string;      // 'bar', '°C', etc.
  timestamp: string; // ISO 8601
}
