
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanLine, Save, X, ScanSearch, Upload, FileUp, Server, Cloud } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'idle' | 'scanning' | 'provisioning' | 'result';
type AnalysisMode = 'camera' | 'file';

interface LocalVisualDbEntry {
  documentId: number;
  equipmentId: string;
  equipmentName: string;
  description?: string | null;
  imageData: string;
  perceptualHash: string;
}

interface ScanResult {
  capturedImage: string;
  match: LocalVisualDbEntry | null;
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
                                <img src={match.imageData} alt={match.equipmentName} width={400} height={300} className="rounded-md border-2 border-primary aspect-video object-contain" />
                            </div>
                        </div>
                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle className="text-xl">{match.equipmentName}</CardTitle>
                                <CardDescription>{match.description}</CardDescription>
                            </CardHeader>
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
  const { toast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const externalIdPattern = /^[A-Z0-9][A-Z0-9.-]*$/;
    if (!formData.id || !externalIdPattern.test(formData.id)) {
        toast({
            variant: 'destructive',
            title: 'ID Externe Invalide',
            description: "Format incorrect. Ex: 'B1.PUMP.01' ou 'TG1'. Pas d'espaces ni de caractères spéciaux au début.",
        });
        return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch(e) {
      // Error is already toasted in handleSaveProvision
    } finally {
      setIsSaving(false);
    }
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
                    <Label htmlFor="id">ID Externe (Tag)</Label>
                    <Input
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="ex: B1.PUMP.01A"
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
                    <img
                    src={imageData}
                    alt="Capture de composant"
                    width={300}
                    height={225}
                    className="h-auto w-full object-contain"
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
  const [isCameraActive, setIsCameraActive] = useState(false);
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

  const activateCamera = async () => {
    if (videoRef.current && !videoRef.current.srcObject) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setIsCameraActive(false);
        toast({
          variant: 'destructive',
          title: 'Accès Caméra Refusé',
          description: "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.",
        });
      }
    }
  };

  const stopCamera = useCallback(() => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setIsCameraActive(false);
      }
  }, []);

  useEffect(() => {
    const isTauriEnv = !!window.__TAURI__;
    setIsTauri(isTauriEnv);

    // Cleanup camera on component unmount
    return () => {
      stopCamera();
    }
  }, [stopCamera]);

  useEffect(() => {
    // OCR is only available in Tauri
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
    stopCamera();
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
  }, [stopCamera]);
  
  const handleTabChange = (value: string) => {
    setAnalysisMode(value as AnalysisMode);
    handleReset();
  }

  const processIdentification = useCallback(async (imageDataUrl: string) => {
    console.log('[IDENTIFY_FLOW] Starting identification process.');
    setViewMode('scanning');
    setCapturedImage(imageDataUrl);

    try {
        if (isTauri) {
            setStatusText('Synchronisation des données...');
            console.log('[IDENTIFY_FLOW] Triggering remote-to-local DB sync.');
            const { syncWithRemote } = await import('@/lib/db-service');
            const stats = await syncWithRemote();
            console.log('[IDENTIFY_FLOW] Sync complete.', stats);
            
            let toastDescription = `${stats.synced} enregistrements mis à jour depuis le serveur.`;
            if (stats.cleaned) {
                toastDescription += " La base de données distante a été nettoyée avec succès.";
            }

            toast({
                title: 'Synchronisation terminée',
                description: toastDescription,
            });
        }

        setStatusText('Récupération de la base de données visuelle locale...');
        const { getLocalVisualDatabase } = await import('@/lib/db-service');
        const localVisualDb = await getLocalVisualDatabase();
        
        if (localVisualDb.length === 0) {
            console.warn('[IDENTIFY_FLOW] Local visual DB is empty. Identification cannot proceed.');
            toast({ variant: 'destructive', title: 'Base locale vide', description: 'Aucune donnée visuelle à comparer. Veuillez provisionner des équipements.' });
            handleReset();
            return;
        }

        setStatusText('Calcul du hachage perceptuel...');
        console.log('[IDENTIFY_FLOW] Computing perceptual hash for captured image.');
        const capturedHash = await computePHash(imageDataUrl);
        console.log(`[IDENTIFY_FLOW] Captured image hash: ${capturedHash}`);

        setStatusText('Comparaison avec la base de données locale...');
        console.log('[IDENTIFY_FLOW] Starting comparison loop.');
        let bestMatch: LocalVisualDbEntry | null = null;
        let minDistance = Infinity;

        for (const item of localVisualDb) {
            if (item.perceptualHash) {
                const distance = compareHashes(capturedHash, item.perceptualHash);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = item;
                }
            }
        }
        
        const similarity = Math.max(0, 100 - (minDistance / 64) * 100 * 1.5); // Amplify difference
        console.log(`[IDENTIFY_FLOW] Comparison finished. Best match: ${bestMatch?.equipmentId}, Similarity: ${similarity.toFixed(2)}%, Distance: ${minDistance}`);

        if (similarity > 75) { // Similarity threshold
             setScanResult({ capturedImage: imageDataUrl, match: bestMatch, similarity });
             console.log(`[IDENTIFY_FLOW] Match found and confirmed with similarity > 75%.`);
        } else {
             setScanResult({ capturedImage: imageDataUrl, match: null, similarity });
             console.log(`[IDENTIFY_FLOW] No match found with sufficient similarity (< 75%).`);
        }
        setViewMode('result');
        console.log('[IDENTIFY_FLOW] Displaying results view.');

    } catch (error: any) {
        console.error("[IDENTIFY_FLOW] Visual identification failed:", error);
        toast({ variant: 'destructive', title: 'Erreur d\'analyse', description: error.message || 'La comparaison visuelle a échoué.' });
        handleReset();
    }
  }, [toast, handleReset, isTauri]);

  const processProvisioning = useCallback(async (imageDataUrl: string) => {
    console.log('[PROVISION_FLOW] Starting provisioning process.');
    setViewMode('scanning');
    setCapturedImage(imageDataUrl);

    let ocrResultText = 'Saisie manuelle requise.';

    if (isTauri && workerRef.current) {
        setStatusText('Analyse OCR en cours...');
        console.log('[PROVISION_FLOW] Starting OCR recognition.');
        try {
            const { data: { text } } = await workerRef.current.recognize(imageDataUrl);
            ocrResultText = text || 'Aucun texte détecté.';
            console.log('[PROVISION_FLOW] OCR Result:', ocrResultText);
        } catch (error) {
            console.error("OCR recognition failed:", error);
            ocrResultText = "L'OCR a échoué. Veuillez saisir les informations manuellement.";
            toast({
                variant: "default",
                title: 'OCR a échoué',
                description: ocrResultText,
            });
        }
    } else if (!isTauri) {
        setStatusText('Préparation du formulaire...');
        console.log('[PROVISION_FLOW] Web mode: skipping OCR.');
        ocrResultText = "Le provisionnement OCR est uniquement disponible dans l'application de bureau. Veuillez saisir les informations manuellement.";
    }

    setOcrText(ocrResultText);
    console.log('[PROVISION_FLOW] Moving to provisioning form view.');
    setViewMode('provisioning');
  }, [toast, isTauri]);
  
  const captureFromVideo = useCallback(() => {
    if (!videoRef.current || !isCameraActive) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isCameraActive]);

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

  const handleSaveProvision = async (componentData: NewComponentFormData) => {
    console.log('[PROVISION_FLOW] Starting save provision process for component:', componentData.id);
    try {
      setStatusText('Calcul du hachage...');
      console.log('[PROVISION_FLOW] Computing perceptual hash for new image.');
      const perceptualHash = await computePHash(capturedImage);
      console.log(`[PROVISION_FLOW] Image hash: ${perceptualHash}`);
      
      const payload = {
        component: {
          externalId: componentData.id,
          name: componentData.name,
          type: componentData.type,
        },
        document: {
          imageData: capturedImage,
          ocrText: ocrText,
          description: `Plaque signalétique pour ${componentData.id}`,
          perceptualHash,
        }
      };
      console.log('[PROVISION_FLOW] Assembled payload for API:', payload);

      setStatusText('Sauvegarde sur le serveur distant...');
      console.log('[PROVISION_FLOW] Sending payload to /api/provision.');
      const response = await fetch('/api/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[PROVISION_FLOW] Server returned an error:', { status: response.status, error: errorData });
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('[PROVISION_FLOW] Server responded with success. Provisioning complete.', responseData);
      toast({ title: 'Succès', description: `La fiche pour le composant ${componentData.id} a été ajoutée au serveur.` });
      handleReset();
    } catch (error: any) {
      console.error('[PROVISION_FLOW] Error saving provision:', error);
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: error.message || "Impossible d'enregistrer." });
      throw error;
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
                <Tabs value={analysisMode} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="camera"><Camera className="mr-2"/>Analyse par Caméra</TabsTrigger>
                        <TabsTrigger value="file"><Upload className="mr-2"/>Analyse par Fichier</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="camera" className="mt-4 space-y-4">
                        <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-dashed bg-muted">
                           {isCameraActive ? (
                             <video
                                ref={videoRef}
                                className={cn("h-full w-full object-cover transition-opacity", !isIdle && 'opacity-30')}
                                autoPlay
                                muted
                                playsInline
                            />
                           ) : (
                            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                                {hasCameraPermission === false ? (
                                    <>
                                        <CameraOff className="h-12 w-12 text-destructive" />
                                        <Alert variant="destructive" className="mt-4">
                                            <AlertTitle>Accès Caméra Refusé</AlertTitle>
                                            <AlertDescription>Veuillez autoriser l'accès à la caméra pour continuer.</AlertDescription>
                                        </Alert>
                                        <Button onClick={activateCamera} className="mt-4"><RefreshCcw className="mr-2" />Réessayer</Button>
                                    </>
                                ) : (
                                    <>
                                        <CameraOff className="h-12 w-12 text-muted-foreground" />
                                        <p className="mt-2 text-sm text-muted-foreground">La caméra est désactivée.</p>
                                        <Button onClick={activateCamera} className="mt-4">
                                            <Camera className="mr-2" />
                                            Activer la caméra
                                        </Button>
                                    </>
                                )}
                            </div>
                           )}

                            {!isIdle && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-primary bg-background/80">
                                    <ScanLine className="h-24 w-24 animate-pulse" />
                                    <p className="font-semibold">{statusText}</p>
                                    <Progress value={progress} className="w-1/2" />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button onClick={() => { const img = captureFromVideo(); if (img) processIdentification(img); }} disabled={!isIdle || !isCameraActive} size="lg" className="h-16 text-lg">
                                <div className="flex items-center gap-3">
                                  {isTauri ? <Server className="h-8 w-8"/> : <Cloud className="h-8 w-8"/>}
                                  <div>
                                      <p className="font-bold">Identifier</p>
                                      <p className="font-normal text-xs text-primary-foreground/80">{isTauri ? 'Sync & Compare (Local)' : 'Compare (Remote)'}</p>
                                  </div>
                                </div>
                            </Button>
                            <Button onClick={() => { const img = captureFromVideo(); if (img) processProvisioning(img); }} disabled={!isIdle || !isCameraActive} size="lg" variant="secondary" className="h-16 text-lg">
                                <div className="flex items-center gap-3">
                                <FileUp className="h-8 w-8"/>
                                <div>
                                    <p className="font-bold">Provisionner</p>
                                    <p className="font-normal text-xs text-secondary-foreground/80">Ajouter via OCR</p>
                                </div>
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
                                <div className="flex items-center gap-3">
                                  {isTauri ? <Server className="h-8 w-8"/> : <Cloud className="h-8 w-8"/>}
                                  <div>
                                      <p className="font-bold">Identifier</p>
                                      <p className="font-normal text-xs text-primary-foreground/80">{isTauri ? 'Sync & Compare (Local)' : 'Compare (Remote)'}</p>
                                  </div>
                                </div>
                            </Button>
                            <Button onClick={() => fileImage && processProvisioning(fileImage)} disabled={!isIdle || !fileImage} size="lg" variant="secondary" className="h-16 text-lg">
                                <div className="flex items-center gap-3">
                                  <FileUp className="h-8 w-8"/>
                                  <div>
                                      <p className="font-bold">Provisionner</p>
                                      <p className="font-normal text-xs text-secondary-foreground/80">Ajouter via OCR</p>
                                  </div>
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
