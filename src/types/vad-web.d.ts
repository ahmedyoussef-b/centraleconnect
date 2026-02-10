// src/types/vad-web.d.ts
declare module '@ricky0123/vad-web' {
    /**
     * Types étendus pour @ricky0123/vad-web
     * Les propriétés avec URL majuscule sont manquantes dans les types officiels
     */
  
    export interface SpeechProbability {
      isSpeech: boolean;
      prob: number;
    }
  
    export interface RealTimeVADOptions {
      /** URL vers le worklet audio */
      workletURL?: string;
      
      /** URL vers le modèle ONNX de Silero VAD */
      modelURL?: string;
      
      /** URL vers le runtime ONNX WebAssembly */
      ortWasmURL?: string;
      
      /** Callback appelé au début de la parole */
      onSpeechStart?: () => void;
      
      /** Callback appelé à la fin de la parole avec l'audio capturé */
      onSpeechEnd?: (audio: Float32Array) => Promise<void> | void;
      
      /** Callback appelé pour chaque frame traitée */
      onFrameProcessed?: (probs: SpeechProbability) => void;
      
      /** Seuil de détection de parole (0-1) */
      threshold?: number;
      
      /** Durée minimale de silence pour déclencher onSpeechEnd (ms) */
      silenceDuration?: number;
    }
  
    export class MicVAD {
      static new(options: Partial<RealTimeVADOptions>): Promise<MicVAD>;
      start(): void;
      pause(): void;
      readonly audioContext: AudioContext;
    }
  
    export const VAD: {
      new(options: Partial<RealTimeVADOptions>): Promise<MicVAD>;
    };
  }
  
  // Ce export vide est nécessaire pour faire de ce fichier un module
  export {};