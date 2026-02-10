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
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { PidViewerProvider, usePidViewer } from '@/contexts/pid-viewer-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PidViewer from '@/components/PidViewer';

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
    '/synoptic': 'Synoptique Interactif',
    '/scada': 'Supervision SCADA',
    '/alarms': 'Liste des Alarmes',
    '/procedures': 'Procédures',
    '/equipments': 'Équipements',
    '/logbook': 'Journal de Bord',
    '/provisioning': 'Analyse Visuelle',
    '/settings': 'Paramètres',
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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');
  
  let title: string;
  if (pathname.startsWith('/equipments/')) {
    title = 'Détail Équipement';
  } else if (pathname.startsWith('/procedures/')) {
    title = 'Exécution Procédure';
  } else {
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
                  <SidebarMenuButton asChild tooltip="Analyse Visuelle" isActive={pathname === '/provisioning'}>
                      <Link href="/provisioning">
                          <ScanSearch />
                          Analyse Visuelle
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
