'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPidSvgContent } from '@/lib/pid-service';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';

const SYNOPTIC_SVG_PATH = '/assets/synoptics/IMG_20260207_071515_602.svg';

export function SynopticView() {
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getPidSvgContent(SYNOPTIC_SVG_PATH)
      .then(setSvgContent)
      .catch((err) => {
        console.error("Failed to load synoptic SVG:", err);
        setError("Le fichier du schéma synoptique n'a pas pu être chargé. Assurez-vous qu'il se trouve bien dans 'public/assets/synoptics/'.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    const hotspotElement = target.closest<SVGElement>('[data-external-id]');
    
    if (hotspotElement) {
      const targetId = hotspotElement.getAttribute('data-external-id');
      if (targetId) {
        router.push(`/equipments/${encodeURIComponent(targetId)}`);
      }
    }
  }, [router]);

  if (loading) {
    return <Skeleton className="w-full h-[600px] bg-muted rounded-md" />;
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="relative w-full">
      <div 
        onClick={handleSvgClick}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        className={cn(
          "cursor-pointer",
          "[&>svg]:w-full [&>svg]:h-auto [&>svg]:rounded-md [&>svg]:bg-muted",
          // Override SVG colors for dark theme visibility
          "[&_path]:!stroke-muted-foreground",
          "[&_line]:!stroke-muted-foreground",
          "[&_polyline]:!stroke-muted-foreground",
          "[&_polygon]:!stroke-muted-foreground",
          "[&_rect]:!stroke-muted-foreground",
          "[&_circle]:!stroke-muted-foreground",
          "[&_ellipse]:!stroke-muted-foreground",
          "[&_text]:!fill-foreground",
          // Style for interactive hotspots
          "[&_[data-external-id]]:hover:!stroke-primary"
        )}
      />
      <div className="absolute top-2 left-2 bg-background/80 p-2 rounded-md">
        <p className="text-xs text-muted-foreground">
          INFO : Pour rendre les éléments interactifs, modifiez le fichier SVG et ajoutez l'attribut `data-external-id="ID_DE_L_EQUIPEMENT"` aux éléments cliquables.
        </p>
      </div>
    </div>
  );
}
