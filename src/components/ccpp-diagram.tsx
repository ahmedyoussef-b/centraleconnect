
'use client';

import { Cog, Factory, Wind } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';

const EquipmentWidget = ({
  name,
  id,
  className,
  power,
  icon: Icon,
}: {
  name: string;
  id: string;
  className?: string;
  power?: number;
  icon: React.ElementType;
}) => (
  <button
    className={cn(
      'z-10 w-40 rounded-lg border-2 bg-card p-3 text-card-foreground shadow-lg transition-all hover:border-primary hover:scale-105',
      className
    )}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-6 w-6 text-primary" />
      <h4 className="font-semibold">{name}</h4>
    </div>
    <div className="mt-2 text-right">
      <span className="text-2xl font-bold">{power?.toFixed(0) ?? '--'}</span>
      <span className="ml-1 text-sm text-muted-foreground">MW</span>
    </div>
  </button>
);

export function CcppDiagram() {
  // Mock data, to be replaced by real-time data from Ably later
  const data = {
    TG1: 132.1,
    TG2: 134.5,
    TV: 181.2,
  };

  return (
    <Card className="relative">
        <CardHeader>
            <CardTitle>Schéma Synoptique du Cycle Combiné</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] w-full rounded-lg bg-muted/30">
            {/* Equipment Widgets */}
            <EquipmentWidget name="Turbine à Gaz 1" id="TG1" power={data.TG1} icon={Cog} className="absolute top-8 left-8" />
            <EquipmentWidget name="Turbine à Gaz 2" id="TG2" power={data.TG2} icon={Cog} className="absolute bottom-8 left-8" />
            <EquipmentWidget name="Chaudière 1" id="CR1" icon={Factory} className="absolute top-8 left-1/2 -translate-x-1/2" />
            <EquipmentWidget name="Chaudière 2" id="CR2" icon={Factory} className="absolute bottom-8 left-1/2 -translate-x-1/2" />
            <EquipmentWidget name="Turbine à Vapeur" id="TV" power={data.TV} icon={Wind} className="absolute top-1/2 right-8 -translate-y-1/2" />

            {/* SVG Pipes */}
            <svg className="absolute top-0 left-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* TG1 -> CR1 */}
              <path d="M250 80 H 420" stroke="hsl(var(--foreground))" strokeWidth="2" strokeDasharray="5,5" />
              <path d="M420 80 L 410 75 M 420 80 L 410 85" stroke="hsl(var(--foreground))" strokeWidth="2"/>

              {/* TG2 -> CR2 */}
              <path d="M250 320 H 420" stroke="hsl(var(--foreground))" strokeWidth="2" strokeDasharray="5,5" />
               <path d="M420 320 L 410 315 M 420 320 L 410 325" stroke="hsl(var(--foreground))" strokeWidth="2"/>

              {/* CR1 -> TV */}
              <path d="M590 80 H 750 C 850 80, 850 200, 750 200" stroke="hsl(var(--accent-foreground))" strokeWidth="3" />
               <path d="M750 200 L 740 195 M 750 200 L 740 205" stroke="hsl(var(--accent-foreground))" strokeWidth="3"/>

              {/* CR2 -> TV */}
              <path d="M590 320 H 750 C 850 320, 850 200, 750 200" stroke="hsl(var(--accent-foreground))" strokeWidth="3" />
               <path d="M750 200 L 740 195 M 750 200 L 740 205" stroke="hsl(var(--accent-foreground))" strokeWidth="3"/>
            </svg>
          </div>
        </CardContent>
      </Card>
  );
}
