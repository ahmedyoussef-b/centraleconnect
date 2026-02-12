
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FileSearch, LoaderCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseSearchQuery } from '@/ai/flows/search-parser-flow';
import { searchDocuments } from '@/lib/db-service';
import type { Document } from '@/types/db';

export default function VisualSearchPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Document[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setResults([]);
    try {
      // 1. Parse the natural language query with AI
      toast({ title: 'Analyse de la requête...', description: 'L\'IA interprète votre recherche.' });
      const parsedQuery = await parseSearchQuery({ query });
      console.log('Parsed query:', parsedQuery);

      // 2. Search documents with structured filters
      toast({ title: 'Recherche en cours...', description: 'Recherche dans la base de données visuelles.' });
      const documents = await searchDocuments({
        text: parsedQuery.text,
        equipmentId: parsedQuery.equipmentId,
      });
      setResults(documents);

      if (documents.length === 0) {
        toast({ title: 'Aucun résultat', description: 'Aucune preuve visuelle ne correspond à votre recherche.' });
      }

    } catch (error: any) {
      console.error('Search failed:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de recherche',
        description: error.message || 'Une erreur est survenue.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch />
            Recherche Visuelle Sémantique
          </CardTitle>
          <CardDescription>
            Recherchez des preuves visuelles en langage naturel. Ex: &quot;fuites sur CR1&quot;, &quot;plaque signalétique pompe&quot;...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Votre recherche..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Rechercher
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:shadow-lg hover:border-primary transition-all overflow-hidden"
              onClick={() => router.push(`/equipments/${encodeURIComponent(doc.equipmentId)}`)}
            >
              <div className="relative aspect-video">
                <Image
                  src={doc.imageData}
                  alt={doc.description || `Document ${doc.id}`}
                  fill
                  className="object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-base">{doc.equipmentId}</CardTitle>
                <CardDescription>
                  {format(new Date(doc.createdAt), 'd MMM yyyy, HH:mm', { locale: fr })}
                </CardDescription>
              </CardHeader>
              {doc.ocrText && (
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">{doc.ocrText}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {!isLoading && query && results.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-12 rounded-lg border-2 border-dashed">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Aucun Résultat</h3>
            <p className="text-sm text-muted-foreground">Aucune preuve visuelle ne correspond à &quot;{query}&quot;.</p>
        </div>
      )}
    </div>
  );
}
