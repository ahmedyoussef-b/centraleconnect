
'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera } from 'lucide-react';

const CameraView = dynamic(
  () => import('@/components/camera-view').then((mod) => mod.CameraView),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera />
            Vue Caméra & Provisionnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    ),
  }
);

export default function ProvisioningPage() {
    return <CameraView />;
}
