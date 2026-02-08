'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define the position and target for each hotspot
const hotspots = [
  {
    id: 'TG',
    name: 'Turbine à Gaz',
    // These are percentages for top, left, width, height
    position: { top: '75%', left: '48%', width: '10%', height: '15%' },
    target: '/equipments/TG1' // Example target
  },
  {
    id: 'RESERVOIR_1',
    name: 'Réservoir 1',
    position: { top: '35%', left: '20%', width: '15%', height: '10%' },
    target: '#' // Placeholder, update with a real ID e.g., /equipments/ID_RESERVOIR_1
  },
  {
    id: 'RESERVOIR_2',
    name: 'Réservoir 2',
    position: { top: '35%', left: '65%', width: '15%', height: '10%' },
    target: '#' // Placeholder, update with a real ID e.g., /equipments/ID_RESERVOIR_2
  }
];

// Path to the real synoptic image.
// You should place your image file at `public/assets/synoptics/ccpp-main-synoptic.svg`
const synopticImage = {
    imageUrl: '/assets/synoptics/ccpp-main-synoptic.svg',
    description: 'Schéma synoptique principal du cycle combiné',
};


export function SynopticView() {
  const router = useRouter();

  const handleHotspotClick = (target: string) => {
    if (target === '#') {
        // In a real scenario, you could show a toast or a modal
        console.warn('Target for this hotspot is not configured yet.');
        return;
    }
    router.push(target);
  };

  return (
    <TooltipProvider>
      <div className="relative w-full">
        {synopticImage ? (
            <Image
                src={synopticImage.imageUrl}
                alt={synopticImage.description}
                width={1200}
                height={800}
                className="w-full h-auto rounded-md bg-muted" // Added bg-muted for better visibility if image is missing
            />
        ) : (
            <div className="w-full h-[600px] bg-muted rounded-md flex items-center justify-center">
                <p>Image du synoptique non trouvée.</p>
            </div>
        )}

        {/* Hotspot overlays */}
        {hotspots.map(hotspot => (
          <Tooltip key={hotspot.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleHotspotClick(hotspot.target)}
                className={cn(
                  'absolute border-2 border-transparent rounded-sm hover:border-primary hover:bg-primary/20 transition-all',
                )}
                style={hotspot.position}
                aria-label={`Accéder à ${hotspot.name}`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Voir les détails pour : {hotspot.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
         <div className="absolute top-2 left-2 bg-background/80 p-2 rounded-md">
            <p className="text-xs text-muted-foreground">NOTE: Ajustez la position des hotspots pour correspondre à votre image.</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
