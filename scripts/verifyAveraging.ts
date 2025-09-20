import fs from 'fs';
import path from 'path';
import { getWindow, applyWindow } from '../src/lib/dsp';
import type { WindowType } from '../src/lib/dsp';
import FFT from 'fft.js';

// Minimal re-implementation of the project's FFT magnitude routine for verification
function computeSingleSidedMagnitude(signal: Float64Array) {
  const N = signal.length;
  const f = new FFT(N);
  const out = f.createComplexArray();
  const data = f.createComplexArray();
  for (let i = 0; i < N; i++) {
    data[2 * i] = signal[i];
    data[2 * i + 1] = 0;
  }
  f.transform(out, data);
  const mags = new Float64Array(N / 2 + 1);
  // single-sided magnitude scaling: (2/N) * |X[k]| except DC and Nyquist
  for (let k = 0; k <= N / 2; k++) {
    const re = out[2 * k];
    const im = out[2 * k + 1];
    const mag = Math.hypot(re, im);
    mags[k] = (2 / N) * mag;
  }
  return mags;
}

function avgMagnitudes(frames: Float64Array[], windowType: WindowType) {
  const M = frames.length;
  const perFrameMags: Float64Array[] = [];
  for (let i = 0; i < M; i++) {
    const frame = frames[i];
    const w = getWindow(windowType, frame.length);
    const win = new Float64Array(frame.length);
    for (let j = 0; j < frame.length; j++) win[j] = frame[j] * w[j];
    perFrameMags.push(computeSingleSidedMagnitude(win));
  }
  // average elementwise
  const L = perFrameMags[0].length;
  const avg = new Float64Array(L);
  for (let k = 0; k < L; k++) {
    let s = 0;
    for (let i = 0; i < M; i++) s += perFrameMags[i][k];
    avg[k] = s / M;
  }
  return { avg, perFrameMags };
}

function generateSignal(freqs: number[], amps: number[], phases: number[], fs: number, duration: number) {
  const N = Math.round(fs * duration);
  const t = new Float64Array(N);
  const y = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    t[i] = i / fs;
    let s = 0;
    for (let j = 0; j < freqs.length; j++) s += amps[j] * Math.sin(2 * Math.PI * freqs[j] * t[i] + phases[j]);
    y[i] = s;
  }
  return { t, y };
}

function splitFrames(y: Float64Array, fs: number, T: number, M: number) {
  const L = Math.round(T * fs);
  const frames: Float64Array[] = [];
  const N = y.length;
  for (let i = 0; i < M; i++) {
    const start = (i * L) % N;
    const frame = new Float64Array(L);
    for (let j = 0; j < L; j++) frame[j] = y[(start + j) % N];
    frames.push(frame);
  }
  return frames;
}

function floatArrEq(a: Float64Array, b: Float64Array, tol = 1e-9) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > tol) return false;
  return true;
}

async function main() {
  const fsamp = 1024;
  const lor = 8; // LOR
  const fmax = 64;
  const Twindow = lor / fmax; // duration of each frame
  const duration = 1.0; // total signal duration in seconds

  // Create a single-sine with amplitude 1 at 13 Hz
  const freqs = [13];
  const amps = [1];
  const phases = [0];
  const { y } = generateSignal(freqs, amps, phases, fsamp, duration);

  const numAverages = 4;
  const frames = splitFrames(y, fsamp, Twindow, numAverages);

  const { avg, perFrameMags } = avgMagnitudes(frames, 'hanning');

  // Now compute magnitude from concatenated frames (like the app: average frames' FFTs)
  // and also a single-FFT over the concatenated signal and see difference
  const concat = new Float64Array(frames.length * frames[0].length);
  for (let i = 0; i < frames.length; i++) concat.set(frames[i], i * frames[0].length);

  const singleFFT = computeSingleSidedMagnitude(concat);

  console.log('fsamp', fsamp, 'Twindow', Twindow, 'frameLength', frames[0].length, 'numFrames', frames.length);
  console.log('Per-frame peak magnitudes (first frame) around freq bin for 13Hz:', perFrameMags[0].slice(10, 18));
  console.log('Averaged magnitude bins (slice 10..18):', avg.slice(10, 18));
  console.log('Single-FFT over concatenated signal bins (slice 10..18):', singleFFT.slice(10, 18));

  // Save output for inspection
  const out = { fsamp, Twindow, frameLength: frames[0].length, numFrames: frames.length, avgSlice: Array.from(avg.slice(10, 18)), singleSlice: Array.from(singleFFT.slice(10, 18)) };
  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, 'averaging_verification.json'), JSON.stringify(out, null, 2));
  console.log('Wrote tmp/averaging_verification.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
