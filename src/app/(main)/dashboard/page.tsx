'use client';

import dynamic from 'next/dynamic';
import { useScadaData } from '@/hooks/use-scada-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function DashboardPage() {
  const { latestData, history } = useScadaData();

  // Provide default values while data is loading
  const displayData: ScadaData = {
    TG1: latestData.TG1 ?? 0,
    TG2: latestData.TG2 ?? 0,
    TV: latestData.TV ?? 0,
  };

  return (
    <div className="space-y-4">
      <CcppDiagram data={displayData} />
      <HistoryChart data={history} />
    </div>
  );
}
