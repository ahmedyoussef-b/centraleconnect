'use client';

import dynamic from 'next/dynamic';
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
            <CardDescription>Les données temps réel sont désactivées pour cette version.</CardDescription>
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
  // La fonctionnalité SCADA temps réel est reportée.
  // Utilisation de données statiques en guise de placeholder.
  const displayData: ScadaData = {
    TG1: 0,
    TG2: 0,
    TV: 0,
  };
  const history: any[] = [];

  return (
    <div className="space-y-4">
      <CcppDiagram data={displayData} />
      <HistoryChart data={history} />
    </div>
  );
}
