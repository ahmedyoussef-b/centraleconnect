
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import type { FunctionalNode, Annotation } from '@/types/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { Loader2, MessageSquare, Save, X } from 'lucide-react';
import { getPidSvgContent } from '@/lib/pid-service';
import { getAnnotationsForNode, addAnnotation } from '@/lib/db-service';
import { useToast } from '@/hooks/use-toast';

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
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  const [isAnnotationPopoverOpen, setIsAnnotationPopoverOpen] = useState(false);
  const [newAnnotationCoords, setNewAnnotationCoords] = useState<{x:number, y:number} | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const getSvgPath = useCallback((id: string): string | null => {
    if (!id) return null;
    
    const mappings: Record<string, string> = {
        'A0.FIRE': 'A0/fire-protection.svg', 'A0.GAS': 'A0/gas-regulation.svg', 'A0.FUEL': 'A0/fuel-transfer.svg',
        'A0.ELEC': 'A0/electrical-building.svg', 'A0.FILT.221TF2': 'A0/FILT/221TF2.svg', 'A0.FILT.GRILLES': 'A0/FILT/GRILLE_BAT.svg',
        'A0.CAA.HV183': 'A0/CAA/HV183.svg', 'A0.CAA.RCP': 'A0/CAA/RCP.svg', 'A0.GGR.TV': 'A0/GGR/TV.svg',
        'A0.GGR.CENT': 'A0/GGR/CENT.svg', 'A0.GGR.POMP1': 'A0/GGR/POMP1.svg', 'A0.GGR.DRAINS': 'A0/GGR/DRAINS.svg',
        'A0.SKD.PUMP': 'A0/SKD/PUMP.svg', 'A0.SKD.TANK': 'A0/SKD/TANK.svg', 'B1.FIRE': 'B1/co2-extinction.svg',
        'B1.GAS': 'B1/gas-detection.svg', 'B1.FUEL': 'B1/fuel-system.svg', 'B1.SAFETY': 'B1/nitrogen-injection.svg',
        'B1.SEPARATOR': 'B1/separator.svg', 'B2.LUB': 'B2/lubrication-filtration.svg', 'B2.FIRE': 'B2/co2-extinction.svg',
        'B2.GAS': 'B2/gas-detection.svg', 'B2.FUEL': 'B2/fuel-system.svg', 'B2.SAFETY': 'B2/nitrogen-injection.svg',
        'B2.SEPARATOR': 'B2/separator.svg', 'B2.FILT.AIR': 'B2/FILT.AIR.svg', 'B2.PAD.HYD': 'B2/PAD.HYD.svg',
        'B2.MIST.ELIM': 'B2/MIST.ELIM.svg', 'B2.PSO.HYD': 'B2/PSO.HYD.svg', 'B2.SKBD.VENT': 'B2/SKBD.VENT.svg',
        'B3.FUEL': 'B3/gas-preheat.svg', 'B3.BOILER.COOL': 'B3/boiler-cooling.svg', 'B3.BOILER': 'B3/boiler-gas.svg',
        'B3.CEX3': 'B3/CEX3.svg', 'B3.BA': 'B3/BA.svg', 'B3.CEX425': 'B3/CEX425.svg', 'B3.SEP269': 'B3/SEP269.svg',
        'B3.PEX271': 'B3/PEX271.svg', 'B3.DES266': 'B3/DES266.svg', 'B3.GSE.SVBP3': 'B3/SVBP3.svg',
    };
    for (const [prefix, path] of Object.entries(mappings)) {
      if (id.startsWith(prefix)) { return `/assets/pids/${path}`; }
    }
    return null;
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSvgContent('');
      setAnnotations([]);

      const path = getSvgPath(externalId);
      if (!path) { throw new Error(`Aucun schéma SVG n'est mappé pour l'ID : ${externalId}`); }
        
      const [svgText, localAnnotations] = await Promise.all([
          getPidSvgContent(path),
          getAnnotationsForNode(externalId)
      ]);
      setSvgContent(svgText);
      setAnnotations(localAnnotations);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [externalId, getSvgPath]);

  useEffect(() => {
    if (externalId) { fetchAllData(); }
  }, [externalId, fetchAllData]);

  const handleSvgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const target = e.target as SVGElement;
    const hotspotElement = target.closest<SVGElement>('[data-external-id]');
    if (hotspotElement) {
        if (onHotspotClick) {
            const clickedExternalId = hotspotElement.getAttribute('data-external-id');
            const partialNode: Partial<FunctionalNode> = {
                external_id: clickedExternalId || '',
                type: hotspotElement.getAttribute('data-type') || 'unknown',
                name: hotspotElement.getAttribute('data-name') || 'N/A',
            };
            onHotspotClick(partialNode);
        }
        setActiveHotspots(prev => [...prev, hotspotElement.getAttribute('data-external-id')!]);
        return;
    }
    
    // If not a hotspot, it's an annotation click
    if (!isAnnotationPopoverOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setNewAnnotationCoords({ x, y });
        setIsAnnotationPopoverOpen(true);
    }
  }, [onHotspotClick, isAnnotationPopoverOpen]);

  const handleSaveAnnotation = async () => {
    if (!annotationText.trim() || !newAnnotationCoords) return;
    setIsSaving(true);
    try {
        await addAnnotation({
            functional_node_external_id: externalId,
            text: annotationText,
            operator: 'Opérateur 1', // Should be dynamic in a real app
            x_pos: newAnnotationCoords.x,
            y_pos: newAnnotationCoords.y,
        });
        toast({ title: "Annotation ajoutée", description: "Votre note a été enregistrée sur le schéma." });
        setAnnotationText('');
        setNewAnnotationCoords(null);
        setIsAnnotationPopoverOpen(false);
        fetchAllData(); // Refresh data
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erreur', description: "L'annotation n'a pas pu être enregistrée." });
    } finally {
        setIsSaving(false);
    }
  }

  const uniqueViewerId = `pid-viewer-${externalId.replace(/\./g, '-')}`;

  useEffect(() => {
    if (!svgContent) return;
    const container = document.getElementById(uniqueViewerId);
    if (!container) return;
    
    let currentActiveHotspots = activeHotspots;
    if (highlightParameters.length > 0) {
        const hotspots = container.querySelectorAll('[data-parameters]');
        const matchingIds: string[] = [];
        hotspots.forEach(hotspot => {
        const params = hotspot.getAttribute('data-parameters')?.split(',') || [];
        if (params.some(p => highlightParameters.includes(p))) {
            const extId = hotspot.getAttribute('data-external-id');
            if (extId) matchingIds.push(extId);
        }
        });
        currentActiveHotspots = [...new Set([...activeHotspots, ...matchingIds])];
    }
    
    container.querySelectorAll('.pid-hotspot').forEach(el => el.classList.remove('active'));
    currentActiveHotspots.forEach(id => {
      const hotspot = container.querySelector(`[data-external-id="${id}"]`);
      if (hotspot) hotspot.classList.add('active');
    });
  }, [highlightParameters, svgContent, uniqueViewerId, activeHotspots]);

  if (loading) {
    return (<div className={cn("flex items-center justify-center h-96", className)}><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
  }

  if (error) {
    return (<Alert variant="destructive" className={className}><AlertTitle>Erreur de chargement du schéma P&amp;ID</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>);
  }

  return (
    <div ref={containerRef} className={cn("relative bg-card border rounded-lg overflow-hidden", className)}>
        <div id={uniqueViewerId} onClick={handleSvgClick} dangerouslySetInnerHTML={{ __html: svgContent }} />
        
        {annotations.map(anno => (
            <TooltipProvider key={anno.id}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="absolute -translate-x-1/2 -translate-y-1/2 p-1 bg-blue-500/80 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            style={{ left: `${anno.x_pos}%`, top: `${anno.y_pos}%` }}
                        >
                            <MessageSquare className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                        <p className="font-semibold">{anno.operator}</p>
                        <p className="text-muted-foreground text-xs mb-2">{format(new Date(anno.timestamp.replace(' ', 'T')), 'dd/MM/yy HH:mm', { locale: fr })}</p>
                        <p>{anno.text}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ))}
        
        <Popover open={isAnnotationPopoverOpen} onOpenChange={setIsAnnotationPopoverOpen}>
            <PopoverTrigger asChild>
                <div style={{
                    position: 'absolute',
                    left: `${newAnnotationCoords?.x ?? 0}%`,
                    top: `${newAnnotationCoords?.y ?? 0}%`,
                    display: isAnnotationPopoverOpen ? 'block' : 'none'
                }} />
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Ajouter une annotation</h4>
                        <p className="text-sm text-muted-foreground">Entrez votre note pour ce point du schéma.</p>
                    </div>
                    <div className="grid gap-2">
                        <Textarea value={annotationText} onChange={(e) => setAnnotationText(e.target.value)} placeholder="Description..." rows={4} />
                    </div>
                    <div className="flex justify-end gap-2">
                         <Button variant="ghost" size="sm" onClick={() => setIsAnnotationPopoverOpen(false)} disabled={isSaving}><X className="mr-1" /> Annuler</Button>
                         <Button size="sm" onClick={handleSaveAnnotation} disabled={!annotationText.trim() || isSaving}>
                            {isSaving ? <Loader2 className="mr-1 animate-spin" /> : <Save className="mr-1" />}
                            Sauvegarder
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    </div>
  );
}
