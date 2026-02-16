'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSearch, LoaderCircle, AlertTriangle, Upload } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseSearchQuery } from '@/ai/flows/search-parser-flow';
import { searchDocuments } from '@/lib/db-service';
import type { Document, Anomaly } from '@/types/db';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { VisualEvidenceCard } from '@/components/vision/visual-evidence-card';

// Types pour les filtres
interface SearchFilters {
  equipment: string;
  anomalyType: string;
  dateRange: null;
}

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

const EquipmentSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Input 
        placeholder="Filtrer par équipement..." 
        value={value} 
        onChange={e => onChange(e.target.value)} 
    />
);

const AnomalyTypeSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Input 
        placeholder="Filtrer par type d'anomalie..." 
        value={value} 
        onChange={e => onChange(e.target.value)} 
    />
);

const DateRangePicker = ({ onChange }: { onChange: (v: any) => void }) => (
    <Button variant="outline" className="w-full justify-start text-left font-normal">
        Sélectionner une période
    </Button>
);

// Fonction utilitaire pour créer des anomalies mock avec le bon typage
const createMockAnomaly = (type: string, severity: Anomaly['severity'] = 'AVERTISSEMENT'): Anomaly => ({
    type,
    severity,
    confidence: 85 + Math.floor(Math.random() * 10),
    description: `${type} détectée sur l'équipement`
});

export default function VisualSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilters>({
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
      const documents = await searchDocuments(
        parsedQuery.text,
        parsedQuery.equipmentId
      );

      // CORRECTION: Ajout de données mock avec le bon typage
      const documentsWithMockData: Document[] = documents.map(doc => ({
        ...doc,
        analysis: { 
          anomalies: [
            createMockAnomaly('FUITE', 'URGENT'),
            createMockAnomaly('CORROSION', 'AVERTISSEMENT')
          ],
          metadata: {
            modelName: 'Vision AI v2',
            processingTime: 234,
            confidence: 0.92
          }
        },
        annotations: [],
        createdBy: { 
          id: 'operator-1',
          name: 'Opérateur 1' 
        },
        status: 'analyzed',
        tags: ['inspection', 'routine']
      }));

      setResults(documentsWithMockData);

      if (documents.length === 0) {
        toast({ 
          title: 'Aucun résultat',
          description: 'Aucune preuve visuelle ne correspond à votre recherche.'
        });
      } else {
        toast({ 
          title: 'Recherche terminée',
          description: `${documents.length} résultat(s) trouvé(s).`
        });
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur de recherche',
        description: error.message || 'Une erreur est survenue lors de la recherche.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimilaritySearch = async (file: File) => {
    toast({ 
      title: 'Recherche par similarité',
      description: 'Cette fonctionnalité sera disponible dans une future version.'
    });
  };

  // Filtrer les résultats selon les filtres
  const filteredResults = results.filter(doc => {
    if (filter.equipment && !doc.equipmentId.toLowerCase().includes(filter.equipment.toLowerCase())) {
      return false;
    }
    if (filter.anomalyType && doc.analysis?.anomalies) {
      const hasAnomalyType = doc.analysis.anomalies.some(a => 
        a.type.toLowerCase().includes(filter.anomalyType.toLowerCase())
      );
      if (!hasAnomalyType) return false;
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-6 w-6" />
            Recherche Visuelle Sémantique
          </CardTitle>
          <CardDescription>
            Recherchez des preuves visuelles en langage naturel. 
            Exemples : &quot;fuites sur CR1&quot;, &quot;plaque signalétique pompe&quot;, &quot;corrosion sur TG1&quot;
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
              disabled={isLoading}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Recherche...' : 'Rechercher'}
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
                    onChange={(value) => setFilter({...filter, equipment: value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type d'anomalie</label>
                  <AnomalyTypeSelect
                    value={filter.anomalyType}
                    onChange={(value) => setFilter({...filter, anomalyType: value})}
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
                <p className="text-xs text-muted-foreground mb-2">
                  Trouver des anomalies similaires à une image.
                </p>
                <FileUpload onUpload={handleSimilaritySearch} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filteredResults.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {filteredResults.length} résultat{filteredResults.length > 1 ? 's' : ''} trouvé{filteredResults.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredResults.map((evidence) => (
              <VisualEvidenceCard
                key={evidence.id}
                evidence={evidence}
                onClick={() => router.push(`/equipments/${encodeURIComponent(evidence.equipmentId)}`)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && filteredResults.length === 0 && query && (
        <div className="flex flex-col items-center justify-center text-center py-12 rounded-lg border-2 border-dashed">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Aucun Résultat</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Aucune preuve visuelle ne correspond à votre recherche. 
            Essayez de modifier vos termes de recherche ou d'utiliser des filtres différents.
          </p>
        </div>
      )}
    </div>
  );
}
