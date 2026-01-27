
'use client';

import PidViewer from '@/components/PidViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaskConical } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical />
            Page de Test des Composants
          </CardTitle>
        </CardHeader>
        <CardContent>
            <h2 className="text-xl font-semibold mb-2">Test du composant `PidViewer`</h2>
            <p className="text-muted-foreground mb-4">
                Test du surlignage des hotspots basés sur les `highlightParameters`. Les hotspots liés aux paramètres `LUB.PRESSURE.IN` et `LUB.TEMP` devraient être actifs (en rouge).
            </p>
            <PidViewer 
                externalId="B2.LUB.TPF" 
                highlightParameters={["LUB.PRESSURE.IN", "LUB.TEMP"]}
            />
        </CardContent>
      </Card>
    </div>
  );
}
