'use client';

import { notFound } from 'next/navigation';
import { getComponentById } from '@/lib/component-service';
import type { Component } from '@/types/db';
import { ComponentDetailView } from '@/components/component-detail-view';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ComponentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [component, setComponent] = useState<Component | null | undefined>(undefined);

  useEffect(() => {
    getComponentById(params.id).then(setComponent);
  }, [params.id]);

  if (component === undefined) {
    return (
        <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-4">
                    <Skeleton className="h-96 w-full" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (component === null) {
    notFound();
  }

  return (
    <ComponentDetailView component={component} />
  );
}
