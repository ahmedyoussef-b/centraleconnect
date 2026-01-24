'use client';

import {
  Activity,
  Book,
  Bot,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

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
          <Button variant="outline" size="sm">
            Rapport d'incident
          </Button>
        </header>
        <main className="flex-1 p-4">
          {/* Le contenu principal viendra ici */}
          <div className="h-full rounded-lg border-2 border-dashed border-border" />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
