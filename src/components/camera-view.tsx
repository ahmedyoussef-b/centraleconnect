
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanLine, Save, X, ScanSearch, Upload, FileUp, Plus } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

type ViewMode = 'idle' | 'scanning' | 'provisioning' | 'result';
type AnalysisMode = 'camera' | 'file';

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
                                <Image src={capturedImage} alt="Capture" width={400} height={300} className="rounded-md border-2 border-dashed aspect-video object-contain" />
                            </div>
                            <div className="space-y-2">
                                <Label>Meilleure Correspondance</Label>
                                <Image src={match.imageUrl} alt={match.name} width={400} height={300} className="rounded-md border-2 border-primary aspect-video object-contain" />
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
interface UploadedFile {
    id: string;
    file: File;
    previewUrl: string;
}
function DatabaseManagementModal() {
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const newUploadedFiles: UploadedFile[] = files.map(file => ({
            id: `${file.name}-${file.lastModified}`,
            file,
            previewUrl: URL.createObjectURL(file),
        }));
        setSelectedFiles(prev => [...prev, ...newUploadedFiles]);
    };

    const removeFile = (id: string) => {
        setSelectedFiles(prev => prev.filter(f => f.id !== id));
    };

    const generateJsonForFile = async (file: File): Promise<any> => {
        // Simulate detailed analysis
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas not supported");

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const image = new window.Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });

        // Simplified histogram
        const histSize = 10;
        canvas.width = histSize;
        canvas.height = histSize;
        ctx.drawImage(img, 0, 0, histSize, histSize);
        const histData = ctx.getImageData(0, 0, histSize, histSize).data;
        const histogram = Array.from(histData).reduce((acc, val, i) => {
            const channel = i % 4; // 0=R, 1=G, 2=B, 3=A
            if (channel < 3) acc[channel] = (acc[channel] || 0) + val;
            return acc;
        }, [] as number[]);

        return {
            fileName: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            histogram: {
                r: Math.round(histogram[0] / (histSize * histSize)),
                g: Math.round(histogram[1] / (histSize * histSize)),
                b: Math.round(histogram[2] / (histSize * histSize)),
            },
        };
    };

    const handleBatchProcess = async () => {
        setIsProcessing(true);
        const allStats = [];
        for (const uploadedFile of selectedFiles) {
            const stats = await generateJsonForFile(uploadedFile.file);
            allStats.push(stats);
        }
        
        // Simulate saving to DB / downloading JSON
        const jsonString = JSON.stringify({ images: allStats }, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'visual-database-export.json';
        a.click();
        URL.revokeObjectURL(url);
        
        setIsProcessing(false);
        setSelectedFiles([]);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg" size="icon">
                    <Plus className="h-8 w-8" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Gérer la Base de Données Visuelle</DialogTitle>
                    <DialogDescription>
                        Importez de nouvelles images pour enrichir la base de données de reconnaissance visuelle.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div 
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Cliquez ou glissez-déposez pour importer des images</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                    {selectedFiles.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-medium">Images à importer ({selectedFiles.length})</h4>
                            <div className="max-h-[300px] overflow-y-auto pr-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {selectedFiles.map(uploadedFile => (
                                    <div key={uploadedFile.id} className="relative group">
                                        <Image
                                            src={uploadedFile.previewUrl}
                                            alt={uploadedFile.file.name}
                                            width={150}
                                            height={150}
                                            className="w-full h-32 object-cover rounded-md"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => removeFile(uploadedFile.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <p className="text-xs truncate text-muted-foreground mt-1">{uploadedFile.file.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button
                        onClick={handleBatchProcess}
                        disabled={selectedFiles.length === 0 || isProcessing}
                    >
                        {isProcessing ? "Traitement en cours..." : `Générer et télécharger JSON pour ${selectedFiles.length} image(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Main Component
export function CameraView() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const workerRef = useRef<Tesseract.Worker | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('camera');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('En attente...');
  
  const [capturedImage, setCapturedImage] = useState('');
  const [fileImage, setFileImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(!!window.__TAURI__);

    if (analysisMode === 'camera') {
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
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [toast, analysisMode]);

  useEffect(() => {
    // Only run in tauri environment
    if (!isTauri) return;

    const initializeWorker = async () => {
      if (!workerRef.current) {
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
  }, [toast, isTauri]);
  
  const handleReset = useCallback(() => {
    setViewMode('idle');
    setFileImage(null);
    setScanResult(null);
    setCapturedImage('');
    setOcrText('');
    setProgress(0);
    setStatusText('Prêt à analyser.');
     if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const processIdentification = useCallback(async (imageDataUrl: string) => {
    setViewMode('scanning');
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
        handleReset();
    }
  }, [toast, handleReset]);

  const processProvisioning = useCallback(async (imageDataUrl: string) => {
    setViewMode('scanning');
    setCapturedImage(imageDataUrl);

    let ocrResultText = 'Saisie manuelle requise.';

    if (isTauri) {
        setStatusText('Analyse OCR en cours...');
        if (!workerRef.current) {
            toast({ variant: 'destructive', title: 'Erreur OCR', description: "Le moteur d'analyse n'est pas prêt." });
            handleReset();
            return;
        }
        try {
            const { data: { text } } = await workerRef.current.recognize(imageDataUrl);
            ocrResultText = text || 'Aucun texte détecté.';
        } catch (error) {
            console.error("OCR recognition failed:", error);
            toast({
                variant: "default",
                title: 'OCR a échoué',
                description: "La reconnaissance de texte a échoué, veuillez saisir les informations manuellement.",
            });
            ocrResultText = "L'OCR a échoué. Saisie manuelle requise.";
        }
    } else {
        setStatusText('Préparation du formulaire...');
        ocrResultText = "L'OCR est indisponible en mode web. Veuillez saisir les informations manuellement.";
    }

    setOcrText(ocrResultText);
    setViewMode('provisioning');
  }, [toast, isTauri, handleReset]);
  
  const captureFromVideo = useCallback(() => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProvision = async (component: NewComponentFormData) => {
    if (!isTauri) {
        toast({ title: 'Fonctionnalité non disponible', description: 'La sauvegarde est uniquement disponible dans l\'application de bureau.'});
        return;
    }
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

  const isIdle = viewMode === 'idle';

  return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScanSearch /> Analyse Visuelle</CardTitle>
          <CardDescription>Identifiez un équipement en le scannant, ou provisionnez-en un nouveau depuis la caméra ou un fichier.</CardDescription>
        </CardHeader>
        <CardContent>
            {viewMode === 'result' && scanResult ? (
              <ResultView result={scanResult} onReset={handleReset} />
            ) : viewMode === 'provisioning' ? (
                <ProvisioningForm imageData={capturedImage} ocrText={ocrText} onSave={handleSaveProvision} onCancel={handleReset} />
            ) : (
                <Tabs value={analysisMode} onValueChange={(value) => { setAnalysisMode(value as AnalysisMode); handleReset(); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="camera"><Camera className="mr-2"/>Analyse par Caméra</TabsTrigger>
                        <TabsTrigger value="file"><Upload className="mr-2"/>Analyse par Fichier</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="camera" className="mt-4 space-y-4">
                        <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-dashed bg-muted">
                            <video
                                ref={videoRef}
                                className={cn("h-full w-full object-cover transition-opacity", !isIdle && 'opacity-30')}
                                autoPlay
                                muted
                                playsInline
                            />
                            {!isIdle && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary bg-background/80">
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
                            <Button onClick={() => { const img = captureFromVideo(); if (img) processIdentification(img); }} disabled={!isIdle || hasCameraPermission === false} size="lg" className="h-16 text-lg">
                                <ScanSearch className="mr-3 h-8 w-8"/>
                                <div>
                                    <p className="font-bold">Identifier</p>
                                    <p className="font-normal text-xs text-primary-foreground/80">Comparer avec la BDD</p>
                                </div>
                            </Button>
                            <Button onClick={() => { const img = captureFromVideo(); if (img) processProvisioning(img); }} disabled={!isIdle || hasCameraPermission === false} size="lg" variant="secondary" className="h-16 text-lg">
                                <FileUp className="mr-3 h-8 w-8"/>
                                <div>
                                    <p className="font-bold">Provisionner</p>
                                    <p className="font-normal text-xs text-secondary-foreground/80">Ajouter via OCR</p>
                                </div>
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="file" className="mt-4 space-y-4">
                        <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-dashed bg-muted">
                           {fileImage ? (
                                <img src={fileImage} alt="Fichier sélectionné" className="h-full w-full object-contain" />
                           ) : (
                                <div 
                                    className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-muted/50"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-12 h-12 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">Cliquez pour sélectionner un fichier</p>
                                </div>
                           )}
                           <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                           {!isIdle && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary bg-background/80">
                                    <ScanLine className="h-24 w-24 animate-pulse" />
                                    <p className="font-semibold">{statusText}</p>
                                    <Progress value={progress} className="w-1/2" />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Button onClick={() => fileImage && processIdentification(fileImage)} disabled={!isIdle || !fileImage} size="lg" className="h-16 text-lg">
                                <ScanSearch className="mr-3 h-8 w-8"/>
                                <div>
                                    <p className="font-bold">Identifier</p>
                                    <p className="font-normal text-xs text-primary-foreground/80">Comparer avec la BDD</p>
                                </div>
                            </Button>
                            <Button onClick={() => fileImage && processProvisioning(fileImage)} disabled={!isIdle || !fileImage} size="lg" variant="secondary" className="h-16 text-lg">
                                <FileUp className="mr-3 h-8 w-8"/>
                                <div>
                                    <p className="font-bold">Provisionner</p>
                                    <p className="font-normal text-xs text-secondary-foreground/80">Ajouter via OCR</p>
                                </div>
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </CardContent>
      </Card>
  );
}
