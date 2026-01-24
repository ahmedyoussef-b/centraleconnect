
'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Book, FileDown, Send } from 'lucide-react';

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
import type { LogEntry } from '@/types/db';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';

export function Logbook() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTauri, setIsTauri] = useState(false);
  const { toast } = useToast();

  const fetchEntries = async () => {
    if (window.__TAURI__) {
      try {
        const { getLogEntries } = await import('@/lib/db-service');
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
    }
  };

  useEffect(() => {
    setIsTauri(!!window.__TAURI__);
    fetchEntries();
  }, []);

  const handleAddEntry = async () => {
    if (!newMessage.trim()) return;

    try {
      const { addLogEntry } = await import('@/lib/db-service');
      await addLogEntry({
        type: 'MANUAL',
        source: 'Opérateur 1', // This should be dynamic in a real app
        message: newMessage,
      });
      setNewMessage('');
      await fetchEntries(); // Refresh the list
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

  if (!isTauri) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="h-6 w-6" />
            <CardTitle>Journal de Bord</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[380px] items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
            <p className="text-center text-muted-foreground">
              La fonctionnalité de journal de bord n'est disponible que dans
              l'application de bureau Tauri.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card id="logbook-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="h-6 w-6" />
            <CardTitle>Journal de Bord</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <FileDown className="mr-2" />
            Exporter en PDF
          </Button>
        </CardHeader>
        <CardContent>
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

          <div className="mt-4 h-[300px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead className="w-[180px]">Horodatage</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[150px]">Source</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(entry.timestamp.replace(' ', 'T')), 'dd/MM/yy HH:mm:ss', {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.type === 'AUTO' ? 'secondary' : 'default'}>
                            {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.source}</TableCell>
                      <TableCell className="whitespace-pre-wrap">{entry.message}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
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
