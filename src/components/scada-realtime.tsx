
'use client';

import { useEffect, useState, useRef } from 'react';
import { getAblyClient } from '@/lib/ably-client';
import type { Types } from 'ably';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';
import type { Parameter } from '@/types/db';
import { useToast } from '@/hooks/use-toast';

// Define the structure for our real-time data
interface ScadaData {
  [key: string]: number;
}

// Define the structure for our parameter thresholds
interface ParameterThresholds {
    [key: string]: Pick<Parameter, 'min_value' | 'max_value' | 'name' | 'component_id'>;
}

// Define the tags we want to display on the dashboard
const TAGS_TO_DISPLAY = [
  { id: 'TG1_POWER', name: 'Puissance TG1', unit: 'MW' },
  { id: 'TG1_EXHAUST_TEMP', name: 'T° Sortie TG1', unit: '°C', dbParamName: 'Température moyenne échappement', componentId: 'TG1' },
  { id: 'TG2_POWER', name: 'Puissance TG2', unit: 'MW' },
  { id: 'TG2_EXHAUST_TEMP', name: 'T° Sortie TG2', unit: '°C', dbParamName: 'Température moyenne échappement', componentId: 'TG2' },
  { id: 'TV_POWER', name: 'Puissance TV', unit: 'MW' },
  { id: 'CR1_HP_STEAM_PRESSURE', name: 'Pression HP CR1', unit: 'bar', dbParamName: 'Pression tambour HP', componentId: 'HRSG1' },
  { id: 'CR1_HP_STEAM_TEMP', name: 'Température HP CR1', unit: '°C' },
  { id: 'CR2_HP_STEAM_PRESSURE', name: 'Pression HP CR2', unit: 'bar', dbParamName: 'Pression tambour HP', componentId: 'HRSG2' },
  { id: 'CR2_HP_STEAM_TEMP', name: 'Température HP CR2', unit: '°C' },
  { id: 'TOTAL_POWER', name: 'Puissance Totale', unit: 'MW' },
];

function getAnomalyState(value: number, thresholds?: Pick<Parameter, 'min_value' | 'max_value'>): 'normal' | 'warning' | 'critical' {
    if (thresholds === undefined || value === undefined) return 'normal';
    
    // This logic assumes min_value is a warning threshold and max_value is a critical threshold for high-value alarms.
    const { min_value, max_value } = thresholds;

    if (max_value !== null && value > max_value) return 'critical';
    if (min_value !== null && value > min_value) return 'warning';

    // A more sophisticated implementation could handle low-value alarms (where value < min_value is bad)
    
    return 'normal';
}


// A small component to display a single SCADA tag
function ScadaTagCard({
  name,
  value,
  unit,
  thresholds
}: {
  name: string;
  value?: number;
  unit: string;
  thresholds?: Pick<Parameter, 'min_value' | 'max_value'>;
}) {
  const isAvailable = value !== undefined && value !== null;
  const displayValue = isAvailable ? value.toFixed(1) : '--';
  
  const anomalyState = isAvailable ? getAnomalyState(value, thresholds) : 'normal';

  const valueColor = {
      normal: 'text-foreground',
      warning: 'text-yellow-500',
      critical: 'text-destructive animate-pulse'
  }[anomalyState];

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
  const [isTauri, setIsTauri] = useState(false);
  const [thresholds, setThresholds] = useState<ParameterThresholds>({});
  const { toast } = useToast();

  const loggedAnomalies = useRef(new Set<string>());

  // Fetch parameter thresholds from DB on mount
  useEffect(() => {
    const tauriEnv = !!window.__TAURI__;
    setIsTauri(tauriEnv);
    if (tauriEnv) {
        import('@/lib/db-service').then(({ getParameters }) => {
            getParameters().then(params => {
                const thresholdMap: ParameterThresholds = {};
                for(const tag of TAGS_TO_DISPLAY) {
                    if (tag.dbParamName && tag.componentId) {
                        const param = params.find(p => p.component_id === tag.componentId && p.name === tag.dbParamName);
                        if (param) {
                            thresholdMap[tag.id] = param;
                        }
                    }
                }
                setThresholds(thresholdMap);
            }).catch(e => {
                console.error(e);
                toast({ variant: 'destructive', title: 'Erreur DB', description: "Impossible de charger les seuils de paramètres."});
            });
        });
    }
  }, [toast]);
  

  useEffect(() => {
    const ably = getAblyClient();

    const onConnectionChange = (stateChange: Types.ConnectionStateChange) => setConnectionState(stateChange.current);
    ably.connection.on(onConnectionChange);
    setConnectionState(ably.connection.state);

    const channel = ably.channels.get('scada:data');
    const onMessage = (message: Types.Message) => setTags((prevTags) => ({ ...prevTags, ...message.data }));
    channel.subscribe(onMessage);

    return () => {
      ably.connection.off(onConnectionChange);
      channel.unsubscribe(onMessage);
    };
  }, []);

  // Anomaly detection and logging
  useEffect(() => {
      if (!isTauri || Object.keys(tags).length === 0 || Object.keys(thresholds).length === 0) return;
      
      for (const tagId in tags) {
          if (Object.prototype.hasOwnProperty.call(tags, tagId)) {
              const value = tags[tagId];
              const thresholdInfo = thresholds[tagId];
              
              if (thresholdInfo) {
                  const state = getAnomalyState(value, thresholdInfo);
                  const anomalyKey = `${tagId}-${state}`;

                  if (state !== 'normal' && !loggedAnomalies.current.has(anomalyKey)) {
                        const thresholdValue = state === 'critical' ? thresholdInfo.max_value : thresholdInfo.min_value;
                        const message = `Anomalie ${state.toUpperCase()}: ${thresholdInfo.name} (${thresholdInfo.component_id}) est à ${value.toFixed(1)}, dépassant le seuil de ${thresholdValue}.`;
                        
                        import('@/lib/db-service').then(({ addLogEntry }) => {
                            addLogEntry({
                                type: 'AUTO',
                                source: 'SCADA_MONITOR',
                                message: message,
                                component_id: thresholdInfo.component_id,
                            });
                        });
                        loggedAnomalies.current.add(anomalyKey);
                  } else if (state === 'normal' && (loggedAnomalies.current.has(`${tagId}-warning`) || loggedAnomalies.current.has(`${tagId}-critical`))) {
                      loggedAnomalies.current.delete(`${tagId}-warning`);
                      loggedAnomalies.current.delete(`${tagId}-critical`);
                  }
              }
          }
      }
  }, [tags, thresholds, isTauri]);

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
              thresholds={thresholds[tag.id]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
