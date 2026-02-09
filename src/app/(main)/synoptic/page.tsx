'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PidViewer from '@/components/PidViewer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';
import { getComponents } from '@/lib/component-service';
import type { Component } from '@/types/db';

export default function SynopticPage() {
  const router = useRouter();
  const [components, setComponents] = useState<Component[]>([]);

  useEffect(() => {
    getComponents().then(setComponents);
  }, []);

  const handleComponentClick = (component: Component) => {
    router.push(`/components/${component.id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid />
          Synoptique Interactif
        </CardTitle>
        <CardDescription>
          Navigation dans les systèmes du cycle combiné. Cliquez sur un
          équipement pour voir ses détails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PidViewer
          components={components}
          onComponentClick={handleComponentClick}
        />
      </CardContent>
    </Card>
  );
}
