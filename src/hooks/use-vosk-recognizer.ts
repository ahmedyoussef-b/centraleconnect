// src/hooks/use-vosk-recognizer.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkerMessage, WorkerResponse } from '@/workers/vosk.worker';

export enum RecognizerState {
    IDLE = 'IDLE',
    LOADING = 'LOADING',
    READY = 'READY',
    LISTENING = 'LISTENING',
    ERROR = 'ERROR',
}

interface RecognizerOptions {
    modelUrl: string;
    sampleRate: number;
}

interface Transcript {
    partial: string;
    final: string;
}

/**
 * Simple linear interpolation resampler.
 */
function resample(audioBuffer: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
        return audioBuffer;
    }
    const fromLength = audioBuffer.length;
    const toLength = Math.round(fromLength * toSampleRate / fromSampleRate);
    const result = new Float32Array(toLength);
    const springFactor = (fromLength - 1) / (toLength - 1);
    result[0] = audioBuffer[0];
    for (let i = 1; i < toLength - 1; i++) {
        const tmp = i * springFactor;
        const before = Math.floor(tmp);
        const after = Math.ceil(tmp);
        const atPoint = tmp - before;
        result[i] = audioBuffer[before] + (audioBuffer[after] - audioBuffer[before]) * atPoint;
    }
    result[toLength - 1] = audioBuffer[fromLength - 1];
    return result;
}

export function useVoskRecognizer(options: RecognizerOptions) {
    const [recognizerState, setRecognizerState] = useState<RecognizerState>(RecognizerState.IDLE);
    const [transcript, setTranscript] = useState<Transcript>({ partial: '', final: '' });
    
    const workerRef = useRef<Worker | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioChunksRef = useRef<Float32Array[]>([]);

    // Initialize the worker
    useEffect(() => {
        if (workerRef.current) return;

        setRecognizerState(RecognizerState.LOADING);
        
        const worker = new Worker(new URL('@/workers/vosk.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { data } = event;
            if (data.type === 'ready') {
                setRecognizerState(RecognizerState.READY);
            } else if (data.type === 'error') {
                console.error('Vosk Worker Error:', data.message);
                setRecognizerState(RecognizerState.ERROR);
            } else if (data.type === 'partial') {
                setTranscript(prev => ({ ...prev, partial: data.text ?? '' }));
            } else if (data.type === 'result') {
                setTranscript({ partial: '', final: data.text ?? '' });
            }
        };
        workerRef.current = worker;
        
        const initMessage: WorkerMessage = { type: 'init', modelUrl: options.modelUrl };
        worker.postMessage(initMessage);

        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, [options.modelUrl]);

    const processAudio = useCallback(async () => {
        if (audioChunksRef.current.length === 0 || !workerRef.current) return;

        const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
        const concatenated = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
            concatenated.set(chunk, offset);
            offset += chunk.length;
        }
        audioChunksRef.current = [];

        if (!audioContextRef.current) return;
        const fromSampleRate = audioContextRef.current.sampleRate;
        
        try {
            const resampledAudio = resample(concatenated, fromSampleRate, options.sampleRate);
            const message: WorkerMessage = { type: 'audio', audio: resampledAudio };
            workerRef.current.postMessage(message, [resampledAudio.buffer]);
        } catch (e) {
            console.error('Failed to resample and process audio', e);
        }
    }, [options.sampleRate]);

    const stopListening = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        setRecognizerState(RecognizerState.READY);
    }, []);

    const start = useCallback(async () => {
        if (recognizerState !== RecognizerState.READY) return;

        setRecognizerState(RecognizerState.LISTENING);
        setTranscript({ partial: '', final: '' });
        workerRef.current?.postMessage({ type: 'reset' } as WorkerMessage);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;

            const source = context.createMediaStreamSource(stream);
            
            const bufferSize = 4096;
            const processor = context.createScriptProcessor(bufferSize, 1, 1);
            scriptProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                audioChunksRef.current.push(new Float32Array(inputData));
            };

            source.connect(processor);
            processor.connect(context.destination);

        } catch (e) {
            console.error('Failed to start microphone:', e);
            setRecognizerState(RecognizerState.ERROR);
            stopListening();
        }
    }, [recognizerState, stopListening]);

    const stop = useCallback(() => {
        if (recognizerState !== RecognizerState.LISTENING) return;
        
        stopListening();
        // Give a moment for the last audio chunks to be processed before sending
        setTimeout(() => {
            processAudio();
        }, 100);

    }, [recognizerState, stopListening, processAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
        }
    }, [stopListening]);

    return { recognizerState, transcript, start, stop };
}
