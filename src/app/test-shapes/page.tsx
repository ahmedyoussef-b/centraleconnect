// src/app/test-shapes/page.tsx
'use client';

import { useState, useRef } from 'react';
import { SimpleShapeDetector, type Detection } from '@/lib/vision/simple-detector';

export default function TestShapes() {
  const [detector] = useState(() => new SimpleShapeDetector());
  const [detections, setDetections] = useState<Detection[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setDetections([]);

    try {
      // Créer URL objet
      const url = URL.createObjectURL(file);
      setImageUrl(url);

      // Charger l'image
      const img = new Image();
      img.src = url;
      await img.decode();

      // Convertir en ImageData
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Détection des formes
      console.log('[SHAPE_DETECTOR] Détection des cercles...');
      const circles = await detector.detectCircles(imageData);
      
      console.log('[SHAPE_DETECTOR] Détection des rectangles...');
      const rectangles = await detector.detectRectangles(imageData);

      const allDetections = [...circles, ...rectangles];
      setDetections(allDetections);

      console.log(`[SHAPE_DETECTOR] ${allDetections.length} formes détectées`);

    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setImageUrl('');
    setDetections([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">🔍 Test Détection de Formes</h1>

        {/* Info */}
        <div className="bg-blue-900 border-l-4 border-blue-500 p-4 mb-6 rounded">
          <p className="text-blue-200">
            💡 Détection 100% offline sans modèle IA - Basée sur l'analyse géométrique
          </p>
        </div>

        {/* Upload */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">📸 Upload d'Image</h2>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {error && (
            <div className="mt-4 bg-red-900 border-l-4 border-red-500 p-3 rounded">
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Résultats */}
        {imageUrl && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">🎯 Résultats</h2>
              <button
                onClick={handleClear}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
              >
                ✕ Effacer
              </button>
            </div>

            <div className="relative mb-6">
              <img
                src={imageUrl}
                alt="Test"
                className="max-w-full h-auto rounded-lg"
                style={{ maxHeight: '500px' }}
              />
              
              {/* Bounding boxes */}
              {detections.map((detection, index) => (
                <BoundingBox
                  key={index}
                  detection={detection}
                  imageWidth={800}
                  imageHeight={600}
                />
              ))}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="mt-2 text-gray-400">Analyse en cours...</p>
              </div>
            ) : detections.length > 0 ? (
              <div className="space-y-3">
                {detections.map((detection, index) => (
                  <DetectionCard key={index} detection={detection} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">Aucune forme détectée</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BoundingBox({ 
  detection, 
  imageWidth, 
  imageHeight 
}: { 
  detection: Detection; 
  imageWidth: number; 
  imageHeight: number;
}) {
  const box = detection.boundingBox;
  const left = (box.x / imageWidth) * 100;
  const top = (box.y / imageHeight) * 100;
  const width = (box.width / imageWidth) * 100;
  const height = (box.height / imageHeight) * 100;

  const color = detection.type === 'CIRCLE' ? 'border-blue-500' : 'border-green-500';

  return (
    <div 
      className={`absolute border-2 ${color} rounded pointer-events-none`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`
      }}
    >
      <div className={`absolute -top-6 left-0 bg-${color.split('-')[1]}-500 text-white text-xs font-bold px-2 py-1 rounded`}>
        {detection.type} ({detection.confidence.toFixed(2)})
      </div>
    </div>
  );
}

function DetectionCard({ detection }: { detection: Detection }) {
  const typeColor = {
    CIRCLE: 'bg-blue-900 text-blue-300 border-blue-500',
    RECTANGLE: 'bg-green-900 text-green-300 border-green-500',
    TRIANGLE: 'bg-purple-900 text-purple-300 border-purple-500'
  };

  return (
    <div className={`bg-gray-700 border-l-4 ${typeColor[detection.type]} p-4 rounded`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 ${typeColor[detection.type].split(' ')[0]} rounded-full flex items-center justify-center`}>
            <span className="text-2xl">
              {detection.type === 'CIRCLE' ? '⭕' : detection.type === 'RECTANGLE' ? '□' : '△'}
            </span>
          </div>
          <div>
            <div className="font-bold text-lg">{detection.type}</div>
            <div className="text-sm text-gray-400">
              {detection.properties?.radius && `Rayon: ${detection.properties.radius.toFixed(1)}px`}
              {detection.properties?.angle && `Angle: ${detection.properties.angle.toFixed(1)}°`}
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeColor[detection.type]}`}>
          {detection.confidence.toFixed(2)}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Bounding Box:</span>
          <span className="ml-2 font-mono text-white text-xs">
            {Math.round(detection.boundingBox.x)}, 
            {Math.round(detection.boundingBox.y)}, 
            {Math.round(detection.boundingBox.width)}x{Math.round(detection.boundingBox.height)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Centre:</span>
          <span className="ml-2 font-mono text-white text-xs">
            {detection.properties?.centerX?.toFixed(0)}, 
            {detection.properties?.centerY?.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
}