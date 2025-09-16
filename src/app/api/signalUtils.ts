export function generateSignal(params: Record<string, number | string>) {
  const N = Number(params.sampling);
  const dt = 1 / N;
  const x = Array.from({ length: N }, (_, i) => i * dt);
  let y: number[] = [];
  const freq = Number(params.frequency);
  const amp = Number(params.amplitude);
  const phase = Number(params.phase);
  const noise = Number(params.noise);
  switch (params.type) {
    case 'Sine':
      y = x.map(t => amp * Math.sin(2 * Math.PI * freq * (t as number) + phase * Math.PI / 180));
      break;
    case 'Square':
      y = x.map(t => amp * (Math.sin(2 * Math.PI * freq * (t as number) + phase * Math.PI / 180) > 0 ? 1 : -1));
      break;
    case 'Chirp':
      y = x.map(t => amp * Math.sin(2 * Math.PI * (freq + (t as number) * freq) * (t as number) + phase * Math.PI / 180));
      break;
    case 'Noise':
      y = x.map(() => amp * (Math.random() * 2 - 1));
      break;
    default:
      y = x.map(() => 0);
  }
  // Add noise
  if (noise > 0) {
    y = y.map(val => val + noise * (Math.random() * 2 - 1));
  }
  return { x, y };
}

export function windowFunc(signal: { x: number[]; y: number[] }, type: string) {
  const N = signal.y.length;
  let win: number[] = [];
  switch (type) {
    case 'Hanning':
      win = Array.from({ length: N }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)));
      break;
    case 'Hamming':
      win = Array.from({ length: N }, (_, n) => 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1)));
      break;
    case 'Rectangular':
      win = Array(N).fill(1);
      break;
    case 'Blackman':
      win = Array.from({ length: N }, (_, n) => 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1)));
      break;
    default:
      win = Array(N).fill(1);
  }
  return { x: signal.x, y: signal.y.map((v, i) => v * win[i]) };
}

export function fft(signal: { x: number[]; y: number[] }, fs: number) {
  // Simple FFT using DFT (for demo, not optimized)
  const N = signal.y.length;
  const freq = Array.from({ length: N / 2 }, (_, k) => k * fs / N);
  const mag = freq.map((_, k) => {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      re += signal.y[n] * Math.cos(-2 * Math.PI * k * n / N);
      im += signal.y[n] * Math.sin(-2 * Math.PI * k * n / N);
    }
    return Math.sqrt(re * re + im * im) / N;
  });
  return { freq, mag };
}

export function averageFunc(signal: { x: number[]; y: number[] }, type: string) {
  switch (type) {
    case 'Linear':
      return signal.y.map((_, i) => signal.y.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
    case 'RMS':
      return signal.y.map((_, i) => Math.sqrt(signal.y.slice(0, i + 1).reduce((a, b) => a + b * b, 0) / (i + 1)));
    case 'Exponential':
      const alpha = 0.1;
      const out: number[] = [];
      signal.y.reduce((prev, curr, i) => {
        const val = i === 0 ? curr : alpha * curr + (1 - alpha) * prev;
        out.push(val);
        return val;
      }, 0);
      return out;
    default:
      return undefined;
  }
}
