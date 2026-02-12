'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FileSearch, LoaderCircle, AlertTriangle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseSearchQuery } from '@/ai/flows/search-parser-flow';
import { searchDocuments } from '@/lib/db-service';
import type { Document } from '@/types/db';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { VisualEvidenceCard } from '@/components/vision/visual-evidence-card';

// Mock/Placeholder components for unimplemented UI elements
const FileUpload = ({ onUpload }: { onUpload: (file: File) => void }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onUpload(e.target.files[0]);
        }
    };
    return (
        <div className="text-center">
            <Button asChild variant="outline">
                <label htmlFor="similarity-upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Télécharger une image
                    <input id="similarity-upload" type="file" className="sr-only" onChange={handleFileChange} />
                </label>
            </Button>
        </div>
    );
};
const EquipmentSelect = ({ value, onChange }: { value: any, onChange: (v: any) => void }) => <Input placeholder="Filtrer par équipement..." value={value} onChange={e => onChange(e.target.value)} />;
const AnomalyTypeSelect = ({ value, onChange }: { value: any, onChange: (v: any) => void }) => <Input placeholder="Filtrer par type d'anomalie..." value={value} onChange={e => onChange(e.target.value)} />;
const DateRangePicker = ({ onChange }: { onChange: (v: any) => void }) => <Button variant="outline" className="w-full justify-start text-left font-normal">Sélectionner une période</Button>;


export default function VisualSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    equipment: '',
    anomalyType: '',
    dateRange: null
  });

  const { toast } = useToast();
  const router = useRouter();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResults([]);
    try {
      toast({ title: 'Analyse de la requête...' });
      const parsedQuery = await parseSearchQuery({ query });
      
      toast({ title: 'Recherche en cours...' });
      const documents = await searchDocuments({
        text: parsedQuery.text,
        equipmentId: parsedQuery.equipmentId,
      });

      // Add mock data to satisfy the VisualEvidenceCard component
      const documentsWithMockData = documents.map(doc => ({
        ...doc,
        analysis: { anomalies: [{ type: 'FUITE', severity: 'CRITIQUE', confidence: 95 }] }, // Mock anomaly
        annotations: [],
        createdBy: { name: 'Opérateur 1' } // Mock user
      }));

      setResults(documentsWithMockData);

      if (documents.length === 0) {
        toast({ title: 'Aucun résultat' });
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      toast({ variant: 'destructive', title: 'Erreur de recherche' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimilaritySearch = async (file: File) => {
    toast({ title: 'Recherche par similarité non implémentée', description: 'Cette fonctionnalité sera disponible dans une future version.' });
  };

  return (
    <div className="container mx-auto p-0 space-y-6">
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
            <div className="flex gap-2">
                <Input
                placeholder="Rechercher une fuite, corrosion, CR1..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? <LoaderCircle className="mr-2 animate-spin"/> : null}
                    Rechercher
                </Button>
            </div>
          </CardContent>
      </Card>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters">
          <AccordionTrigger>Filtres avancés & Recherche par similarité</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Équipement</label>
                    <EquipmentSelect
                      value={filter.equipment}
                      onChange={(e) => setFilter({...filter, equipment: e})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type d'anomalie</label>
                    <AnomalyTypeSelect
                      value={filter.anomalyType}
                      onChange={(t) => setFilter({...filter, anomalyType: t})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Période</label>
                    <DateRangePicker
                      onChange={(range) => setFilter({...filter, dateRange: range})}
                    />
                  </div>
              </div>
              <div className="border-l pl-4">
                <label className="text-sm font-medium">Recherche par similarité</label>
                <p className="text-xs text-muted-foreground mb-2">Trouver des anomalies similaires à une image.</p>
                 <FileUpload onUpload={handleSimilaritySearch} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {isLoading && <LoaderCircle className="mx-auto my-12 h-8 w-8 animate-spin text-primary" />}

      {!isLoading && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((evidence) => (
            <VisualEvidenceCard
                key={evidence.id}
                evidence={evidence}
                onClick={() => router.push(`/equipments/${encodeURIComponent(evidence.equipmentId)}`)}
            />
            ))}
        </div>
      )}

      {!isLoading && !results.length && query && (
         <div className="flex flex-col items-center justify-center text-center py-12 rounded-lg border-2 border-dashed">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Aucun Résultat</h3>
            <p className="text-sm text-muted-foreground">Aucune preuve visuelle ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
