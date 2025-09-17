'use client';
import { useMemo } from 'react';
import FFT from 'fft.js';
import { WindowType, getWindow, applyWindow, detrendMean, segmentSignal, isPowerOfTwo, nearestPowerOfTwo } from '@/lib/dsp';

export type AveragingMode = 'none' | 'linear' | 'overlap';

export interface SpectrumParams {
  signal: ArrayLike<number>;
  fs: number;
  windowType: WindowType;
  averagingMode: AveragingMode;
  segmentLength: number; // power of two
  overlapPercent: number; // 0..90
}

function computeFFTMag(x: ArrayLike<number>, fs: number) {
  const N = x.length;
  const fft = new FFT(N);
  const out = fft.createComplexArray();
  const data = fft.createComplexArray();
  for (let i = 0; i < N; i++) {
    data[2 * i] = x[i] as number;
    data[2 * i + 1] = 0;
  }
  fft.transform(out, data);
  const half = Math.floor(N / 2);
  const mag = new Float64Array(half + 1);
  const freq = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) {
    const re = out[2 * k];
    const im = out[2 * k + 1];
    mag[k] = (2 / N) * Math.hypot(re, im);
    freq[k] = (k * fs) / N;
  }
  return { freq, mag };
}

export function useSpectrum(params: SpectrumParams) {
  const { signal, fs, windowType, averagingMode, segmentLength, overlapPercent } = params;

  const result = useMemo(() => {
    // Single FFT on full record
    const N = signal.length;
    const wFull = getWindow(windowType, N);
    const xDetrended = detrendMean(signal);
    const xw = applyWindow(xDetrended, wFull);
    const single = computeFFTMag(xw, fs);

    // Averaging options
    let averaged: { freq: Float64Array; mag: Float64Array } | undefined = undefined;

    if (averagingMode !== 'none') {
      let L = segmentLength;
      if (!isPowerOfTwo(L)) L = nearestPowerOfTwo(L);
      L = Math.min(L, N);
      if (!isPowerOfTwo(L) || L < 8) {
        // fallback to safe size
        L = Math.min(256, nearestPowerOfTwo(N));
      }
      const step = averagingMode === 'overlap' ? Math.max(1, Math.floor(L * (1 - Math.min(0.9, Math.max(0, overlapPercent)) / 100))) : L;
      const segments = segmentSignal(signal, L, step);
      const w = getWindow(windowType, L);
      let accMag: Float64Array | null = null;
      let accCount = 0;
      for (const seg of segments) {
        const segDet = detrendMean(seg);
        const segW = applyWindow(segDet, w);
        const { mag, freq } = computeFFTMag(segW, fs);
        if (!accMag) {
          accMag = new Float64Array(mag.length);
        }
        for (let i = 0; i < mag.length; i++) accMag[i] += mag[i];
        accCount++;
        averaged = { freq, mag: accMag };
      }
      if (averaged && accCount > 0) {
        for (let i = 0; i < averaged.mag.length; i++) averaged.mag[i] /= accCount;
      }
    }

    return { single, averaged };
  }, [signal, fs, windowType, averagingMode, segmentLength, overlapPercent]);

  return result;
}
