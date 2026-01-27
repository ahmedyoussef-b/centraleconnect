
'use client';

import { useState } from 'react';

interface PidViewerProps {
  externalId: string;
}

export default function PidViewer({ externalId }: PidViewerProps) {
  const [error, setError] = useState(false);
  
  // NOTE DE L'ASSISTANT: La structure des fichiers SVG a été refactorisée pour être basée sur les systèmes
  // (ex: fire-protection.svg) plutôt que par équipement. Ce mapping doit être mis à jour pour
  // faire correspondre un `externalId` d'équipement au bon fichier SVG système.
  const pidMap: Record<string, string> = {
    // Exemple de mapping nécessaire :
    // 'A0.FIRE.DET.DF002': '/assets/pids/A0/fire-protection.svg',
    // 'B1.FUEL.FAZ': '/assets/pids/B1/fuel-system.svg',
  };

  const src = pidMap[externalId] || null;

  if (!src) return <div className="text-destructive">❌ Schéma P&ID non mappé pour l'ID: {externalId}</div>;

  return (
    <div className="relative w-full h-[600px] border rounded overflow-hidden bg-muted/20">
      {error ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Échec du chargement du schéma
        </div>
      ) : (
        <img
          src={src}
          alt={`Schéma P&ID ${externalId}`}
          className="w-full h-full object-contain bg-white"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
