'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { ArrowLeft, Cog, Book, Bell, FileText, Database, BarChart2, Thermometer } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import type { FunctionalNode, Parameter, LogEntry, Document } from '@/types/db';
import type { Alarm } from '@/lib/alarms-service';
import { getFunctionalNodeById, getParametersForComponent, getLogEntriesForNode, getDocumentsForComponent } from '@/lib/db-service';
import { getAlarmsForComponent } from '@/lib/alarms-service';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PidViewer from '@/components/PidViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, type BadgeProps } from '@/components/ui/badge';

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Skeleton className="h-64 w-full" />
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Skeleton className="h-96 w-full" />
        </div>
    );
}

const severityVariantMap: Record<Alarm['severity'], BadgeProps['variant']> = {
  EMERGENCY: 'destructive',
  CRITICAL: 'destructive',
  WARNING: 'default',
  INFO: 'secondary',
};

export default function EquipmentDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const equipmentId = decodeURIComponent(params.id);
    const [node, setNode] = useState<FunctionalNode | null>(null);
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [alarms, setAlarms] = useState<Alarm[]>([]);
    const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!equipmentId) return;

        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const nodeData = await getFunctionalNodeById(equipmentId);
                if (!nodeData) {
                    setError('Équipement non trouvé.');
                    return;
                }
                setNode(nodeData);

                // Fetch related data in parallel
                const [paramsData, alarmsData, logsData, docsData] = await Promise.all([
                    getParametersForComponent(equipmentId),
                    Promise.resolve(getAlarmsForComponent(equipmentId)), // This one is synchronous
                    getLogEntriesForNode(equipmentId),
                    getDocumentsForComponent(equipmentId),
                ]);

                setParameters(paramsData);
                setAlarms(alarmsData);
                setLogEntries(logsData);
                setDocuments(docsData);

            } catch (err: any) {
                console.error(err);
                setError('Erreur lors du chargement des données de l\'équipement.');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [equipmentId]);

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error || !node) {
        return notFound();
    }
    
    return (
        <div className="space-y-4">
            <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
            </Button>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-3xl">
                        <Cog className="h-8 w-8 text-primary" />
                        {node.name}
                    </CardTitle>
                    <CardDescription>{node.description || 'Aucune description disponible.'}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                           <h3 className="font-semibold text-lg flex items-center gap-2"><Database className="h-5 w-5"/> Informations Clés</h3>
                           <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-md">
                               <div><strong>ID Externe:</strong> <Badge variant="secondary" className="font-mono">{node.external_id}</Badge></div>
                               <div><strong>Tag:</strong> <Badge variant="secondary" className="font-mono">{node.tag || 'N/A'}</Badge></div>
                               <div><strong>Système:</strong> {node.system}</div>
                               <div><strong>Sous-système:</strong> {node.subsystem}</div>
                               <div className="col-span-2"><strong>Localisation:</strong> {node.location || 'Non spécifiée'}</div>
                           </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart2 className="h-5 w-5"/>État</h3>
                            <div className="border p-4 rounded-md space-y-2 text-sm">
                                <div><strong>Statut:</strong> <Badge>{node.status}</Badge></div>
                                <div><strong>Approuvé par:</strong> {node.approved_by || 'N/A'}</div>
                                {node.approved_at && <div><strong>Approuvé le:</strong> {format(new Date(node.approved_at), 'dd/MM/yyyy', { locale: fr })}</div>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="pid" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="pid"><Cog className="mr-2"/>P&ID</TabsTrigger>
                    <TabsTrigger value="params"><Thermometer className="mr-2"/>Paramètres</TabsTrigger>
                    <TabsTrigger value="alarms"><Bell className="mr-2"/>Alarmes</TabsTrigger>
                    <TabsTrigger value="logbook"><Book className="mr-2"/>Historique</TabsTrigger>
                    <TabsTrigger value="docs"><FileText className="mr-2"/>Documents</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pid" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Schéma P&ID Associé</CardTitle></CardHeader>
                        <CardContent>
                            <PidViewer externalId={node.external_id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="params" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Paramètres Nominaux</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Paramètre</TableHead><TableHead>Valeur Nominale</TableHead><TableHead>Unité</TableHead><TableHead>Seuils (Sûr/Haut)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {parameters.length > 0 ? parameters.map(p => (
                                        <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.nominal_value ?? 'N/A'}</TableCell><TableCell>{p.unit}</TableCell><TableCell>{`Min: ${p.min_safe ?? 'N/A'}, Max: ${p.max_safe ?? 'N/A'}`}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={4} className="text-center">Aucun paramètre défini.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="alarms" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Alarmes Associées</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Sévérité</TableHead><TableHead>Code</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {alarms.length > 0 ? alarms.map(a => (
                                        <TableRow key={a.code}><TableCell><Badge variant={severityVariantMap[a.severity]}>{a.severity}</Badge></TableCell><TableCell>{a.code}</TableCell><TableCell>{a.description}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">Aucune alarme associée.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logbook" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Historique des Événements</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader><TableRow><TableHead>Horodatage</TableHead><TableHead>Source</TableHead><TableHead>Message</TableHead></TableRow></TableHeader>
                                <TableBody>
                                     {logEntries.length > 0 ? logEntries.map(l => (
                                        <TableRow key={l.id}><TableCell>{format(new Date(l.timestamp.replace(' ', 'T')), 'dd/MM/yy HH:mm:ss', { locale: fr })}</TableCell><TableCell>{l.source}</TableCell><TableCell>{l.message}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={3} className="text-center">Aucun événement enregistré.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="docs" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Documents & Photos</CardTitle></CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                             {documents.length > 0 ? documents.map(d => (
                                <Card key={d.id}>
                                    <CardHeader><CardTitle className="text-base">{d.description}</CardTitle><CardDescription>Capturé le {format(new Date(d.createdAt), 'dd/MM/yyyy', { locale: fr })}</CardDescription></CardHeader>
                                    <CardContent>
                                        <Image src={d.imageData} alt={d.description || 'Document image'} width={400} height={300} className="rounded-md object-cover"/>
                                    </CardContent>
                                </Card>
                            )) : <p className="text-muted-foreground p-4">Aucun document associé.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
