
'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
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
import { askAssistant } from '@/ai/flows/assistant-flow';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

// Check for SpeechRecognition API
const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export function VocalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Speech Recognition Effect
  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript); // Automatically send after recognition
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast({
        variant: 'destructive',
        title: 'Erreur de reconnaissance vocale',
        description: event.error,
      });
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [toast]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (query: string) => {
    const trimmedInput = query.trim();
    if (!trimmedInput) return;

    setInput('');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmedInput,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const assistantResponse = await askAssistant(trimmedInput);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantResponse.text,
      };
      setMessages((prev) => [...prev, assistantMessage]);

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
  };
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSend(input);
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
                    placeholder="Posez votre question..."
                    disabled={isProcessing}
                />
                {SpeechRecognition && (
                    <Button type="button" variant="ghost" size="icon" onClick={toggleListening} disabled={isProcessing}>
                        {isListening ? <MicOff className="text-destructive"/> : <Mic />}
                        <span className="sr-only">{isListening ? 'Arrêter l\'écoute' : 'Commencer l\'écoute'}</span>
                    </Button>
                )}
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
