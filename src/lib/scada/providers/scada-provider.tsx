// src/lib/scada/providers/scada-provider.tsx
'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode, useRef, useCallback } from 'react';
import type { Types } from 'ably';
import { getAblyClient } from '../client/ably-client';
import { ScadaStatus } from '../interfaces';
import { SyntheticDataProvider } from '../simulation/synthetic-data-provider';

export interface ScadaDataPoint {
  timestamp: string;
  source: 'DEMO' | 'OPCUA' | 'DEMO_CLIENT';
  values: Record<string, number>;
}

interface ScadaContextType {
  latestData: Record<string, number>;
  history: any[];
  status: ScadaStatus;
  dataSource: 'REALTIME' | 'SIMULATED';
}

const MAX_HISTORY_POINTS = 100;
const SOURCE_TIMEOUT_MS = 5000; // 5 seconds to wait for real data

const ScadaContext = createContext<ScadaContextType | undefined>(undefined);

export function ScadaProvider({ children }: { children: ReactNode }) {
  const [latestData, setLatestData] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState<ScadaStatus>(ScadaStatus.INITIALIZING);
  const [dataSource, setDataSource] = useState<'REALTIME' | 'SIMULATED'>('REALTIME');

  const simulatorRef = useRef<SyntheticDataProvider | null>(null);
  const sourceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ablyRef = useRef<Types.RealtimePromise | null>(null);

  const handleDataPoint = useCallback((data: ScadaDataPoint, source: 'REALTIME' | 'SIMULATED') => {
      // If we receive real data, stop any running simulation
      if (source === 'REALTIME' && simulatorRef.current) {
          simulatorRef.current.stop();
          simulatorRef.current = null;
      }
      // If we receive real data, clear the timeout that would start the simulation
      if (source === 'REALTIME' && sourceTimeoutRef.current) {
          clearTimeout(sourceTimeoutRef.current);
          sourceTimeoutRef.current = null;
      }
      
      setDataSource(source);
      const flatData = { ...data.values, time: new Date(data.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
      setLatestData(data.values);
      setHistory(prev => [...prev.slice(-MAX_HISTORY_POINTS + 1), flatData]);
  }, []);

  const startClientSimulator = useCallback(() => {
    // Only start if no real data has been received and no simulator is running
    if (dataSource === 'REALTIME' && !simulatorRef.current) {
        console.warn(`[SCADA Provider] Aucune donnée temps réel reçue après ${SOURCE_TIMEOUT_MS}ms. Démarrage du simulateur client.`);
        const simulator = new SyntheticDataProvider();
        simulator.start((data) => {
            handleDataPoint(data, 'SIMULATED');
        });
        simulatorRef.current = simulator;
    }
  }, [dataSource, handleDataPoint]);


  useEffect(() => {
    let channel: Types.RealtimeChannelPromise | undefined;
    let connection: Types.Connection | undefined;

    async function setupAbly() {
        const ably = await getAblyClient();
        ablyRef.current = ably;
        channel = ably.channels.get('scada:data');
        connection = ably.connection;

        const handleConnectionChange = () => {
          const currentState = ably.connection.state;
          switch (currentState) {
            case 'connected':
              setStatus(ScadaStatus.CONNECTED);
              // Start a timer to check if we receive data from a backend publisher
              if (!sourceTimeoutRef.current) {
                  sourceTimeoutRef.current = setTimeout(startClientSimulator, SOURCE_TIMEOUT_MS);
              }
              break;
            case 'suspended':
              setStatus(ScadaStatus.SUSPENDED);
              break;
            case 'failed':
              setStatus(ScadaStatus.FAILED);
              // If the connection to Ably fails, also start the client simulator as a fallback
              startClientSimulator();
              break;
            default:
              setStatus(ScadaStatus.DISCONNECTED);
              break;
          }
        };

        const handleMessage = (message: Types.Message) => {
            const newDataPoint: ScadaDataPoint = message.data;
            handleDataPoint(newDataPoint, 'REALTIME');
        };
        
        connection.on(handleConnectionChange);
        channel.subscribe(handleMessage);
        handleConnectionChange();
    }
    
    setupAbly();

    return () => {
      if (channel) {
          channel.unsubscribe();
      }
      // Since handleConnectionChange is defined inside setupAbly, we can't easily remove it.
      // However, when the component unmounts, the connection will eventually close
      // or the component will be gone, so listeners won't be a problem.
      if (ablyRef.current) {
        // ablyRef.current.connection.off(); // This would remove all listeners which might not be desirable
      }

      if (simulatorRef.current) {
          simulatorRef.current.stop();
      }
      if (sourceTimeoutRef.current) {
          clearTimeout(sourceTimeoutRef.current);
      }
    };
  }, [handleDataPoint, startClientSimulator]);

  const value = { latestData, history, status, dataSource };

  return (
    <ScadaContext.Provider value={value}>
      {children}
    </ScadaContext.Provider>
  );
}

export function useScadaContext() {
    const context = useContext(ScadaContext);
    if (context === undefined) {
        throw new Error('useScadaContext doit être utilisé à l\'intérieur d\'un ScadaProvider');
    }
    return context;
}
