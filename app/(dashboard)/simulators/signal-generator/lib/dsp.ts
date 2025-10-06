// DSP utilities: window functions, segmentation, and helpers
export type WindowType = 'rectangular' | 'hanning' | 'hamming' | 'blackman';

export function getWindow(type: WindowType, N: number): Float64Array {
  const w = new Float64Array(N);
  if (N <= 1) {
    w.fill(1);
    return w;
  }
  switch (type) {
    case 'rectangular':
      w.fill(1);
      break;
    case 'hanning':
      for (let n = 0; n < N; n++) {
        w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
      }
      break;
    case 'hamming':
      for (let n = 0; n < N; n++) {
        w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
      }
      break;
    case 'blackman':
      for (let n = 0; n < N; n++) {
        w[n] = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1));
      }
      break;
    default:
      w.fill(1);
  }
  return w;
}

export function applyWindow(x: ArrayLike<number>, w: ArrayLike<number>): Float64Array {
  const N = Math.min(x.length, w.length);
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) y[i] = (x[i] as number) * (w[i] as number);
  return y;
}

export function detrendMean(x: ArrayLike<number>): Float64Array {
  const N = x.length;
  let sum = 0;
  for (let i = 0; i < N; i++) sum += x[i] as number;
  const mean = sum / N;
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) y[i] = (x[i] as number) - mean;
  return y;
}

export function segmentSignal(x: ArrayLike<number>, segmentLength: number, step: number): Float64Array[] {
  const segments: Float64Array[] = [];
  if (segmentLength <= 0 || step <= 0) return segments;
  for (let start = 0; start + segmentLength <= x.length; start += step) {
    const seg = new Float64Array(segmentLength);
    for (let i = 0; i < segmentLength; i++) seg[i] = x[start + i] as number;
    segments.push(seg);
  }
  return segments;
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function nearestPowerOfTwo(n: number): number {
  // returns the nearest power of two less than or equal to n
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}
