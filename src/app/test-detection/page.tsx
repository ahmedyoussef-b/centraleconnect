// src/app/test-detection/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { EquipmentDetector, type EquipmentDetection } from '@/lib/vision/equipment-detector';

export default function TestDetection() {
  const [detector] = useState(() => new EquipmentDetector());
  const [status, setStatus] = useState({ initialized: false, modelLoaded: false });
  const [detections, setDetections] = useState<EquipmentDetection[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Vérifier le statut initial
    setStatus(detector.getStatus());
  }, [detector]);

  const handleInit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await detector.initialize();
      if (success) {
        setStatus(detector.getStatus());
        setError(null);
      } else {
        setError('❌ Échec de l\'initialisation du modèle');
      }
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

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

      // Détection
      const results = await detector.detect(img, {
        minConfidence: 0.5,
        maxDetections: 10
      });

      setDetections(results);

    } catch (err) {
      setError(`Erreur de détection: ${err instanceof Error ? err.message : 'inconnue'}`);
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
        <h1 className="text-4xl font-bold mb-6">🧪 Test Détection IA Équipements</h1>

        {/* Statut */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Statut du Détecteur</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatusItem 
              label="Initialisé" 
              value={status.initialized ? '✅ Oui' : '❌ Non'} 
              color={status.initialized ? 'green' : 'red'} 
            />
            <StatusItem 
              label="Modèle Chargé" 
              value={status.modelLoaded ? '✅ Oui' : '❌ Non'} 
              color={status.modelLoaded ? 'green' : 'red'} 
            />
          </div>

          {!status.initialized && (
            <button
              onClick={handleInit}
              disabled={loading}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg
                disabled:bg-gray-600 disabled:cursor-not-allowed
                transition-colors duration-200"
            >
              {loading ? '🚀 Initialisation...' : '🚀 Initialiser le Détecteur'}
            </button>
          )}
        </div>

        {/* Upload */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">📸 Upload d'Image</h2>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={!status.initialized || loading}
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
                  imageWidth={800} // Ajustez selon la taille réelle
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
              <p className="text-gray-400 italic">Aucune détection trouvée (confiance &lt; 50%)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({ label, value, color }: { 
  label: string; 
  value: string; 
  color: 'green' | 'red' | 'yellow' 
}) {
  const colorClasses = {
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400'
  };

  return (
    <div>
      <span className="text-gray-400">{label}:</span>
      <span className={`ml-2 font-semibold ${colorClasses[color]}`}>{value}</span>
    </div>
  );
}

function BoundingBox({ 
  detection, 
  imageWidth, 
  imageHeight 
}: { 
  detection: EquipmentDetection; 
  imageWidth: number; 
  imageHeight: number;
}) {
  const box = detection.boundingBox;
  const left = (box.x / imageWidth) * 100;
  const top = (box.y / imageHeight) * 100;
  const width = (box.width / imageWidth) * 100;
  const height = (box.height / imageHeight) * 100;

  const color = detection.criticality === 'HIGH' ? 'border-red-500' :
                detection.criticality === 'MEDIUM' ? 'border-yellow-500' : 'border-green-500';

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
        {detection.icon} {detection.equipmentType} ({detection.confidence.toFixed(0)}%)
      </div>
    </div>
  );
}

function DetectionCard({ detection }: { detection: EquipmentDetection }) {
  const criticalityColor = {
    LOW: 'bg-green-900 text-green-300 border-green-500',
    MEDIUM: 'bg-yellow-900 text-yellow-300 border-yellow-500',
    HIGH: 'bg-red-900 text-red-300 border-red-500'
  };

  return (
    <div className={`bg-gray-700 border-l-4 ${criticalityColor[detection.criticality]} p-4 rounded`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{detection.icon}</span>
          <div>
            <div className="font-bold text-lg">{detection.equipmentType}</div>
            <div className="text-sm text-gray-400">{detection.originalClass}</div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${criticalityColor[detection.criticality]}`}>
          {detection.criticality}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Confiance:</span>
          <span className="ml-2 font-bold text-white">{detection.confidence.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-gray-400">Bounding Box:</span>
          <span className="ml-2 font-mono text-white text-xs">
            {Math.round(detection.boundingBox.x)}, 
            {Math.round(detection.boundingBox.y)}, 
            {Math.round(detection.boundingBox.width)}x{Math.round(detection.boundingBox.height)}
          </span>
        </div>
      </div>
    </div>
  );
}