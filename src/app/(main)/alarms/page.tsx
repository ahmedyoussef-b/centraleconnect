'use client';

import { getAlarms } from '@/lib/alarms-service';
import type { Alarm } from '@/types/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { BellRing, Wind, Cog, Zap, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type AlarmWithRef = Alarm & { standardRef: string };

const severityVariantMap: Record<Alarm['severity'], BadgeProps['variant']> = {
  EMERGENCY: 'destructive',
  CRITICAL: 'destructive',
  WARNING: 'default',
  INFO: 'secondary',
};

function AlarmTable({ alarms }: { alarms: AlarmWithRef[] }) {
    if (alarms.length === 0) {
        return (
            <div className="flex h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-border">
                <p className="text-center text-sm text-muted-foreground">Aucune alarme configurée dans cette catégorie.</p>
            </div>
        );
    }
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[120px]">Sévérité</TableHead>
                        <TableHead className="w-[200px]">Code Alarme</TableHead>
                        <TableHead className="w-[150px]">Composant</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[150px]">Réf. Norme</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {alarms.map((alarm, index) => (
                        <TableRow key={`${alarm.code}-${index}`}>
                            <TableCell>
                                <Badge 
                                    variant={severityVariantMap[alarm.severity] ?? 'default'}
                                    className={cn(
                                        alarm.severity === 'WARNING' && 'bg-yellow-500 text-slate-900 hover:bg-yellow-500/90 border-transparent',
                                        alarm.severity === 'EMERGENCY' && 'animate-pulse'
                                    )}
                                >
                                    {alarm.severity}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{alarm.code}</TableCell>
                            <TableCell className="font-medium">{alarm.component_id}</TableCell>
                            <TableCell>{alarm.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{alarm.standardRef}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

interface AlarmCategory {
    name: string;
    description: string;
    alarms: AlarmWithRef[];
    icon: React.ElementType;
}

export default function AlarmsPage() {
    const alarms = getAlarms();

    const groupedAlarms = {
        tg: alarms.filter(a => a.component_id.startsWith('TG')),
        tv: alarms.filter(a => a.component_id.startsWith('TV')),
        elec: alarms.filter(a => a.component_id.startsWith('ELEC')), // Assuming a convention
        aux: alarms.filter(a => !a.component_id.startsWith('TG') && !a.component_id.startsWith('TV') && !a.component_id.startsWith('ELEC')),
    };

    const categories: AlarmCategory[] = [
        { name: "Alarmes Turbine à Gaz", description: "Alarmes relatives aux turbines à gaz (TG1, TG2).", alarms: groupedAlarms.tg, icon: Cog },
        { name: "Alarmes Turbine à Vapeur", description: "Alarmes relatives à la turbine à vapeur (TV).", alarms: groupedAlarms.tv, icon: Wind },
        { name: "Alarmes Auxiliaires", description: "Alarmes pour les systèmes de support (chaudières, condenseurs, pompes...).", alarms: groupedAlarms.aux, icon: Factory },
        { name: "Alarmes Électriques", description: "Alarmes relatives aux systèmes de distribution et de contrôle électrique.", alarms: groupedAlarms.elec, icon: Zap },
    ];
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellRing />
                        Référentiel des Alarmes
                    </CardTitle>
                    <CardDescription>
                        Liste de toutes les alarmes de référence, groupées par système principal.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Accordion type="multiple" defaultValue={categories.map(c => c.name)} className="space-y-4">
                {categories.map(category => (
                     <Card key={category.name}>
                        <AccordionItem value={category.name} className="border-b-0">
                                <AccordionTrigger className="p-6 hover:no-underline">
                                    <div className="text-left flex-1">
                                        <CardTitle className="flex items-center gap-3">
                                            <category.icon className="h-6 w-6 text-primary"/>
                                            {category.name}
                                            <Badge variant="secondary">{category.alarms.length}</Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-1.5">{category.description}</CardDescription>
                                    </div>
                                </AccordionTrigger>
                            <AccordionContent>
                                <CardContent className="pt-0">
                                    <AlarmTable alarms={category.alarms} />
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                     </Card>
                ))}
            </Accordion>
        </div>
    );
}
