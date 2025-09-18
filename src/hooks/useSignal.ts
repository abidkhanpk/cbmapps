'use client';
import { useMemo } from 'react';

export type SignalType = 'sine' | 'square' | 'chirp' | 'noise';

export interface SingleSignalParams {
  type: SignalType;
  amplitude: number;
  frequency: number;
  phaseDeg: number;
  chirpStartFreq?: number;
  chirpEndFreq?: number;
}

export interface MultiSignalParams {
  signals: SingleSignalParams[];
  fs: number;
  noiseLevel: number;
  numSamples: number;
}

export interface SignalOutputs {
  tSamples: Float64Array;
  cleanSamples: Float64Array;
  noisySamples: Float64Array;
  tAnalog: Float64Array;
  analog: Float64Array;
  individualSignals: {
    tSamples: Float64Array;
    cleanSamples: Float64Array;
    tAnalog: Float64Array;
    analog: Float64Array;
    label: string;
  }[];
}

function generateSample(
  type: SignalType,
  amp: number,
  f: number,
  phi: number,
  t: number,
  f0?: number,
  k?: number
): number {
  switch (type) {
    case 'sine':
      return amp * Math.sin(2 * Math.PI * f * t + phi);
    case 'square': {
      const v = Math.sin(2 * Math.PI * f * t + phi);
      return amp * (v >= 0 ? 1 : -1);
    }
    case 'chirp': {
      // phi(t) = 2π (f0 t + 0.5 k t^2)
      const fstart = f0 ?? f;
      const rate = k ?? 0;
      const phase = 2 * Math.PI * (fstart * t + 0.5 * rate * t * t) + phi;
      return amp * Math.sin(phase);
    }
    case 'noise':
      return amp * (2 * Math.random() - 1);
  }
}

export function useSignal(params: MultiSignalParams): SignalOutputs {
  const { signals, fs, noiseLevel, numSamples } = params;

  const outputs = useMemo<SignalOutputs>(() => {
    const N = Math.max(2, Math.floor(numSamples));
    const duration = N / fs;

    // Prepare arrays for summed signals
    const tSamples = new Float64Array(N);
    const cleanSamples = new Float64Array(N);
    const noisySamples = new Float64Array(N);

    // Individual signal arrays for UI
    const individualSignals: SignalOutputs['individualSignals'] = [];

    // For analog reference
    let maxFreq = 0;
  signals.forEach((sig) => {
      if (sig.type === 'chirp') {
        maxFreq = Math.max(maxFreq, sig.chirpEndFreq ?? sig.frequency);
      } else {
        maxFreq = Math.max(maxFreq, sig.frequency);
      }
    });
    const analogFs = Math.max(10000, 20 * maxFreq);
    const analogCount = Math.max(N * 10, Math.max(2, Math.floor(duration * analogFs)));
    const tAnalog = new Float64Array(analogCount);
    const analog = new Float64Array(analogCount);

    // Zero arrays for summing
    for (let n = 0; n < N; n++) {
      tSamples[n] = n / fs;
      cleanSamples[n] = 0;
      noisySamples[n] = 0;
    }
    for (let i = 0; i < analogCount; i++) {
      tAnalog[i] = (i * duration) / Math.max(analogCount - 1, 1);
      analog[i] = 0;
    }

    // Generate and sum each signal
    signals.forEach((sig, idx) => {
      const phase = (sig.phaseDeg * Math.PI) / 180;
      const f0 = sig.chirpStartFreq ?? sig.frequency;
      const f1 = sig.chirpEndFreq ?? sig.frequency;
      const k = (f1 - f0) / Math.max(duration, 1e-9);

      // Individual sampled
      const indClean = new Float64Array(N);
      for (let n = 0; n < N; n++) {
        const ti = tSamples[n];
        const s = generateSample(sig.type, sig.amplitude, sig.frequency, phase, ti, f0, k);
        indClean[n] = s;
        cleanSamples[n] += s;
      }
      // Individual analog
      const indAnalog = new Float64Array(analogCount);
      for (let i = 0; i < analogCount; i++) {
        const ti = tAnalog[i];
        const s = generateSample(sig.type, sig.amplitude, sig.frequency, phase, ti, f0, k);
        indAnalog[i] = s;
        analog[i] += s;
      }
      individualSignals.push({
        tSamples,
        cleanSamples: indClean,
        tAnalog,
        analog: indAnalog,
        label: `${sig.type} (${sig.frequency} Hz)`,
      });
    });

    // Add noise to summed signal
    for (let n = 0; n < N; n++) {
      const noise = noiseLevel * (signals.reduce((sum, sig) => sum + sig.amplitude, 0)) * (2 * Math.random() - 1);
      noisySamples[n] = cleanSamples[n] + noise;
    }

    return { tSamples, cleanSamples, noisySamples, tAnalog, analog, individualSignals };
  }, [signals, fs, noiseLevel, numSamples]);

  return outputs;
}
