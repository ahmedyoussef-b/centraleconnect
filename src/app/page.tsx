
'use client';

import {
  Activity,
  Book,
  Bot,
  Camera,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import dynamic from 'next/dynamic';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';
import type { Equipment } from '@/types/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Logbook } from '@/components/logbook';
import { CcppDiagram } from '@/components/ccpp-diagram';

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

const VocalAssistant = dynamic(
  () =>
    import('@/components/vocal-assistant').then((mod) => mod.VocalAssistant),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" size="icon" className="rounded-full" disabled>
        <Bot />
      </Button>
    ),
  }
);

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

function EquipmentsTable() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check for Tauri environment only on client-side
    setIsTauri(!!window.__TAURI__);

    async function loadData() {
      if (!!window.__TAURI__) {
        try {
          const { getEquipments } = await import('@/lib/db-service');
          const data = await getEquipments();
          setEquipments(data);
        } catch (e) {
          console.error(e);
          setError('Failed to load equipment data from local database.');
        }
      }
    }
    loadData();
  }, []);

  if (!isTauri) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
        <p className="text-center text-muted-foreground">
          La fonctionnalité de base de données n'est disponible que dans
          l'application de bureau Tauri.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-destructive p-4">
        <p className="text-center text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Équipements Principaux</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipments.length > 0 ? (
              equipments.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.id}</TableCell>
                  <TableCell>{eq.name}</TableCell>
                  <TableCell>{eq.description}</TableCell>
                  <TableCell>{eq.type}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Chargement des données...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">
                CCPP Monitor
              </span>
              <span className="text-xs text-muted-foreground">
                Cycle Combiné 2x1
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Tableau de Bord" isActive>
                <LayoutDashboard />
                Tableau de Bord
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Supervision SCADA">
                <Activity />
                Supervision SCADA
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Procédures">
                <ClipboardCheck />
                Procédures
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Équipements">
                <Database />
                Équipements
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Journal de Bord">
                <Book />
                Journal de Bord
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Paramètres">
                <Settings />
                Paramètres
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-8 w-8">
                  {userAvatar && (
                    <AvatarImage
                      src={userAvatar.imageUrl}
                      alt={userAvatar.description}
                      data-ai-hint={userAvatar.imageHint}
                    />
                  )}
                  <AvatarFallback>OP</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Opérateur 1</span>
                  <span className="text-xs text-muted-foreground">
                    Chef de Quart
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center justify-between border-b bg-background/50 px-4 backdrop-blur-sm">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Tableau de Bord</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Rapport d'incident
            </Button>
            <VocalAssistant />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4">
          <CcppDiagram />
          <ScadaRealtime />
          <EquipmentsTable />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Logbook />
            <CameraView />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
