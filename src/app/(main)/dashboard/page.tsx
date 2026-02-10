'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CcppDiagram } from '@/components/ccpp-diagram';

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
      <HistoryChart />
    </>
  );
}
