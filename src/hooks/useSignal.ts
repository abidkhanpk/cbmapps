'use client';
import { useMemo } from 'react';

export type SignalType = 'sine' | 'square' | 'chirp' | 'noise';

export interface SignalParams {
  type: SignalType;
  amplitude: number; // base signal amplitude
  frequency: number; // Hz (for sine/square)
  phaseDeg: number;  // degrees
  fs: number;        // sampling frequency (Hz)
  noiseLevel: number; // 0..1 fraction of amplitude
  numSamples: number; // should be power of two for FFT
  chirpStartFreq?: number; // Hz
  chirpEndFreq?: number;   // Hz
}

export interface SignalOutputs {
  // Sampled (discrete-time) signal used for FFT/aliasing visualization
  tSamples: Float64Array;
  cleanSamples: Float64Array;
  noisySamples: Float64Array;
  // High-resolution analog reference over the same time span
  tAnalog: Float64Array;
  analog: Float64Array;
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

export function useSignal(params: SignalParams): SignalOutputs {
  const { type, amplitude, frequency, phaseDeg, fs, noiseLevel, numSamples, chirpStartFreq, chirpEndFreq } = params;

  const outputs = useMemo<SignalOutputs>(() => {
    const N = Math.max(2, Math.floor(numSamples));
    const phase = (phaseDeg * Math.PI) / 180;

    // Duration of sampled record
    const duration = N / fs; // seconds

    // Chirp characteristics
    const f0 = chirpStartFreq ?? frequency;
    const f1 = chirpEndFreq ?? frequency;
    const k = (f1 - f0) / Math.max(duration, 1e-9); // Hz/s for linear chirp across record

    // Generate sampled (discrete) signal at fs
    const tSamples = new Float64Array(N);
    const cleanSamples = new Float64Array(N);
    const noisySamples = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      const ti = n / fs;
      tSamples[n] = ti;
      const s = generateSample(type, amplitude, frequency, phase, ti, f0, k);
      const noise = noiseLevel * amplitude * (2 * Math.random() - 1);
      cleanSamples[n] = s;
      noisySamples[n] = s + noise;
    }

    // High-resolution analog reference over same time span
    const maxFreq = type === 'chirp' ? Math.max(f0, f1) : frequency;
    const analogFs = Math.max(10000, 20 * maxFreq); // at least 10k Hz or 20x max frequency
    const analogCount = Math.max(N * 10, Math.max(2, Math.floor(duration * analogFs)));
    const tAnalog = new Float64Array(analogCount);
    const analog = new Float64Array(analogCount);
    for (let i = 0; i < analogCount; i++) {
      const ti = (i * duration) / Math.max(analogCount - 1, 1);
      tAnalog[i] = ti;
      analog[i] = generateSample(type, amplitude, frequency, phase, ti, f0, k);
    }

    return { tSamples, cleanSamples, noisySamples, tAnalog, analog };
  }, [type, amplitude, frequency, phaseDeg, fs, noiseLevel, numSamples, chirpStartFreq, chirpEndFreq]);

  return outputs;
}
