'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    )
  }
);

export default function ScadaPage() {
  return (
    <div className="space-y-4">
      <ScadaRealtime />
      <HistoryChart />
    </div>
  );
}
