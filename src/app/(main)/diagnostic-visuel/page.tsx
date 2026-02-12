

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Search, LoaderCircle, AlertTriangle, FileDown, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Import analysis functions
import { extractIndustrialMetadata, type IndustrialImageMetadata } from '@/lib/image/metadata-extractor';
import { performIndustrialOCR, type OCRExtractionResult } from '@/lib/ocr/industrial-ocr';
import { detectIndustrialCodes, type IndustrialCode } from '@/lib/vision/code-detector';
import { EquipmentDetector, type EquipmentDetection } from '@/lib/vision/equipment-detector';
import { PIDAnalyzer, type PIDAnalysis } from '@/lib/vision/pid-analyzer';
import { FaultDetector, type VisualAnomalyDetection } from '@/lib/vision/fault-detector';
import { ParameterExtractor, type Parameter } from '@/lib/ocr/parameter-extractor';
import { SafetyLabelDetector, type SafetyLabel } from '@/lib/ocr/safety-label-detector';
import { SignatureExtractor, type Signature } from '@/lib/ocr/signature-extractor';
import { EnvironmentAnalyzer, type EnvironmentAnalysis } from '@/lib/vision/environment-analyzer';
import { SimpleShapeDetector, type Detection as ShapeDetection } from '@/lib/vision/simple-detector';


interface AnalysisResults {
  metadata: IndustrialImageMetadata;
  ocr: OCRExtractionResult;
  codes: IndustrialCode[];
  detections: EquipmentDetection[];
  pid: PIDAnalysis | null;
  anomalies: VisualAnomalyDetection[];
  parameters: Parameter[];
  safetyLabels: SafetyLabel[];
  signatures: Signature[];
  environment: EnvironmentAnalysis | null;
  shapes: ShapeDetection[];
}

export default function DiagnosticVisuelPage() {
  const [fileImage, setFileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  // Initialiser les détecteurs
  const detectorRef = useRef<EquipmentDetector | null>(null);
  const pidAnalyzerRef = useRef<PIDAnalyzer | null>(null);
  const faultDetectorRef = useRef<FaultDetector | null>(null);
  const parameterExtractorRef = useRef<ParameterExtractor | null>(null);
  const safetyLabelDetectorRef = useRef<SafetyLabelDetector | null>(null);
  const signatureExtractorRef = useRef<SignatureExtractor | null>(null);
  const shapeDetectorRef = useRef<SimpleShapeDetector | null>(null);

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
    faultDetectorRef.current = new FaultDetector();
    faultDetectorRef.current.initialize().catch(err => {
        console.error(err);
        toast({
            variant: 'destructive',
            title: 'Erreur Modèle IA',
            description: "Impossible de charger le modèle de détection de défauts.",
        });
    });
    parameterExtractorRef.current = new ParameterExtractor();
    safetyLabelDetectorRef.current = new SafetyLabelDetector();
    signatureExtractorRef.current = new SignatureExtractor();
    shapeDetectorRef.current = new SimpleShapeDetector();
  }, [toast]);


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
      const imageDataForAnalysis = ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);

      const [metadata, ocr, codes, detections, pid, anomalies, parameters, safetyLabels, signatures, shapes] = await Promise.all([
        extractIndustrialMetadata(imageBlob),
        performIndustrialOCR(fileImage, { zone: 'B1' }),
        detectIndustrialCodes(imageDataForAnalysis),
        detectorRef.current ? detectorRef.current.detect(imageRef.current) : Promise.resolve([]),
        pidAnalyzerRef.current ? pidAnalyzerRef.current.analyze(imageDataForAnalysis) : Promise.resolve(null),
        faultDetectorRef.current ? faultDetectorRef.current.detect(imageRef.current) : Promise.resolve([]),
        parameterExtractorRef.current ? parameterExtractorRef.current.extract(imageRef.current) : Promise.resolve([]),
        safetyLabelDetectorRef.current ? safetyLabelDetectorRef.current.detect(imageRef.current) : Promise.resolve([]),
        signatureExtractorRef.current ? signatureExtractorRef.current.extract(imageRef.current) : Promise.resolve([]),
        shapeDetectorRef.current ? Promise.all([
            shapeDetectorRef.current.detectCircles(imageDataForAnalysis),
            shapeDetectorRef.current.detectRectangles(imageDataForAnalysis),
            shapeDetectorRef.current.detectTriangles(imageDataForAnalysis),
            shapeDetectorRef.current.detectLines(imageDataForAnalysis)
        ]).then(results => results.flat()) : Promise.resolve([]),
      ]);
      
      const environmentAnalyzer = new EnvironmentAnalyzer();
      const environment = environmentAnalyzer.analyze(detections);

      setResults({ metadata, ocr, codes, detections, pid, anomalies, parameters, safetyLabels, signatures, environment, shapes });

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

  const handleExport = () => {
    if (!results) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(results, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `diagnostic-results-${new Date().toISOString()}.json`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Search />
              Diagnostic Visuel
            </CardTitle>
            {results && (
              <Button onClick={handleExport} variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Exporter en JSON
              </Button>
            )}
          </div>
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
            {results.anomalies.length > 0 && (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle />Anomalies Détectées !</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {results.anomalies.map((anomaly, index) => (
                            <div key={index} className="p-3 rounded-md bg-destructive/10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold">{anomaly.type}</h4>
                                        <p className="text-sm text-destructive/80">Confiance: {anomaly.confidence.toFixed(0)}% | Sévérité: {anomaly.severity}</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-destructive text-destructive-foreground">{anomaly.severity}</span>
                                </div>
                                {anomaly.suggestedAction && (
                                    <div className="mt-2 flex items-center gap-2 text-sm text-destructive/90 bg-destructive/10 p-2 rounded-md">
                                        <Wrench className="h-4 w-4 flex-shrink-0" />
                                        <span>Action suggérée : {anomaly.suggestedAction}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

          {results.safetyLabels.length > 0 && (
            <Card>
                <CardHeader><CardTitle>Étiquettes de Sécurité</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.safetyLabels, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}

           <Card>
                <CardHeader><CardTitle>Détection d'Équipements (IA)</CardTitle></CardHeader>
                <CardContent>
                    {results.detections.length > 0 ? (
                    <div className="space-y-2">
                        {results.detections.map((detection, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted">
                            <div>
                            <span className="font-semibold">{detection.equipmentType}</span>
                            <span className="text-sm text-muted-foreground ml-2">({detection.confidence.toFixed(0)}%)</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/equipments/${detection.equipmentType}`)}>Voir détails</Button>
                        </div>
                        ))}
                    </div>
                    ) : <p className="text-muted-foreground">Aucun équipement détecté.</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Détection de Codes (QR & Barcodes)</CardTitle></CardHeader>
                <CardContent>
                    {results.codes.length > 0 ? (
                    <div className="space-y-2">
                        {results.codes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted">
                            <div>
                            <span className="font-semibold">{code.type}</span>
                            <p className="text-sm text-muted-foreground font-mono">{code.content}</p>
                            </div>
                            {code.equipmentId && (
                            <Button size="sm" variant="outline" onClick={() => router.push(`/equipments/${encodeURIComponent(code.equipmentId!)}`)}>Voir {code.equipmentId}</Button>
                            )}
                        </div>
                        ))}
                    </div>
                    ) : <p className="text-muted-foreground">Aucun code détecté.</p>}
                </CardContent>
            </Card>

           {results.shapes.length > 0 && (
            <Card>
                <CardHeader><CardTitle>Détection de Formes Géométriques</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.shapes, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Métadonnées EXIF</CardTitle></CardHeader>
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
            <CardHeader><CardTitle>OCR (Reconnaissance de Texte)</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(results.ocr, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {results.parameters.length > 0 && (
            <Card>
                <CardHeader><CardTitle>Paramètres de Performance (OCR)</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.parameters, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}

          {results.environment && (
            <Card>
                <CardHeader><CardTitle>Analyse de l'Environnement (Zone)</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.environment, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}
          
          {results.pid && (
            <Card>
                <CardHeader><CardTitle>Analyse P&amp;ID (Simulation CV)</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.pid, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}

          {results.signatures.length > 0 && (
            <Card>
                <CardHeader><CardTitle>Signatures Manuscrites</CardTitle></CardHeader>
                <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(results.signatures, null, 2)}
                    </pre>
                </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
