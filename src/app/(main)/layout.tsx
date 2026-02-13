
// src/app/(main)/layout.tsx
'use client';

import {
  Activity,
  BellRing,
  Book,
  Bot,
  ScanSearch,
  ClipboardCheck,
  Database,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  RefreshCw,
  Search,
  Shapes,
  FileSearch,
  Camera,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
import { PidViewerProvider, usePidViewer } from '@/contexts/pid-viewer-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PidViewer from '@/components/PidViewer';
import { SyncProvider, useSync } from '@/contexts/sync-context';
import { Badge } from '@/components/ui/badge';
import { ScadaProvider } from '@/lib/scada/providers/scada-provider';

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

const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Tableau de Bord',
    '/scada-diagnostics': 'Diagnostic SCADA',
    '/synoptic': 'Synoptique Interactif',
    '/alarms': 'Liste des Alarmes',
    '/procedures': 'Procédures',
    '/equipments': 'Équipements',
    '/logbook': 'Journal de Bord',
    '/vision': 'Scanner Visuel',
    '/vision/search': 'Recherche Visuelle',
    '/vision/analysis': 'Analyse d\'Image',
    '/sync': 'Synchronisation',
    '/test': 'Page de Test',
};

function PidModal() {
    const { pidToShow, hidePid } = usePidViewer();

    if (!pidToShow) {
        return null;
    }
    
    return (
        <Dialog open={!!pidToShow} onOpenChange={(open) => !open && hidePid()}>
            <DialogContent className="max-w-4xl h-auto">
                <DialogHeader>
                    <DialogTitle>Schéma P&ID: {pidToShow}</DialogTitle>
                </DialogHeader>
                <div className="h-[60vh] overflow-hidden">
                    <PidViewer externalId={pidToShow} />
                </div>
            </DialogContent>
        </Dialog>
    );
}


function MainLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');
    const { pendingSyncCount } = useSync();
  
    let title: string;
    if (pathname.startsWith('/equipments/')) {
        title = 'Détail Équipement';
    } else if (pathname.startsWith('/procedures/')) {
        title = 'Exécution Procédure';
    } else if (pathname.startsWith('/sync')) {
        title = 'Synchronisation';
    }
    else {
        title = pageTitles[pathname] ?? 'CCPP Monitor';
    }

    return (
    <PidViewerProvider>
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
                  <SidebarMenuButton asChild tooltip="Tableau de Bord" isActive={pathname === '/dashboard'}>
                      <Link href="/dashboard">
                          <LayoutDashboard />
                          Tableau de Bord
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Diagnostic SCADA" isActive={pathname === '/scada-diagnostics'}>
                    <Link href="/scada-diagnostics">
                        <Activity />
                        Diagnostic SCADA
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Synoptique" isActive={pathname === '/synoptic'}>
                    <Link href="/synoptic">
                        <LayoutGrid />
                        Synoptique
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Alarmes" isActive={pathname === '/alarms'}>
                      <Link href="/alarms">
                          <BellRing />
                          Alarmes
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Procédures" isActive={pathname.startsWith('/procedures')}>
                      <Link href="/procedures">
                          <ClipboardCheck />
                          Procédures
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Équipements" isActive={pathname.startsWith('/equipments')}>
                      <Link href="/equipments">
                          <Database />
                          Équipements
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Journal de Bord" isActive={pathname === '/logbook'}>
                      <Link href="/logbook">
                          <Book />
                          Journal de Bord
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Scanner Visuel" isActive={pathname.startsWith('/vision') && !pathname.includes('search') && !pathname.includes('analysis')}>
                      <Link href="/vision">
                          <Camera />
                          Scanner Visuel
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Recherche Visuelle" isActive={pathname.startsWith('/vision/search')}>
                      <Link href="/vision/search">
                          <FileSearch />
                          Recherche Visuelle
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Analyse d'Image" isActive={pathname.startsWith('/vision/analysis')}>
                      <Link href="/vision/analysis">
                          <ScanSearch />
                          Analyse d'Image
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Synchronisation" isActive={pathname === '/sync'}>
                    <Link href="/sync">
                        <RefreshCw />
                        <span>Synchronisation</span>
                        {pendingSyncCount > 0 && (
                            <Badge variant="destructive" className="ml-auto group-data-[collapsible=icon]:hidden">
                            {pendingSyncCount}
                            </Badge>
                        )}
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Test" isActive={pathname === '/test'}>
                      <Link href="/test">
                          <FlaskConical />
                          Test
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Paramètres" isActive={pathname === '/settings'}>
                      <Link href="/settings">
                          <Settings />
                          Paramètres
                      </Link>
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
             <div className="mt-2 border-t border-sidebar-border pt-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                <p>v{process.env.APP_VERSION}</p>
                {process.env.BUILD_TIME && (
                    <p title={new Date(process.env.BUILD_TIME).toISOString()}>
                        Build: {format(new Date(process.env.BUILD_TIME), 'dd/MM/yy HH:mm', { locale: fr })}
                    </p>
                )}
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-12 items-center justify-between border-b bg-background/50 px-4 backdrop-blur-sm">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Rapport d'incident
              </Button>
              <VocalAssistant />
            </div>
          </header>
          <main className="flex-1 space-y-4 p-4">
              {children}
          </main>
        </SidebarInset>
        <PidModal />
      </SidebarProvider>
    </PidViewerProvider>
    );
}


export default function MainLayout({ children }: { children: React.ReactNode; }) {
    return (
        <SyncProvider>
            <ScadaProvider>
                <MainLayoutContent>{children}</MainLayoutContent>
            </ScadaProvider>
        </SyncProvider>
    );
}
