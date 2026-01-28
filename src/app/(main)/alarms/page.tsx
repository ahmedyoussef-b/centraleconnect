'use client';

import { getAlarms } from '@/lib/alarms-service';
import type { Alarm } from '@/types/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { BellRing } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlarmWithRef = Alarm & { standardRef: string };

const severityVariantMap: Record<Alarm['severity'], BadgeProps['variant']> = {
  CRITICAL: 'destructive',
  WARNING: 'default',
  INFO: 'secondary',
};

export default function AlarmsPage() {
    const alarms = getAlarms();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BellRing />
                    Liste des Alarmes
                </CardTitle>
                <CardDescription>
                    Liste de toutes les alarmes de référence configurées dans le système.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                            {alarms.length > 0 ? (
                                alarms.map((alarm, index) => (
                                    <TableRow key={`${alarm.code}-${index}`}>
                                        <TableCell>
                                            <Badge 
                                                variant={severityVariantMap[alarm.severity] ?? 'default'}
                                                className={cn(alarm.severity === 'WARNING' && 'bg-yellow-500 text-slate-900 hover:bg-yellow-500/90 border-transparent')}
                                            >
                                                {alarm.severity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{alarm.code}</TableCell>
                                        <TableCell className="font-medium">{alarm.component_id}</TableCell>
                                        <TableCell>{alarm.description}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{alarm.standardRef}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Aucune alarme configurée.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
