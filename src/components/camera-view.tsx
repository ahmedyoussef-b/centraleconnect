
'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanLine, Save, X, ScanSearch, PlusCircle } from 'lucide-react';
import type Tesseract from 'tesseract.js';
import Image from 'next/image';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Component } from '@/types/db';
import { computePHash, compareHashes } from '@/lib/image-hashing';
import visualDbData from '@/assets/master-data/visual-database.json';
import { cn } from '@/lib/utils';

type ViewMode = 'idle' | 'scanning' | 'provisioning' | 'result';

// Simplified type for our visual DB
interface VisualDbEntry {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  perceptualHash: string;
  tags: string[];
}

interface ScanResult {
  capturedImage: string;
  match: VisualDbEntry | null;
  similarity: number;
}

type NewComponentFormData = Omit<Component, 'description'> & {
  description?: string;
};

// Sub-component for displaying scan results
function ResultView({ result, onReset }: { result: ScanResult; onReset: () => void }) {
    const { capturedImage, match, similarity } = result;

    return (
        <Card className="border-primary/50">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Résultat de l'Analyse</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onReset}><RefreshCcw className="mr-2"/>Nouvelle Analyse</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {match ? (
                    <>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Similarité détectée</p>
                            <p className="text-4xl font-bold text-primary">{similarity.toFixed(1)}%</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-2">
                                <Label>Image Capturée</Label>
                                <Image src={capturedImage} alt="Capture" width={400} height={300} className="rounded-md border-2 border-dashed" />
                            </div>
                            <div className="space-y-2">
                                <Label>Meilleure Correspondance</Label>
                                <Image src={match.imageUrl} alt={match.name} width={400} height={300} className="rounded-md border-2 border-primary" />
                            </div>
                        </div>
                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle className="text-xl">{match.name}</CardTitle>
                                <CardDescription>{match.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {match.tags && match.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {match.tags.map(tag => <code key={tag} className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground">{tag}</code>)}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-lg font-semibold">Aucune correspondance trouvée.</p>
                        <p className="text-muted-foreground">L'équipement scanné ne semble pas être dans la base de données visuelle.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


// Sub-component for provisioning form
function ProvisioningForm({
  imageData,
  ocrText,
  onSave,
  onCancel,
}: {
  imageData: string;
  ocrText: string;
  onSave: (component: NewComponentFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<NewComponentFormData>({
    id: '',
    name: '',
    type: '',
    criticality: 'low',
    description: ocrText,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <Card className="border-accent/50">
        <CardHeader><CardTitle>Provisionner un Nouvel Équipement</CardTitle></CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                <h4 className="font-medium">Nouveau composant</h4>
                <div className="space-y-2">
                    <Label htmlFor="id">ID Composant (Tag)</Label>
                    <Input
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="ex: P-101A"
                    required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ex: Pompe de circulation"
                    required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Input
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    placeholder="ex: PUMP"
                    required
                    />
                </div>
                </div>
                <div className="space-y-2">
                <Label>Image Capturée</Label>
                <div className="overflow-hidden rounded-md border">
                    <Image
                    src={imageData}
                    alt="Capture de composant"
                    width={300}
                    height={225}
                    className="h-auto w-full"
                    />
                </div>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">
                Description (Texte extrait de l'image)
                </Label>
                <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="font-mono text-xs"
                />
            </div>
            <div className="flex justify-end gap-2">
                <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                >
                <X className="mr-2" />
                Annuler
                </Button>
                <Button type="submit" disabled={!formData.id || isSaving}>
                {isSaving ? (
                    'Sauvegarde...'
                ) : (
                    <>
                    <Save className="mr-2" />
                    Sauvegarder
                    </>
                )}
                </Button>
            </div>
            </form>
        </CardContent>
    </Card>
  );
}

// Main Component
export function CameraView() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const workerRef = useRef<Tesseract.Worker | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('En attente...');
  
  const [capturedImage, setCapturedImage] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(!!window.__TAURI__);
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
       try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };
    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [toast]);

  useEffect(() => {
    const initializeWorker = async () => {
      if (isTauri && !workerRef.current) {
        setStatusText('Initialisation du moteur OCR...');
        try {
          const TesseractModule = await import('tesseract.js');
          const worker = await TesseractModule.createWorker('fra', 1, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setProgress(m.progress * 100);
              }
            },
          });
          await worker.setParameters({
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-.,°m³/h barNOxDLNHRSGCTGV',
          });
          workerRef.current = worker;
          setStatusText('Prêt à analyser.');
        } catch (error) {
          console.error("Failed to initialize Tesseract worker:", error);
          toast({
            variant: 'destructive',
            title: 'Erreur OCR',
            description: "Le moteur de reconnaissance de texte n'a pas pu être chargé.",
          });
          setStatusText('Erreur OCR.');
        }
      }
    };
    initializeWorker();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [isTauri, toast]);

  const handleIdentify = async () => {
    if (!videoRef.current) return;
    
    setViewMode('scanning');
    setStatusText('Capture en cours...');
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    try {
        setStatusText('Calcul du hachage perceptuel...');
        const capturedHash = await computePHash(imageDataUrl);

        setStatusText('Comparaison avec la base de données...');
        let bestMatch: VisualDbEntry | null = null;
        let minDistance = Infinity;

        for (const item of visualDbData.images) {
            const distance = compareHashes(capturedHash, item.perceptualHash);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = item;
            }
        }
        
        const similarity = Math.max(0, 100 - (minDistance / 64) * 100 * 1.5); // Amplify difference

        if (similarity > 75) { // Similarity threshold
             setScanResult({ capturedImage: imageDataUrl, match: bestMatch, similarity });
        } else {
             setScanResult({ capturedImage: imageDataUrl, match: null, similarity });
        }
        setViewMode('result');

    } catch (error) {
        console.error("Visual identification failed:", error);
        toast({ variant: 'destructive', title: 'Erreur d\'analyse', description: 'La comparaison visuelle a échoué.' });
        setViewMode('idle');
    }
  };

  const handleProvision = async () => {
    if (!videoRef.current) return;

    setViewMode('scanning');
    setStatusText('Analyse OCR en cours...');
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    if (!workerRef.current) {
        toast({ variant: 'destructive', title: 'Erreur OCR', description: "Le moteur d'analyse n'est pas prêt." });
        setViewMode('idle');
        return;
    }
    
    const { data: { text } } = await workerRef.current.recognize(canvas);
    setOcrText(text || 'Aucun texte détecté.');
    setViewMode('provisioning');
  };

  const handleSaveProvision = async (component: NewComponentFormData) => {
    try {
      const { addComponentAndDocument } = await import('@/lib/db-service');
      await addComponentAndDocument(
        { externalId: component.id, name: component.name, type: component.type },
        { imageData: capturedImage, ocrText: ocrText, description: `Plaque signalétique pour ${component.id}` }
      );
      toast({ title: 'Succès', description: `La fiche pour le composant ${component.id} a été ajoutée.` });
      handleReset();
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: error.message || "Impossible d'enregistrer." });
    }
  };

  const handleReset = () => {
    setViewMode('idle');
    setScanResult(null);
    setCapturedImage('');
    setOcrText('');
    setProgress(0);
    setStatusText('Prêt à analyser.');
  };

  if (!isTauri) {
    return (
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ScanSearch /> Analyse Visuelle</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-4 min-h-[300px]">
            <p className="text-center text-muted-foreground">L'analyse visuelle n'est disponible que dans l'application de bureau.</p>
          </CardContent>
      </Card>
    );
  }
  
  const isIdle = viewMode === 'idle';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScanSearch /> Analyse Visuelle</CardTitle>
        <CardDescription>Identifiez un équipement en le scannant, ou provisionnez-en un nouveau.</CardDescription>
      </CardHeader>
      <CardContent>
        {viewMode === 'result' && scanResult ? (
            <ResultView result={scanResult} onReset={handleReset} />
        ) : viewMode === 'provisioning' ? (
            <ProvisioningForm imageData={capturedImage} ocrText={ocrText} onSave={handleSaveProvision} onCancel={handleReset} />
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-dashed bg-muted">
              <video
                ref={videoRef}
                className={cn("h-full w-full object-cover transition-opacity", viewMode === 'scanning' && 'opacity-30')}
                autoPlay
                muted
                playsInline
              />
               {viewMode === 'scanning' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary">
                    <ScanLine className="h-24 w-24 animate-pulse" />
                    <p className="font-semibold">{statusText}</p>
                    <Progress value={progress} className="w-1/2" />
                 </div>
               )}
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4">
                  <CameraOff className="h-12 w-12 text-destructive" />
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Accès Caméra Requis</AlertTitle>
                    <AlertDescription>Veuillez autoriser l'accès à la caméra.</AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleIdentify} disabled={!isIdle || !hasCameraPermission} size="lg" className="h-16 text-lg">
                    <ScanSearch className="mr-3 h-8 w-8"/>
                    <div>
                        <p className="font-bold">Identifier l'Équipement</p>
                        <p className="font-normal text-xs text-primary-foreground/80">Comparer avec la base de données</p>
                    </div>
                </Button>
                <Button onClick={handleProvision} disabled={!isIdle || !hasCameraPermission || !workerRef.current} size="lg" variant="secondary" className="h-16 text-lg">
                    <PlusCircle className="mr-3 h-8 w-8"/>
                     <div>
                        <p className="font-bold">Provisionner un Équipement</p>
                        <p className="font-normal text-xs text-secondary-foreground/80">Ajouter via OCR/QR Code</p>
                    </div>
                </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
