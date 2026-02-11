'use client';

import { useState, useRef, useEffect } from 'react';
import { FileUp, Search, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Import analysis functions
import { extractIndustrialMetadata, type IndustrialImageMetadata } from '@/lib/image/metadata-extractor';
import { performIndustrialOCR, type OCRExtractionResult } from '@/lib/ocr/industrial-ocr';
import { detectIndustrialCodes, type IndustrialCode } from '@/lib/vision/code-detector';
import { EquipmentDetector, type EquipmentDetection } from '@/lib/vision/equipment-detector';
import { PIDAnalyzer, type PIDAnalysis } from '@/lib/vision/pid-analyzer';


interface AnalysisResults {
  metadata: IndustrialImageMetadata;
  ocr: OCRExtractionResult;
  codes: IndustrialCode[];
  detections: EquipmentDetection[];
  pid: PIDAnalysis | null;
}

export default function TestLecturePage() {
  const [fileImage, setFileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  
  // Initialiser les détecteurs
  const detectorRef = useRef<EquipmentDetector | null>(null);
  const pidAnalyzerRef = useRef<PIDAnalyzer | null>(null);

  useEffect(() => {
    detectorRef.current = new EquipmentDetector();
    detectorRef.current.initialize().catch(err => {
        console.error(err);
        toast({
            variant: 'destructive',
            title: 'Erreur Modèle IA',
            description: "Impossible de charger le modèle de détection d'objets.",
        });
    });
    pidAnalyzerRef.current = new PIDAnalyzer();
  }, [toast]);


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileImage(e.target?.result as string);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!fileImage || !imageRef.current) {
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
      const imageBlob = await fetch(fileImage).then(res => res.blob());
      
      const imageBitmap = await createImageBitmap(imageBlob);
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(imageBitmap, 0, 0);
      const imageDataForCodes = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

      const [metadata, ocr, codes, detections, pid] = await Promise.all([
        extractIndustrialMetadata(imageBlob),
        performIndustrialOCR(fileImage, { zone: 'B1' }),
        detectIndustrialCodes(imageDataForCodes),
        detectorRef.current ? detectorRef.current.detect(imageRef.current) : Promise.resolve([]),
        pidAnalyzerRef.current ? pidAnalyzerRef.current.analyze(imageDataForCodes) : Promise.resolve(null),
      ]);
      
      setResults({ metadata, ocr, codes, detections, pid });

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search />
            Test de Lecture d'Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="flex flex-col items-center justify-center h-64 cursor-pointer border-2 border-dashed rounded-md bg-muted hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
          >
            {fileImage ? (
              <img ref={imageRef} src={fileImage} alt="Image sélectionnée" className="h-full w-full object-contain p-2" />
            ) : (
              <>
                <FileUp className="w-12 h-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Cliquez pour sélectionner une image</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>

          <Button onClick={handleAnalyze} disabled={isLoading || !fileImage} className="w-full">
            {isLoading ? <LoaderCircle className="mr-2 animate-spin" /> : <Search className="mr-2" />}
            Lancer l'analyse complète
          </Button>

          {error && <Alert variant="destructive"><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        </CardContent>
      </Card>
      
      {results && (
        <div className="space-y-4">
           <Card>
            <CardHeader><CardTitle>1. Détection d'Équipements (IA)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(results.detections, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>2. Métadonnées EXIF</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(results.metadata, (key, value) => {
                  if (value instanceof Date) {
                    return value.toISOString();
                  }
                  return value;
                }, 2)}
              </pre>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>3. OCR (Reconnaissance de Texte)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(results.ocr, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>4. Détection de Codes (QR & Barcodes)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(results.codes, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {results.pid && (
            <Card>
                <CardHeader><CardTitle>5. Analyse P&amp;ID (Simulation CV)</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.pid, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
