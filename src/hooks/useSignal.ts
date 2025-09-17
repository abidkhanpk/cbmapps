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
  numSamples: number; // must be power of two for FFT performance
  chirpStartFreq?: number; // Hz
  chirpEndFreq?: number;   // Hz
}

export function useSignal(params: SignalParams) {
  const { type, amplitude, frequency, phaseDeg, fs, noiseLevel, numSamples, chirpStartFreq, chirpEndFreq } = params;

  const { t, clean, noisy } = useMemo(() => {
    const N = numSamples;
    const t = new Float64Array(N);
    const clean = new Float64Array(N);
    const noisy = new Float64Array(N);
    const phase = (phaseDeg * Math.PI) / 180;
    const T = N / fs; // seconds

    const f0 = chirpStartFreq ?? frequency;
    const f1 = chirpEndFreq ?? frequency;
    const k = (f1 - f0) / T; // chirp rate Hz/s for linear chirp

    for (let n = 0; n < N; n++) {
      const ti = n / fs;
      t[n] = ti;
      let s = 0;
      switch (type) {
        case 'sine':
          s = amplitude * Math.sin(2 * Math.PI * frequency * ti + phase);
          break;
        case 'square': {
          const v = Math.sin(2 * Math.PI * frequency * ti + phase);
          s = amplitude * (v >= 0 ? 1 : -1);
          break;
        }
        case 'chirp': {
          // phi(t) = 2π (f0 t + 0.5 k t^2)
          const phi = 2 * Math.PI * (f0 * ti + 0.5 * k * ti * ti) + phase;
          s = amplitude * Math.sin(phi);
          break;
        }
        case 'noise':
          s = amplitude * (2 * Math.random() - 1);
          break;
      }
      const noise = noiseLevel * amplitude * (2 * Math.random() - 1);
      clean[n] = s;
      noisy[n] = s + noise;
    }

    return { t, clean, noisy };
  }, [type, amplitude, frequency, phaseDeg, fs, noiseLevel, numSamples, chirpStartFreq, chirpEndFreq]);

  return { t, clean, signal: noisy };
}
