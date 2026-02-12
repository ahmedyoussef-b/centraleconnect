'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ArrowRight, Wrench, Shield, Play, Factory } from "lucide-react";

import { getProcedures } from '@/lib/procedures-service';
import type { Procedure } from '@/types/db';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, React.ElementType> = {
    "Démarrage et Opérations": Play,
    "Arrêt et Maintenance": Wrench,
    "Analyse et Sécurité": Shield,
    "Auxiliaires": Factory,
};

export default function ProceduresPage() {
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProcedures().then(data => {
            setProcedures(data);
            setLoading(false);
        });
    }, []);

    const groupedProcedures = useMemo(() => {
        return procedures.reduce((acc, proc) => {
            const category = proc.category || 'Autres';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(proc);
            return acc;
        }, {} as Record<string, Procedure[]>);
    }, [procedures]);
    
    const categories = Object.keys(groupedProcedures);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck />
                    Procédures Disponibles
                </CardTitle>
                <CardDescription>
                    Sélectionnez une procédure pour commencer le guidage interactif.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : procedures.length > 0 ? (
                    <Accordion type="multiple" defaultValue={categories} className="space-y-4">
                        {categories.map(category => {
                            const procs = groupedProcedures[category];
                            const Icon = categoryIcons[category] || ClipboardCheck;
                            return (
                                <Card key={category}>
                                    <AccordionItem value={category} className="border-b-0">
                                        <AccordionTrigger className="p-6 hover:no-underline">
                                             <div className="text-left flex-1">
                                                <CardTitle className="flex items-center gap-3">
                                                    <Icon className="h-6 w-6 text-primary"/>
                                                    {category}
                                                </CardTitle>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6">
                                            <div className="space-y-4">
                                            {procs.map(proc => (
                                                <Card key={proc.id} className="flex items-center justify-between p-4">
                                                    <div>
                                                        <h3 className="font-semibold">{proc.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{proc.description}</p>
                                                    </div>
                                                    <Button asChild>
                                                        <Link href={`/procedures/${proc.id}`}>
                                                            Commencer <ArrowRight className="h-4 w-4 ml-2" />
                                                        </Link>
                                                    </Button>
                                                </Card>
                                            ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Card>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
                        <p className="text-center text-muted-foreground">
                            Aucune procédure n'est actuellement disponible.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
