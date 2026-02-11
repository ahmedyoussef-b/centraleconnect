'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Server, CloudDownload, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSync } from '@/contexts/sync-context';
import { syncWithRemote } from '@/lib/db-service';
import type { Equipment, Document, LogEntry } from '@/types/db';

interface RemoteData {
    equipments: Equipment[];
    documents: Document[];
    logEntries: LogEntry[];
    // Add other tables as needed
}


export default function SyncPage() {
    const { pendingSyncCount, setPendingSyncCount } = useSync();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTauri, setIsTauri] = useState(false);
    const { toast } = useToast();

    const [isFetching, setIsFetching] = useState(false);
    const [remoteData, setRemoteData] = useState<RemoteData | null>(null);
    const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchRemoteData = async () => {
        setIsFetching(true);
        try {
            const response = await fetch('/api/sync/data');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Échec du chargement des données distantes.');
            }
            const data: RemoteData = await response.json();
            
            const totalCount = (data.equipments?.length || 0) + (data.documents?.length || 0) + (data.logEntries?.length || 0);
            
            setRemoteData(data);
            setFilteredEquipments(data.equipments || []);
            setPendingSyncCount(totalCount);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur de chargement',
                description: error.message
            });
        } finally {
            setIsFetching(false);
        }
    };
    
    useEffect(() => {
        const tauriEnv = !!window.__TAURI__;
        setIsTauri(tauriEnv);
        if (tauriEnv) {
            fetchRemoteData();
        }
    }, []);

    useEffect(() => {
        if (!remoteData?.equipments) return;

        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = remoteData.equipments.filter(e => 
            e.name.toLowerCase().includes(lowerCaseQuery) ||
            e.externalId.toLowerCase().includes(lowerCaseQuery)
        );
        setFilteredEquipments(filtered);
    }, [searchQuery, remoteData]);


    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const { synced } = await syncWithRemote();
            toast({
                title: 'Synchronisation terminée',
                description: `${synced} enregistrements ont été synchronisés depuis le serveur distant.`
            });
            // Reset state after successful sync
            setRemoteData(null);
            setFilteredEquipments([]);
            setPendingSyncCount(0);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur de synchronisation',
                description: error.message || 'Impossible de synchroniser avec le serveur distant.'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isTauri) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw />
                        Synchronisation
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertTitle>Fonctionnalité en attente</AlertTitle>
                        <AlertDescription>
                            Vous avez <strong>{pendingSyncCount}</strong> enregistrement(s) en attente de synchronisation. Veuillez ouvrir l'application de bureau pour synchroniser vos données.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw />
                    Synchronisation avec le serveur distant
                </CardTitle>
                <CardDescription>
                    Téléchargez les données provisionnées depuis le serveur vers votre base de données locale.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Card className="bg-muted/50">
                    <CardContent className="pt-6 flex items-center justify-between">
                       <div>
                         <p className="text-sm text-muted-foreground">Données en attente</p>
                         <p className="text-4xl font-bold">{pendingSyncCount}</p>
                         <p className="text-xs text-muted-foreground">enregistrements à synchroniser</p>
                       </div>
                       <Server className="h-16 w-16 text-muted-foreground" />
                    </CardContent>
                </Card>

                <Button onClick={handleSync} disabled={isSyncing || pendingSyncCount === 0} className="w-full" size="lg">
                    {isSyncing ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Synchronisation en cours...
                        </>
                    ) : (
                        <>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            Lancer la synchronisation
                        </>
                    )}
                </Button>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Détail des équipements en attente</h3>
                    <div className="relative mb-4">
                        <Input
                            placeholder="Filtrer par nom ou ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={isFetching || !remoteData}
                        />
                    </div>
                     <ScrollArea className="h-64 rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID Externe</TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isFetching ? (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24"><LoaderCircle className="animate-spin inline-block mr-2" />Chargement des données distantes...</TableCell></TableRow>
                                ) : filteredEquipments.length > 0 ? (
                                    filteredEquipments.map(equip => (
                                        <TableRow key={equip.externalId}>
                                            <TableCell className="font-mono text-xs">{equip.externalId}</TableCell>
                                            <TableCell>{equip.name}</TableCell>
                                            <TableCell>{equip.type}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24">Aucune donnée d'équipement en attente de synchronisation.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
