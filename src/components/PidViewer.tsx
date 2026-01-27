'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FunctionalNode } from '@/types/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface PidViewerProps {
  externalId: string;
  highlightParameters?: string[];
  onHotspotClick?: (node: Partial<FunctionalNode>) => void;
  className?: string;
}

export default function PidViewer({
  externalId,
  highlightParameters = [],
  onHotspotClick,
  className = '',
}: PidViewerProps) {
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHotspots, setActiveHotspots] = useState<string[]>([]);

  const getSvgPath = useCallback((id: string): string | null => {
    if (!id) return null;
    
    // This mapping links a system/subsystem prefix to a specific SVG file.
    const mappings: Record<string, string> = {
        // A0
        'A0.FIRE': 'A0/fire-protection.svg',
        'A0.GAS': 'A0/gas-regulation.svg',
        'A0.FUEL': 'A0/fuel-transfer.svg',
        'A0.ELEC': 'A0/electrical-building.svg',
        'A0.FILT.221TF2': 'A0/FILT/221TF2.svg',
        'A0.FILT.GRILLES': 'A0/FILT/GRILLE_BAT.svg',
        'A0.CAA.HV183': 'A0/CAA/HV183.svg',
        'A0.CAA.RCP': 'A0/CAA/RCP.svg',
        'A0.GGR.TV': 'A0/GGR/TV.svg',
        'A0.GGR.CENT': 'A0/GGR/CENT.svg',
        'A0.GGR.POMP1': 'A0/GGR/POMP1.svg',
        'A0.GGR.DRAINS': 'A0/GGR/DRAINS.svg',
        'A0.SKD.PUMP': 'A0/SKD/PUMP.svg',
        'A0.SKD.TANK': 'A0/SKD/TANK.svg',
        // B1
        'B1.FIRE': 'B1/co2-extinction.svg',
        'B1.GAS': 'B1/gas-detection.svg',
        'B1.FUEL': 'B1/fuel-system.svg',
        'B1.SAFETY': 'B1/nitrogen-injection.svg',
        'B1.SEPARATOR': 'B1/separator.svg',
        // B2
        'B2.LUB': 'B2/lubrication-filtration.svg',
        'B2.FIRE': 'B2/co2-extinction.svg',
        'B2.GAS': 'B2/gas-detection.svg',
        'B2.FUEL': 'B2/fuel-system.svg',
        'B2.SAFETY': 'B2/nitrogen-injection.svg',
        'B2.SEPARATOR': 'B2/separator.svg',
        'B2.FILT.AIR': 'B2/FILT.AIR.svg',
        'B2.PAD.HYD': 'B2/PAD.HYD.svg',
        'B2.MIST.ELIM': 'B2/MIST.ELIM.svg',
        'B2.PSO.HYD': 'B2/PSO.HYD.svg',
        'B2.SKBD.VENT': 'B2/SKBD.VENT.svg',
        // B3
        'B3.FUEL': 'B3/gas-preheat.svg',
        'B3.BOILER.COOL': 'B3/boiler-cooling.svg',
        'B3.BOILER': 'B3/boiler-gas.svg',
        'B3.CEX3': 'B3/CEX3.svg',
        'B3.BA': 'B3/BA.svg',
        'B3.CEX425': 'B3/CEX425.svg',
        'B3.SEP269': 'B3/SEP269.svg',
        'B3.PEX271': 'B3/PEX271.svg',
        'B3.DES266': 'B3/DES266.svg',
        'B3.GSE.SVBP3': 'B3/SVBP3.svg',
    };

    for (const [prefix, path] of Object.entries(mappings)) {
      if (id.startsWith(prefix)) {
        return `/assets/pids/${path}`;
      }
    }
    
    return null;
  }, []);

  useEffect(() => {
    const loadSvg = async () => {
      try {
        setLoading(true);
        setError(null);
        setSvgContent('');

        const path = getSvgPath(externalId);
        if (!path) {
            throw new Error(`Aucun schéma SVG n'est mappé pour l'ID : ${externalId}`);
        }
        
        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(`SVG non trouvé : ${path} (status: ${response.status})`);
        }

        const svgText = await response.text();
        setSvgContent(svgText);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    if (externalId) {
        loadSvg();
    }
  }, [externalId, getSvgPath]);

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as SVGElement;
      if (target.tagName === 'svg') return;

      const hotspotElement = target.closest<SVGElement>('[data-external-id]');
      if (!hotspotElement) return;

      const clickedExternalId = hotspotElement.getAttribute('data-external-id');
      if (!clickedExternalId) return;

      if (onHotspotClick) {
        const partialNode: Partial<FunctionalNode> = {
            external_id: clickedExternalId,
            type: hotspotElement.getAttribute('data-type') || 'unknown',
            name: hotspotElement.getAttribute('data-name') || 'N/A',
        };
        onHotspotClick(partialNode);
      }
      setActiveHotspots([clickedExternalId]);
    },
    [onHotspotClick]
  );

  const uniqueViewerId = `pid-viewer-${externalId.replace(/\./g, '-')}`;

  useEffect(() => {
    if (!svgContent) return;
    const container = document.getElementById(uniqueViewerId);
    if (!container) return;
    
    if (highlightParameters.length === 0) {
      setActiveHotspots([]);
      return;
    }

    const hotspots = container.querySelectorAll('[data-parameters]');
    const matchingIds: string[] = [];

    hotspots.forEach(hotspot => {
      const params = hotspot.getAttribute('data-parameters')?.split(',') || [];
      if (params.some(p => highlightParameters.includes(p))) {
        const extId = hotspot.getAttribute('data-external-id');
        if (extId) matchingIds.push(extId);
      }
    });

    setActiveHotspots(matchingIds);
  }, [highlightParameters, svgContent, uniqueViewerId]);

  useEffect(() => {
    if (!svgContent) return;

    const container = document.getElementById(uniqueViewerId);
    if (!container) return;

    container.querySelectorAll('.pid-hotspot').forEach(el => {
      el.classList.remove('active');
    });

    activeHotspots.forEach(id => {
      const hotspot = container.querySelector(`[data-external-id="${id}"]`);
      if (hotspot) {
        hotspot.classList.add('active');
      }
    });
  }, [svgContent, activeHotspots, uniqueViewerId]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive" className={className}>
            <AlertTitle>Erreur de chargement du schéma P&ID</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }

  return (
    <div
      id={uniqueViewerId}
      className={cn("bg-card border rounded-lg overflow-hidden", className)}
      onClick={handleSvgClick}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
