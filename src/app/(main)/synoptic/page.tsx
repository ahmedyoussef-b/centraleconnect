'use client';

import { SynopticView } from '@/components/synoptic-view';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';

export default function SynopticPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid />
          Synoptique Interactif
        </CardTitle>
        <CardDescription>
          Navigation dans les systèmes du cycle combiné. Cliquez sur un équipement pour voir ses détails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SynopticView />
      </CardContent>
    </Card>
  );
}
