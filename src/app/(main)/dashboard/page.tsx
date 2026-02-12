'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAblyClient } from '@/lib/ably-client';
import type { Types } from 'ably';

const HistoryChart = dynamic(
  () => import('@/components/history-chart').then((mod) => mod.HistoryChart),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Historique de Puissance (24h)</CardTitle>
          <CardDescription>Évolution des puissances actives (MW)</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    ),
  }
);

const CcppDiagram = dynamic(
  () => import('@/components/ccpp-diagram').then((mod) => mod.CcppDiagram),
  {
    ssr: false,
    loading: () => (
       <Card>
        <CardHeader>
            <CardTitle>Schéma Synoptique du Cycle Combiné</CardTitle>
            <CardDescription>Connexion au flux de données temps réel...</CardDescription>
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[400px]" />
        </CardContent>
      </Card>
    ),
  }
);

interface ScadaData {
  TG1: number;
  TG2: number;
  TV: number;
}

interface HistoryPoint extends ScadaData {
    time: string;
}

const MAX_HISTORY_POINTS = 100; // Garder les 100 derniers points de données

export default function DashboardPage() {
  const [realtimeData, setRealtimeData] = useState<ScadaData>({ TG1: 0, TG2: 0, TV: 0 });
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    const ablyClient = getAblyClient();
    const channel = ablyClient.channels.get('scada:data');

    const subscribe = async () => {
      await channel.subscribe((message: Types.Message) => {
        const newData: ScadaData = message.data;
        
        // Mettre à jour les données temps réel
        setRealtimeData(newData);
        
        // Mettre à jour l'historique
        setHistoryData(prevHistory => {
          const newPoint = {
            ...newData,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          };
          const updatedHistory = [...prevHistory, newPoint];
          // Limiter la taille de l'historique pour éviter les problèmes de performance
          if (updatedHistory.length > MAX_HISTORY_POINTS) {
            return updatedHistory.slice(updatedHistory.length - MAX_HISTORY_POINTS);
          }
          return updatedHistory;
        });
      });
    };

    subscribe();

    // Nettoyer l'abonnement en quittant la page
    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <>
      <CcppDiagram data={realtimeData} />
      <HistoryChart data={historyData} />
    </>
  );
}
