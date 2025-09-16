export function solveSpringMass(params: {
  mass: number;
  stiffness: number;
  damping: number;
  excitationFreq: number;
  excitationAmp: number;
}) {
  const { mass, stiffness, damping, excitationFreq, excitationAmp } = params;
  const N = 1000;
  const dt = 0.01;
  const x = Array.from({ length: N }, (_, i) => i * dt);
  // Free vibration: x'' + 2ζωx' + ω^2x = 0
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(mass * stiffness));
  const y: number[] = [];
  let v = 0, y0 = 1;
  for (let i = 0; i < N; i++) {
    const t = x[i];
    // Forced vibration: x'' + 2ζωx' + ω^2x = F0/m * sin(Ωt)
    const force = excitationAmp * Math.sin(2 * Math.PI * excitationFreq * t);
    const a = force / mass - 2 * zeta * omega * v - omega * omega * y0;
    v += a * dt;
    y0 += v * dt;
    y.push(y0);
  }
  // Bode plot
  const freq = Array.from({ length: 100 }, (_, i) => i * 0.1 + 0.1);
  const amp = freq.map(f => {
    const w = 2 * Math.PI * f;
    return excitationAmp / Math.sqrt((stiffness - mass * w * w) ** 2 + (damping * w) ** 2);
  });
  // Phase plot
  const phase = freq.map(f => {
    const w = 2 * Math.PI * f;
    return Math.atan2(damping * w, stiffness - mass * w * w) * 180 / Math.PI;
  });
  // Animation data (last value)
  const animationData = { x: y[y.length - 1] };
  return {
    timePlot: {
      data: [{ x, y, type: 'scatter', mode: 'lines', name: 'Displacement' }],
      layout: { title: 'Displacement', xaxis: { title: 'Time (s)' }, yaxis: { title: 'Displacement' } },
    },
    bodePlot: {
      data: [{ x: freq, y: amp, type: 'scatter', mode: 'lines', name: 'Amplitude' }],
      layout: { title: 'Amplitude-Frequency', xaxis: { title: 'Frequency (Hz)' }, yaxis: { title: 'Amplitude' } },
    },
    phasePlot: {
      data: [{ x: freq, y: phase, type: 'scatter', mode: 'lines', name: 'Phase' }],
      layout: { title: 'Phase-Frequency', xaxis: { title: 'Frequency (Hz)' }, yaxis: { title: 'Phase (deg)' } },
    },
    animationData,
  };
}
