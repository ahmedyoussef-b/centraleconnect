
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Server, CloudDownload, LoaderCircle, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSync } from '@/contexts/sync-context';
import { syncWithRemote } from '@/lib/db-service';

export default function SyncPage() {
    const { pendingSyncCount, setPendingSyncCount } = useSync();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTauri, setIsTauri] = useState(false);
    const [lastSyncCount, setLastSyncCount] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        const tauriEnv = !!window.__TAURI__;
        setIsTauri(tauriEnv);
        // We no longer fetch remote data on page load.
        // The user must initiate the sync.
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        setLastSyncCount(0);
        try {
            const { synced, cleaned } = await syncWithRemote();
            setLastSyncCount(synced);
            
            if (cleaned) {
                setPendingSyncCount(0);
            }
            
            toast({
                title: 'Synchronisation terminée',
                description: `${synced} enregistrement(s) ont été synchronisés depuis le serveur distant.`
            });
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
                        <Server className="h-4 w-4" />
                        <AlertTitle>Synchronisation via l'Application de Bureau</AlertTitle>
                        <AlertDescription>
                            La synchronisation des données s'effectue uniquement sur l'application de bureau (Tauri).
                            <br />
                            Le mode Web est en lecture seule.
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
                    <CardContent className="pt-6 grid grid-cols-2 gap-4">
                       <div className="flex items-center gap-4">
                         <Database className="h-10 w-10 text-muted-foreground" />
                         <div>
                            <p className="text-sm text-muted-foreground">Données locales</p>
                            <p className="text-2xl font-bold">À jour</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <Server className="h-10 w-10 text-muted-foreground" />
                         <div>
                            <p className="text-sm text-muted-foreground">Données en attente (serveur)</p>
                            <p className="text-2xl font-bold">{pendingSyncCount}</p>
                         </div>
                       </div>
                    </CardContent>
                </Card>

                <Button onClick={handleSync} disabled={isSyncing} className="w-full" size="lg">
                    {isSyncing ? (
                        <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Synchronisation en cours...
                        </>
                    ) : (
                        <>
                            <CloudDownload className="mr-2 h-4 w-4" />
                            Lancer la synchronisation
                        </>
                    )}
                </Button>

                {lastSyncCount > 0 && !isSyncing && (
                    <Alert>
                        <AlertTitle>Rapport de la dernière synchronisation</AlertTitle>
                        <AlertDescription>
                            {lastSyncCount} enregistrement(s) ont été mis à jour ou ajoutés dans la base de données locale.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
