
'use client';

import { useState } from 'react';

interface PidViewerProps {
  externalId: string;
}

export default function PidViewer({ externalId }: PidViewerProps) {
  const [error, setError] = useState(false);
  const pidMap: Record<string, string> = {
    // B3 - Cycle vapeur (part04/05/06)
    'B3.CEX3': '/assets/pids/B3/CEX3.svg',
    'B3.BA': '/assets/pids/B3/BA.svg',
    'B3.CEX425': '/assets/pids/B3/CEX425.svg',
    'B3.SEP269': '/assets/pids/B3/SEP269.svg',
    'B3.PEX271': '/assets/pids/B3/PEX271.svg',
    'B3.DES266': '/assets/pids/B3/DES266.svg',
    'B3.GSE.SVBP3': '/assets/pids/B3/SVBP3.svg',
    
    // A0 - Lubrification & utilities (part06/07/08/09)
    'A0.GGR.TV': '/assets/pids/A0/GGR/TV.svg',
    'A0.GGR.CENT': '/assets/pids/A0/GGR/CENT.svg',
    'A0.GGR.POMP1': '/assets/pids/A0/GGR/POMP1.svg',
    'A0.GGR.DRAINS': '/assets/pids/A0/GGR/DRAINS.svg',
    'A0.CAA.HV183': '/assets/pids/A0/CAA/HV183.svg',
    'A0.CAA.RCP': '/assets/pids/A0/CAA/RCP.svg',
    'A0.SKD.PUMP': '/assets/pids/A0/SKD/PUMP.svg',
    'A0.SKD.TANK': '/assets/pids/A0/SKD/TANK.svg',
    'A0.FILT.221TF2': '/assets/pids/A0/FILT/221TF2.svg',
    'A0.FILT.GRILLES': '/assets/pids/A0/FILT/GRILLE_BAT.svg',

    // B2 - Turbine gaz (part08/09)
    'B2.FILT.AIR': '/assets/pids/B2/FILT.AIR.svg',
    'B2.PAD.HYD': '/assets/pids/B2/PAD.HYD.svg',
    'B2.MIST.ELIM': '/assets/pids/B2/MIST.ELIM.svg',
    'B2.PSO.HYD': '/assets/pids/B2/PSO.HYD.svg',
    'B2.SKBD.VENT': '/assets/pids/B2/SKBD.VENT.svg',
  };

  const src = pidMap[externalId] || null;

  if (!src) return <div className="text-destructive">❌ Schéma P&amp;ID non disponible</div>;

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
