
// src/lib/ocr/tesseract-free.ts

// This is a placeholder for a real Tesseract.js wrapper.
export class FreeOCREngine {
  private isInitialized = false;

  async initialize(lang: string): Promise<void> {
    if (this.isInitialized) return;
    console.log(`[Tesseract-Free] NOTE: Initializing mock OCR engine for lang: ${lang}.`);
    this.isInitialized = true;
  }

  async recognize(image: HTMLImageElement): Promise<{ rawText: string; confidence: number }> {
    if (!this.isInitialized) {
      throw new Error("Tesseract-Free model not initialized.");
    }
    console.log('[Tesseract-Free] NOTE: "recognize" is a placeholder, returning mock parameter data.');

    // Simulate finding some parameters in an image.
    // This text is designed to be parsed by the ParameterExtractor's regex.
    const mockText = `
      STATUS: OPERATIONAL (MODE AUTO)
      PRESSURE: 110.5 bar
      TEMP = 585 °C
      FLOW: 418.2 m3/h
      VIBRATION: 2.1 mm/s
      ATTENTION: HAUTE TENSION
      DANGER: RISQUE D'EXPLOSION

      Validé par: Jean Dupont (11/02/2026)
    `;
    
    return {
      rawText: mockText,
      confidence: 95.5,
    };
  }
}
