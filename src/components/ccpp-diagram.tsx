
'use client';

import { Cog, Factory, Wind } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

const EquipmentWidget = ({
  name,
  id,
  className,
  power,
  icon: Icon,
  onClick,
}: {
  name: string;
  id: string;
  className?: string;
  power?: number;
  icon: React.ElementType;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'z-10 w-44 rounded-lg border-2 bg-card p-3 text-card-foreground shadow-lg transition-all hover:border-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      className
    )}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-6 w-6 text-primary" />
      <h4 className="font-semibold">{name}</h4>
    </div>
    {power !== undefined ? (
        <div className="mt-2 text-right">
            <span className="text-2xl font-bold">{power.toFixed(1)}</span>
            <span className="ml-1 text-sm text-muted-foreground">MW</span>
        </div>
    ) : (
        <div className="mt-2 text-right">
            <Badge variant="secondary" className="mt-1">N/A</Badge>
        </div>
    )}
  </button>
);

export function CcppDiagram({ data }: { data: { TG1: number; TG2: number; TV: number } }) {
  const router = useRouter();

  const navigateToEquipment = (id: string) => {
    // Note: l'ID utilisé ici (ex: 'TG1') est un placeholder. Pour une navigation
    // réelle, il faudrait utiliser l'externalId complet de l'équipement.
    router.push(`/equipments/${id}`);
  };
  
  return (
    <Card className="relative">
        <CardHeader>
            <CardTitle>Schéma Synoptique du Cycle Combiné</CardTitle>
            <CardDescription>Données temps réel provenant du bus de données SCADA.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] w-full rounded-lg bg-muted/30">
            {/* Equipment Widgets */}
            <EquipmentWidget name="Turbine à Gaz 1" id="TG1" power={data.TG1} icon={Cog} onClick={() => navigateToEquipment('TG1')} className="absolute top-8 left-8" />
            <EquipmentWidget name="Turbine à Gaz 2" id="TG2" power={data.TG2} icon={Cog} onClick={() => navigateToEquipment('TG2')} className="absolute bottom-8 left-8" />
            <EquipmentWidget name="Chaudière 1" id="HRSG1" icon={Factory} onClick={() => navigateToEquipment('HRSG1')} className="absolute top-8 left-1/2 -translate-x-1/2" />
            <EquipmentWidget name="Chaudière 2" id="HRSG2" icon={Factory} onClick={() => navigateToEquipment('HRSG2')} className="absolute bottom-8 left-1/2 -translate-x-1/2" />
            <EquipmentWidget name="Turbine à Vapeur" id="TV" power={data.TV} icon={Wind} onClick={() => navigateToEquipment('TV')} className="absolute top-1/2 right-8 -translate-y-1/2" />

            {/* SVG Pipes */}
            <svg className="absolute top-0 left-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* TG1 -> CR1 */}
              <path d="M260 80 H 420" stroke="hsl(var(--foreground))" strokeWidth="2" strokeDasharray="5,5" />
              <path d="M420 80 L 410 75 M 420 80 L 410 85" stroke="hsl(var(--foreground))" strokeWidth="2"/>

              {/* TG2 -> CR2 */}
              <path d="M260 320 H 420" stroke="hsl(var(--foreground))" strokeWidth="2" strokeDasharray="5,5" />
               <path d="M420 320 L 410 315 M 420 320 L 410 325" stroke="hsl(var(--foreground))" strokeWidth="2"/>

              {/* CR1 -> TV */}
              <path d="M598 80 H 750 C 850 80, 850 200, 750 200" stroke="hsl(var(--accent))" strokeWidth="3" />
               <path d="M750 200 L 740 195 M 750 200 L 740 205" stroke="hsl(var(--accent))" strokeWidth="3"/>

              {/* CR2 -> TV */}
              <path d="M598 320 H 750 C 850 320, 850 200, 750 200" stroke="hsl(var(--accent))" strokeWidth="3" />
            </svg>
          </div>
        </CardContent>
      </Card>
  );
}
