'use client';

import { useEffect, useState, useMemo } from 'react';
import { getFunctionalNodes } from '@/lib/db-service';
import type { FunctionalNode } from '@/types/db';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, Cog, Database, ChevronRight, Home } from 'lucide-react';
import { usePidViewer } from '@/contexts/pid-viewer-context';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

function Breadcrumb({ path, setPath }: { path: string[], setPath: (path: string[]) => void }) {
    const handleClick = (index: number) => {
        setPath(path.slice(0, index + 1));
    };

    return (
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Button variant="ghost" size="sm" onClick={() => setPath([])} className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Systèmes
            </Button>
            {path.length > 0 && <ChevronRight className="h-4 w-4" />}
            {path.map((item, index) => (
                <React.Fragment key={item}>
                    <Button
                        variant={index === path.length - 1 ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => handleClick(index)}
                    >
                        {item}
                    </Button>
                    {index < path.length - 1 && <ChevronRight className="h-4 w-4" />}
                </React.Fragment>
            ))}
        </nav>
    );
}

export function SystemHierarchyBrowser() {
    const [nodes, setNodes] = useState<FunctionalNode[]>([]);
    const [path, setPath] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTauri, setIsTauri] = useState(false);
    const { showPid } = usePidViewer();

    useEffect(() => {
        const tauriEnv = !!window.__TAURI__;
        setIsTauri(tauriEnv);
        if (tauriEnv) {
            setLoading(true);
            getFunctionalNodes()
                .then(setNodes)
                .catch(err => {
                    console.error(err);
                    setError("Impossible de charger les données des équipements.");
                })
                .finally(() => setLoading(false));
        }
    }, []);

    const currentView = useMemo(() => {
        if (path.length === 0) { // System View
            const systems = [...new Set(nodes.map(n => n.system))];
            return systems.map(s => ({ id: s, name: s, type: 'system' as const }));
        }
        if (path.length === 1) { // Subsystem View
            const [system] = path;
            const systemNodes = nodes.filter(n => n.system === system);
            const subsystems = [...new Set(systemNodes.map(n => n.subsystem.split('.')[0]))];
            return subsystems.map(s => ({ id: s, name: s, type: 'subsystem' as const }));
        }
        if (path.length === 2) { // Equipment View
            const [system, subsystem] = path;
            return nodes
                .filter(n => n.system === system && n.subsystem.startsWith(subsystem))
                .map(n => ({ id: n.external_id, name: n.name, type: 'equipment' as const, node: n }));
        }
        return [];
    }, [path, nodes]);

    const handleCardClick = (item: { id: string; type: 'system' | 'subsystem' | 'equipment'; node?: FunctionalNode }) => {
        if (item.type === 'equipment' && item.node) {
            showPid(item.node.external_id);
        } else {
            setPath([...path, item.id]);
        }
    };

    if (!isTauri) {
        return (
          <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
            <p className="text-center text-muted-foreground">
              Le navigateur d'équipements n'est disponible que dans
              l'application de bureau Tauri.
            </p>
          </div>
        );
    }

    if (loading) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (error) {
        return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    const level = path.length;
    let title = "Navigateur d'Équipements";
    if (level === 1) title = `Système ${path[0]}`;
    if (level === 2) title = `Sous-système ${path[1]}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database /> {title}</CardTitle>
                <CardDescription>Explorez la hiérarchie des équipements de la centrale.</CardDescription>
            </CardHeader>
            <CardContent>
                <Breadcrumb path={path} setPath={setPath} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {currentView.map(item => (
                        <Card
                            key={item.id}
                            className={cn(
                                "cursor-pointer hover:shadow-lg hover:border-primary transition-all",
                                item.type === 'equipment' && "border-2 border-transparent"
                            )}
                            onClick={() => handleCardClick(item)}
                        >
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                {item.type === 'system' && <Folder className="w-8 h-8 text-primary" />}
                                {item.type === 'subsystem' && <Folder className="w-8 h-8 text-secondary-foreground" />}
                                {item.type === 'equipment' && <Cog className="w-8 h-8 text-accent-foreground" />}
                                <div>
                                    <CardTitle>{item.name}</CardTitle>
                                    <CardDescription>{item.type === 'equipment' ? item.node?.type : item.type}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
