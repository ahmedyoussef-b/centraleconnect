'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MicVAD } from '@ricky0123/vad-web';
import type { WorkerMessage, WorkerResponse } from '@/workers/vosk.worker';

export enum RecognizerState {
    IDLE,
    LOADING,
    READY,
    LISTENING,
    ERROR,
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
    const vadRef = useRef<MicVAD | null>(null);

    // Initialize the worker and VAD
    useEffect(() => {
        if (workerRef.current) return; // Already initialized

        setRecognizerState(RecognizerState.LOADING);
        
        // Initialize Web Worker
        const worker = new Worker(new URL('@/workers/vosk.worker.ts', import.meta.url));
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
                 // Reset partial transcript and set final transcript
                setTranscript({ partial: '', final: data.text ?? '' });
            }
        };
        workerRef.current = worker;
        
        // Initialize VAD
        MicVAD.new({
            workletURL: '/models/vad.worklet.js',
            modelUrl: '/models/silero_vad.onnx',
            ortWasmURL: '/models/onnx-runtime-web.wasm',
            onSpeechStart: () => {
                console.log('VAD: Speech started');
            },
            onSpeechEnd: async (audio) => {
                console.log('VAD: Speech ended');
                if (!workerRef.current || !vadRef.current) return;

                const fromSampleRate = vadRef.current.audioContext.sampleRate;
                
                try {
                    const resampledAudio = resample(audio, fromSampleRate, options.sampleRate);
                    const message: WorkerMessage = { type: 'audio', audio: resampledAudio };
                    workerRef.current?.postMessage(message);
                } catch (e) {
                    console.error('Failed to resample audio', e);
                }
            },
            onFrameProcessed(probs) {
                // You can use probs.isSpeech for real-time feedback
            },
        }).then(vad => {
            vadRef.current = vad;
            // Now that VAD is ready, we can initialize the worker model
            const initMessage: WorkerMessage = { type: 'init', modelUrl: options.modelUrl };
            workerRef.current?.postMessage(initMessage);
        }).catch(e => {
            console.error('Failed to initialize VAD', e);
            setRecognizerState(RecognizerState.ERROR);
        });

        return () => {
            vadRef.current?.pause();
            vadRef.current = null;
            workerRef.current?.terminate();
            workerRef.current = null;
        }
    }, [options.modelUrl, options.sampleRate]);

    const start = useCallback(() => {
        if (vadRef.current && recognizerState === RecognizerState.READY) {
            vadRef.current.start();
            setRecognizerState(RecognizerState.LISTENING);
            setTranscript({ partial: '', final: '' });
             // Reset recognizer state in worker
            workerRef.current?.postMessage({ type: 'reset' } as WorkerMessage);
        }
    }, [recognizerState]);

    const stop = useCallback(() => {
        if (vadRef.current && recognizerState === RecognizerState.LISTENING) {
            vadRef.current.pause();
            setRecognizerState(RecognizerState.READY);
        }
    }, [recognizerState]);

    return { recognizerState, transcript, start, stop };
}
