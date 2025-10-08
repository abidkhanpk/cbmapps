"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });
import { useMotionValue, useMotionValueEvent } from "framer-motion";

// Notes:
// - Uses Tailwind via dynamic CDN injection like your signal generator page to ensure styles after client-side navigation
// - Uses Plotly for amplitude–frequency response, and Framer Motion for the spring–mass animation
// - All computations assume SI units. Frequency input is in Hz, angular frequency omega = 2πf

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

function computeNaturalFreq(k: number, m: number) {
  // ωn = sqrt(k/m); fn = ωn / (2π)
  const wn = Math.sqrt(k / Math.max(m, 1e-9));
  return { wn, fn: wn / (2 * Math.PI) };
}

function computeDampingRatio(c: number, k: number, m: number) {
  // ζ = c / (2*sqrt(k*m))
  const cc = 2 * Math.sqrt(Math.max(k, 0) * Math.max(m, 0)); // critical damping c_c
  const zeta = cc > 0 ? c / cc : 0;
  return { zeta, cc };
}

function computeSteadyStateAmplitude(k: number, m: number, c: number, omega: number, F0 = 1) {
  // Standard forced vibration formula (base excitation force):
  // X = (F0/k) / sqrt((1 - r^2)^2 + (2 ζ r)^2), where r = ω/ωn and ζ = c/(2√(km))
  const { wn } = computeNaturalFreq(k, m);
  const { zeta } = computeDampingRatio(c, k, m);
  const r = wn > 0 ? omega / wn : 0;
  const denom = Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
  const X = (F0 / Math.max(k, 1e-9)) / Math.max(denom, 1e-9);
  // phase φ = atan((2 ζ r) / (1 - r^2))
  const phi = Math.atan2(2 * zeta * r, 1 - r * r);
  return { X, phi, r };
}

function computeResonancePeak(k: number, m: number, c: number) {
  // For ζ < 1/√2, amplitude peak occurs near r_peak = sqrt(1 - 2 ζ^2)
  const { wn, fn } = computeNaturalFreq(k, m);
  const { zeta } = computeDampingRatio(c, k, m);
  const rPeak = zeta < 1 / Math.sqrt(2) ? Math.sqrt(clamp(1 - 2 * zeta * zeta, 0, 1)) : 0; // 0 if overdamped for this context
  const wPeak = rPeak * wn;
  const fPeak = wPeak / (2 * Math.PI);
  const { X } = computeSteadyStateAmplitude(k, m, c, wPeak, 1);
  return { rPeak, wPeak, fPeak, Xpeak: X };
}

export default function SpringMassSystem() {
  // Tailwind CDN readiness (same pattern used in your signal generator page)
  const [twReady, setTwReady] = useState(false);
  useEffect(() => {
    const hasTailwindStyles = () => {
      if (typeof window === "undefined") return false;
      try {
        for (const style of Array.from(document.querySelectorAll("style"))) {
          if (style.textContent && style.textContent.includes("--tw")) return true;
        }
      } catch {}
      return false;
    };

    if (hasTailwindStyles()) { setTwReady(true); return; }

    const existingCdn = document.querySelector("script[data-tailwind-cdn]");
    if (!existingCdn) {
      const config = document.createElement("script");
      config.setAttribute("data-tailwind-config", "true");
      config.innerHTML = "tailwind = { config: { corePlugins: { preflight: false } } }";
      document.head.appendChild(config);

      const cdn = document.createElement("script");
      cdn.src = "https://cdn.tailwindcss.com";
      cdn.setAttribute("data-tailwind-cdn", "true");
      cdn.async = true;
      document.head.appendChild(cdn);
    }

    const poll = window.setInterval(() => {
      if (hasTailwindStyles()) {
        window.clearInterval(poll);
        setTwReady(true);
      }
    }, 40);
    const bailout = window.setTimeout(() => { setTwReady(true); }, 3500);
    return () => { window.clearInterval(poll); window.clearTimeout(bailout); };
  }, []);

  // Parameters and derived quantities
  const [m, setM] = useState(1.0);           // kg
  const [k, setK] = useState(200);           // N/m
  const [c, setC] = useState(2 * Math.sqrt(200 * 1) * 0.05); // 5% damping of critical by default
  const { wn, fn } = useMemo(() => computeNaturalFreq(k, m), [k, m]);
  const { zeta, cc } = useMemo(() => computeDampingRatio(c, k, m), [c, k, m]);

  // Frequency control (Hz)
  const [freqHz, setFreqHz] = useState<number>(Math.max(0.2, fn));
  const omega = 2 * Math.PI * freqHz;

  // Sweep control
  const [running, setRunning] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepRate, setSweepRate] = useState(0.5); // Hz per second
  const sweepDir = useRef<1 | -1>(1);

  // Amplitude/current response at the selected frequency
  const { X, phi, r } = useMemo(() => computeSteadyStateAmplitude(k, m, c, omega, 1), [k, m, c, omega]);
  const { rPeak, fPeak, Xpeak } = useMemo(() => computeResonancePeak(k, m, c), [k, m, c]);

  // Build frequency response curve up to ~3×fn (auto-scales)
  const { frqHzArr, ampArr } = useMemo(() => {
    const fmax = Math.max(1, fn * 3);
    const points = 600;
    const arrF: number[] = new Array(points);
    const arrA: number[] = new Array(points);
    for (let i = 0; i < points; i++) {
      const f = (i / (points - 1)) * fmax;
      const om = 2 * Math.PI * f;
      arrF[i] = f;
      arrA[i] = computeSteadyStateAmplitude(k, m, c, om, 1).X;
    }
    return { frqHzArr: arrF, ampArr: arrA };
  }, [k, m, c, fn]);

  // Animation state
  const yPx = useMotionValue(0);
  const [dispPx, setDispPx] = useState(0); // current pixel displacement used to stretch spring and damper rod
  const rafRef = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  useMotionValueEvent(yPx, 'change', (latest) => {
    setDispPx(latest);
  });

  // Visual scaling for displacement (pixels per meter). The dynamic amplitude is capped for visualization.
  const pxPerMeter = 250; // arbitrary scale factor for visual displacement
  const maxDynPx = 80;    // clamp animation for legibility

  // Frequency bounds (auto based on fn)
  const fMin = 0;
  const fMax = Math.max(1, fn * 3);

  useEffect(() => {
    if (!running) return;
    const loop = (ts: number) => {
      if (t0.current === null) t0.current = ts;
      if (lastTs.current === null) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000; // seconds since last frame
      lastTs.current = ts;

      // Sweep frequency if enabled
      if (sweeping) {
        const fNew = freqHz + sweepDir.current * sweepRate * dt;
        if (fNew >= fMax) { sweepDir.current = -1; }
        if (fNew <= fMin) { sweepDir.current = 1; }
        const bounded = clamp(fNew, fMin, fMax);
        if (Math.abs(bounded - freqHz) > 1e-6) setFreqHz(bounded);
      }

      // Compute steady-state displacement x(t) = X * sin(ω t - φ)
      const t = (ts - t0.current) / 1000;
      const x = X * Math.sin(omega * t - phi); // meters
      const y = clamp(x * pxPerMeter, -maxDynPx, maxDynPx);
      yPx.set(y);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null; t0.current = null; lastTs.current = null;
    };
  }, [running, sweeping, freqHz, omega, X, phi, fMin, fMax, sweepRate, yPx]);

  // Keep damping within [0, 2×critical] as k/m changes to prevent wild ranges
  useEffect(() => {
    const maxC = 2 * cc; // allow up to 200% of critical for exploration
    if (c > maxC) setC(maxC);
  }, [cc, c]);

  // Render helper: vertical zig‑zag spring with non-scaling stroke
  const SpringSVG = ({ x = 80, length, coils = 9, radius = 12, color = '#22c55e' }: { x?: number; length: number; coils?: number; radius?: number; color?: string; }) => {
    const turns = coils;
    const seg = length / turns;
    let d = `M ${x} 0`;
    for (let i = 0; i < turns; i++) {
      const y1 = seg * (i + 0.5);
      const y2 = seg * (i + 1);
      const dir = i % 2 === 0 ? 1 : -1;
      d += ` L ${x + dir * radius} ${y1} L ${x} ${y2}`;
    }
    return (
      <path d={d} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" style={{ vectorEffect: 'non-scaling-stroke' as const }} />
    );
  };

  
  return (
    <div className="position-relative">
      {!twReady && (
        <div className="d-flex align-items-center justify-content-center position-absolute top-0 start-0 w-100" style={{ height: 'calc(100vh - var(--navbar-height))', zIndex: 10, background: 'rgba(249,250,251,0.9)' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      <div style={{ visibility: twReady ? 'visible' : 'hidden' }} className="mx-n4 min-h-screen text-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 p-0">
          {/* Controls + Plot */}
          <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-5 h-fit lg:col-span-7 order-1 min-w-0">
            <div>
              <h1 className="text-lg font-semibold">Spring–Mass–Damper</h1>
              <p className="text-xs text-gray-500 mt-1">Interactive forced vibration simulator. Adjust parameters to see resonance and damping effects.</p>
            </div>

            {/* Parameter sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex items-end justify-between">
                  <label className="block text-sm font-medium">Mass m (kg)</label>
                  <div className="text-xs text-gray-600">{m.toFixed(2)}</div>
                </div>
                <input type="range" min={0.1} max={10} step={0.1} value={m} onChange={(e) => setM(Number(e.target.value))} className="mt-1 w-full" />
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <label className="block text-sm font-medium">Stiffness k (N/m)</label>
                  <div className="text-xs text-gray-600">{k.toFixed(0)}</div>
                </div>
                <input type="range" min={10} max={2000} step={10} value={k} onChange={(e) => setK(Number(e.target.value))} className="mt-1 w-full" />
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <label className="block text-sm font-medium">Damping c (N·s/m)</label>
                  <div className="text-xs text-gray-600">{c.toFixed(3)}</div>
                </div>
                <input type="range" min={0} max={Math.max(0.001, 2 * cc)} step={0.001} value={c} onChange={(e) => setC(Number(e.target.value))} className="mt-1 w-full" />
                <div className="text-[11px] text-gray-500 mt-1">Critical damping c<sub>c</sub> = {(cc).toFixed(3)} N·s/m</div>
              </div>
              <div>
                <div className="flex items-end justify-between">
                  <label className="block text-sm font-medium">Excitation Frequency f (Hz)</label>
                  <div className="text-xs text-gray-600">{freqHz.toFixed(2)}</div>
                </div>
                <input type="range" min={fMin} max={fMax} step={0.01} value={freqHz} onChange={(e) => setFreqHz(Number(e.target.value))} disabled={sweeping} className="mt-1 w-full" />
                <div className="flex items-center gap-3 mt-2">
                  <button className={`px-3 py-1.5 text-sm rounded border ${running ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setRunning(v => !v)}>{running ? 'Pause' : 'Run'}</button>
                  <button className={`px-3 py-1.5 text-sm rounded border ${sweeping ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setSweeping(v => !v)}>{sweeping ? 'Stop sweep' : 'Start sweep'}</button>
                </div>
                {sweeping && (
                  <div className="mt-2">
                    <div className="flex items-end justify-between">
                      <label className="block text-sm font-medium">Sweep rate (Hz/s)</label>
                      <div className="text-xs text-gray-600">{sweepRate.toFixed(2)}</div>
                    </div>
                    <input type="range" min={0.05} max={3 * Math.max(0.1, fn)} step={0.05} value={sweepRate} onChange={(e) => setSweepRate(Number(e.target.value))} className="mt-1 w-full" />
                  </div>
                )}
              </div>
            </div>

            
            {/* Frequency response chart */}
            <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
              <Plot
                data={[
                  {
                    x: frqHzArr,
                    y: ampArr,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: 'rgba(2,132,199,1)', width: 2 },
                    name: 'Amplitude',
                    hovertemplate: 'f = %{x:.3f} Hz<br>X = %{y:.3e} m<extra></extra>',
                  },
                ]}
                layout={{
                  autosize: true,
                  height: 220,
                  margin: { l: 45, r: 10, t: 10, b: 35 },
                  xaxis: {
                    title: 'Frequency (Hz)',
                    range: [0, Math.max(1, fn * 3)],
                    showgrid: true,
                    zeroline: false,
                  },
                  yaxis: {
                    title: 'Amplitude (m)',
                    type: 'linear',
                    rangemode: 'tozero',
                    showgrid: true,
                    zeroline: false,
                  },
                  shapes: [
                    // Vertical line at fn
                    {
                      type: 'line', x0: fn, x1: fn, y0: 0, y1: 1, xref: 'x', yref: 'paper',
                      line: { color: 'rgba(220,38,38,0.7)', width: 2, dash: 'dot' },
                    },
                    // Vertical line at current frequency
                    {
                      type: 'line', x0: freqHz, x1: freqHz, y0: 0, y1: 1, xref: 'x', yref: 'paper',
                      line: { color: 'rgba(22,163,74,0.8)', width: 2 },
                    },
                  ],
                  annotations: [
                    { x: fn, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f_n', font: { size: 10, color: '#dc2626' } },
                    { x: freqHz, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#16a34a' } },
                  ],
                }}
                config={{ displayModeBar: false, responsive: true }}
                useResizeHandler
                style={{ width: '100%', height: 260 }}
              />
                          </div>
          </aside>

          {/* Animation panel */}
          <main className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex items-center justify-center lg:col-span-3 order-2">
            <div className="w-full max-w-xl">
              <div className="flex items-center justify-center">
                {/* Animation */}
                <div className="relative">
                  {(() => {
                    // Geometry and dynamic values
                    const topY = 24;                 // ceiling offset
                    const springBaseLen = 150;       // un-stretched spring length (px)
                    const xSpring = 70;              // spring x position
                    const xDamper = 130;             // damper x position
                    const springScale = Math.max(0.6, Math.min(1.6, 1 + dispPx / springBaseLen));
                    const crossbarY = topY + springBaseLen + dispPx; // where spring lower end connects
                    const massBaseY = crossbarY + 14; // mass top y

                    // Damper body
                    const damperBodyTop = topY + 20;
                    const damperBodyBottom = damperBodyTop + 90;
                    const damperRodBottom = crossbarY; // dynamic

                    return (
                      <svg viewBox="0 0 220 360" className="w-full h-[300px] md:h-[320px]">
                        <defs>
                          <linearGradient id="massGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ade80" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                          <linearGradient id="springGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#22c55e" />
                          </linearGradient>
                          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="6" stroke="#6b7280" strokeWidth="1" />
                          </pattern>
                        </defs>

                        {/* Ceiling / fixed support */}
                        <rect x="20" y="8" width="180" height="10" fill="#9ca3af" rx="2" />
                        <rect x="20" y="2" width="180" height="6" fill="url(#hatch)" opacity="0.55" />

                        {/* Upper joints */}
                        <circle cx={xSpring} cy={topY} r={5} fill="#ffffff" stroke="#0b61a4" strokeWidth={2} />
                        <circle cx={xDamper} cy={topY} r={5} fill="#ffffff" stroke="#0b61a4" strokeWidth={2} />

                        {/* Vertical guides from ceiling to spring/damper tops */}
                        <line x1={xSpring} y1={18} x2={xSpring} y2={topY} stroke="#0b61a4" strokeOpacity="0.3" strokeWidth={3} />
                        <line x1={xDamper} y1={18} x2={xDamper} y2={topY} stroke="#0b61a4" strokeOpacity="0.3" strokeWidth={3} />

                        {/* Spring (stretches with mass via scaleY), anchored at topY */}
                        <g transform={`translate(0, ${topY})`}>
                          <g transform={`scale(1, ${springScale})`}>
                            <SpringSVG x={xSpring} length={springBaseLen} coils={9} radius={12} color="url(#springGrad)" />
                          </g>
                        </g>

                        {/* Damper (body fixed, rod extends to the crossbar) */}
                        {/* Damper body */}
                        <rect x={xDamper - 10} y={damperBodyTop} width={20} height={damperBodyBottom - damperBodyTop} rx={3} fill="#0b61a4" opacity="0.15" stroke="#0b61a4" strokeOpacity="0.35" />
                        <rect x={xDamper - 7} y={damperBodyTop + 8} width={14} height={damperBodyBottom - damperBodyTop - 16} rx={2} fill="#0b61a4" opacity="0.85" />
                        {/* Damper piston rod */}
                        <line x1={xDamper} y1={damperBodyBottom} x2={xDamper} y2={damperRodBottom} stroke="#0b61a4" strokeWidth={4} strokeLinecap="round" />

                        {/* Connectors from spring/damper to mass and the mass itself */}
                        {/* Horizontal rods to the mass left edge at the attachment level */}
                        <line x1={xSpring} y1={crossbarY} x2={xDamper + 40} y2={crossbarY} stroke="#0b61a4" strokeWidth={6} strokeLinecap="round" />
                        <line x1={xDamper} y1={crossbarY} x2={xDamper + 40} y2={crossbarY} stroke="#0b61a4" strokeWidth={6} strokeLinecap="round" />
                        {/* Joint markers at connection points */}
                        <circle cx={xSpring} cy={crossbarY} r={5} fill="#ffffff" stroke="#0b61a4" strokeWidth={2} />
                        <circle cx={xDamper} cy={crossbarY} r={5} fill="#ffffff" stroke="#0b61a4" strokeWidth={2} />
                        <circle cx={xDamper + 40} cy={crossbarY} r={5} fill="#ffffff" stroke="#0b61a4" strokeWidth={2} />
                        {/* Mass block directly attached to the rods */}
                        <rect x={xDamper + 45} y={crossbarY - 30} width={80} height={60} rx={6} fill="url(#massGrad)" stroke="#0f172a" strokeOpacity={0.25} />
                      </svg>
                    );
                  })()}
                  <div className="absolute -bottom-2 left-0 right-0 text-center text-xs text-gray-500">Amplitude is scaled for visualization.</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
