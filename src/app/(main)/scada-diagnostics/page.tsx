
'use client';

import { Activity, CheckCircle, XCircle, AlertTriangle, LoaderCircle, Wifi, Cpu, BadgeCheck } from 'lucide-react';
import { useScadaData, ScadaConnectionStatus } from '@/lib/scada/hooks/use-scada-data';
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

function StatCard({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType, description?: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}

export default function ScadaDiagnosticsPage() {
  const { latestData, history, status, dataSource } = useScadaData();
  const currentStatusInfo = StatusInfo[status];

  const latestDataEntries = Object.entries(latestData);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity />
            Tableau de Bord de Diagnostic SCADA
          </CardTitle>
          <CardDescription>
            Surveillez l'état de la connexion temps réel, la source des données et visualisez les données brutes.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="État de la Connexion"
            value={currentStatusInfo.text}
            icon={currentStatusInfo.icon}
            description={
                <span className="flex items-center gap-2">
                    <span
                        className={cn(
                        'h-2 w-2 rounded-full',
                        currentStatusInfo.color,
                        currentStatusInfo.animate && 'animate-pulse'
                        )}
                    />
                    Bus de données temps réel
                </span>
            }
          />
          <StatCard
            title="Source des Données"
            value={dataSource === 'REALTIME' ? 'Temps Réel' : 'Simulateur'}
            icon={dataSource === 'REALTIME' ? Wifi : Cpu}
            description={dataSource === 'REALTIME' ? 'Données provenant du backend (OPC UA ou Démo)' : 'Fallback : données générées par le client'}
          />
           <StatCard
            title="Tags Reçus"
            value={latestDataEntries.length.toString()}
            icon={BadgeCheck}
            description="Nombre de tags dans le dernier message"
          />
      </div>
      
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
                    <TableHead>Qualité</TableHead>
                    <TableHead className="text-right">Valeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestDataEntries.map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs">{key}</TableCell>
                      <TableCell>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">BONNE</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{typeof value === 'number' ? value.toFixed(2) : value}</TableCell>
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
            <CardTitle>Historique Brut des Messages</CardTitle>
            <CardDescription>Les 100 derniers messages reçus du bus de données.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/20">
                <pre className="p-4 text-xs">
                    {history.length > 0 ? JSON.stringify(history.slice().reverse(), null, 2) : "Aucun message dans l'historique."}
                </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
