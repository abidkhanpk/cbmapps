"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
const Plot = dynamic<PlotParams>(() => import("react-plotly.js"), { ssr: false });
import FFT from "fft.js";

// Utilities
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Dynamics helpers
function naturalFreq(k: number, m: number) {
  const wn = Math.sqrt(k / Math.max(m, 1e-9));
  return { wn, fn: wn / (2 * Math.PI) };
}
function forcedResponse(k: number, m: number, zeta: number, omega: number, F0 = 1) {
  const { wn } = naturalFreq(k, m);
  const r = wn > 0 ? omega / wn : 0;
  const denom = Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
  const X = (F0 / Math.max(k, 1e-9)) / Math.max(denom, 1e-9);
  const phi = Math.atan2(2 * zeta * r, 1 - r * r); // radians
  return { X, phi, r };
}

export default function SpringMassSystem() {
  // Tailwind readiness via runtime CDN injection
  const [twReady, setTwReady] = useState(false);
  useEffect(() => {
    const hasTw = () => {
      try { for (const s of Array.from(document.querySelectorAll('style'))) { if (s.textContent && s.textContent.includes('--tw')) return true; } } catch {}
      return false;
    };
    if (hasTw()) { setTwReady(true); return; }
    if (!document.querySelector('script[data-tailwind-cdn]')) {
      const cfg = document.createElement('script'); cfg.setAttribute('data-tailwind-config', 'true'); cfg.innerHTML = "tailwind = { config: { corePlugins: { preflight: false } } }"; document.head.appendChild(cfg);
      const cdn = document.createElement('script'); cdn.src = 'https://cdn.tailwindcss.com'; cdn.setAttribute('data-tailwind-cdn', 'true'); cdn.async = true; document.head.appendChild(cdn);
    }
    const poll = window.setInterval(() => { if (hasTw()) { window.clearInterval(poll); setTwReady(true); } }, 40);
    const bailout = window.setTimeout(() => setTwReady(true), 3500);
    return () => { window.clearInterval(poll); window.clearTimeout(bailout); };
  }, []);

  // Parameters (zeta-based damping)
  const [m, setM] = useState(1.0);    // kg
  const [k, setK] = useState(200);    // N/m
  const [zeta, setZeta] = useState(0.1); // damping ratio (0..2)
  const c = useMemo(() => 2 * zeta * Math.sqrt(Math.max(k, 0) * Math.max(m, 0)), [zeta, k, m]);
  const { wn, fn } = useMemo(() => naturalFreq(k, m), [k, m]);

  // Forcing frequency (Hz) applied to base
  const [freqHz, setFreqHz] = useState<number>(0);
  const omega = 2 * Math.PI * freqHz;

  // Run/Pause & sweep
  const [running, setRunning] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepMult, setSweepMult] = useState(1); // 0.1..2 (x normal)
  const normalSweepRate = 0.2; // Hz/s baseline (slow). 0.1x => 0.02 Hz/s, 2x => 0.4 Hz/s
  const sweepDir = useRef<1 | -1>(1);

  // Real-time waveform buffer (meters)
  const rtRef = useRef<{ t: number[]; x: number[]; yb: number[] }>({ t: [], x: [], yb: [] });
  const [rtState, setRtState] = useState<{ t: number[]; x: number[]; yb: number[] }>({ t: [], x: [], yb: [] });
  const rtStart = useRef<number | null>(null);
  const lastUiPush = useRef<number>(0);

  // Free-vibration transient (nudge)
  const freeStartRef = useRef<number | null>(null);
  const freeAmpRef = useRef<number>(0);
  const nudgeActiveRef = useRef<boolean>(false);

  // Derived response at current freq
  const { X, phi } = useMemo(() => forcedResponse(k, m, zeta, omega, 1), [k, m, zeta, omega]);

  // Bode precomputed curve (amp & phase)
  const bode = useMemo(() => {
    const fmax = Math.max(1, fn * 3);
    const N = 600; const f: number[] = new Array(N); const amp: number[] = new Array(N); const ph: number[] = new Array(N);
    for (let i = 0; i < N; i++) {
      const fi = (i / (N - 1)) * fmax; const om = 2 * Math.PI * fi;
      const fr = forcedResponse(k, m, zeta, om, 1);
      f[i] = fi; amp[i] = fr.X; ph[i] = fr.phi * 180 / Math.PI;
    }
    return { f, amp, ph };
  }, [k, m, zeta, fn]);
  // Fixed Y ranges for Bode plots (disable autoscale)
  const bodeAmpMax = useMemo(() => (bode.amp && bode.amp.length ? bode.amp.reduce((a, b) => (b > a ? b : a), 0) : 1), [bode]);
  const bodePhRange = useMemo(() => {
    if (!bode.ph || !bode.ph.length) return [-180, 180] as [number, number];
    let min = Infinity, max = -Infinity;
    for (const v of bode.ph) { if (v < min) min = v; if (v > max) max = v; }
    if (!isFinite(min) || !isFinite(max)) return [-180, 180] as [number, number];
    return [min, max] as [number, number];
  }, [bode]);

  // Sweep capture (coast up/down)
  const upPts = useRef<{ f: number; amp: number; ph: number; }[]>([]);
  const downPts = useRef<{ f: number; amp: number; ph: number; }[]>([]);
  const lastCapture = useRef<number>(0);
  const prevFreqRef = useRef<number>(freqHz);
  const lastManualCaptureRef = useRef<number>(0);

  // Animation + real-time generation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) return;
    let raf: number | null = null; let t0: number | null = null; let last: number | null = null;
    const pxPerMeter = 250; const baseAmpPx = 6; // small base motion

    const loop = (ts: number) => {
      if (t0 === null) t0 = ts; if (last === null) last = ts; const dt = (ts - last) / 1000; last = ts;
      if (rtStart.current === null) rtStart.current = ts;
      const tsec = (ts - rtStart.current) / 1000;

      // Sweep frequency
      if (sweeping) {
        const actualRate = normalSweepRate * clamp(sweepMult, 0.1, 5);
        let fNew = freqHz + sweepDir.current * actualRate * dt;
        const fMin = 0; const fMax = Math.max(1, fn * 3);
        if (fNew >= fMax) { sweepDir.current = -1; fNew = fMax; }
        if (fNew <= fMin) { sweepDir.current = 1; fNew = fMin; }
        setFreqHz(fNew); // keep slider enabled and responsive during sweep
        // capture sweep traces
        if (ts - lastCapture.current > 40) {
          lastCapture.current = ts;
          const fr = forcedResponse(k, m, zeta, 2 * Math.PI * fNew, 1);
          const point = { f: fNew, amp: fr.X, ph: fr.phi * 180 / Math.PI };
          if (sweepDir.current > 0) upPts.current.push(point); else downPts.current.push(point);
          if (upPts.current.length > 2500) upPts.current.shift();
          if (downPts.current.length > 2500) downPts.current.shift();
        }
      }

      // Recompute response with updated omega
      const w = 2 * Math.PI * freqHz;
      const fr = forcedResponse(k, m, zeta, w, 1);

      // Forced steady-state x_f (m), base y_b (m)
      let xForced = fr.X * Math.sin(w * tsec - fr.phi);
      let yb = (baseAmpPx / pxPerMeter) * Math.sin(w * tsec);

      // Free-vibration transient component x_free(t)
      let xFree = 0;
      if (freeStartRef.current !== null) {
        const td = (ts - freeStartRef.current) / 1000;
        const { wn } = naturalFreq(k, m);
        const A0 = freeAmpRef.current; // meters
        const zf = zeta < 1 ? Math.min(zeta * 0.6, 0.98) : zeta;
        if (zeta < 1) {
          const wd = wn * Math.sqrt(1 - zf * zf);
          const beta = zf / Math.max(Math.sqrt(1 - zf * zf), 1e-9);
          // ICS: x(0)=A0, x'(0)=0 → nonzero at t=0, no initial downward spike
          xFree = A0 * Math.exp(-zf * wn * td) * (Math.cos(wd * td) + beta * Math.sin(wd * td));
        } else if (Math.abs(zeta - 1) < 1e-3) {
          // Critically damped: non-oscillatory, no overshoot for positive A0
          xFree = A0 * td * Math.exp(-wn * td);
        } else {
          // Overdamped: sum of decaying exponentials (non-oscillatory)
          const s = Math.sqrt(zeta * zeta - 1);
          const term1 = Math.exp(-wn * (zeta - s) * td);
          const term2 = Math.exp(-wn * (zeta + s) * td);
          xFree = (A0 / (2 * s)) * (term1 - term2);
        }
        // End transient when envelope is very small (adaptive to damping)
        let envelope = 0;
        if (zeta < 1) {
          envelope = Math.abs(A0) * Math.exp(-zf * wn * td);
        } else if (Math.abs(zeta - 1) < 1e-3) {
          envelope = Math.abs(A0) * Math.abs(td) * Math.exp(-wn * td);
        } else {
          const s = Math.sqrt(zeta * zeta - 1);
          const e1 = Math.exp(-wn * (zeta - s) * td);
          const e2 = Math.exp(-wn * (zeta + s) * td);
          envelope = Math.abs(A0) * Math.max(e1, e2) / (2 * s);
        }
        if (envelope < Math.max(1e-7, Math.abs(A0) * 1e-5) || td > 60) {
          freeStartRef.current = null; freeAmpRef.current = 0; nudgeActiveRef.current = false;
        }
      }

      // If nudge animation is active, show pure free response (no forcing/base)
      if (nudgeActiveRef.current) { xForced = 0; yb = 0; }

      const xTotal = xForced + xFree; // meters

      // Push to real-time buffer
      const buf = rtRef.current;
      buf.t.push(tsec);
      buf.x.push(xTotal);
      buf.yb.push(yb);
      // keep last 12 seconds
      while (buf.t.length > 0 && tsec - buf.t[0] > 12) { buf.t.shift(); buf.x.shift(); buf.yb.shift(); }

      // Throttle state updates for plots (~16fps)
      if (ts - lastUiPush.current > 60) {
        lastUiPush.current = ts;
        setRtState({ t: [...buf.t], x: [...buf.x], yb: [...buf.yb] });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [running, sweeping, sweepMult, freqHz, k, m, zeta, fn]);

  // Capture coast-up/down traces even when sweep is off and user changes frequency
  useEffect(() => {
    const now = performance.now();
    if (!sweeping) {
      const prev = prevFreqRef.current;
      if (freqHz !== prev && now - lastManualCaptureRef.current > 40) {
        lastManualCaptureRef.current = now;
        const fr = forcedResponse(k, m, zeta, 2 * Math.PI * freqHz, 1);
        const point = { f: freqHz, amp: fr.X, ph: fr.phi * 180 / Math.PI };
        if (freqHz > prev) upPts.current.push(point); else downPts.current.push(point);
        if (upPts.current.length > 2500) upPts.current.shift();
        if (downPts.current.length > 2500) downPts.current.shift();
      }
    }
    prevFreqRef.current = freqHz;
  }, [freqHz, sweeping, k, m, zeta]);

  // Visual mappings
  const springStroke = useMemo(() => {
    // map k in [10..2000] -> stroke in [5..14]
    const t = clamp((k - 10) / (2000 - 10), 0, 1);
    return lerp(5, 14, t);
  }, [k]);
  const massSize = useMemo(() => {
    // base 90x70 scaled smoothly with m
    const t = clamp((Math.log(m) - Math.log(0.1)) / (Math.log(10) - Math.log(0.1)), 0, 1);
    const s = lerp(0.65, 1.45, t);
    return { w: 90 * s, h: 70 * s };
  }, [m]);
  const damperInnerColor = useMemo(() => {
    // darker with higher zeta (0..1.1)
    const norm = clamp(zeta / 1.1, 0, 1);
    const lightness = lerp(78, 35, norm);
    return `hsl(210 80% ${lightness}%)`;
  }, [zeta]);

  // Tabs and units
  const [activeTab, setActiveTab] = useState<'fft' | 'time' | 'bode'>('fft');
  const [freqUnits, setFreqUnits] = useState<'Hz' | 'ratio'>('Hz');
  const [sweepVersion, setSweepVersion] = useState(0); // force re-render on clear
  // Persistent axis ranges (avoid autoscaling to tiny values)
  const timeYMaxRef = useRef<number>(0.05);
  const [timeYMax, setTimeYMax] = useState<number>(0.05);
  const fftYMaxRef = useRef<number>(1e-4);
  const [fftYMax, setFftYMax] = useState<number>(1e-4);
  // FFT axis locking while sweeping
  const [fftXRange, setFftXRange] = useState<[number, number] | null>(null);
  const [fftYRange, setFftYRange] = useState<[number, number] | null>(null);
  const sweepLockRef = useRef<boolean>(false);

  // FFT of real-time waveform
  const fftData = useMemo(() => {
    const N = rtState.t.length;
    if (N < 32) return { f: [] as number[], mag: [] as number[] };
    const tArr = rtState.t; const xArr = rtState.x;
    const Tspan = tArr[N - 1] - tArr[0];
    if (Tspan <= 0) return { f: [], mag: [] };
    const dt = Tspan / Math.max(1, N - 1);
    const Fs = 1 / dt;
    // choose nearest lower power of 2
    let n2 = 1; while ((n2 << 1) <= N) n2 <<= 1;
    const x = new Float64Array(n2);
    // take last n2 samples and apply Hann window
    const start = N - n2; for (let i = 0; i < n2; i++) { const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n2 - 1))); x[i] = (xArr[start + i] ?? 0) * w; }
    const fft = new (FFT as any)(n2);
    const out = fft.createComplexArray(); const data = fft.createComplexArray();
    for (let i = 0; i < n2; i++) { data[2 * i] = x[i]; data[2 * i + 1] = 0; }
    fft.transform(out, data);
    const half = Math.floor(n2 / 2);
    const f: number[] = new Array(half + 1); const mag: number[] = new Array(half + 1);
    for (let kbin = 0; kbin <= half; kbin++) {
      const re = out[2 * kbin]; const im = out[2 * kbin + 1];
      const m = (2 / n2) * Math.hypot(re, im);
      f[kbin] = (kbin * Fs) / n2;
      mag[kbin] = m;
    }
    return { f, mag };
  }, [rtState]);

  // Update persistent y ranges
  useEffect(() => {
    // Time waveform range
    try {
      const maxAbs = Math.max(
        ...(rtState.x.length ? rtState.x.map(v => Math.abs(v)) : [0]),
        ...(rtState.yb.length ? rtState.yb.map(v => Math.abs(v)) : [0])
      );
      if (maxAbs > timeYMaxRef.current) {
        const next = Math.max(maxAbs * 1.25, timeYMaxRef.current);
        timeYMaxRef.current = next;
        setTimeYMax(next);
      }
    } catch {}
  }, [rtState]);

  useEffect(() => {
    // FFT magnitude range
    try {
      const mag = fftData.mag;
      if (mag && mag.length) {
        const maxMag = mag.reduce((a, b) => (b > a ? b : a), 0);
        if (maxMag > fftYMaxRef.current) {
          const next = Math.max(maxMag * 1.25, fftYMaxRef.current);
          fftYMaxRef.current = next;
          setFftYMax(next);
        }
      }
    } catch {}
  }, [fftData]);

  // Units mapping for frequency axes
  const mapFreq = (arr: number[]) => freqUnits === 'Hz' ? arr : arr.map(v => fn > 0 ? v / fn : 0);
  const freqTitle = freqUnits === 'Hz' ? 'Frequency (Hz)' : 'Frequency Ratio (f/f_n)';
  const fnMark = freqUnits === 'Hz' ? fn : 1;
  const bodeXRange = freqUnits === 'Hz' ? [0, Math.max(1, fn * 3)] : [0, 3];
  // Forcing frequency slider range aligned with Default plot
  const sliderMin = 0;
  const sliderMax = freqUnits === 'Hz' ? 25 : 3;
  const sliderValue = freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0);
  const sliderStep = Math.max((sliderMax - sliderMin) / 1000, 0.001);
  const PLOT_MARGINS = { l: 55, r: 10, t: 10, b: 40 } as const;
  // Tailwind paddings: plot container uses p-2 (8px), controls container uses p-3 (12px)
  const PLOT_CONTAINER_PAD = 8;
  const CONTROLS_CONTAINER_PAD = 12;
  // Default pads as fallback (before dynamic alignment runs)
  const defaultSliderPadLeft = Math.max(0, PLOT_MARGINS.l + PLOT_CONTAINER_PAD - CONTROLS_CONTAINER_PAD);
  const defaultSliderPadRight = Math.max(0, PLOT_MARGINS.r + PLOT_CONTAINER_PAD - CONTROLS_CONTAINER_PAD);
  const [sliderPadLeft, setSliderPadLeft] = useState<number>(defaultSliderPadLeft);
  const [sliderPadRight, setSliderPadRight] = useState<number>(defaultSliderPadRight);
  const defaultPlotWrapRef = useRef<HTMLDivElement | null>(null);
  const defaultPlotDivRef = useRef<HTMLDivElement | null>(null);
  const sliderWrapRef = useRef<HTMLDivElement | null>(null);
  const updateSliderPads = (graphDiv?: HTMLDivElement) => {
    try {
      const gd = graphDiv ?? defaultPlotDivRef.current;
      const sliderWrap = sliderWrapRef.current;
      if (!gd || !sliderWrap) return;

      const sliderRect = sliderWrap.getBoundingClientRect();

      // Prefer measuring the actual plot area from the SVG background rect
      const bgRectEl = gd.querySelector('g.cartesianlayer g.subplot.xy rect.bg') as SVGRectElement | null;
      if (bgRectEl) {
        const bgRect = bgRectEl.getBoundingClientRect();
        const padL = Math.max(0, Math.round(bgRect.left - sliderRect.left));
        const padR = Math.max(0, Math.round(sliderRect.right - bgRect.right));
        setSliderPadLeft(padL);
        setSliderPadRight(padR);
        return;
      }

      // Fallback: use internal layout offsets if rect.bg is not found
      const plotRect = gd.getBoundingClientRect();
      const fl: any = (gd as any)._fullLayout;
      const xa = fl?.xaxis;
      const plotLeft = plotRect.left + (typeof xa?._offset === 'number' ? xa._offset : PLOT_MARGINS.l);
      const plotRight = plotLeft + (typeof xa?._length === 'number' ? xa._length : Math.max(0, plotRect.width - (PLOT_MARGINS.l + PLOT_MARGINS.r)));
      const padL = Math.max(0, Math.round(plotLeft - sliderRect.left));
      const padR = Math.max(0, Math.round(sliderRect.right - plotRight));
      setSliderPadLeft(padL);
      setSliderPadRight(padR);
    } catch {}
  };
  useEffect(() => {
    const onResize = () => updateSliderPads();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Model-based spectrum (amplitude vs frequency), with color gradient and damping-dependent peak width
  const spectrumModel = useMemo(() => {
    const fmax = freqUnits === 'Hz' ? 25 : Math.max(1, fn * 3);
    const N = 600;
    const f: number[] = new Array(N);
    const y: number[] = new Array(N);
    let yMax = 0;
    for (let i = 0; i < N; i++) {
      const fi = (i / (N - 1)) * fmax;
      const fr = forcedResponse(k, m, zeta, 2 * Math.PI * fi, 1);
      f[i] = fi; y[i] = fr.X; if (y[i] > yMax) yMax = y[i];
    }
    return { f, y, yMax };
  }, [k, m, zeta, fn]);

  const specYMax = useMemo(() => (spectrumModel.yMax ? spectrumModel.yMax * 1.1 : 1), [spectrumModel]);

  const spectrumTrace = useMemo(() => {
    return {
      x: mapFreq(spectrumModel.f),
      y: spectrumModel.y,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'rgba(2,132,199,1)', width: 2 },
      name: 'Spectrum',
    } as any;
  }, [spectrumModel, mapFreq, freqUnits]);

  // Lock Default (FFT) plot axes while sweeping is ON (based on model spectrum)
  useEffect(() => {
    if (sweeping && !sweepLockRef.current) {
      const fLast = spectrumModel.f.length ? spectrumModel.f[spectrumModel.f.length - 1] : 1;
      const xMax = freqUnits === 'Hz' ? fLast : (fn > 0 ? fLast / fn : 1);
      const yMax = spectrumModel.yMax || 1;
      setFftXRange([0, xMax]);
      setFftYRange([0, yMax * 1.1]);
      sweepLockRef.current = true;
    } else if (!sweeping && sweepLockRef.current) {
      sweepLockRef.current = false;
      setFftXRange(null);
      setFftYRange(null);
    }
  }, [sweeping, spectrumModel, freqUnits, fn]);

  // Current visual sample (last rtState)
  const xPx = (rtState.x.length ? rtState.x[rtState.x.length - 1] : 0) * 250;
  const basePx = (rtState.yb.length ? rtState.yb[rtState.yb.length - 1] : 0) * 250;

  // Collapsible parameters
  const [showParams, setShowParams] = useState(true);

  return (
    <div className="position-relative">
      {!twReady && (
        <div className="d-flex align-items-center justify-content-center position-absolute top-0 start-0 w-100" style={{ height: 'calc(100vh - var(--navbar-height))', zIndex: 10, background: 'rgba(249,250,251,0.9)' }}>
          <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        </div>
      )}
      <div style={{ visibility: twReady ? 'visible' : 'hidden' }} className="mx-n4 min-h-screen text-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 p-0">
          {/* Controls + Plots */}
          <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-4 h-fit lg:col-span-7 order-1 min-w-0">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Spring–Mass–Damper</h1>
              <div className="flex items-center gap-3 text-sm">
                <label className="inline-flex items-center gap-1"><input type="radio" name="units" checked={freqUnits === 'Hz'} onChange={() => setFreqUnits('Hz')} /> Hz</label>
                <label className="inline-flex items-center gap-1"><input type="radio" name="units" checked={freqUnits === 'ratio'} onChange={() => setFreqUnits('ratio')} /> f/f<sub>n</sub></label>
              </div>
            </div>

            {/* Collapsible parameters */}
            <div className="rounded border border-gray-200">
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50" onClick={() => setShowParams(s => !s)}>
                <span className="font-medium">Parameters</span>
                <span className="text-gray-500">{showParams ? 'Hide' : 'Show'}</span>
              </button>
              {showParams && (
                <div className="p-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-end justify-between"><label className="block text-sm font-medium">Mass m (kg)</label><div className="text-xs text-gray-600">{m.toFixed(2)}</div></div>
                      <input type="range" min={0.1} max={10} step={0.1} value={m} onChange={e => setM(Number(e.target.value))} className="mt-1 w-full" />
                    </div>
                    <div>
                      <div className="flex items-end justify-between"><label className="block text-sm font-medium">Stiffness k (N/m)</label><div className="text-xs text-gray-600">{k.toFixed(0)}</div></div>
                      <input type="range" min={10} max={2000} step={10} value={k} onChange={e => setK(Number(e.target.value))} className="mt-1 w-full" />
                    </div>
                    <div>
                      <div className="flex items-end justify-between"><label className="block text-sm font-medium">Damping ζ</label><div className="text-xs text-gray-600">{zeta.toFixed(3)} {zeta < 1 ? '(underdamped)' : zeta === 1 ? '(critical)' : '(overdamped)'}</div></div>
                      <input type="range" min={0} max={1.1} step={0.001} value={zeta} onChange={e => setZeta(Number(e.target.value))} className="mt-1 w-full" />
                    </div>
                                      </div>

                  
                                  </div>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button className={`px-3 py-1.5 text-sm rounded border ${activeTab === 'fft' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setActiveTab('fft')}>Default</button>
                <button className={`px-3 py-1.5 text-sm rounded border ${activeTab === 'time' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setActiveTab('time')}>Time Waveform</button>
                <button className={`px-3 py-1.5 text-sm rounded border ${activeTab === 'bode' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setActiveTab('bode')}>Bode (Amp & Phase)</button>
              </div>

              {/* FFT Tab: show natural frequency marker */}
              {activeTab === 'fft' && (
                <div ref={defaultPlotWrapRef} className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                  <Plot
                    data={[spectrumTrace]}
                    layout={{ autosize: true, height: 260, uirevision: "fft", margin: PLOT_MARGINS as any, xaxis: { title: freqTitle, range: (freqUnits === 'Hz' ? ([0, 25] as any) : ([0, sliderMax] as any)), autorange: false }, yaxis: { title: '|X(f)| (m)', zeroline: false, showgrid: true, range: (fftYRange as any) ?? ([0, specYMax] as any), autorange: false }, shapes: [
                      { type: 'line', x0: fnMark, x1: fnMark, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(220,38,38,0.8)', width: 1.5, dash: 'dot' } },
                      { type: 'line', x0: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), x1: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(16,185,129,0.95)', width: 2.5 } }
                    ], annotations: [
                      { x: fnMark, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f_n', font: { size: 10, color: '#dc2626' } },
                      { x: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#10b981' } }
                    ] }}
                    config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 260 }}
                    onInitialized={(_fig, gd) => {
                      defaultPlotDivRef.current = gd;
                      requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd)));
                    }}
                    onUpdate={(_fig, gd) => {
                      defaultPlotDivRef.current = gd;
                      requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd)));
                    }}
                  />
                </div>
              )}

              {/* Time Waveform Tab: real-time */}
              {activeTab === 'time' && (
                <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                  <Plot
                    data={[
                      { x: rtState.t, y: rtState.x, type: 'scatter', mode: 'lines', line: { color: 'rgba(2,132,199,1)', width: 2 }, name: 'Mass x(t)' },
                      { x: rtState.t, y: rtState.yb, type: 'scatter', mode: 'lines', line: { color: 'rgba(234,88,12,0.8)', width: 1, dash: 'dot' }, name: 'Base yb(t)' },
                    ]}
                    layout={{ autosize: true, height: 260, uirevision: "time", margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: 'Time (s)' }, yaxis: { title: 'Displacement (m)', zeroline: false, showgrid: true, range: [-timeYMax, timeYMax], autorange: false } }}
                    config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 260 }}
                  />
                </div>
              )}

              {/* Bode Tab */}
              {activeTab === 'bode' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <button className="px-2.5 py-1 rounded border border-gray-300 bg-white" onClick={() => { upPts.current = []; downPts.current = []; setSweepVersion(v => v + 1); }}>Clear sweep area</button>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                    <Plot
                      data={[
                        { x: mapFreq(bode.f), y: bode.amp, type: 'scatter', mode: 'lines', line: { color: 'rgba(2,132,199,1)', width: 2 }, name: 'Amplitude (model)', visible: 'legendonly' },
                        ...(upPts.current.length ? [{ x: mapFreq(upPts.current.map(p => p.f)), y: upPts.current.map(p => p.amp), type: 'scatter', mode: 'lines', line: { color: 'rgba(99,102,241,0.9)', width: 2 }, name: 'Coast up' }] : []),
                        ...(downPts.current.length ? [{ x: mapFreq(downPts.current.map(p => p.f)), y: downPts.current.map(p => p.amp), type: 'scatter', mode: 'lines', line: { color: 'rgba(236,72,153,0.9)', width: 2 }, name: 'Coast down' }] : []),
                      ]}
                      layout={{ autosize: true, height: 240, uirevision: "bode-amp", legend: {}, margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: freqTitle, range: bodeXRange as any }, yaxis: { title: 'Amplitude (m)', zeroline: false, showgrid: true, range: [0, bodeAmpMax || 1], autorange: false }, shapes: [
                        { type: 'line', x0: fnMark, x1: fnMark, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(220,38,38,0.7)', width: 2, dash: 'dot' } },
                        { type: 'line', x0: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), x1: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(16,185,129,0.95)', width: 2 } }
                      ], annotations: [
                        { x: fnMark, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f_n', font: { size: 10, color: '#dc2626' } },
                        { x: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#10b981' } }
                      ] }}
                      config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 240 }}
                    />
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                    <Plot
                      data={[
                        { x: mapFreq(bode.f), y: bode.ph, type: 'scatter', mode: 'lines', line: { color: 'rgba(234,88,12,1)', width: 2 }, name: 'Phase (model)', visible: 'legendonly' },
                        ...(upPts.current.length ? [{ x: mapFreq(upPts.current.map(p => p.f)), y: upPts.current.map(p => p.ph), type: 'scatter', mode: 'lines', line: { color: 'rgba(99,102,241,0.9)', width: 2 }, name: 'Coast up' }] : []),
                        ...(downPts.current.length ? [{ x: mapFreq(downPts.current.map(p => p.f)), y: downPts.current.map(p => p.ph), type: 'scatter', mode: 'lines', line: { color: 'rgba(236,72,153,0.9)', width: 2 }, name: 'Coast down' }] : []),
                      ]}
                      layout={{ autosize: true, height: 240, uirevision: "bode-ph", legend: {}, margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: freqTitle, range: bodeXRange as any }, yaxis: { title: 'Phase (deg)', zeroline: false, showgrid: true, range: bodePhRange as any, autorange: false }, shapes: [
                        { type: 'line', x0: fnMark, x1: fnMark, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(220,38,38,0.7)', width: 2, dash: 'dot' } },
                        { type: 'line', x0: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), x1: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(16,185,129,0.95)', width: 2 } }
                      ], annotations: [
                        { x: fnMark, y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f_n', font: { size: 10, color: '#dc2626' } },
                        { x: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#10b981' } }
                      ] }}
                      config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 240 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Controls under plots */}
            <div className="mt-4 rounded border border-gray-200 p-3">
              <div className="grid gap-3">
                <div>
                  <div className="flex items-end justify-between">
                    <label className="block text-sm font-medium">Forcing frequency {freqUnits === 'Hz' ? '(Hz)' : '(f/f_n)'}</label>
                    <div className="text-xs text-gray-600">{freqUnits === 'Hz' ? sliderValue.toFixed(2) : sliderValue.toFixed(3)}</div>
                  </div>
                </div>
                <div ref={sliderWrapRef} style={{ paddingLeft: sliderPadLeft, paddingRight: sliderPadRight }}>
                  <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    step={sliderStep}
                    value={sliderValue}
                    onChange={e => {
                      const v = Number(e.target.value);
                      const targetHz = freqUnits === 'Hz' ? v : (fn > 0 ? v * fn : 0);
                      setFreqHz(targetHz);
                    }}
                    className="mt-1 w-full"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>{sliderMin.toFixed(0)}</span>
                    <span>{sliderMax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className={`px-3 py-1.5 text-sm rounded border ${running ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setRunning(v => !v)}>{running ? 'Pause' : 'Run'}</button>
                  <button className={`px-3 py-1.5 text-sm rounded border ${sweeping ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setSweeping(v => !v)}>{sweeping ? 'Stop sweep' : 'Start sweep'}</button>
                  <button className="px-3 py-1.5 text-sm rounded border bg-white text-gray-800 border-gray-300" onClick={() => { freeStartRef.current = performance.now(); freeAmpRef.current = 0.08; nudgeActiveRef.current = true; }}>Nudge mass</button>
                </div>
                {sweeping && (
                  <div>
                    <div className="flex items-end justify-between mt-2">
                      <label className="block text-sm font-medium">Sweep rate multiplier (×)</label>
                      <div className="text-xs text-gray-600">{sweepMult.toFixed(2)}×</div>
                    </div>
                    <input type="range" min={0.1} max={5} step={0.1} value={sweepMult} onChange={e => setSweepMult(Number(e.target.value))} className="mt-1 w-full" />
                    <div className="text-[11px] text-gray-500">Slow (0.1×) — Normal (1×) — Fast (5×). Baseline 0.2 Hz/s.</div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Animation (30%) */}
          <main className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex items-center justify-center lg:col-span-3 order-2">
            <div className="w-full max-w-xl">
              <div className="flex items-center justify-center">
                {/* Animation SVG refined to match schematic */}
                <div className="relative">
                  {(() => {
                    const topY = 24; // base nominal Y
                    const w = 260; const h = 380;
                    const xLeft = 80;  // damper column
                    const xRight = 170; // spring column
                    const link = "#0b61a4";

                    // Spring length based on current displacement
                    const springBaseLen = 180; // px nominal
                    const springLen = springBaseLen + xPx; // use current mass px displacement
                    const baseOffset = basePx; // base motion px
                    const attachY = topY + 10 + springLen; // joint level

                    // mass size and position
                    const massW = massSize.w; const massH = massSize.h;
                    const massX = (xLeft + xRight) / 2 - massW / 2;
                    const massY = attachY - massH / 2;

                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[320px]">
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

                        {/* Moving base */}
                        <g transform={`translate(0 ${baseOffset})`}>
                          <rect x="20" y="8" width="220" height="10" fill="#9ca3af" rx="2" />
                          <rect x="20" y="2" width="220" height="6" fill="url(#hatch)" opacity="0.55" />
                          {/* top left and right joints + bracket */}
                          <circle cx={xLeft} cy={topY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                          <circle cx={xRight} cy={topY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                          <path d={`M ${xRight} ${topY} L ${xRight + 10} ${topY} L ${xRight + 10} ${topY + 18}`} stroke={link} strokeWidth={6} fill="none" strokeLinecap="round" />
                        </g>

                        {/* Damper left column */}
                        <line x1={xLeft} y1={topY + baseOffset} x2={xLeft} y2={topY + 28} stroke={link} strokeWidth={6} strokeLinecap="round" />
                        {/* Cylinder and fluid */}
                        <rect x={xLeft - 14} y={topY + 28} width={28} height={90} rx={3} fill={link} opacity={0.2} stroke={link} strokeOpacity={0.35} />
                        <rect x={xLeft - 9} y={topY + 38} width={18} height={70} rx={2} fill={damperInnerColor} />
                        {/* Piston head and rod to attachY */}
                        <rect x={xLeft - 12} y={topY + 68} width={24} height={8} rx={1} fill={link} opacity={0.95} />
                        <line x1={xLeft} y1={topY + 72} x2={xLeft} y2={attachY} stroke={link} strokeWidth={6} strokeLinecap="round" />
                        <circle cx={xLeft} cy={attachY} r={5} fill="#fff" stroke={link} strokeWidth={2} />

                        {/* Spring column with zig-zag and elbow to mass */}
                        <g transform={`translate(10 ${18 + baseOffset})`}>
                          {(() => {
                            const x0 = xRight; const y0 = topY; const y1 = attachY - (18 + baseOffset) - 16;
                            const coils = 6; const seg = Math.max(10, y1 / coils); const R = 12;
                            let d = `M ${x0} ${y0}`;
                            for (let i = 0; i < coils; i++) {
                              const yy1 = y0 + seg * (i + 0.5); const yy2 = y0 + seg * (i + 1); const dir = i % 2 === 0 ? 1 : -1;
                              d += ` L ${x0 + dir * R} ${yy1} L ${x0} ${yy2}`;
                            }
                            return <path d={d} stroke="url(#springGrad)" strokeWidth={springStroke} fill="none" strokeLinecap="round" style={{ vectorEffect: 'non-scaling-stroke' as const }} />;
                          })()}
                        </g>
                        <path d={`M ${xRight + 10} ${attachY - 16} L ${xRight + 10} ${attachY} L ${xRight - 18} ${attachY}`} stroke={link} strokeWidth={6} fill="none" strokeLinecap="round" />
                        <circle cx={xRight - 18} cy={attachY} r={5} fill="#fff" stroke={link} strokeWidth={2} />

                        {/* Short links into mass */}
                        <line x1={xLeft} y1={attachY} x2={massX} y2={attachY} stroke={link} strokeWidth={6} strokeLinecap="round" />
                        <line x1={xRight - 18} y1={attachY} x2={massX + massW} y2={attachY} stroke={link} strokeWidth={6} strokeLinecap="round" />

                        {/* Mass block */}
                        <rect x={massX} y={massY} width={massW} height={massH} rx={6} fill="url(#massGrad)" stroke="#0f172a" strokeOpacity={0.25} />
                        {/* Mass top-corner joints */}
                        <circle cx={massX} cy={attachY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                        <circle cx={massX + massW} cy={attachY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                      </svg>
                    );
                  })()}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
