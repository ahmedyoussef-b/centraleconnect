
'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCcw, ScanLine } from 'lucide-react';
import type Tesseract from 'tesseract.js';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';

export function CameraView() {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(
    null
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // OCR & QR State
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState('');

  // Effect for camera permission and stream management
  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("L'API de la caméra n'est pas supportée par ce navigateur.");
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Fonctionnalité non supportée',
          description: "Votre navigateur ne supporte pas l'accès à la caméra.",
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Erreur d'accès à la caméra:", error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Accès Caméra Refusé',
          description:
            "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.",
        });
      }
    };

    getCameraPermission();

    // Clean up the stream when the component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [toast]);

  // Effect to initialize Tesseract worker
  useEffect(() => {
    const initializeWorker = async () => {
      setIsInitializing(true);
      const TesseractModule = await import('tesseract.js');
      const worker = await TesseractModule.createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress * 100);
          }
        },
      });
      // Whitelist common industrial characters to improve accuracy
      await worker.setParameters({
        tessedit_char_whitelist:
          '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-.,°m³/h barNOxDLNHRSGCTGV',
      });
      workerRef.current = worker;
      setIsInitializing(false);
    };

    initializeWorker();

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleAnalyze = async () => {
    if (!videoRef.current) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Le flux vidéo de la caméra n'est pas disponible.",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setAnalysisResult('');

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de capturer l'image de la caméra.",
      });
      setIsProcessing(false);
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 1. Try QR code recognition first
    const jsqrModule = await import('jsqr');
    const code = jsqrModule.default(
      imageData.data,
      imageData.width,
      imageData.height
    );

    if (code) {
      setAnalysisResult(`QR Code Détecté :\n\n${code.data}`);
      setIsProcessing(false);
      return;
    }

    // 2. If no QR code, proceed with OCR
    if (!workerRef.current) {
      toast({
        variant: 'destructive',
        title: 'Erreur OCR',
        description:
          "Le moteur de reconnaissance de caractères n'est pas encore prêt.",
      });
      setIsProcessing(false);
      return;
    }
    toast({
      title: 'Analyse OCR en cours',
      description:
        'Aucun QR code détecté. Lancement de la reconnaissance de texte...',
    });
    const {
      data: { text },
    } = await workerRef.current.recognize(canvas);
    setAnalysisResult(text || 'Aucun texte détecté.');
    setIsProcessing(false);
  };

  const handleReset = () => {
    setAnalysisResult('');
    setProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera />
          Vue Caméra & Analyse
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
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
          {hasCameraPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <p className="text-muted-foreground">
                Demande d'accès à la caméra...
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {analysisResult ? (
            <div className="space-y-2">
              <Label htmlFor="ocr-result">Résultat de l'analyse</Label>
              <Textarea
                id="ocr-result"
                readOnly
                value={analysisResult}
                className="h-24 font-mono text-xs"
              />
              <Button onClick={handleReset} variant="outline" size="sm">
                <RefreshCcw className="mr-2" />
                Nouvelle Analyse
              </Button>
            </div>
          ) : isProcessing || isInitializing ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                {isInitializing
                  ? "Initialisation du moteur d'analyse..."
                  : 'Analyse en cours...'}
              </p>
              <Progress
                value={isInitializing ? undefined : progress}
                className="w-full"
              />
            </div>
          ) : (
            <Button
              onClick={handleAnalyze}
              disabled={!hasCameraPermission || isInitializing}
              className="w-full"
            >
              <ScanLine className="mr-2" />
              Analyser l'image (QR & Texte)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
