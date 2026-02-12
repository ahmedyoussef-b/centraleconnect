
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Book, FileDown, Send, ShieldCheck, ShieldX, LoaderCircle, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { LogEntry, LogEntryType } from '@/types/db';
import { useToast } from '@/hooks/use-toast';
import { Badge, type BadgeProps } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { addLogEntry, getLogEntries } from '@/lib/db-service';

const typeVariantMap: Record<LogEntryType, BadgeProps['variant']> = {
  AUTO: 'secondary',
  MANUAL: 'default',
  DOCUMENT_ADDED: 'outline',
};


export function Logbook() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTauri, setIsTauri] = useState(false);
  const { toast } = useToast();

  const [verificationStatus, setVerificationStatus] = useState<Map<number, boolean>>(new Map());
  const [isVerifying, setIsVerifying] = useState(false);


  const fetchEntries = async () => {
    try {
      const data = await getLogEntries();
      setEntries(data);
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger le journal de bord.',
      });
    }
  };

  useEffect(() => {
    setIsTauri(!!window.__TAURI__);
    fetchEntries();
  }, []);

  const handleAddEntry = async () => {
    if (!newMessage.trim() || !isTauri) return;

    try {
      await addLogEntry({
        type: 'MANUAL',
        source: 'Opérateur 1', // This should be dynamic in a real app
        message: newMessage,
      });
      setNewMessage('');
      await fetchEntries(); // Refresh the list
      setVerificationStatus(new Map()); // Reset verification status
      toast({
        title: 'Succès',
        description: 'Entrée ajoutée au journal de bord.',
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "L'entrée n'a pas pu être enregistrée.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVerify = async () => {
    if (!isTauri) return;
    setIsVerifying(true);
    setVerificationStatus(new Map());

    async function createEntrySignature(
        entryData: Omit<LogEntry, 'id' | 'signature'>,
        previousSignature: string
      ): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(
          `${previousSignature}|${entryData.timestamp}|${entryData.type}|${entryData.source}|${entryData.message}|${
            entryData.equipmentId ?? ''
          }`
        );
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    const sortedEntries = [...entries].reverse(); // Oldest first
    let previousSignature = 'GENESIS';
    const newStatus = new Map<number, boolean>();
    let isChainValid = true;

    for (const entry of sortedEntries) {
        if (!isChainValid) {
            newStatus.set(entry.id, false);
            continue;
        }
        
        if (!entry.signature) {
            newStatus.set(entry.id, false);
            isChainValid = false;
            console.warn(`Entry ${entry.id} has no signature. Chain broken.`);
            continue;
        }

        const expectedSignature = await createEntrySignature(entry, previousSignature);

        if (expectedSignature === entry.signature) {
            newStatus.set(entry.id, true);
        } else {
            newStatus.set(entry.id, false);
            isChainValid = false;
            console.error(`Signature mismatch for entry ${entry.id}. Expected ${expectedSignature}, got ${entry.signature}`);
        }
        previousSignature = entry.signature;
    }
    
    setVerificationStatus(newStatus);
    setIsVerifying(false);

    toast({
        title: "Vérification d'intégrité terminée",
        description: isChainValid ? "L'intégrité du journal de bord est confirmée." : "Rupture de chaîne détectée ! Le journal a peut-être été altéré.",
        variant: isChainValid ? 'default' : 'destructive',
      });
  };

  return (
    <>
      <Card id="logbook-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="h-6 w-6" />
            <CardTitle>Journal de Bord</CardTitle>
          </div>
          <div className="flex items-center gap-2">
             {isTauri && (
                <Button variant="outline" size="sm" onClick={handleVerify} disabled={isVerifying}>
                    {isVerifying ? (
                        <LoaderCircle className="mr-2 animate-spin" />
                    ) : (
                        <ShieldCheck className="mr-2" />
                    )}
                    Vérifier l'intégrité
                </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <FileDown className="mr-2" />
              Exporter en PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isTauri && (
            <div className="flex w-full items-start gap-2">
                <Textarea
                placeholder="Ajouter une note manuelle..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow"
                rows={2}
                />
                <Button size="icon" onClick={handleAddEntry} disabled={!newMessage.trim()}>
                <Send />
                <span className="sr-only">Envoyer</span>
                </Button>
            </div>
          )}

          <div className="mt-4 h-[300px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  {isTauri && <TableHead className="w-[40px]">Statut</TableHead>}
                  <TableHead className="w-[180px]">Horodatage</TableHead>
                  <TableHead className="w-[150px]">Type</TableHead>
                  <TableHead className="w-[150px]">Source</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      {isTauri && (
                        <TableCell>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                    {isVerifying ? (
                                        <LoaderCircle className="animate-spin text-muted-foreground" />
                                    ) : verificationStatus.has(entry.id) ? (
                                        verificationStatus.get(entry.id) ? (
                                            <ShieldCheck className="text-green-500" />
                                        ) : (
                                            <ShieldX className="text-destructive" />
                                        )
                                    ) : (
                                        <Shield className="text-muted-foreground" />
                                    )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isVerifying ? "Vérification en cours..." :
                                        verificationStatus.has(entry.id) ? 
                                        (verificationStatus.get(entry.id) ? "Signature valide" : "Signature INVALIDE") : 
                                        "Non vérifié"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">
                        {format(new Date(entry.timestamp.replace(' ', 'T')), 'dd/MM/yy HH:mm:ss', {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeVariantMap[entry.type] ?? 'default'} className="capitalize">
                            {entry.type.replace('_', ' ').toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.source}</TableCell>
                      <TableCell className="whitespace-pre-wrap">{entry.message}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isTauri ? 5 : 4} className="text-center">
                      Aucune entrée dans le journal.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #logbook-card, #logbook-card * {
            visibility: visible;
          }
          #logbook-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            border: none;
            box-shadow: none;
            margin: 0;
            padding: 0;
          }
          main {
            padding: 0 !important;
          }
          header, .flex-row.items-center.justify-between > .flex.items-center.gap-2, .flex-row.items-center.justify-between > .btn-outline {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
