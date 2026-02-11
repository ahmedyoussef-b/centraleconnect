// src/lib/ocr/industrial-ocr.ts
import Tesseract, { PSM } from 'tesseract.js';
import { EquipmentTagParser, type EquipmentTag, type ParameterValue, type SafetyLabel } from './tag-parser';

export interface OCRExtractionResult {
  rawText: string;
  equipmentTags: EquipmentTag[];   // TG1-ALTERNATOR-001
  parameterValues: ParameterValue[]; // Pression: 12.5 bar
  safetyLabels: SafetyLabel[];     // DANGER HAUTE TENSION
  confidence: number;              // Score de fiabilité (0-100)
}

export const performIndustrialOCR = async (
  imageData: string,
  context: { zone: string; equipmentType?: string }
): Promise<OCRExtractionResult> => {
  // Configuration spécialisée pour environnement industriel
  const worker = await Tesseract.createWorker('fra', 1, {
    logger: m => console.log(`[OCR] ${m.progress * 100}%`),
    cacheMethod: 'none', // Désactiver cache pour données critiques
  });

  // ✅ CORRECTION : Utiliser l'enum PSM au lieu d'une chaîne
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:/°%barMPakg', // Caractères industriels
    preserve_interword_spaces: '1',
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // ✅ Utilisation de l'enum PSM (valeur 6)
  });

  const { data: { text, confidence } } = await worker.recognize(imageData);
  await worker.terminate();

  // Parsing contextuel avec Master Data
  const parser = new EquipmentTagParser(context.zone);
  return {
    rawText: text,
    equipmentTags: parser.extractEquipmentTags(text),
    parameterValues: parser.extractParameters(text),
    safetyLabels: parser.extractSafetyLabels(text),
    confidence: confidence,
  };
};