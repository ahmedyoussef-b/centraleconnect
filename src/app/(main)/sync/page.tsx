'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Server, CloudDownload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSync } from '@/contexts/sync-context';
import { syncWithRemote } from '@/lib/db-service';

export default function SyncPage() {
    const { pendingSyncCount, clearPendingSyncCount } = useSync();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTauri, setIsTauri] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsTauri(!!window.__TAURI__);
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const { synced, cleaned } = await syncWithRemote();
            toast({
                title: 'Synchronisation terminée',
                description: `${synced} enregistrements ont été synchronisés depuis le serveur distant. Le serveur distant a été nettoyé : ${cleaned ? 'Oui' : 'Non'}.`
            });
            if(cleaned) {
                clearPendingSyncCount();
            }
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
            </CardContent>
        </Card>
    );
}
