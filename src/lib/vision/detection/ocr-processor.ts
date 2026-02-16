// src/lib/vision/detection/ocr-processor.ts
'use client';

import Tesseract from 'tesseract.js';

export interface OCRExtractionResult {
  rawText: string;
  confidence: number;
  data: {
    equipmentIds: string[];
    values: Array<{
      parameter: string;
      value: string;
      unit?: string;
    }>;
  };
}

export async function performIndustrialOCR(
  imageUrl: string,
  options: { zone?: string } = {}
): Promise<OCRExtractionResult> {
  try {
    console.log('[OCR] Starting text extraction...');
    
    const result = await Tesseract.recognize(
      imageUrl,
      'fra', // Langue française
      {
        logger: (m) => console.log('[OCR Progress]', m),
      }
    );

    const rawText = result.data.text;
    const confidence = result.data.confidence / 100; // Normaliser entre 0 et 1

    // Extraction des données industrielles
    const extractedData = parseIndustrialText(rawText);

    console.log('[OCR] Extraction complete', {
      textLength: rawText.length,
      confidence,
      equipmentFound: extractedData.equipmentIds.length
    });

    return {
      rawText,
      confidence,
      data: extractedData
    };
  } catch (error) {
    console.error('[OCR] Failed to extract text:', error);
    return {
      rawText: '',
      confidence: 0,
      data: {
        equipmentIds: [],
        values: []
      }
    };
  }
}

function parseIndustrialText(text: string): OCRExtractionResult['data'] {
  const equipmentIds: string[] = [];
  const values: Array<{ parameter: string; value: string; unit?: string }> = [];

  // Patterns industriels courants
  const equipmentPattern = /[A-Z]{2,3}[-_][0-9]{2,}/g; // TG-01, CR-02, etc.
  const valuePattern = /(\w+)[:\s]+([0-9,.]+)\s*([A-Za-z°\/]+)?/g;

  // Extraire les IDs d'équipement
  const matches = text.match(equipmentPattern);
  if (matches) {
    equipmentIds.push(...matches);
  }

  // Extraire les valeurs mesurées
  let match;
  while ((match = valuePattern.exec(text)) !== null) {
    values.push({
      parameter: match[1].toLowerCase(),
      value: match[2].replace(',', '.'),
      unit: match[3]
    });
  }

  return {
    equipmentIds: [...new Set(equipmentIds)], // Dédupliquer
    values
  };
}