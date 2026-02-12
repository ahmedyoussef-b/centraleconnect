'use client';

import { Activity, CheckCircle, XCircle, AlertTriangle, LoaderCircle } from 'lucide-react';
import { useScadaData, ScadaConnectionStatus } from '@/hooks/use-scada-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

const StatusInfo = {
  [ScadaConnectionStatus.INITIALIZING]: {
    text: 'Initialisation...',
    color: 'bg-gray-500',
    icon: LoaderCircle,
    animate: true,
  },
  [ScadaConnectionStatus.CONNECTED]: {
    text: 'Connecté',
    color: 'bg-green-500',
    icon: CheckCircle,
    animate: false,
  },
  [ScadaConnectionStatus.DISCONNECTED]: {
    text: 'Déconnecté',
    color: 'bg-red-500',
    icon: XCircle,
    animate: false,
  },
  [ScadaConnectionStatus.SUSPENDED]: {
    text: 'Suspendu',
    color: 'bg-yellow-500',
    icon: AlertTriangle,
    animate: false,
  },
  [ScadaConnectionStatus.FAILED]: {
    text: 'Échec',
    color: 'bg-red-700',
    icon: XCircle,
    animate: false,
  },
};

export default function ScadaDiagnosticsPage() {
  const { latestData, history, status } = useScadaData();
  const currentStatusInfo = StatusInfo[status];

  const latestDataEntries = Object.entries(latestData);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity />
            Diagnostic du Bus de Données SCADA
          </CardTitle>
          <CardDescription>
            Surveillez l'état de la connexion temps réel et visualisez les données brutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="font-semibold">État de la connexion:</span>
            <Badge variant="outline" className="flex items-center gap-2">
              <span
                className={cn(
                  'h-3 w-3 rounded-full',
                  currentStatusInfo.color,
                  currentStatusInfo.animate && 'animate-pulse'
                )}
              />
              {currentStatusInfo.text}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dernières Données Reçues</CardTitle>
          </CardHeader>
          <CardContent>
            {latestDataEntries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestDataEntries.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs">{key}</TableCell>
                      <TableCell className="text-right font-semibold">{value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">En attente de données...</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Historique Brut</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border">
                <pre className="p-4 text-xs">
                    {JSON.stringify(history.slice().reverse(), null, 2)}
                </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
