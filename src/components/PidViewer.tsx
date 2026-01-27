
'use client';

import { useState } from 'react';

interface PidViewerProps {
  externalId: string;
}

export default function PidViewer({ externalId }: PidViewerProps) {
  const [error, setError] = useState(false);
  const pidMap: Record<string, string> = {
    'B3.CEX3': '/assets/pids/B3/CEX3-001.svg',
    'B3.BA': '/assets/pids/B3/BACHE_ALIMENTAIRE.svg',
    'B3.PEX': '/assets/pids/B3/POMPES_EXTRACTION.svg',
    'B3.PE20': '/assets/pids/B3/B3PE20.svg',
    'A0.CAA.HV183': '/assets/pids/A0/HV183.svg',
  };

  const src = pidMap[externalId] || null;

  if (!src) return <div className="text-destructive">❌ Schéma P&ID non disponible</div>;

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
