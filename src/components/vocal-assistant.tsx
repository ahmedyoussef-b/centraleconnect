
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, LoaderCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { askAssistant, type AssistantInput } from '@/ai/flows/assistant-flow';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useVoskRecognizer, RecognizerState } from '@/hooks/use-vosk-recognizer';
import { getAssistantContextData } from '@/lib/db-service';
import { usePidViewer } from '@/contexts/pid-viewer-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function VocalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isTauri, setIsTauri] = useState(false);
  const [masterDataContext, setMasterDataContext] = useState<any | null>(null);
  
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { showPid } = usePidViewer();

  const { recognizerState, transcript, start, stop } = useVoskRecognizer({
      modelUrl: '/models/vosk-model-small-fr-0.22.zip',
      sampleRate: 16000
  });

  // Update input field with transcript from Vosk
  useEffect(() => {
    if (transcript.partial) {
        setInput(transcript.partial);
    }
    if (transcript.final) {
        handleSend(transcript.final);
    }
  }, [transcript]);

  // Load master data on mount if in Tauri
  useEffect(() => {
    const tauriEnv = !!window.__TAURI__;
    setIsTauri(tauriEnv);

    async function loadData() {
      if (tauriEnv) {
        try {
          const data = await getAssistantContextData();
          setMasterDataContext(data);
          console.log('Master data context loaded for assistant.');
        } catch (e) {
          console.error(e);
          toast({
            variant: 'destructive',
            title: 'Erreur de base de données',
            description: "Impossible de charger les données de référence pour l'assistant.",
          });
        }
      }
    }
    loadData();
  }, [toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (query: string) => {
    const trimmedInput = query.trim();
    if (!trimmedInput || isProcessing) return;

    setInput('');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmedInput,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
        const assistantInput: AssistantInput = {
            query: trimmedInput,
        };
        if (isTauri && masterDataContext) {
            assistantInput.context = masterDataContext;
        }
      const assistantResponse = await askAssistant(assistantInput);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantResponse.text,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (assistantResponse.action?.action === 'show_pid') {
        showPid(assistantResponse.action.target);
      }

      if (isTtsEnabled && audioRef.current) {
        audioRef.current.src = assistantResponse.audio;
        audioRef.current.play().catch(e => console.error("Audio playback failed", e));
      }
    } catch (error) {
      console.error('Assistant error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de l\'assistant',
        description: 'Impossible d\'obtenir une réponse. Veuillez réessayer.',
      });
       const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Désolé, je rencontre une difficulté technique.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isTtsEnabled, toast, masterDataContext, isTauri, showPid]);
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSend(input);
  }

  const toggleListening = () => {
    if (recognizerState === RecognizerState.LISTENING) {
        stop();
    } else {
        start();
    }
  }

  const getMicButton = () => {
    switch(recognizerState) {
        case RecognizerState.LOADING:
            return (
                <Button type="button" variant="ghost" size="icon" disabled>
                    <LoaderCircle className="animate-spin" />
                    <span className="sr-only">Chargement du modèle...</span>
                </Button>
            );
        case RecognizerState.READY:
            return (
                 <Button type="button" variant="ghost" size="icon" onClick={toggleListening} disabled={isProcessing}>
                    <Mic />
                    <span className="sr-only">Commencer l'écoute</span>
                </Button>
            );
        case RecognizerState.LISTENING:
            return (
                 <Button type="button" variant="ghost" size="icon" onClick={toggleListening} disabled={isProcessing}>
                    <MicOff className="text-destructive" />
                    <span className="sr-only">Arrêter l'écoute</span>
                </Button>
            );
        case RecognizerState.ERROR:
        default:
             return (
                <Button type="button" variant="ghost" size="icon" disabled>
                    <MicOff className="text-muted-foreground" />
                    <span className="sr-only">Reconnaissance vocale non disponible</span>
                </Button>
            );
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Bot />
          <span className="sr-only">Ouvrir l'assistant vocal</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Bot /> Assistant Vocal CCPP-AI
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
             <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="space-y-4 p-4">
                    {messages.map((message) => (
                        <div key={message.id} className={cn("flex items-start gap-3", message.role === 'user' && 'justify-end')}>
                            {message.role === 'assistant' && (
                                 <Avatar className="h-8 w-8">
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn("max-w-xs rounded-lg p-3 text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                {message.text}
                            </div>
                             {message.role === 'user' && userAvatar && (
                                <Avatar className="h-8 w-8">
                                     <AvatarImage src={userAvatar.imageUrl} alt={userAvatar.description} />
                                     <AvatarFallback>OP</AvatarFallback>
                                 </Avatar>
                            )}
                        </div>
                    ))}
                    {isProcessing && (
                         <div className="flex items-start gap-3">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                            <div className="max-w-xs rounded-lg bg-muted p-3 text-sm">
                                <div className="flex items-center gap-2">
                                <div className="h-2 w-2 animate-pulse rounded-full bg-foreground" />
                                <div className="h-2 w-2 animate-pulse rounded-full bg-foreground [animation-delay:0.2s]" />
                                <div className="h-2 w-2 animate-pulse rounded-full bg-foreground [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
             </ScrollArea>
        </div>
        <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                 <Button type="button" variant="ghost" size="icon" onClick={() => setIsTtsEnabled(!isTtsEnabled)}>
                    {isTtsEnabled ? <Volume2 /> : <VolumeX />}
                    <span className="sr-only">{(isTtsEnabled ? 'Désactiver' : 'Activer') + ' la synthèse vocale'}</span>
                </Button>
                <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={recognizerState === RecognizerState.READY ? "Posez votre question..." : "Chargement de l'assistant..."}
                    disabled={isProcessing || recognizerState !== RecognizerState.READY}
                />
                {getMicButton()}
                 <Button type="submit" size="icon" disabled={isProcessing || !input.trim()}>
                    <Send />
                    <span className="sr-only">Envoyer</span>
                </Button>
            </form>
        </div>
        <audio ref={audioRef} className="hidden" />
      </SheetContent>
    </Sheet>
  );
}
