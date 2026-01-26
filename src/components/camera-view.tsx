
'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanLine, Save, X } from 'lucide-react';
import type Tesseract from 'tesseract.js';
import Image from 'next/image';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Component } from '@/types/db';

type ViewState = 'idle' | 'processing' | 'confirming';
type NewComponentFormData = Omit<Component, 'description'> & {
  description?: string;
};

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
  );
}

export function CameraView() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const workerRef = useRef<Tesseract.Worker | null>(null);
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState('');
  const [capturedImage, setCapturedImage] = useState('');
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(!!window.__TAURI__);
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      // ... (permission logic remains the same)
    };
    getCameraPermission();
    // ... (cleanup logic remains the same)
  }, [toast]);

  useEffect(() => {
    const initializeWorker = async () => {
      setViewState('processing');
      const TesseractModule = await import('tesseract.js');
      const worker = await TesseractModule.createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress * 100);
          }
        },
      });
      await worker.setParameters({
        tessedit_char_whitelist:
          '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-.,°m³/h barNOxDLNHRSGCTGV',
      });
      workerRef.current = worker;
      setViewState('idle');
    };
    if (isTauri) {
      initializeWorker();
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [isTauri]);

  const handleAnalyze = async () => {
    if (!videoRef.current) return;

    setViewState('processing');
    setProgress(0);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const jsqrModule = await import('jsqr');
    const code = jsqrModule.default(
      imageData.data,
      imageData.width,
      imageData.height
    );

    if (code) {
      setAnalysisResult(`QR Code Détecté :\n\n${code.data}`);
      setViewState('confirming');
      return;
    }

    if (!workerRef.current) {
      toast({
        variant: 'destructive',
        title: 'Erreur OCR',
        description: "Le moteur d'analyse n'est pas prêt.",
      });
      setViewState('idle');
      return;
    }

    const {
      data: { text },
    } = await workerRef.current.recognize(canvas);
    setAnalysisResult(text || 'Aucun texte détecté.');
    setViewState('confirming');
  };

  const handleSave = async (component: NewComponentFormData) => {
    try {
      const { addComponentAndDocument } = await import('@/lib/db-service');
      await addComponentAndDocument(component, {
        imageData: capturedImage,
        ocrText: analysisResult,
        description: `Plaque signalétique pour ${component.id}`,
      });
      toast({
        title: 'Succès',
        description: `La fiche pour le composant ${component.id} a été ajoutée.`,
      });
      handleReset();
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur de sauvegarde',
        description:
          error.message ||
          "Impossible d'enregistrer le nouveau composant.",
      });
    }
  };

  const handleReset = () => {
    setViewState('idle');
    setAnalysisResult('');
    setCapturedImage('');
    setProgress(0);
  };

  const isProcessing = viewState === 'processing';
  const isConfirming = viewState === 'confirming';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera />
          Vue Caméra & Provisionnement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isTauri ? (
          <>
            <div
              className={`relative aspect-video w-full overflow-hidden rounded-md border bg-muted ${
                isConfirming ? 'hidden' : ''
              }`}
            >
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />
              {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4">
                  <CameraOff className="h-12 w-12 text-destructive" />
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Accès Caméra Requis</AlertTitle>
                    <AlertDescription>
                      Veuillez autoriser l'accès à la caméra.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {isConfirming ? (
                <ProvisioningForm
                  imageData={capturedImage}
                  ocrText={analysisResult}
                  onSave={handleSave}
                  onCancel={handleReset}
                />
              ) : isProcessing ? (
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    {progress > 0
                      ? 'Analyse du texte en cours...'
                      : 'Analyse en cours...'}
                  </p>
                  <Progress value={progress} className="w-full" />
                </div>
              ) : (
                <Button
                  onClick={handleAnalyze}
                  disabled={!hasCameraPermission || !workerRef.current}
                  className="w-full"
                >
                  <ScanLine className="mr-2" />
                  Analyser pour provisionner
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-4">
            <p className="text-center text-muted-foreground">
              Le provisionnement par caméra n'est disponible que dans
              l'application de bureau.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
