const fs = require('fs');
const path = require('path');
const FFT = require('fft.js');

function getWindow(type, N) {
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
      for (let n = 0; n < N; n++) w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
      break;
    case 'hamming':
      for (let n = 0; n < N; n++) w[n] = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1));
      break;
    case 'blackman':
      for (let n = 0; n < N; n++) w[n] = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1));
      break;
    default:
      w.fill(1);
  }
  return w;
}

function computeSingleSidedMagnitude(signal) {
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
  for (let k = 0; k <= N / 2; k++) {
    const re = out[2 * k];
    const im = out[2 * k + 1];
    const mag = Math.hypot(re, im);
    mags[k] = (2 / N) * mag;
  }
  return mags;
}

function avgMagnitudes(frames, windowType) {
  const M = frames.length;
  const perFrameMags = [];
  for (let i = 0; i < M; i++) {
    const frame = frames[i];
    const w = getWindow(windowType, frame.length);
    const win = new Float64Array(frame.length);
    for (let j = 0; j < frame.length; j++) win[j] = frame[j] * w[j];
    perFrameMags.push(computeSingleSidedMagnitude(win));
  }
  const L = perFrameMags[0].length;
  const avg = new Float64Array(L);
  for (let k = 0; k < L; k++) {
    let s = 0;
    for (let i = 0; i < M; i++) s += perFrameMags[i][k];
    avg[k] = s / M;
  }
  return { avg, perFrameMags };
}

function generateSignal(freqs, amps, phases, fs, duration) {
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

function splitFrames(y, fs, T, M) {
  const L = Math.round(T * fs);
  const frames = [];
  const N = y.length;
  for (let i = 0; i < M; i++) {
    const start = (i * L) % N;
    const frame = new Float64Array(L);
    for (let j = 0; j < L; j++) frame[j] = y[(start + j) % N];
    frames.push(frame);
  }
  return frames;
}

function main() {
  const fsamp = 1024;
  const lor = 8;
  const fmax = 64;
  const Twindow = lor / fmax;
  const duration = 1.0;

  const freqs = [13];
  const amps = [1];
  const phases = [0];
  const { y } = generateSignal(freqs, amps, phases, fsamp, duration);

  const numAverages = 4;
  const frames = splitFrames(y, fsamp, Twindow, numAverages);

  const { avg, perFrameMags } = avgMagnitudes(frames, 'hanning');

  const concat = new Float64Array(frames.length * frames[0].length);
  for (let i = 0; i < frames.length; i++) concat.set(frames[i], i * frames[0].length);

  const singleFFT = computeSingleSidedMagnitude(concat);

  console.log('fsamp', fsamp, 'Twindow', Twindow, 'frameLength', frames[0].length, 'numFrames', frames.length);
  console.log('Per-frame peak magnitudes (first frame) around freq bin for 13Hz:', Array.prototype.slice.call(perFrameMags[0].slice(10,18)));
  console.log('Averaged magnitude bins (slice 10..18):', Array.prototype.slice.call(avg.slice(10,18)));
  console.log('Single-FFT over concatenated signal bins (slice 10..18):', Array.prototype.slice.call(singleFFT.slice(10,18)));

  const out = { fsamp, Twindow, frameLength: frames[0].length, numFrames: frames.length, avgSlice: Array.from(avg.slice(10, 18)), singleSlice: Array.from(singleFFT.slice(10, 18)) };
  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(path.join(outDir, 'averaging_verification.json'), JSON.stringify(out, null, 2));
  console.log('Wrote tmp/averaging_verification.json');
}

main();
