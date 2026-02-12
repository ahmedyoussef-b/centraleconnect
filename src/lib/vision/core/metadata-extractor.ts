
// src/lib/vision/core/metadata-extractor.ts
import exifr from 'exifr';

export interface IndustrialImageMetadata {
  captureTimestamp: Date;          // Horodatage fiable (ISO 8601)
  gpsCoordinates?: { lat: number; lng: number }; // Zone fonctionnelle (B0/B1/B2/B3)
  deviceModel: string;             // Modèle appareil (auditabilité)
  isoSpeed: number;                // Qualité image (fiabilité OCR)
  focalLength: number;             // Distance à l'équipement
  customTags: Record<string, string>; // Tags SCADA personnalisés
}

export const extractIndustrialMetadata = async (
  imageData: string | Blob
): Promise<IndustrialImageMetadata> => {
  const exif = await exifr.parse(imageData);
  
  return {
    captureTimestamp: exif.DateTimeOriginal 
      ? new Date(exif.DateTimeOriginal) 
      : new Date(),
    gpsCoordinates: exif.latitude && exif.longitude
      ? { lat: exif.latitude, lng: exif.longitude }
      : undefined,
    deviceModel: exif.Make && exif.Model 
      ? `${exif.Make} ${exif.Model}` 
      : 'UNKNOWN_DEVICE',
    isoSpeed: exif.ISOSpeedRatings || 100,
    focalLength: exif.FocalLength || 0,
    customTags: {
      plantZone: exif.ImageDescription?.split(';')[0] || 'UNKNOWN',
      safetyLevel: exif.UserComment?.includes('ZONE_DANGEREUSE') 
        ? 'HAUTE' 
        : 'STANDARD'
    }
  };
};
