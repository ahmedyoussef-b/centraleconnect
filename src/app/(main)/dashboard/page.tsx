'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CcppDiagram } from '@/components/ccpp-diagram';

const ScadaRealtime = dynamic(
  () => import('@/components/scada-realtime').then((mod) => mod.ScadaRealtime),
  {
    ssr: false,
    loading: () => (
       <Card>
        <CardHeader>
          <CardTitle>Supervision Temps Réel (SCADA)</CardTitle>
        </CardHeader>
        <CardContent>
           <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    ),
  }
);

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

export default function DashboardPage() {
  return (
    <>
      <CcppDiagram />
      <ScadaRealtime />
      <HistoryChart />
    </>
  );
}
