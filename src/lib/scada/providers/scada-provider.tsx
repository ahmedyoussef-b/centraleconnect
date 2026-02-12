// src/lib/scada/providers/scada-provider.tsx
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import type { Types } from 'ably';
import { getAblyClient } from '../client/ably-client';
import { ScadaStatus } from '../interfaces';

export interface ScadaDataPoint {
  timestamp: string;
  source: 'DEMO' | 'OPCUA';
  values: Record<string, number>;
}

interface ScadaContextType {
  latestData: Record<string, number>;
  history: any[];
  status: ScadaStatus;
}

const MAX_HISTORY_POINTS = 100;

const ScadaContext = createContext<ScadaContextType | undefined>(undefined);

/**
 * Fournit les données SCADA temps réel à l'ensemble de l'application.
 * Il gère la connexion à Ably, les abonnements et l'état des données.
 */
export function ScadaProvider({ children }: { children: ReactNode }) {
  const [latestData, setLatestData] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState<ScadaStatus>(ScadaStatus.INITIALIZING);

  useEffect(() => {
    const ably = getAblyClient();
    const channel = ably.channels.get('scada:data');

    const handleConnectionChange = () => {
      switch (ably.connection.state) {
        case 'connected':
          setStatus(ScadaStatus.CONNECTED);
          break;
        case 'suspended':
          setStatus(ScadaStatus.SUSPENDED);
          break;
        case 'failed':
          setStatus(ScadaStatus.FAILED);
          break;
        default:
          setStatus(ScadaStatus.DISCONNECTED);
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
    handleConnectionChange(); // Définir le statut initial

    return () => {
      channel.unsubscribe();
      ably.connection.off(handleConnectionChange);
    };
  }, []);

  const value = { latestData, history, status };

  return (
    <ScadaContext.Provider value={value}>
      {children}
    </ScadaContext.Provider>
  );
}

/**
 * Hook interne pour consommer le contexte SCADA.
 */
export function useScadaContext() {
    const context = useContext(ScadaContext);
    if (context === undefined) {
        throw new Error('useScadaContext doit être utilisé à l\'intérieur d\'un ScadaProvider');
    }
    return context;
}
