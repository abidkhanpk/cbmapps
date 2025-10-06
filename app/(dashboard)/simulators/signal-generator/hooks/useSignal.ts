 'use client';
import { useMemo } from 'react';
import FFT from 'fft.js';

export type SignalType = 'sine' | 'square' | 'chirp' | 'noise' | 'am' | 'fm' | 'machine';

export interface SingleSignalParams {
  type: SignalType;
  amplitude: number;
  frequency: number;
  phaseDeg: number;
  chirpStartFreq?: number;
  chirpEndFreq?: number;
  // AM parameters
  modulationFrequency?: number;
  modulationIndex?: number;
  // FM parameters
  frequencyDeviation?: number; // peak frequency deviation (Hz)
  // machine preset name (optional)
  machinePreset?: string;
  // machine complexity (1..5) controls number of components/harmonics
  machineComplexity?: number;
}

export interface AntiAliasOptions {
  enabled?: boolean;
  cutoffHz?: number; // cutoff frequency to apply to analog waveform before sampling
}

export interface MultiSignalParams {
  signals: SingleSignalParams[];
  fs: number;
  noiseLevel: number;
  numSamples: number;
  antiAlias?: AntiAliasOptions;
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
    case 'am': {
      const fm = f0 ?? 0; // modulation frequency
      const m = k ?? 0;   // modulation index (0..1)
      return amp * (1 + m * Math.cos(2 * Math.PI * fm * t)) * Math.cos(2 * Math.PI * f * t + phi);
    }
    case 'fm': {
      const fm = f0 ?? 0;          // modulation frequency
      const df = k ?? 0;           // frequency deviation (Hz)
      if (fm <= 0) {
        return amp * Math.cos(2 * Math.PI * f * t + phi);
      }
      const beta = df / fm;        // modulation index β
      const phase = 2 * Math.PI * f * t + 2 * Math.PI * beta * Math.sin(2 * Math.PI * fm * t) + phi;
      return amp * Math.cos(phase);
    }
    case 'noise':
      return amp * (2 * Math.random() - 1);
    case 'machine': {
      // richer machine model: sum of multiple narrowband components, harmonics, sidebands and FM jitter
      const base = f;
      const complexity = Math.max(1, Math.min(8, Math.round((k as number) || 3)));
      // complexity controls number of components (up to 8). Use integer k passed as machineComplexity.
      const numComponents = complexity;
      let out = 0;
      // per-component deterministic offsets (small, reproducible using index-like constants)
      for (let c = 0; c < numComponents; c++) {
        // component amplitude fraction
        const frac = [0.6, 0.35, 0.25, 0.18, 0.12, 0.09, 0.06, 0.04][c] ?? 0.03;
        // small frequency offset to create multiple nearby tones
        const freqOffset = (c === 0) ? 0 : (c * 0.15 * base + (c % 2 === 0 ? 0.5 : -0.4));
        // harmonics count depends on complexity
        const harmonics = 1 + Math.floor(complexity / 2);
        // FM jitter depth (Hz)
        const fmJitter = 0.1 * base * (0.05 + 0.02 * c);
        // instantaneous frequency modulation via small sinusoid
        const instFreq = base + freqOffset + (fmJitter * Math.sin(2 * Math.PI * (0.5 + 0.3 * c) * t + c));
        for (let h = 1; h <= harmonics; h++) {
          const harmAmp = frac * (1 / h);
          // sideband modulation at low freq
          const sb = 2 * Math.PI * (0.2 + 0.1 * c) * Math.sin(2 * Math.PI * (0.5 + 0.2 * c) * t + c * 0.7);
          out += amp * harmAmp * Math.sin(2 * Math.PI * h * instFreq * t + phi + sb);
        }
      }
      // overall low-freq AM to simulate load modulation
      out *= 1 + 0.04 * Math.sin(2 * Math.PI * 0.5 * t + 0.2);
      // small broadband noise/jitter added
      out += amp * 0.02 * (2 * Math.random() - 1);
      return out;
    }
  }
}

export function useSignal(params: MultiSignalParams): SignalOutputs {
  const { signals, fs, noiseLevel, numSamples, antiAlias } = params;

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
      } else if (sig.type === 'am') {
        maxFreq = Math.max(maxFreq, sig.frequency + (sig.modulationFrequency ?? 0));
      } else if (sig.type === 'fm') {
        maxFreq = Math.max(maxFreq, sig.frequency + (sig.frequencyDeviation ?? 0));
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
  signals.forEach((sig) => {
      const phase = (sig.phaseDeg * Math.PI) / 180;
      let f0 = sig.chirpStartFreq ?? sig.frequency;
      const f1 = sig.chirpEndFreq ?? sig.frequency;
      let k = (f1 - f0) / Math.max(duration, 1e-9);
      if (sig.type === 'am') {
        f0 = sig.modulationFrequency ?? 0;
        k = sig.modulationIndex ?? 0;
      } else if (sig.type === 'fm') {
        f0 = sig.modulationFrequency ?? 0;
        k = sig.frequencyDeviation ?? 0;
      } else if (sig.type === 'machine') {
        // pass machine complexity through k param to generator
        k = sig.machineComplexity ?? 3;
      }

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
      const label =
        sig.type === 'am'
          ? `am (fc=${sig.frequency} Hz, fm=${sig.modulationFrequency ?? 0} Hz, m=${sig.modulationIndex ?? 0})`
          : sig.type === 'fm'
          ? `fm (fc=${sig.frequency} Hz, fm=${sig.modulationFrequency ?? 0} Hz, df=${sig.frequencyDeviation ?? 0} Hz)`
          : sig.type === 'machine'
          ? `machine (fc=${sig.frequency} Hz, c=${sig.machineComplexity ?? 3}${sig.machinePreset ? `, ${sig.machinePreset}` : ''})`
          : `${sig.type} (${sig.frequency} Hz)`;

      individualSignals.push({
        tSamples,
        cleanSamples: indClean,
        tAnalog,
        analog: indAnalog,
        label,
      });
    });

    // Add noise to summed signal
    // Add noise to the analog waveform (so analog contains noise).
    const totalAmp = signals.reduce((sum, sig) => sum + sig.amplitude, 0);
    const noisyAnalog = new Float64Array(analogCount);
    for (let i = 0; i < analogCount; i++) {
      const noise = noiseLevel * totalAmp * (2 * Math.random() - 1);
      noisyAnalog[i] = analog[i] + noise;
    }

    // If anti-aliasing is requested, apply an ideal frequency-domain low-pass to the noisyAnalog
    // before sampling. This simulates an analog anti-alias filter. The antiAlias.cutoffHz is
    // interpreted relative to the analog sampling rate (analogFs).
    if (antiAlias && antiAlias.enabled) {
      try {
        const cutoffHz = Math.max(0, antiAlias.cutoffHz ?? Math.floor(fs / 2));
        // perform FFT on noisyAnalog: pad to next power-of-two length for stability
        const M0 = analogCount;
        const nextPow2 = (n: number) => (n <= 1 ? 1 : 1 << Math.ceil(Math.log2(n)));
        const M = nextPow2(M0);
        const fft = new FFT(M);
        const inArr = fft.createComplexArray();
        const out = fft.createComplexArray();
        // copy noisyAnalog into input buffer and zero-pad remainder
        for (let i = 0; i < M; i++) {
          inArr[2 * i] = i < M0 ? noisyAnalog[i] : 0;
          inArr[2 * i + 1] = 0;
        }
        fft.transform(out, inArr);
        const dtAnalog = tAnalog[1] - tAnalog[0];
        const fsAnalog = 1 / dtAnalog;
        for (let k = 0; k < M; k++) {
          const freq = (k <= M / 2) ? (k * fsAnalog) / M : ((k - M) * fsAnalog) / M;
          if (Math.abs(freq) > cutoffHz) {
            out[2 * k] = 0;
            out[2 * k + 1] = 0;
          }
        }
        // inverse FFT (using conjugation trick) and copy back the first M0 samples
        const conjIn = fft.createComplexArray();
        const temp = fft.createComplexArray();
        for (let i = 0; i < M; i++) {
          conjIn[2 * i] = out[2 * i];
          conjIn[2 * i + 1] = -out[2 * i + 1];
        }
        fft.transform(temp, conjIn);
        for (let i = 0; i < M0; i++) {
          // conjugate and normalize by M
          noisyAnalog[i] = temp[2 * i] / M;
        }
      } catch {
        // If FFT fails or module unavailable, skip anti-aliasing silently
      }
    }

    // Sample noisyAnalog at the sample times to build noisySamples
    let ai = 0;
    for (let n = 0; n < N; n++) {
      // advance ai until tAnalog[ai] >= tSamples[n]
      while (ai < analogCount - 1 && tAnalog[ai] < tSamples[n]) ai++;
      let chosen = ai;
      if (ai > 0) {
        const d0 = Math.abs(tAnalog[ai] - tSamples[n]);
        const d1 = Math.abs(tAnalog[ai - 1] - tSamples[n]);
        if (d1 < d0) chosen = ai - 1;
      }
      noisySamples[n] = noisyAnalog[chosen];
    }

  // Return noisy analog (so analog plot shows noise) while individualSignals keep their clean analog components.
  return { tSamples, cleanSamples, noisySamples, tAnalog, analog: noisyAnalog, individualSignals };
  }, [signals, fs, noiseLevel, numSamples, JSON.stringify(params.antiAlias ?? {})]);

  return outputs;
}
