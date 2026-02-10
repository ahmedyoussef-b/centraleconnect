
'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanLine, Save, X, ScanSearch, PlusCircle, Upload, Plus, Image as ImageIcon, Trash2 } from 'lucide-react';
import type Tesseract from 'tesseract.js';
import Image from 'next/image';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Component } from '@/types/db';
import { computePHash, compareHashes } from '@/lib/image-hashing';
import visualDbData from '@/assets/master-data/visual-database.json';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

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

interface StagedImage {
    file: File;
    dataUrl: string;
}

// Placeholder for complex image analysis
async function generateJsonForImage(image: StagedImage): Promise<any> {
    console.log(`Generating stats for ${image.file.name}...`);
    // Simulate async work
    await new Promise(res => setTimeout(res, 50 + Math.random() * 100));
    return {
        filename: image.file.name,
        size: image.file.size,
        perceptual_hash: await computePHash(image.dataUrl),
        histogram: Array(100).fill(0), // Placeholder 10x10 histogram
        rgb_stats: {
            mean: { r: 128, g: 128, b: 128 },
            std_dev: { r: 50, g: 50, b: 50 },
            min: { r: 0, g: 0, b: 0 },
            max: { r: 255, g: 255, b: 255 },
        }
    };
}


function AddToDatabaseModal({ isOpen, onOpenChange, onProcess }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onProcess: (images: StagedImage[]) => void }) {
    const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newImages: StagedImage[] = [];
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    newImages.push({ file, dataUrl: e.target?.result as string });
                    if (newImages.length === files.length) {
                        setStagedImages(prev => [...prev, ...newImages]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const handleRemoveImage = (index: number) => {
        setStagedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcess = () => {
        onProcess(stagedImages);
        setStagedImages([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Ajouter à la base de données visuelle</DialogTitle>
                    <CardDescription>Sélectionnez une ou plusieurs images à analyser et à ajouter.</CardDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div 
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-12 h-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Cliquez ou glissez-déposez des fichiers ici</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Images en attente ({stagedImages.length})</Label>
                        {stagedImages.length > 0 ? (
                        <ScrollArea className="h-48 border rounded-md p-2">
                            <div className="grid grid-cols-2 gap-2">
                                {stagedImages.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <Image src={image.dataUrl} alt={image.file.name} width={150} height={100} className="rounded-md object-cover w-full aspect-[3/2]" />
                                        <Button 
                                            variant="destructive" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => handleRemoveImage(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                         ) : (
                            <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                            </div>
                         )}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                    <Button onClick={handleProcess} disabled={stagedImages.length === 0}>
                        <PlusCircle className="mr-2"/>
                        Traiter {stagedImages.length} image(s)
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
  const { toast } = useToast();

  const workerRef = useRef<Tesseract.Worker | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('En attente...');
  
  const [capturedImage, setCapturedImage] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [isTauri, setIsTauri] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [stagedForProcessing, setStagedForProcessing] = useState<StagedImage[]>([]);

  useEffect(() => {
    const isTauriEnv = !!window.__TAURI__;
    setIsTauri(isTauriEnv);

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
    const isTauriEnv = !!window.__TAURI__;
    if (!isTauriEnv) return;

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
  }, [toast]);

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
        setViewMode('idle');
    }
  }, [toast]);

  const processProvisioning = useCallback(async (imageDataUrl: string) => {
    setViewMode('scanning');
    setCapturedImage(imageDataUrl);
    setStatusText('Analyse OCR en cours...');

    if (!workerRef.current) {
        toast({ variant: 'destructive', title: 'Erreur OCR', description: "Le moteur d'analyse n'est pas prêt." });
        setViewMode('idle');
        return;
    }
    
    // Tesseract worker can directly recognize a data URL
    const { data: { text } } = await workerRef.current.recognize(imageDataUrl);
    setOcrText(text || 'Aucun texte détecté.');
    setViewMode('provisioning');
  }, [toast]);

  const handleIdentifyFromCamera = useCallback(async () => {
    if (!videoRef.current) return;
    
    setStatusText('Capture en cours...');
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    await processIdentification(imageDataUrl);
  }, [processIdentification]);

  const handleProvisionFromCamera = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    await processProvisioning(imageDataUrl);
  }, [processProvisioning]);

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

  const handleReset = () => {
    setViewMode('idle');
    setScanResult(null);
    setCapturedImage('');
    setOcrText('');
    setProgress(0);
    setStatusText('Prêt à analyser.');
    setStagedForProcessing([]);
  };

  const handleBatchProcessForDb = async (images: StagedImage[]) => {
    console.log("Processing images to add to DB:", images);
    toast({
        title: "Traitement par lots démarré",
        description: `Génération des métadonnées pour ${images.length} images.`
    });
    
    try {
        const promises = images.map(img => generateJsonForImage(img));
        const results = await Promise.all(promises);
        
        console.log("Generated JSON for DB:", results);
        
        // Here you would typically send this to a server or store in localStorage
        // For now, we just show a success message
        toast({
            title: "Traitement terminé",
            description: "Les données JSON ont été générées et sont prêtes pour la sauvegarde. (Simulation)"
        });
    } catch (error) {
        console.error("Batch processing failed:", error);
        toast({
            variant: "destructive",
            title: "Erreur de traitement",
            description: "La génération des métadonnées a échoué."
        });
    }
  };
  
  const isIdle = viewMode === 'idle';

  return (
    <div className="relative">
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
          ) : stagedForProcessing.length > 0 ? (
              <div className="space-y-4 text-center">
                  <div className="relative aspect-video w-full max-w-lg mx-auto overflow-hidden rounded-md border-2 border-dashed bg-muted">
                      <Image src={stagedForProcessing[0].dataUrl} alt="Image à analyser" layout="fill" objectFit="contain" />
                  </div>
                  <p className="text-sm text-muted-foreground">{stagedForProcessing[0].file.name}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button onClick={() => processIdentification(stagedForProcessing[0].dataUrl)} disabled={!isIdle} size="lg" className="h-16 text-lg">
                          <ScanSearch className="mr-3 h-8 w-8"/>
                          <div>
                              <p className="font-bold">Identifier le Fichier</p>
                              <p className="font-normal text-xs text-primary-foreground/80">Comparer avec la base de données</p>
                          </div>
                      </Button>
                      <Button onClick={() => processProvisioning(stagedForProcessing[0].dataUrl)} disabled={!isIdle || !workerRef.current} size="lg" variant="secondary" className="h-16 text-lg">
                          <PlusCircle className="mr-3 h-8 w-8"/>
                           <div>
                              <p className="font-bold">Provisionner le Fichier</p>
                              <p className="font-normal text-xs text-secondary-foreground/80">Extraire les données via OCR</p>
                          </div>
                      </Button>
                  </div>
                   <Button variant="ghost" onClick={handleReset}>
                      <RefreshCcw className="mr-2 h-4 w-4"/>
                      Utiliser la caméra ou choisir un autre fichier
                  </Button>
              </div>
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
                  <Button onClick={handleIdentifyFromCamera} disabled={!isIdle || !hasCameraPermission} size="lg" className="h-16 text-lg">
                      <ScanSearch className="mr-3 h-8 w-8"/>
                      <div>
                          <p className="font-bold">Identifier (Caméra)</p>
                          <p className="font-normal text-xs text-primary-foreground/80">Comparer avec la base de données</p>
                      </div>
                  </Button>
                  <Button onClick={handleProvisionFromCamera} disabled={!isIdle || !hasCameraPermission || (isTauri && !workerRef.current)} size="lg" variant="secondary" className="h-16 text-lg">
                      <PlusCircle className="mr-3 h-8 w-8"/>
                       <div>
                          <p className="font-bold">Provisionner (Caméra)</p>
                          <p className="font-normal text-xs text-secondary-foreground/80">Ajouter via OCR/QR Code</p>
                      </div>
                  </Button>
              </div>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs uppercase text-muted-foreground">Ou</span>
                <div className="flex-grow border-t border-border"></div>
              </div>
              <Button onClick={() => setIsDbModalOpen(true)} variant="outline" className="w-full h-12">
                <Upload className="mr-2 h-4 w-4" />
                Analyser une image depuis l'ordinateur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="fixed bottom-6 right-6">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setIsDbModalOpen(true)}>
          <Plus className="h-8 w-8" />
          <span className="sr-only">Ajouter à la base de données</span>
        </Button>
      </div>

      <AddToDatabaseModal 
        isOpen={isDbModalOpen} 
        onOpenChange={(open) => {
            if (!open) {
                setStagedForProcessing([]);
            }
            setIsDbModalOpen(open);
        }} 
        onProcess={(images) => {
          if(images.length > 0) {
            handleReset(); // Reset the main view
            setStagedForProcessing(images);
          }
        }}
      />
    </div>
  );
}
