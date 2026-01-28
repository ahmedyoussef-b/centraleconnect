'use client';

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getEquipments } from '@/lib/db-service';
import type { Equipment } from '@/types/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, Cog, Database, ChevronRight, Home, Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
            {path.map((item, index) => (
                <React.Fragment key={item}>
                    <ChevronRight className="h-4 w-4" />
                    <Button
                        variant={index === path.length - 1 ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => handleClick(index)}
                    >
                        {item}
                    </Button>
                </React.Fragment>
            ))}
        </nav>
    );
}

export function SystemHierarchyBrowser() {
    const [nodes, setNodes] = useState<Equipment[]>([]);
    const [path, setPath] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getEquipments()
            .then(setNodes)
            .catch(err => {
                console.error(err);
                setError("Impossible de charger les données des équipements.");
            })
            .finally(() => setLoading(false));
    }, []);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        return nodes.filter(n =>
            n.name.toLowerCase().includes(lowerCaseQuery) ||
            (n.description && n.description.toLowerCase().includes(lowerCaseQuery)) ||
            (n.tagNumber && n.tagNumber.toLowerCase().includes(lowerCaseQuery)) ||
            (n.systemCode && n.systemCode.toLowerCase().includes(lowerCaseQuery)) ||
            (n.subSystem && n.subSystem.toLowerCase().includes(lowerCaseQuery)) ||
            n.externalId.toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, nodes]);

    const currentView = useMemo(() => {
        if (path.length === 0) { // System View
            const systems = [...new Set(nodes.map(n => n.systemCode).filter(Boolean))];
            return systems.map(s => ({ id: s!, name: s!, type: 'system' as const }));
        }
        if (path.length === 1) { // Subsystem View
            const [system] = path;
            const systemNodes = nodes.filter(n => n.systemCode === system);
            const subsystems = [...new Set(systemNodes.map(n => n.subSystem?.split('.')[0]).filter(Boolean))];
            return subsystems.map(s => ({ id: s!, name: s!, type: 'subsystem' as const }));
        }
        if (path.length === 2) { // Equipment View
            const [system, subsystem] = path;
            return nodes
                .filter(n => n.systemCode === system && n.subSystem?.startsWith(subsystem))
                .map(n => ({ id: n.externalId, name: n.name, type: 'equipment' as const, node: n }));
        }
        return [];
    }, [path, nodes]);

    const handleCardClick = (item: { id: string; type: 'system' | 'subsystem' | 'equipment'; node?: Equipment }) => {
        if (item.type === 'equipment' && item.node) {
            router.push(`/equipments/${encodeURIComponent(item.node.externalId)}`);
        } else {
            setPath([...path, item.id]);
        }
    };
    
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2"/>
                    <Skeleton className="h-4 w-3/4"/>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    }

    const level = path.length;
    let title = "Navigateur d'Équipements";
    if (searchQuery) {
        title = "Résultats de la recherche";
    } else if (level === 1) {
        title = `Système ${path[0]}`;
    } else if (level === 2) {
        title = `Sous-système ${path[1]}`;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database /> {title}</CardTitle>
                <CardDescription>Explorez la hiérarchie ou recherchez un équipement spécifique.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                     <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par nom, tag, description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                         {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {!searchQuery && <Breadcrumb path={path} setPath={setPath} />}
                </div>

                {searchQuery ? (
                    <div>
                        {searchResults.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {searchResults.map(node => (
                                    <Card
                                        key={node.externalId}
                                        className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                                        onClick={() => router.push(`/equipments/${encodeURIComponent(node.externalId)}`)}
                                    >
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Cog className="w-6 h-6 text-accent-foreground" />
                                                {node.name}
                                            </CardTitle>
                                            <CardDescription>{node.externalId}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{node.description || 'Pas de description.'}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
                                <p className="text-center text-muted-foreground">
                                    Aucun résultat pour &quot;{searchQuery}&quot;.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
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
                )}
            </CardContent>
        </Card>
    );
}
