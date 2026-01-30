'use client';

import * as React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getEquipments } from '@/lib/db-service';
import type { Equipment } from '@/types/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, Cog, Database, ChevronRight, Home, Search, X, Package, Wind, Droplets, Turbine } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

type EquipmentWithChildren = Equipment & {
    children?: EquipmentWithChildren[];
};

function EquipmentItem({ node, level = 0 }: { node: EquipmentWithChildren, level?: number }) {
    const router = useRouter();

    if (!node.children || node.children.length === 0) {
        return (
            <div
                className="flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-md cursor-pointer hover:bg-muted"
                style={{ paddingLeft: `${1 + level * 1.5}rem` }}
                onClick={() => router.push(`/equipments/${encodeURIComponent(node.externalId)}`)}
            >
                <Cog className="h-4 w-4 text-accent-foreground flex-shrink-0" />
                <div className="flex-grow">
                    <p className="font-medium text-sm">{node.name}</p>
                    {node.description && <p className="text-xs text-muted-foreground">{node.description}</p>}
                </div>
            </div>
        );
    }

    return (
        <Accordion type="single" collapsible>
            <AccordionItem value={node.externalId} className="border-b-0">
                <AccordionTrigger
                    className="flex items-center gap-3 rounded-md hover:no-underline hover:bg-muted/50 p-2"
                    style={{ paddingLeft: `${0.5 + level * 1.5}rem` }}
                >
                    <Folder className="h-5 w-5 text-secondary-foreground" />
                    <span className="font-semibold text-sm">{node.name}</span>
                </AccordionTrigger>
                <AccordionContent className="pl-4 border-l ml-4">
                    {node.children.map(child => (
                        <EquipmentItem key={child.externalId} node={child} level={level + 1} />
                    ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}


export function SystemHierarchyBrowser() {
    const [nodes, setNodes] = useState<Equipment[]>([]);
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
            (n.systemCode && n.systemCode.toLowerCase().includes(lowerCaseQuery)) ||
            (n.subSystem && n.subSystem.toLowerCase().includes(lowerCaseQuery)) ||
            n.externalId.toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, nodes]);


    const categories = useMemo(() => {
        const buildTree = (items: Equipment[], parentId: string | null = null): EquipmentWithChildren[] => {
            return items
                .filter(item => (item.parentId || null) === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.externalId)
                }));
        };

        const tgEquipments = nodes.filter(n => n.systemCode === 'TG');
        const tgTree = buildTree(tgEquipments);
        
        return [
            { id: 'TG', name: 'Turbines à Gaz', data: tgTree, icon: Turbine, type: 'tree', count: tgEquipments.length },
            { id: 'A0', name: 'Utilitaires (A0)', data: nodes.filter(n => n.systemCode === 'A0'), icon: Package, type: 'grid', count: nodes.filter(n => n.systemCode === 'A0').length },
            { id: 'B0', name: 'Auxiliaires Communs (B0)', data: nodes.filter(n => n.systemCode === 'B0'), icon: Cog, type: 'grid', count: nodes.filter(n => n.systemCode === 'B0').length },
            { id: 'B1', name: 'Cycle Eau-Vapeur CR1 (B1)', data: nodes.filter(n => n.systemCode === 'B1'), icon: Droplets, type: 'grid', count: nodes.filter(n => n.systemCode === 'B1').length },
            { id: 'B2', name: 'Cycle Eau-Vapeur CR2 (B2)', data: nodes.filter(n => n.systemCode === 'B2'), icon: Droplets, type: 'grid', count: nodes.filter(n => n.systemCode === 'B2').length },
            { id: 'B3', name: 'Cycle Eau-Vapeur TV (B3)', data: nodes.filter(n => n.systemCode === 'B3'), icon: Wind, type: 'grid', count: nodes.filter(n => n.systemCode === 'B3').length },
        ].filter(c => c.count > 0);
    }, [nodes]);

    
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


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database /> Navigateur d'Équipements</CardTitle>
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
                                                <Cog className="w-5 h-5 text-accent-foreground" />
                                                {node.name}
                                            </CardTitle>
                                            <CardDescription>{node.externalId}</CardDescription>
                                        </CardHeader>
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
                    <Accordion type="multiple" defaultValue={['TG']} className="space-y-4">
                        {categories.map(cat => (
                            <Card key={cat.id}>
                                <AccordionItem value={cat.id} className="border-b-0">
                                    <AccordionTrigger className="p-6 hover:no-underline">
                                        <div className="text-left flex-1">
                                            <CardTitle className="flex items-center gap-3">
                                                <cat.icon className="h-6 w-6 text-primary"/>
                                                {cat.name}
                                                <Badge variant="secondary">{cat.count}</Badge>
                                            </CardTitle>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-6">
                                        {cat.type === 'grid' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {(cat.data as Equipment[]).map(node => (
                                                    <Button key={node.externalId} variant="ghost" className="justify-start gap-2" onClick={() => router.push(`/equipments/${encodeURIComponent(node.externalId)}`)}>
                                                        <Cog className="h-4 w-4" />
                                                        <span>{node.name}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        {cat.type === 'tree' && (
                                            <div className="space-y-1">
                                                {(cat.data as EquipmentWithChildren[]).map(tg => (
                                                    <Card key={tg.externalId} className="overflow-hidden">
                                                         <div className="flex items-center gap-3 p-3 font-semibold bg-muted/50 cursor-pointer" onClick={() => router.push(`/equipments/${encodeURIComponent(tg.externalId)}`)}>
                                                            <Cog className="h-6 w-6 text-primary" />
                                                            {tg.name}
                                                        </div>
                                                        <div className="p-2 space-y-1">
                                                            {tg.children && tg.children.map(child => (
                                                                <EquipmentItem key={child.externalId} node={child} />
                                                            ))}
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Card>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}