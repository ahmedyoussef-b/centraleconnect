
'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScanSearch } from 'lucide-react';

const VisualScanner = dynamic(
  () => import('@/components/vision/camera-view').then((mod) => mod.CameraView),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch />
            Analyse Visuelle
          </CardTitle>
          <CardDescription>Chargement du scanner...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    ),
  }
);

export default function VisualScanPage() {
    return <VisualScanner />;
}
