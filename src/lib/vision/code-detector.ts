// src/lib/vision/code-detector.ts
import jsQR from 'jsqr';
import { BrowserMultiFormatReader } from '@zxing/library';

// Placeholder/Stub types and functions to make the module self-contained for now.

export interface IndustrialCode {
    type: 'QR' | 'BARCODE';
    content: string;
    equipmentId: string | null;
    zone?: string;
    validity: boolean;
}

interface QRParsedContent {
    type: 'EQUIPMENT_TAG' | 'OTHER';
    equipmentId?: string;
    zone?: string;
}

/**
 * @placeholder This is a placeholder. In a real implementation, this would parse
 * a structured QR code content (e.g., a JSON string) into a meaningful object.
 */
function parseQRContent(content: string): QRParsedContent {
    console.log(`[CodeDetector] Parsing QR content: ${content}`);
    try {
        const data = JSON.parse(content);
        if (data.equipmentId && data.zone) {
            return {
                type: 'EQUIPMENT_TAG',
                equipmentId: data.equipmentId,
                zone: data.zone,
            };
        }
    } catch (e) {
        // If not JSON, treat it as a simple tag if it matches a pattern.
        const tagPattern = /^[A-Z0-9.-]+$/;
        if (tagPattern.test(content)) {
             return { type: 'EQUIPMENT_TAG', equipmentId: content };
        }
    }
    return { type: 'OTHER' };
}

/**
 * @placeholder This is a placeholder. In a real implementation, this would
 * query the local DB service to verify if the equipmentId exists in the master data.
 */
function validateTagAgainstMasterData(equipmentId?: string): boolean {
    console.log(`[CodeDetector] Validating tag against master data: ${equipmentId}`);
    if (!equipmentId) return false;
    // For now, assume all non-empty tags are valid for the sake of the demo.
    return true;
}

/**
 * @placeholder This is a placeholder. This function would contain logic to
 * extract a standardized equipment ID from a manufacturer's barcode format.
 */
function extractEquipmentIdFromBarcode(barcodeContent: string): string | null {
    console.log(`[CodeDetector] Extracting equipment ID from barcode: ${barcodeContent}`);
    // For now, let's assume the barcode content IS the equipment ID.
    return barcodeContent;
}

export const detectIndustrialCodes = async (
  imageData: ImageData
): Promise<IndustrialCode[]> => {
  const codes: IndustrialCode[] = [];
  
  // 1. Détection QR code (prioritaire - données structurées)
  const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
  if (qrResult) {
    const parsed = parseQRContent(qrResult.data);
    if (parsed.type === 'EQUIPMENT_TAG') {
      codes.push({
        type: 'QR',
        content: qrResult.data,
        equipmentId: parsed.equipmentId || null,
        zone: parsed.zone, // B0/B1/B2/B3
        validity: validateTagAgainstMasterData(parsed.equipmentId)
      });
    }
  }

  // 2. Détection codes-barres linéaires (plaques constructeur)
  const zxing = new BrowserMultiFormatReader();
  try {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        
        const imageElement = new Image();
        imageElement.src = canvas.toDataURL();
        await new Promise((resolve) => { imageElement.onload = resolve; });
        const result = await zxing.decodeFromImageElement(imageElement);
        
        codes.push({
          type: 'BARCODE',
          content: result.getText(),
          equipmentId: extractEquipmentIdFromBarcode(result.getText()),
          validity: true // Assume valid for now
        });
    }
  } catch (e) {
    // Pas de code-barres détecté - normal
    console.debug('[CodeDetector] No barcode detected:', e);
  }

  return codes;
};
