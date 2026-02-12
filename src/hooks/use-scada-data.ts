'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAblyClient } from '@/lib/ably-client';
import type { Types } from 'ably';

export interface ScadaDataPoint {
  timestamp: string;
  source: 'DEMO' | 'OPCUA';
  values: Record<string, number>;
}

export enum ScadaConnectionStatus {
  INITIALIZING = 'INITIALIZING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  SUSPENDED = 'SUSPENDED',
  FAILED = 'FAILED',
}

const MAX_HISTORY_POINTS = 100;

export function useScadaData() {
  const [latestData, setLatestData] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState<ScadaConnectionStatus>(ScadaConnectionStatus.INITIALIZING);

  useEffect(() => {
    const ably = getAblyClient();
    const channel = ably.channels.get('scada:data');

    const handleConnectionChange = () => {
      switch (ably.connection.state) {
        case 'connected':
          setStatus(ScadaConnectionStatus.CONNECTED);
          break;
        case 'suspended':
          setStatus(ScadaConnectionStatus.SUSPENDED);
          break;
        case 'failed':
          setStatus(ScadaConnectionStatus.FAILED);
          break;
        default:
          setStatus(ScadaConnectionStatus.DISCONNECTED);
          break;
      }
    };

    const handleMessage = (message: Types.Message) => {
        const newDataPoint: ScadaDataPoint = message.data;
        const flatData = { ...newDataPoint.values, time: new Date(newDataPoint.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
        setLatestData(newDataPoint.values);
        setHistory(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), flatData]);
    };
    
    ably.connection.on(handleConnectionChange);
    channel.subscribe(handleMessage);
    handleConnectionChange(); // Set initial status

    return () => {
      channel.unsubscribe();
      ably.connection.off(handleConnectionChange);
    };
  }, []);

  return { latestData, history, status };
}
