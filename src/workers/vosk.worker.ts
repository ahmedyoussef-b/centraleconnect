/// <reference lib="webworker" />

import { createModel, KaldiRecognizer } from 'vosk-browser';
import type { Model, Result } from 'vosk-browser';

// Define message types for worker communication
export interface WorkerMessage {
  type: 'init' | 'audio' | 'reset';
  modelUrl?: string;
  audio?: Float32Array;
}

export interface WorkerResponse {
  type: 'ready' | 'error' | 'partial' | 'result';
  text?: string;
  message?: string;
}

let recognizer: KaldiRecognizer | null = null;
let model: Model | null = null;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;

  if (data.type === 'init') {
    if (!data.modelUrl) {
      self.postMessage({ type: 'error', message: 'Model URL not provided.' } as WorkerResponse);
      return;
    }
    try {
      if (!model) { // Only load model once
        self.postMessage({ type: 'loading', message: 'Downloading model...' });
        model = await createModel(data.modelUrl);
        self.postMessage({ type: 'loading', message: 'Model downloaded. Initializing recognizer...' });
      }
      
      recognizer = new model.KaldiRecognizer(16000); // Vosk requires 16kHz

      recognizer.on('result', (message: Result) => {
        self.postMessage({ type: 'result', text: message.result.text } as WorkerResponse);
      });
      recognizer.on('partialresult', (message: Result) => {
        self.postMessage({ type: 'partial', text: message.result.partial } as WorkerResponse);
      });

      self.postMessage({ type: 'ready' } as WorkerResponse);

    } catch (e: any) {
      self.postMessage({ type: 'error', message: e.message } as WorkerResponse);
    }
  } else if (data.type === 'audio') {
    if (recognizer && data.audio) {
      recognizer.acceptWaveform(data.audio);
    }
  } else if (data.type === 'reset') {
    if (recognizer) {
        recognizer.reset();
    }
  }
};
