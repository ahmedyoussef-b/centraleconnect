'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Search } from 'lucide-react';
import { EquipmentDetector, type EquipmentDetection } from '@/lib/vision/equipment-detector';

export default function TestAiPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<EquipmentDetection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const detectorRef = useRef<EquipmentDetector | null>(null);
  const { toast } = useToast();

  // Initialize the detector
  useEffect(() => {
    detectorRef.current = new EquipmentDetector();
    detectorRef.current.initialize().catch(err => {
        console.error("Failed to initialize EquipmentDetector:", err);
        toast({
            variant: 'destructive',
            title: 'Erreur Modèle IA',
            description: "Impossible de charger le modèle de détection d'équipements.",
        });
    });
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !imageRef.current) {
      toast({
        variant: 'destructive',
        title: 'Aucune image',
        description: "Veuillez sélectionner une image à analyser.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      if (!detectorRef.current) {
        throw new Error("Le détecteur n'est pas initialisé.");
      }
      const detections = await detectorRef.current.detect(imageRef.current);
      setResults(detections);
    } catch (e: any) {
      console.error("Analysis failed:", e);
      setError(e.message || "Une erreur est survenue lors de l'analyse.");
      toast({
        variant: 'destructive',
        title: 'Erreur d\'analyse',
        description: e.message || "Impossible d'analyser l'image.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Page de Test du Détecteur d'Équipements (IA)</CardTitle>
          <CardDescription>
            Uploadez une image pour tester le modèle de reconnaissance d'objets TensorFlow.js.
            Le service est conçu pour simuler la détection si le modèle n'est pas trouvé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept="image/*" onChange={handleFileChange} />
          
          {imagePreview && (
            <div className="border rounded-md p-2">
              <img ref={imageRef} src={imagePreview} alt="Aperçu" className="max-h-64 w-auto mx-auto" />
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={isLoading || !file} className="w-full">
            {isLoading ? <LoaderCircle className="mr-2 animate-spin" /> : <Search className="mr-2" />}
            Lancer l'analyse
          </Button>

          {error && <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
      </Card>
      
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats de la Détection</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
                 <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results, null, 2)}
                 </pre>
            ) : (
                <p className="text-muted-foreground">Aucun équipement détecté avec un seuil de confiance suffisant.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
