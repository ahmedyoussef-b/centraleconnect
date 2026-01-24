
'use client';

import { useEffect, useState } from 'react';
import { ably } from '@/lib/ably-client';
import type { Types } from 'ably';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

// Define the structure for our real-time data
interface ScadaData {
  [key: string]: number;
}

// Define the tags we want to display on the dashboard
const TAGS_TO_DISPLAY = [
  { id: 'TG1_POWER', name: 'Puissance TG1', unit: 'MW' },
  { id: 'TG1_EXHAUST_TEMP', name: 'T° Sortie TG1', unit: '°C' },
  { id: 'TG2_POWER', name: 'Puissance TG2', unit: 'MW' },
  { id: 'TG2_EXHAUST_TEMP', name: 'T° Sortie TG2', unit: '°C' },
  { id: 'TV_POWER', name: 'Puissance TV', unit: 'MW' },
  { id: 'CR1_HP_STEAM_PRESSURE', name: 'Pression HP CR1', unit: 'bar' },
  { id: 'CR1_HP_STEAM_TEMP', name: 'Température HP CR1', unit: '°C' },
  { id: 'CR2_HP_STEAM_PRESSURE', name: 'Pression HP CR2', unit: 'bar' },
  { id: 'CR2_HP_STEAM_TEMP', name: 'Température HP CR2', unit: '°C' },
  { id: 'TOTAL_POWER', name: 'Puissance Totale', unit: 'MW' },
];

// A small component to display a single SCADA tag
function ScadaTagCard({
  name,
  value,
  unit,
}: {
  name: string;
  value?: number;
  unit: string;
}) {
  const isAvailable = value !== undefined && value !== null;
  const displayValue = isAvailable ? value.toFixed(1) : '--';
  const valueColor =
    value && value < 0 ? 'text-destructive' : 'text-foreground';

  return (
    <div className="flex flex-col rounded-lg bg-background p-3 shadow">
      <p className="text-xs text-muted-foreground">{name}</p>
      <div
        className={cn(
          'text-2xl font-bold transition-colors',
          isAvailable ? valueColor : 'text-muted-foreground'
        )}
      >
        {displayValue}
      </div>
      <p className="text-xs text-muted-foreground">{unit}</p>
    </div>
  );
}

// The main component for real-time SCADA supervision
export function ScadaRealtime() {
  const [tags, setTags] = useState<ScadaData>({});
  const [connectionState, setConnectionState] =
    useState<Types.ConnectionState>('initializing');

  useEffect(() => {
    // Listener for connection state changes
    const onConnectionChange = (stateChange: Types.ConnectionStateChange) => {
      setConnectionState(stateChange.current);
    };
    
    ably.connection.on(onConnectionChange);
    setConnectionState(ably.connection.state);

    // Subscribe to the SCADA data channel
    const channel = ably.channels.get('scada:data');
    const onMessage = (message: Types.Message) => {
      setTags((prevTags) => ({ ...prevTags, ...message.data }));
    };
    channel.subscribe(onMessage);

    // Cleanup on component unmount
    return () => {
      ably.connection.off(onConnectionChange);
      channel.unsubscribe(onMessage);
    };
  }, []);

  const ConnectionIcon = connectionState === 'connected' ? Wifi : WifiOff;
  const connectionColor =
    connectionState === 'connected'
      ? 'text-green-500'
      : connectionState === 'failed'
      ? 'text-destructive'
      : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Supervision Temps Réel (SCADA)</CardTitle>
        <div className="flex items-center gap-2" title={`Ably: ${connectionState}`}>
            <ConnectionIcon className={cn('h-5 w-5', connectionColor)} />
            <span className="text-sm text-muted-foreground capitalize">{connectionState}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {TAGS_TO_DISPLAY.map((tag) => (
            <ScadaTagCard
              key={tag.id}
              name={tag.name}
              unit={tag.unit}
              value={tags[tag.id]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
