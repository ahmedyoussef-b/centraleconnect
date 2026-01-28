'use client';

import { getAlarms } from '@/lib/alarms-service';
import type { Alarm } from '@/types/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { BellRing, Wind, Cog, Zap, Factory, ChevronDown, AlertTriangle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type AlarmWithRef = Alarm & { standardRef?: string };

const severityVariantMap: Record<Alarm['severity'], BadgeProps['variant']> = {
  EMERGENCY: 'destructive',
  CRITICAL: 'destructive',
  WARNING: 'default',
  INFO: 'secondary',
};

function AlarmList({ alarms }: { alarms: AlarmWithRef[] }) {
    if (alarms.length === 0) {
        return (
            <div className="flex h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-border">
                <p className="text-center text-sm text-muted-foreground">Aucune alarme configurée dans cette catégorie.</p>
            </div>
        );
    }
    return (
        <div className="space-y-2">
            {alarms.map((alarm, index) => (
                <Collapsible key={`${alarm.code}-${index}`} className="rounded-lg border group">
                    <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 rounded-t-lg">
                        <div className="grid flex-1 grid-cols-4 items-center gap-4">
                            <div className="flex items-center gap-2 font-semibold">
                                <Badge
                                    variant={severityVariantMap[alarm.severity] ?? 'default'}
                                    className={cn(
                                        'text-xs',
                                        alarm.severity === 'WARNING' && 'bg-yellow-500 text-slate-900 hover:bg-yellow-500/90 border-transparent',
                                        alarm.severity === 'EMERGENCY' && 'animate-pulse'
                                    )}
                                >
                                    {alarm.severity}
                                </Badge>
                            </div>
                            <div className="font-mono text-xs">{alarm.code}</div>
                            <div>{alarm.description}</div>
                            <div className="text-xs text-muted-foreground">{alarm.component_id}</div>
                        </div>
                        <ChevronDown className="ml-4 h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="border-t p-4 space-y-4 text-sm bg-muted/30 rounded-b-lg">
                            {alarm.parameter && (
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Paramètre de déclenchement</h4>
                                        <p className="text-muted-foreground">{alarm.parameter}</p>
                                    </div>
                                </div>
                            )}
                             {alarm.reset_procedure && (
                                <div className="flex items-start gap-3">
                                    <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Procédure de Réarmement</h4>
                                        <p className="text-muted-foreground">{alarm.reset_procedure}</p>
                                    </div>
                                </div>
                            )}
                             {alarm.standardRef && (
                                <div className="flex items-start gap-3">
                                    <Cog className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Référence Norme</h4>
                                        <p className="text-muted-foreground">{alarm.standardRef}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
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
                                    <div className="grid grid-cols-4 items-center gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground border-b mb-2">
                                        <span>Sévérité</span>
                                        <span>Code Alarme</span>
                                        <span>Description</span>
                                        <span>Composant</span>
                                    </div>
                                    <AlarmList alarms={category.alarms} />
                                </CardContent>
                            </AccordionContent>
                        </AccordionItem>
                     </Card>
                ))}
            </Accordion>
        </div>
    );
}
