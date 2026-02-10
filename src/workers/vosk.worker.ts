// src/workers/vosk.worker.ts
/// <reference lib="webworker" />

import { createModel, KaldiRecognizer } from 'vosk-browser';
import type { Model } from 'vosk-browser';

// Define message types for worker communication
export interface WorkerMessage {
  type: 'init' | 'audio' | 'reset';
  modelUrl?: string;
  audio?: Float32Array;
}

export interface WorkerResponse {
  type: 'ready' | 'error' | 'partial' | 'result' | 'loading';
  text?: string;
  message?: string;
}

// ✅ Type personnalisé pour les messages Vosk
export interface VoskResult {
  text?: string;
  partial?: string;
  result?: {
    text?: string;
    partial?: string;
    // ... autres propriétés possibles selon la version
  };
}

let recognizer: KaldiRecognizer | null = null;
let model: Model | null = null;

/**
 * Convert Float32Array to AudioBuffer for Vosk
 */
function float32ArrayToAudioBuffer(audioData: Float32Array, sampleRate: number): AudioBuffer {
  const audioCtx = new AudioContext({ sampleRate, latencyHint: 'playback' });
  const audioBuffer = audioCtx.createBuffer(1, audioData.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  channelData.set(audioData);
  return audioBuffer;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;

  if (data.type === 'init') {
    if (!data.modelUrl) {
      self.postMessage({ type: 'error', message: 'Model URL not provided.' } as WorkerResponse);
      return;
    }
    try {
      if (!model) { // Only load model once
        self.postMessage({ type: 'loading', message: 'Downloading model...' } as WorkerResponse);
        model = await createModel(data.modelUrl);
        self.postMessage({ type: 'loading', message: 'Model downloaded. Initializing recognizer...' } as WorkerResponse);
      }
      
      recognizer = new model.KaldiRecognizer(16000); // Vosk requires 16kHz

      // ✅ Correction: Utiliser le bon type pour les événements
      recognizer.on('result', (message: VoskResult) => {
        const text = message.result?.text || message.text;
        if (text) {
          self.postMessage({ type: 'result', text } as WorkerResponse);
        }
      });
      
      recognizer.on('partialresult', (message: VoskResult) => {
        const partial = message.result?.partial || message.partial;
        if (partial) {
          self.postMessage({ type: 'partial', text: partial } as WorkerResponse);
        }
      });

      self.postMessage({ type: 'ready' } as WorkerResponse);

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      self.postMessage({ type: 'error', message: errorMessage } as WorkerResponse);
    }
  } else if (data.type === 'audio') {
    if (recognizer && data.audio) {
      const audioBuffer = float32ArrayToAudioBuffer(data.audio, 16000);
      recognizer.acceptWaveform(audioBuffer);
    }
  } else if (data.type === 'reset') {
    // ✅ Recréer le recognizer au lieu d'appeler reset()
    if (model) {
      recognizer = new model.KaldiRecognizer(16000);
      self.postMessage({ type: 'ready' } as WorkerResponse);
    }
  }
};