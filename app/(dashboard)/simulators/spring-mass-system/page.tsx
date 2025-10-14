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
// Base excitation transfer from base displacement y to absolute mass displacement x
function baseResponse(k: number, m: number, zeta: number, omega: number, Y = 1) {
  const { wn } = naturalFreq(k, m);
  const r = wn > 0 ? omega / wn : 0;
  // H(ω) = X/Y = (1 + i 2ζr) / (1 - r^2 + i 2ζr)
  const numRe = 1;
  const numIm = 2 * zeta * r;
  const denRe = 1 - r * r;
  const denIm = 2 * zeta * r;
  const denMag2 = denRe * denRe + denIm * denIm;
  const Hre = (numRe * denRe + numIm * denIm) / Math.max(denMag2, 1e-12);
  const Him = (numIm * denRe - numRe * denIm) / Math.max(denMag2, 1e-12);
  const H = Math.hypot(Hre, Him);
  const phi = Math.atan2(Him, Hre); // phase of X relative to base Y
  const X = H * Y;
  return { X, phi, r, H };
}

function baseRelativeResponse(k: number, m: number, zeta: number, omega: number, Y = 1) {
  const { wn } = naturalFreq(k, m);
  const r = wn > 0 ? omega / wn : 0;
  // H_rel(ω) = (X - Y)/Y = r^2 / (1 - r^2 + i 2ζr)
  const denRe = 1 - r * r;
  const denIm = 2 * zeta * r;
  const denMag = Math.hypot(denRe, denIm);
  const H = (r * r) / Math.max(denMag, 1e-12);
  const phi = -Math.atan2(denIm, denRe); // phase of (X-Y) relative to Y
  const Xrel = H * Y;
  return { Xrel, phi, r, H };
}

// Phase (deg) helper for consistent plotting across modes
function phaseDeg(k: number, m: number, zeta: number, omega: number) {
  // Always use relative phase so that the lag across resonance is 180° and
  // stays asymptotically at 180° for an ideal single-DOF base-excited system.
  const { wn } = naturalFreq(k, m);
  const r = wn > 0 ? omega / wn : 0;
  let deg = Math.atan2(2 * zeta * r, 1 - r * r) * 180 / Math.PI;
  if (!isFinite(deg)) deg = 0;
  return Math.max(0, Math.min(200, deg));
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
  // System configuration: SDOF or 2-DOF
  const [systemDOF, setSystemDOF] = useState<'1DOF' | '2DOF'>('1DOF');
  
  const c = useMemo(() => 2 * zeta * Math.sqrt(Math.max(k, 0) * Math.max(m, 0)), [zeta, k, m]);
  const { wn, fn } = useMemo(() => naturalFreq(k, m), [k, m]);
  
  // 2-DOF additional parameters
  const [m2, setM2] = useState(0.8);   // kg (mass 2)
  const [k2, setK2] = useState(150);   // N/m (spring 2, mass 1 to mass 2)
  const [zeta2, setZeta2] = useState(0.1); // damping ratio for mass 2

  // Forcing frequency (Hz) applied to base
  const [freqHz, setFreqHz] = useState<number>(0);
  const omega = 2 * Math.PI * freqHz;
  // Amplitude mode: absolute (|X|/|Y|) or relative (|X - Y|/|Y|)
  const [ampMode, setAmpMode] = useState<'relative' | 'absolute'>('absolute');
  // Units: Hz or f/fn
  const [freqUnits, setFreqUnits] = useState<'Hz' | 'ratio'>('Hz');
  // Base amplitude of the base excitation (meters). Default keeps previous behavior (6 px at 250 px/m)
  const [baseAmp, setBaseAmp] = useState<number>(6 / 250);
  const baseAmpMax = 0.4; // up to 0.4 m for a visibly larger effect
  const knobRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const angleRange = { min: -135, max: 135 } as const;
  const angleFromBaseAmp = (v: number) => angleRange.min + (Math.max(0, Math.min(baseAmpMax, v)) / baseAmpMax) * (angleRange.max - angleRange.min);
  const baseAmpFromAngle = (deg: number) => {
    const t = (deg - angleRange.min) / (angleRange.max - angleRange.min);
    return Math.max(0, Math.min(1, t)) * baseAmpMax;
  };
  const updateBaseAmpFromEvent = (ev: any) => {
    try {
      const el = knobRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
      const clientX = ev?.clientX ?? ev?.touches?.[0]?.clientX ?? 0;
      const clientY = ev?.clientY ?? ev?.touches?.[0]?.clientY ?? 0;
      const dx = clientX - cx; const dy = clientY - cy;
      let deg = Math.atan2(dy, dx) * 180 / Math.PI;
      deg = Math.max(angleRange.min, Math.min(angleRange.max, deg));
      setBaseAmp(baseAmpFromAngle(deg));
    } catch {}
  };
    
  // Run/Pause & sweep
  const [running, setRunning] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepMult, setSweepMult] = useState(1); // 0.1..2 (x normal)
  const normalSweepRate = 0.2; // Hz/s baseline (slow). 0.1x => 0.02 Hz/s, 2x => 0.4 Hz/s
  const sweepDir = useRef<1 | -1>(1);
  const nextSweepDirRef = useRef<1 | -1>(1);

  // Real-time waveform buffer (meters) with optional x2 for 2-DOF
  const rtRef = useRef<{ t: number[]; x: number[]; x2: number[]; yb: number[] }>({ t: [], x: [], x2: [], yb: [] });
  const [rtState, setRtState] = useState<{ t: number[]; x: number[]; x2: number[]; yb: number[] }>({ t: [], x: [], x2: [], yb: [] });
  const rtStart = useRef<number | null>(null);
  const lastUiPush = useRef<number>(0);

  // Free-vibration transient (nudge)
  const freeStartRef = useRef<number | null>(null);
  const freeAmpRef = useRef<number>(0);
  const nudgeActiveRef = useRef<boolean>(false);
  // 2-DOF state for numerical integration and optional second free amp
  const state2DOFRef = useRef<{ x1: number; v1: number; x2: number; v2: number }>({ x1: 0, v1: 0, x2: 0, v2: 0 });
  const freeAmp2Ref = useRef<number>(0);

  // Derived response at current freq
  const { X, phi } = useMemo(() => baseResponse(k, m, zeta, omega, 1), [k, m, zeta, omega]);

  // Bode precomputed curve (amp & phase)
  const bode = useMemo(() => {
    const fmax = (freqUnits === 'Hz') ? 25 : Math.max(1, fn * 3);
    const N = 600; const f: number[] = new Array(N); const amp: number[] = new Array(N); const ph: number[] = new Array(N);
    
    if (systemDOF === '2DOF') {
      // Compute 2-DOF frequency response; use the dominant mass's phase.
      const unwrapped: number[] = new Array(N);
      let lastPhase = 0;
      let offset = 0;

      for (let i = 0; i < N; i++) {
        const fi = (i / (N - 1)) * fmax;
        const w = 2 * Math.PI * fi;
        const c1 = 2 * zeta * Math.sqrt(Math.max(k, 0) * Math.max(m, 0));
        const c2n = 2 * zeta2 * Math.sqrt(Math.max(k2, 0) * Math.max(m2, 0));

        // Complex coefficients for 2-DOF system
        const a11 = { re: -w * w * m + k + k2, im: w * (c1 + c2n) };
        const a12 = { re: -k2, im: -w * c2n };
        const a21 = { re: -k2, im: -w * c2n };
        const a22 = { re: -w * w * m2 + k2, im: w * c2n };
        const b1 = { re: k, im: w * c1 };

        const det = {
          re: a11.re * a22.re - a11.im * a22.im - (a12.re * a21.re - a12.im * a21.im),
          im: a11.re * a22.im + a11.im * a22.re - (a12.re * a21.im + a12.im * a21.re),
        };

        const num1 = {
          re: b1.re * a22.re - b1.im * a22.im,
          im: b1.re * a22.im + b1.im * a22.re,
        };

        const detMag2 = det.re * det.re + det.im * det.im || 1e-18;
        const x1re = (num1.re * det.re + num1.im * det.im) / detMag2;
        const x1im = (num1.im * det.re - num1.re * det.im) / detMag2;

        const nb = {
          re: a21.re * b1.re - a21.im * b1.im,
          im: a21.re * b1.im + a21.im * b1.re,
        };
        const num2 = { re: -nb.re, im: -nb.im };
        const x2re = (num2.re * det.re + num2.im * det.im) / detMag2;
        const x2im = (num2.im * det.re - num2.re * det.im) / detMag2;

        const H1 = Math.hypot(x1re, x1im);
        const H2 = Math.hypot(x2re, x2im);

        // phase of the dominant mass relative to base input
        const p1 = Math.atan2(x1im, x1re) * 180 / Math.PI;
        const p2 = Math.atan2(x2im, x2re) * 180 / Math.PI;
        const rawPhase = (H1 >= H2 ? p1 : p2);

        if (i === 0) {
          lastPhase = rawPhase;
          unwrapped[i] = rawPhase;
        } else {
          const diff = rawPhase - lastPhase;
          if (diff < -180) {
            offset += 360;
          } else if (diff > 180) {
            offset -= 360;
          }
          unwrapped[i] = rawPhase + offset;
          lastPhase = rawPhase;
        }

        f[i] = fi;
        amp[i] = Math.max(H1, H2);
      }

      const phi0 = unwrapped[0] || 0;
      for (let i = 0; i < N; i++) {
        const d = Math.abs((unwrapped[i] || 0) - phi0);
        ph[i] = Math.max(0, Math.min(180, d));
      }
    } else {
      // Use 1-DOF response for Bode plot
      for (let i = 0; i < N; i++) {
        const fi = (i / (N - 1)) * fmax; const om = 2 * Math.PI * fi;
        const br = (ampMode === 'relative') ? baseRelativeResponse(k, m, zeta, om, 1) : baseResponse(k, m, zeta, om, 1);
        const phd = phaseDeg(k, m, zeta, om);
        f[i] = fi; amp[i] = br.H; ph[i] = phd;
      }
    }
    
    return { f, amp, ph };
  }, [systemDOF, k, m, zeta, k2, m2, zeta2, fn, ampMode, freqUnits]);
  // Fixed Y ranges for Bode plots (disable autoscale)
  const bodeAmpMax = useMemo(() => (bode.amp && bode.amp.length ? bode.amp.reduce((a, b) => (b > a ? b : a), 0) : 1), [bode]);
  const bodePhRange = useMemo(() => [0, 180] as [number, number], []);

  // Sweep capture - Single trace mode (default) vs Multi-trace mode
  const [singleTraceMode, setSingleTraceMode] = useState(true);
  const allPts = useRef<{ f: number; amp: number; ph: number }[]>([]);
  const multiTraces = useRef<{ f: number; amp: number; ph: number }[][]>([]);
  const currentTraceIdx = useRef<number>(0);
  const lastCapture = useRef<number>(0);
  const prevFreqRef = useRef<number>(freqHz);
  const lastManualCaptureRef = useRef<number>(0);
  const lastSweepDir = useRef<1 | -1>(1);
  // Live parameter refs to avoid restarting the animation loop on updates
  const freqHzRef = useRef<number>(freqHz);
  useEffect(() => { freqHzRef.current = freqHz; }, [freqHz]);
  const baseAmpRef = useRef<number>(baseAmp);
  useEffect(() => { baseAmpRef.current = baseAmp; }, [baseAmp]);
  const sweepingRef = useRef<boolean>(sweeping);
  useEffect(() => { sweepingRef.current = sweeping; }, [sweeping]);
  const sweepMultRef = useRef<number>(sweepMult);
  useEffect(() => { sweepMultRef.current = sweepMult; }, [sweepMult]);
  const freqUnitsRef = useRef<'Hz' | 'ratio'>(freqUnits);
  useEffect(() => { freqUnitsRef.current = freqUnits; }, [freqUnits]);
  const kRef = useRef<number>(k);
  useEffect(() => { kRef.current = k; }, [k]);
  const mRef = useRef<number>(m);
  useEffect(() => { mRef.current = m; }, [m]);
  const zetaRef = useRef<number>(zeta);
  useEffect(() => { zetaRef.current = zeta; }, [zeta]);
  const fnRef = useRef<number>(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);
  const ampModeRef = useRef<'relative' | 'absolute'>(ampMode);
  useEffect(() => { ampModeRef.current = ampMode; }, [ampMode]);
  // Config refs for 2-DOF control
  const systemDOFRef = useRef<'1DOF' | '2DOF'>(systemDOF);
  useEffect(() => { systemDOFRef.current = systemDOF; }, [systemDOF]);
  const m2Ref = useRef<number>(m2);
  useEffect(() => { m2Ref.current = m2; }, [m2]);
  const k2Ref = useRef<number>(k2);
  useEffect(() => { k2Ref.current = k2; }, [k2]);
  const zeta2Ref = useRef<number>(zeta2);
  useEffect(() => { zeta2Ref.current = zeta2; }, [zeta2]);
  // Persistent base phase accumulator for clean sine generation
  const basePhaseRef = useRef<number>(0);

  // Reset sweep traces when amplitude mode changes to avoid mixing modes
  useEffect(() => {
    allPts.current = [];
    multiTraces.current = [];
    currentTraceIdx.current = 0;
    setSweepVersion(v => v + 1);
  }, [ampMode]);

  // Animation + real-time generation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) return;
    let raf: number | null = null; let t0: number | null = null; let last: number | null = null;
    const pxPerMeter = 250; // pixels per meter (for visualization only)

    const loop = (ts: number) => {
      if (t0 === null) t0 = ts; if (last === null) last = ts; let dt = (ts - last) / 1000; last = ts;
      // Clamp dt to avoid integrator blow-ups on tab inactivity/frame hiccups
      if (!isFinite(dt) || dt <= 0) dt = 0.016;
      dt = Math.min(dt, 0.03);
      const tsec = (ts - (t0 ?? ts)) / 1000;
      
      // Sweep frequency
      if (sweepingRef.current) {
        const actualRate = normalSweepRate * clamp(sweepMultRef.current, 0.1, 5);
        let fNew = freqHzRef.current + sweepDir.current * actualRate * dt;
        const fMin = 0; 
        const fMax = freqUnitsRef.current === 'Hz' ? 25 : (fnRef.current > 0 ? fnRef.current * 3 : 25);
        const prevDir = sweepDir.current;
        // One-way sweep: stop at bound and arm the next sweep direction
        if (sweepDir.current === 1 && fNew >= fMax) {
          fNew = fMax;
          setFreqHz(fNew);
          setSweeping(false);
          nextSweepDirRef.current = -1;
        } else if (sweepDir.current === -1 && fNew <= fMin) {
          fNew = fMin;
          setFreqHz(fNew);
          setSweeping(false);
          nextSweepDirRef.current = 1;
        }
        
        // Detect direction change
        if (prevDir !== sweepDir.current) {
          lastSweepDir.current = sweepDir.current;
          if (!singleTraceMode) {
            // Start a new trace in multi-trace mode
            currentTraceIdx.current++;
            if (!multiTraces.current[currentTraceIdx.current]) {
              multiTraces.current[currentTraceIdx.current] = [];
            }
          }
        }
        
        setFreqHz(fNew); // keep slider enabled and responsive during sweep
        // capture sweep traces
        if (ts - lastCapture.current > 40) {
          lastCapture.current = ts;
          const wNew = 2 * Math.PI * fNew;
          let ampVal = 0;
          let phaseDisplay = 0;
          if (systemDOFRef.current === '2DOF') {
            const c1 = 2 * zetaRef.current * Math.sqrt(Math.max(kRef.current, 0) * Math.max(mRef.current, 0));
            const c2n = 2 * zeta2Ref.current * Math.sqrt(Math.max(k2Ref.current, 0) * Math.max(m2Ref.current, 0));
            const a11 = { re: -wNew * wNew * mRef.current + kRef.current + k2Ref.current, im: wNew * (c1 + c2n) };
            const a12 = { re: -k2Ref.current, im: -wNew * c2n };
            const a21 = { re: -k2Ref.current, im: -wNew * c2n };
            const a22 = { re: -wNew * wNew * m2Ref.current + k2Ref.current, im: wNew * c2n };
            const b1 = { re: kRef.current, im: wNew * c1 };
            const det = {
              re: a11.re * a22.re - a11.im * a22.im - (a12.re * a21.re - a12.im * a21.im),
              im: a11.re * a22.im + a11.im * a22.re - (a12.re * a21.im + a12.im * a21.re),
            };
            const num1 = {
              re: b1.re * a22.re - b1.im * a22.im,
              im: b1.re * a22.im + b1.im * a22.re,
            };
            const detMag2 = det.re * det.re + det.im * det.im || 1e-18;
            const x1re = (num1.re * det.re + num1.im * det.im) / detMag2;
            const x1im = (num1.im * det.re - num1.re * det.im) / detMag2;
            const nb = {
              re: a21.re * b1.re - a21.im * b1.im,
              im: a21.re * b1.im + a21.im * b1.re,
            };
            const num2 = { re: -nb.re, im: -nb.im };
            const x2re = (num2.re * det.re + num2.im * det.im) / detMag2;
            const x2im = (num2.im * det.re - num2.re * det.im) / detMag2;
            const H1 = Math.hypot(x1re, x1im);
            const H2 = Math.hypot(x2re, x2im);
            ampVal = Math.max(H1, H2);
            const p1 = Math.atan2(x1im, x1re) * 180 / Math.PI;
            const p2 = Math.atan2(x2im, x2re) * 180 / Math.PI;
            let p = (H1 >= H2 ? p1 : p2);
            if (p <= -180) p += 360;
            if (p > 180) p -= 360;
            phaseDisplay = Math.abs(p);
          } else {
            const br = (ampModeRef.current === 'relative') ? baseRelativeResponse(kRef.current, mRef.current, zetaRef.current, wNew, 1) : baseResponse(kRef.current, mRef.current, zetaRef.current, wNew, 1);
            ampVal = br.H;
            phaseDisplay = phaseDeg(kRef.current, mRef.current, zetaRef.current, wNew);
          }
          const point = { f: fNew, amp: ampVal, ph: phaseDisplay };
          
          if (singleTraceMode) {
            // Single trace: add break point (NaN) when direction changes
            if (prevDir !== sweepDir.current && allPts.current.length > 0) {
              allPts.current.push({ f: NaN, amp: NaN, ph: NaN });
            }
            allPts.current.push(point);
            if (allPts.current.length > 5000) allPts.current.shift();
          } else {
            // Multi-trace mode: separate traces for each run
            if (!multiTraces.current[currentTraceIdx.current]) {
              multiTraces.current[currentTraceIdx.current] = [];
            }
            multiTraces.current[currentTraceIdx.current].push(point);
            if (multiTraces.current[currentTraceIdx.current].length > 2500) {
              multiTraces.current[currentTraceIdx.current].shift();
            }
          }
        }
      }

      // Recompute response with updated omega
      const fNow = freqHzRef.current;
      const w = 2 * Math.PI * fNow;
      const Yamp = baseAmpRef.current; // meters
      const yb = Yamp * Math.sin(w * tsec);
      const ydot = Yamp * w * Math.cos(w * tsec);

      let x2Val = NaN;
      let xTotal = 0;

      if (systemDOFRef.current === '2DOF') {
        // 2-DOF numerical integration (base – k1,c1 – m1 – k2,c2 – m2)
        const c1 = 2 * zetaRef.current * Math.sqrt(Math.max(kRef.current, 0) * Math.max(mRef.current, 0));
        const c2now = 2 * zeta2Ref.current * Math.sqrt(Math.max(k2Ref.current, 0) * Math.max(m2Ref.current, 0));
        const s = state2DOFRef.current;
        let { x1, v1, x2, v2 } = s;

        // Use dynamic smaller sub-steps for stability (target sub-step <= 4 ms)
        const maxSubDt = 0.004;
        const numSubSteps = Math.max(1, Math.ceil(dt / maxSubDt));
        const subDt = dt / numSubSteps;
        
        for (let step = 0; step < numSubSteps; step++) {
          // Interpolate base motion for this sub-step
          const tSub = tsec + step * subDt;
          const ybSub = Yamp * Math.sin(w * tSub);
          const ydotSub = Yamp * w * Math.cos(w * tSub);

          // Equations of motion with base excitation yb(t)
          // m1*x1dd + c1*(v1 - ydot) + k1*(x1 - yb) + c2*(v1 - v2) + k2*(x1 - x2) = 0
          // m2*x2dd + c2*(v2 - v1) + k2*(x2 - x1) = 0
          const a1 = (
            - c1 * (v1 - ydotSub)
            - kRef.current * (x1 - ybSub)
            - c2now * (v1 - v2)
            - k2Ref.current * (x1 - x2)
          ) / Math.max(mRef.current, 1e-9);
          const a2 = (
            - c2now * (v2 - v1)
            - k2Ref.current * (x2 - x1)
          ) / Math.max(m2Ref.current, 1e-9);

          // Semi-implicit Euler integration with sub-stepping
          v1 += a1 * subDt;
          v2 += a2 * subDt;
          x1 += v1 * subDt;
          x2 += v2 * subDt;
          
          // Apply damping to prevent numerical instability
          const dampingFactor = Math.exp(-0.01 * subDt);
          v1 *= dampingFactor;
          v2 *= dampingFactor;
        }

        // Save back
        s.x1 = x1; s.v1 = v1; s.x2 = x2; s.v2 = v2;
        // Guard against numerical blow-up; reset state if it goes non-finite or huge
        if (!isFinite(s.x1) || !isFinite(s.v1) || !isFinite(s.x2) || !isFinite(s.v2)
            || Math.abs(s.x1) > 1e6 || Math.abs(s.v1) > 1e6 || Math.abs(s.x2) > 1e6 || Math.abs(s.v2) > 1e6) {
          s.x1 = 0; s.v1 = 0; s.x2 = 0; s.v2 = 0;
        }

        xTotal = x1;
        x2Val = x2;
      } else {
        // 1-DOF analytic steady-state + free response superposition
        const br = baseResponse(kRef.current, mRef.current, zetaRef.current, w, Yamp);
        const xForced = br.X * Math.sin(w * tsec + br.phi);

        // Free-vibration transient component x_free(t)
        let xFree = 0;
        if (freeStartRef.current !== null) {
          const td = (ts - freeStartRef.current) / 1000;
          const { wn } = naturalFreq(kRef.current, mRef.current);
          const A0 = freeAmpRef.current; // meters
          const zf = zetaRef.current < 1 ? Math.min(zetaRef.current * 0.6, 0.98) : zetaRef.current;
          if (zetaRef.current < 1) {
            const wd = wn * Math.sqrt(1 - zf * zf);
            const beta = zf / Math.max(Math.sqrt(1 - zf * zf), 1e-9);
            xFree = A0 * Math.exp(-zf * wn * td) * (Math.cos(wd * td) + beta * Math.sin(wd * td));
          } else if (Math.abs(zetaRef.current - 1) < 1e-3) {
            xFree = A0 * td * Math.exp(-wn * td);
          } else {
            const s = Math.sqrt(zetaRef.current * zetaRef.current - 1);
            const term1 = Math.exp(-wn * (zetaRef.current - s) * td);
            const term2 = Math.exp(-wn * (zetaRef.current + s) * td);
            xFree = (A0 / (2 * s)) * (term1 - term2);
          }
          // Envelope cutoff
          let envelope = 0;
          if (zetaRef.current < 1) {
            envelope = Math.abs(A0) * Math.exp(-zf * wn * td);
          } else if (Math.abs(zetaRef.current - 1) < 1e-3) {
            envelope = Math.abs(A0) * Math.abs(td) * Math.exp(-wn * td);
          } else {
            const s = Math.sqrt(zetaRef.current * zetaRef.current - 1);
            const e1 = Math.exp(-wn * (zetaRef.current - s) * td);
            const e2 = Math.exp(-wn * (zetaRef.current + s) * td);
            envelope = Math.abs(A0) * Math.max(e1, e2) / (2 * s);
          }
          if (envelope < Math.max(1e-7, Math.abs(A0) * 1e-5) || td > 60) {
            freeStartRef.current = null; freeAmpRef.current = 0; nudgeActiveRef.current = false;
          }
        }
        xTotal = xForced + xFree;
      }

      // Push to real-time buffer
      const buf = rtRef.current;
      // Clamp outputs before pushing to buffers
      if (!isFinite(xTotal) || Math.abs(xTotal) > 1e6) xTotal = 0;
      if (!isFinite(x2Val) || Math.abs(x2Val) > 1e6) x2Val = 0;
      buf.t.push(tsec);
      buf.x.push(xTotal);
      buf.x2.push(x2Val);
      buf.yb.push(yb);
      // keep last 12 seconds
      while (buf.t.length > 0 && tsec - buf.t[0] > 12) { buf.t.shift(); buf.x.shift(); buf.x2.shift(); buf.yb.shift(); }

      // Throttle state updates for plots (~16fps)
      if (ts - lastUiPush.current > 60) {
        lastUiPush.current = ts;
        setRtState({ t: [...buf.t], x: [...buf.x], x2: [...buf.x2], yb: [...buf.yb] });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [running]);

  // Capture coast-up/down traces even when sweep is off and user changes frequency
  useEffect(() => {
    const now = performance.now();
    if (!sweeping) {
      const prev = prevFreqRef.current;
      if (freqHz !== prev && now - lastManualCaptureRef.current > 40) {
        lastManualCaptureRef.current = now;
        const wNow = 2 * Math.PI * freqHz;
        let ampVal = 0;
        let phaseDisplay = 0;
        if (systemDOF === '2DOF') {
          const c1 = 2 * zeta * Math.sqrt(Math.max(k, 0) * Math.max(m, 0));
          const c2n = 2 * zeta2 * Math.sqrt(Math.max(k2, 0) * Math.max(m2, 0));
          const a11 = { re: -wNow * wNow * m + k + k2, im: wNow * (c1 + c2n) };
          const a12 = { re: -k2, im: -wNow * c2n };
          const a21 = { re: -k2, im: -wNow * c2n };
          const a22 = { re: -wNow * wNow * m2 + k2, im: wNow * c2n };
          const b1 = { re: k, im: wNow * c1 };
          const det = {
            re: a11.re * a22.re - a11.im * a22.im - (a12.re * a21.re - a12.im * a21.im),
            im: a11.re * a22.im + a11.im * a22.re - (a12.re * a21.im + a12.im * a21.re),
          };
          const num1 = {
            re: b1.re * a22.re - b1.im * a22.im,
            im: b1.re * a22.im + b1.im * a22.re,
          };
          const detMag2 = det.re * det.re + det.im * det.im || 1e-18;
          const x1re = (num1.re * det.re + num1.im * det.im) / detMag2;
          const x1im = (num1.im * det.re - num1.re * det.im) / detMag2;
          const nb = {
            re: a21.re * b1.re - a21.im * b1.im,
            im: a21.re * b1.im + a21.im * b1.re,
          };
          const num2 = { re: -nb.re, im: -nb.im };
          const x2re = (num2.re * det.re + num2.im * det.im) / detMag2;
          const x2im = (num2.im * det.re - num2.re * det.im) / detMag2;
          const H1 = Math.hypot(x1re, x1im);
          const H2 = Math.hypot(x2re, x2im);
          ampVal = Math.max(H1, H2);
          const p1 = Math.atan2(x1im, x1re) * 180 / Math.PI;
          const p2 = Math.atan2(x2im, x2re) * 180 / Math.PI;
          let p = (H1 >= H2 ? p1 : p2);
          if (p <= -180) p += 360;
          if (p > 180) p -= 360;
          phaseDisplay = Math.abs(p);
        } else {
          const br = (ampMode === 'relative') ? baseRelativeResponse(k, m, zeta, wNow, 1) : baseResponse(k, m, zeta, wNow, 1);
          ampVal = br.H;
          phaseDisplay = phaseDeg(k, m, zeta, wNow);
        }
        const point = { f: freqHz, amp: ampVal, ph: phaseDisplay };
        
        // Detect direction change in manual mode
        const currentDir: 1 | -1 = freqHz > prev ? 1 : -1;
        const dirChanged = lastSweepDir.current !== currentDir;
        
        if (dirChanged) {
          lastSweepDir.current = currentDir;
          if (!singleTraceMode) {
            // Start a new trace in multi-trace mode
            currentTraceIdx.current++;
            if (!multiTraces.current[currentTraceIdx.current]) {
              multiTraces.current[currentTraceIdx.current] = [];
            }
          }
        }
        
        if (singleTraceMode) {
          // Single trace: add break point when direction changes
          if (dirChanged && allPts.current.length > 0) {
            allPts.current.push({ f: NaN, amp: NaN, ph: NaN });
          }
          allPts.current.push(point);
          if (allPts.current.length > 5000) allPts.current.shift();
        } else {
          // Multi-trace mode
          if (!multiTraces.current[currentTraceIdx.current]) {
            multiTraces.current[currentTraceIdx.current] = [];
          }
          multiTraces.current[currentTraceIdx.current].push(point);
          if (multiTraces.current[currentTraceIdx.current].length > 2500) {
            multiTraces.current[currentTraceIdx.current].shift();
          }
        }
      }
    }
    prevFreqRef.current = freqHz;
  }, [freqHz, sweeping, k, m, zeta, singleTraceMode, ampMode]);

  // Visual mappings
  const springStroke = useMemo(() => {
    // map k in [10..2000] -> stroke in [5..14]
    const t = clamp((k - 10) / (2000 - 10), 0, 1);
    return lerp(5, 14, t);
  }, [k]);
  const springStroke2 = useMemo(() => {
    const t = clamp((k2 - 10) / (2000 - 10), 0, 1);
    return lerp(5, 14, t);
  }, [k2]);
  const massSize = useMemo(() => {
    // base 90x70 scaled smoothly with m
    const t = clamp((Math.log(m) - Math.log(0.1)) / (Math.log(10) - Math.log(0.1)), 0, 1);
    const s = lerp(0.65, 1.45, t);
    return { w: 90 * s, h: 70 * s };
  }, [m]);
  const mass2Size = useMemo(() => {
    const t = clamp((Math.log(m2) - Math.log(0.1)) / (Math.log(10) - Math.log(0.1)), 0, 1);
    const s = lerp(0.65, 1.45, t);
    return { w: 90 * s, h: 70 * s };
  }, [m2]);
  const damperInnerColor = useMemo(() => {
    // darker with higher zeta (0..1.1)
    const norm = clamp(zeta / 1.1, 0, 1);
    const lightness = lerp(78, 35, norm);
    return `hsl(210 80% ${lightness}%)`;
  }, [zeta]);
  const damperInnerColor2 = useMemo(() => {
    const norm = clamp(zeta2 / 1.1, 0, 1);
    const lightness = lerp(78, 35, norm);
    return `hsl(210 80% ${lightness}%)`;
  }, [zeta2]);

  // Tabs and units
  const [activeTab, setActiveTab] = useState<'fft' | 'time' | 'bode'>('fft');
    const [sweepVersion, setSweepVersion] = useState(0); // force re-render on clear
    const [showCombinedTime, setShowCombinedTime] = useState(true);

  // Shared Bode x-axis range and revision for syncing amp/phase plots
  const [bodeXRangeState, setBodeXRangeState] = useState<[number, number]>([0, 25]);
  const [bodeRevision, setBodeRevision] = useState<number>(0);
  useEffect(() => {
    // Reset to defaults on units toggle
    setBodeXRangeState(freqUnits === 'Hz' ? [0, 25] : [0, 3]);
    setBodeRevision(r => r + 1);
  }, [freqUnits]);

  const applyBodeRange = (x0: number, x1: number) => {
    if (!isFinite(x0) || !isFinite(x1)) return;
    const [cx0, cx1] = bodeXRangeState;
    if (Math.abs(x0 - cx0) < 1e-6 && Math.abs(x1 - cx1) < 1e-6) return;
    setBodeXRangeState([x0, x1]);
    setBodeRevision(r => r + 1);
  };
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
        ...(rtState.x2.length ? rtState.x2.map(v => Math.abs(v)) : [0]),
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
  // Bode x-axis range is controlled by synchronized state bodeXRangeState
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
  const activePlotDivRef = useRef<HTMLDivElement | null>(null);
  const sliderWrapRef = useRef<HTMLDivElement | null>(null);
  const updateSliderPads = (graphDiv?: HTMLDivElement) => {
    try {
      const gd = graphDiv ?? activePlotDivRef.current;
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
  // Re-align slider pads when switching tabs (after plot renders)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(activePlotDivRef.current || undefined)));
  }, [activeTab]);

  // Model-based spectrum (amplitude vs frequency), with color gradient and damping-dependent peak width
  const spectrumModel = useMemo(() => {
    const fmax = freqUnits === 'Hz' ? 25 : Math.max(1, fn * 3);
    const N = 600;
    const f: number[] = new Array(N);
    const y1: number[] = new Array(N);
    const y2: number[] = new Array(N);
    let yMax = 0;
    for (let i = 0; i < N; i++) {
      const fi = (i / (N - 1)) * fmax;
      const w = 2 * Math.PI * fi;
      if (systemDOF === '2DOF') {
        const c1 = 2 * zeta * Math.sqrt(Math.max(k, 0) * Math.max(m, 0));
        const c2n = 2 * zeta2 * Math.sqrt(Math.max(k2, 0) * Math.max(m2, 0));
        // Complex coefficients
        const a11 = { re: -w * w * m + k + k2, im: w * (c1 + c2n) };
        const a12 = { re: -k2, im: -w * c2n };
        const a21 = { re: -k2, im: -w * c2n };
        const a22 = { re: -w * w * m2 + k2, im: w * c2n };
        const b1 = { re: k, im: w * c1 };
        const b2 = { re: 0, im: 0 };
        // det = a11*a22 - a12*a21
        const det = {
          re: a11.re * a22.re - a11.im * a22.im - (a12.re * a21.re - a12.im * a21.im),
          im: a11.re * a22.im + a11.im * a22.re - (a12.re * a21.im + a12.im * a21.re),
        };
        // num1 = b1*a22 - a12*b2 = b1*a22
        const num1 = {
          re: b1.re * a22.re - b1.im * a22.im,
          im: b1.re * a22.im + b1.im * a22.re,
        };
        // num2 = -a21*b1
        const nb = {
          re: a21.re * b1.re - a21.im * b1.im,
          im: a21.re * b1.im + a21.im * b1.re,
        };
        const num2 = { re: -nb.re, im: -nb.im };
        const detMag2 = det.re * det.re + det.im * det.im || 1e-18;
        const x1re = (num1.re * det.re + num1.im * det.im) / detMag2;
        const x1im = (num1.im * det.re - num1.re * det.im) / detMag2;
        const x2re = (num2.re * det.re + num2.im * det.im) / detMag2;
        const x2im = (num2.im * det.re - num2.re * det.im) / detMag2;
        const H1 = Math.hypot(x1re, x1im);
        const H2 = Math.hypot(x2re, x2im);
        f[i] = fi; y1[i] = H1; y2[i] = H2;
        if (H1 > yMax) yMax = H1;
        if (H2 > yMax) yMax = H2;
      } else {
        const br = baseResponse(k, m, zeta, w, 1);
        f[i] = fi; y1[i] = br.H;
        if (y1[i] > yMax) yMax = y1[i];
      }
    }
    return { f, y: y1, y2, yMax };
  }, [systemDOF, k, m, zeta, k2, m2, zeta2, fn, freqUnits]);

  const specYMax = useMemo(() => (spectrumModel.yMax ? spectrumModel.yMax * 1.1 : 1), [spectrumModel]);

  const spectrumTraces = useMemo(() => {
    const traces: any[] = [];
    if (systemDOF === '2DOF') {
      // Combined trace (max of both masses at each frequency)
      const combined = spectrumModel.f.map((_, i) => Math.max(spectrumModel.y[i], spectrumModel.y2[i]));
      traces.push({
        x: mapFreq(spectrumModel.f),
        y: combined,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(16,185,129,1)', width: 2.5 },
        name: 'Combined (max)',
      } as any);
      traces.push({
        x: mapFreq(spectrumModel.f),
        y: spectrumModel.y,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(2,132,199,1)', width: 2 },
        name: 'Mass 1 |X1|/|Y|',
        visible: 'legendonly',
      } as any);
      traces.push({
        x: mapFreq(spectrumModel.f),
        y: spectrumModel.y2,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(99,102,241,1)', width: 2 },
        name: 'Mass 2 |X2|/|Y|',
        visible: 'legendonly',
      } as any);
    } else {
      traces.push({
        x: mapFreq(spectrumModel.f),
        y: spectrumModel.y,
        type: 'scatter',
        mode: 'lines',
        line: { color: 'rgba(2,132,199,1)', width: 2 },
        name: 'Spectrum',
      } as any);
    }
    return traces;
  }, [spectrumModel, mapFreq, systemDOF, freqUnits]);

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
  const x2Px = (rtState.x2.length ? rtState.x2[rtState.x2.length - 1] : 0) * 250;
  const basePx = (rtState.yb.length ? rtState.yb[rtState.yb.length - 1] : 0) * 250;

  const combinedTime = useMemo(() => {
    const t = rtState.t || [];
    if (systemDOF === '2DOF') {
      const y = t.map((_, i) => {
        const v1 = rtState.x[i] ?? 0;
        const v2 = rtState.x2[i] ?? 0;
        return Math.abs(v2) > Math.abs(v1) ? v2 : v1;
      });
      return { t, y };
    }
    return { t, y: rtState.x || [] };
  }, [rtState, systemDOF]);

  // Collapsible parameters
  const [showParams, setShowParams] = useState(true);
  const [showParams2, setShowParams2] = useState(true);

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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h1 className="text-lg font-semibold">Spring–Mass–Damper</h1>
              {/* DOF cluster (right side of title) */}
              <div className="inline-flex items-center gap-3 bg-white border border-gray-300 rounded-full px-3 py-1.5 shadow-sm text-sm">
                <label className="inline-flex items-center gap-1"><input type="radio" name="dof" checked={systemDOF === '1DOF'} onChange={() => setSystemDOF('1DOF')} /> 1-DOF</label>
                <label className="inline-flex items-center gap-1"><input type="radio" name="dof" checked={systemDOF === '2DOF'} onChange={() => setSystemDOF('2DOF')} /> 2-DOF</label>
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
                      <div className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Natural frequency:</span> {fn.toFixed(2)} Hz ({(fn * 2 * Math.PI).toFixed(2)} rad/s)
                      </div>
                    </div>
                                      </div>

                  
                                  </div>
              )}
            </div>

            {/* Additional parameters for 2-DOF */}
            {systemDOF === '2DOF' && (
              <div className="rounded border border-gray-200">
                <button className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50" onClick={() => setShowParams2(s => !s)}>
                  <span className="font-medium">Parameters (Mass 2)</span>
                  <span className="text-gray-500">{showParams2 ? 'Hide' : 'Show'}</span>
                </button>
                {showParams2 && (
                  <div className="p-3 space-y-4">
                    <div className="text-xs font-medium text-gray-700">Mass 2 (Coupled to Mass 1)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-end justify-between"><label className="block text-sm font-medium">Mass m₂ (kg)</label><div className="text-xs text-gray-600">{m2.toFixed(2)}</div></div>
                        <input type="range" min={0.1} max={10} step={0.1} value={m2} onChange={e => setM2(Number(e.target.value))} className="mt-1 w-full" />
                      </div>
                      <div>
                        <div className="flex items-end justify-between"><label className="block text-sm font-medium">Stiffness k₂ (N/m)</label><div className="text-xs text-gray-600">{k2.toFixed(0)}</div></div>
                        <input type="range" min={10} max={2000} step={10} value={k2} onChange={e => setK2(Number(e.target.value))} className="mt-1 w-full" />
                      </div>
                      <div>
                        <div className="flex items-end justify-between"><label className="block text-sm font-medium">Damping ζ₂</label><div className="text-xs text-gray-600">{zeta2.toFixed(3)}</div></div>
                        <input type="range" min={0} max={1.1} step={0.001} value={zeta2} onChange={e => setZeta2(Number(e.target.value))} className="mt-1 w-full" />
                        <div className="mt-1 text-xs text-gray-600">
                          <span className="font-medium">Natural frequency (m₂ alone):</span> {(() => {
                            const fn2 = Math.sqrt(k2 / Math.max(m2, 1e-9)) / (2 * Math.PI);
                            return `${fn2.toFixed(2)} Hz (${(fn2 * 2 * Math.PI).toFixed(2)} rad/s)`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="mt-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button className={`px-3 py-1.5 text-sm rounded border ${activeTab === 'fft' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setActiveTab('fft')}>Default</button>
                <button className={`px-3 py-1.5 text-sm rounded border ${activeTab === 'time' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setActiveTab('time')}>Time Waveform</button>
                <button className={`px-3 py-1.5 text-sm rounded border ${activeTab === 'bode' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setActiveTab('bode')}>Bode (Amp & Phase)</button>
              </div>
              
              {/* Units + Amplitude cluster moved below tabs */}
              <div className="mb-3">
                <div className="inline-flex items-center gap-3 bg-white border border-gray-300 rounded-full px-3 py-1.5 shadow-sm text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Units:</span>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="units" checked={freqUnits === 'Hz'} onChange={() => setFreqUnits('Hz')} /> Hz</label>
                    <label className="inline-flex items-center gap-1"><input type="radio" name="units" checked={freqUnits === 'ratio'} onChange={() => setFreqUnits('ratio')} /> f/f<sub>n</sub></label>
                  </div>
                  <div className="h-4 w-px bg-gray-300 mx-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Amplitude:</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="ampModeGlobal" checked={ampMode === 'absolute'} onChange={() => setAmpMode('absolute')} />
                      <span>Amplitude Ratio (|X|/|Y|)</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="ampModeGlobal" checked={ampMode === 'relative'} onChange={() => setAmpMode('relative')} />
                      <span>Relative Amplitude (|X−Y|/|Y|)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* FFT Tab: show natural frequency marker */}
              {activeTab === 'fft' && (
                <div ref={defaultPlotWrapRef} className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                  <Plot
                    data={spectrumTraces}
                    layout={{ autosize: true, height: 260, uirevision: "fft", margin: PLOT_MARGINS as any, xaxis: { title: freqTitle, range: (freqUnits === 'Hz' ? ([0, 25] as any) : ([0, sliderMax] as any)), autorange: false }, yaxis: { title: '|X(f)| (m)', zeroline: false, showgrid: true, range: (fftYRange as any) ?? ([0, specYMax] as any), autorange: false }, shapes: [
                      { type: 'line', x0: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), x1: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(16,185,129,0.95)', width: 2.5 } }
                    ], annotations: [
                      { x: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#10b981' } }
                    ] }}
                    config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 260 }}
                    onInitialized={(_fig, gd) => {
                      defaultPlotDivRef.current = gd;
                      activePlotDivRef.current = gd;
                      requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd)));
                    }}
                    onUpdate={(_fig, gd) => {
                      defaultPlotDivRef.current = gd;
                      activePlotDivRef.current = gd;
                      requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd)));
                    }}
                  />
                </div>
              )}

              {/* Time Waveform Tab: real-time */}
              {activeTab === 'time' && (
                <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={showCombinedTime}
                        onChange={(e) => setShowCombinedTime(e.target.checked)}
                      />
                      <span>Show combined waveform</span>
                    </label>
                  </div>
                  <Plot
                    data={[
                      ...(showCombinedTime ? [{ x: combinedTime.t, y: combinedTime.y, type: 'scatter', mode: 'lines', line: { color: 'rgba(16,185,129,1)', width: 2.5 }, name: 'Combined x(t)' }] : []),
                      { x: rtState.t, y: rtState.yb, type: 'scatter', mode: 'lines', line: { color: 'rgba(234,88,12,0.9)', width: 2 }, name: 'Base yb(t)' },
                      { x: rtState.t, y: rtState.x, type: 'scatter', mode: 'lines', line: { color: 'rgba(2,132,199,1)', width: 2 }, name: (systemDOF === '2DOF' ? 'Mass 1 x1(t)' : 'Mass x(t)'), visible: 'legendonly' as const } as any,
                      ...(systemDOF === '2DOF' ? [
                        { x: rtState.t, y: rtState.x2, type: 'scatter', mode: 'lines', line: { color: 'rgba(99,102,241,1)', width: 2 }, name: 'Mass 2 x2(t)', visible: 'legendonly' as const } as any
                      ] : []),
                    ]}
                    layout={{ autosize: true, height: 260, uirevision: "time", margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: 'Time (s)' }, yaxis: { title: 'Displacement (m)', zeroline: false, showgrid: true, range: [-timeYMax, timeYMax], autorange: false } }}
                    onInitialized={(_fig, gd) => { activePlotDivRef.current = gd; requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd))); }}
                    onUpdate={(_fig, gd) => { activePlotDivRef.current = gd; requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd))); }}
                    config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 260 }}
                  />
                </div>
              )}

              {/* Bode Tab */}
              {activeTab === 'bode' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={singleTraceMode} 
                          onChange={(e) => setSingleTraceMode(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Single trace mode</span>
                      </label>
                    </div>
                    <button className="px-2.5 py-1 rounded border border-gray-300 bg-white" onClick={() => { 
                      allPts.current = [];
                      multiTraces.current = [];
                      currentTraceIdx.current = 0;
                      setSweepVersion(v => v + 1); 
                    }}>Clear sweep area</button>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                    <Plot
                      key={`amp-${sweepVersion}`}
                      data={[
                        { x: mapFreq(bode.f), y: bode.amp, type: 'scatter', mode: 'lines', line: { color: 'rgba(16,185,129,1)', width: 2.5 }, name: 'Combined (max)', visible: 'legendonly' },
                        ...(singleTraceMode 
                          ? (allPts.current.length ? [{
                              x: mapFreq(allPts.current.map(p => p.f)),
                              y: allPts.current.map(p => p.amp),
                              type: 'scatter',
                              mode: 'lines',
                              line: { color: 'rgba(99,102,241,0.9)', width: 2 },
                              name: 'Sweep trace'
                            }] : [])
                          : multiTraces.current.filter(t => t && t.length > 0).map((trace, idx) => ({
                              x: mapFreq(trace.map(p => p.f)),
                              y: trace.map(p => p.amp),
                              type: 'scatter',
                              mode: 'lines',
                              line: { 
                                color: idx % 2 === 0 ? 'rgba(99,102,241,0.9)' : 'rgba(236,72,153,0.9)', 
                                width: 2 
                              },
                              name: `Run ${idx + 1}`
                            }))
                        )
                      ]}
                      layout={{ autosize: true, height: 240, uirevision: bodeRevision as any, legend: {}, showlegend: true, margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: freqTitle, range: bodeXRangeState as any, autorange: false }, yaxis: { title: (ampMode === 'relative' ? 'Relative displacement ratio (|X - Y| / |Y|)' : 'Amplitude ratio (|X| / |Y|)'), zeroline: false, showgrid: true, range: [0, bodeAmpMax || 1], autorange: false }, shapes: [
                        { type: 'line', x0: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), x1: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(16,185,129,0.95)', width: 2 } }
                      ], annotations: [
                        { x: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#10b981' } }
                      ] } as any}
                      onInitialized={(_fig, gd) => { activePlotDivRef.current = gd; requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd))); }}
                      onUpdate={(_fig, gd) => { activePlotDivRef.current = gd; requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd))); }}
                      onRelayout={(ev: any) => {
                        const x0 = ev && (ev['xaxis.range[0]'] as number);
                        const x1 = ev && (ev['xaxis.range[1]'] as number);
                        const auto = ev && ev['xaxis.autorange'];
                        if (typeof x0 === 'number' && typeof x1 === 'number') {
                          applyBodeRange(x0, x1);
                        } else if (auto) {
                          const d = freqUnits === 'Hz' ? [0, 25] : [0, 3];
                          applyBodeRange(d[0], d[1]);
                        }
                      }}
                      config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%', height: 240 }}
                    />
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2 relative overflow-hidden">
                    <Plot
                      key={`ph-${sweepVersion}`}
                      data={[
                        { x: mapFreq(bode.f), y: bode.ph, type: 'scatter', mode: 'lines', line: { color: 'rgba(234,88,12,1)', width: 2 }, name: 'Phase (model)', visible: 'legendonly' },
                        ...(singleTraceMode 
                          ? (allPts.current.length ? [{
                              x: mapFreq(allPts.current.map(p => p.f)),
                              y: allPts.current.map(p => p.ph),
                              type: 'scatter',
                              mode: 'lines',
                              line: { color: 'rgba(99,102,241,0.9)', width: 2 },
                              name: 'Sweep trace'
                            }] : [])
                          : multiTraces.current.filter(t => t && t.length > 0).map((trace, idx) => ({
                              x: mapFreq(trace.map(p => p.f)),
                              y: trace.map(p => p.ph),
                              type: 'scatter',
                              mode: 'lines',
                              line: { 
                                color: idx % 2 === 0 ? 'rgba(99,102,241,0.9)' : 'rgba(236,72,153,0.9)', 
                                width: 2 
                              },
                              name: `Run ${idx + 1}`
                            }))
                        )
                      ]}
                      layout={{ autosize: true, height: 240, uirevision: bodeRevision as any, legend: {}, showlegend: true, margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: freqTitle, range: bodeXRangeState as any, autorange: false }, yaxis: { title: 'Phase (deg)', zeroline: false, showgrid: true, range: bodePhRange as any, autorange: false }, shapes: [
                        { type: 'line', x0: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), x1: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(16,185,129,0.95)', width: 2 } }
                      ], annotations: [
                        { x: (freqUnits === 'Hz' ? freqHz : (fn > 0 ? freqHz / fn : 0)), y: 1, xref: 'x', yref: 'paper', yanchor: 'bottom', showarrow: false, text: 'f', font: { size: 10, color: '#10b981' } }
                      ] } as any}
                      onInitialized={(_fig, gd) => { activePlotDivRef.current = gd; requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd))); }}
                      onUpdate={(_fig, gd) => { activePlotDivRef.current = gd; requestAnimationFrame(() => requestAnimationFrame(() => updateSliderPads(gd))); }}
                      onRelayout={(ev: any) => {
                        const x0 = ev && (ev['xaxis.range[0]'] as number);
                        const x1 = ev && (ev['xaxis.range[1]'] as number);
                        const auto = ev && ev['xaxis.autorange'];
                        if (typeof x0 === 'number' && typeof x1 === 'number') {
                          applyBodeRange(x0, x1);
                        } else if (auto) {
                          const d = freqUnits === 'Hz' ? [0, 25] : [0, 3];
                          applyBodeRange(d[0], d[1]);
                        }
                      }}
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

                <div style={{ paddingLeft: sliderPadLeft, paddingRight: sliderPadRight }}>
                  <div className="flex items-end justify-between mt-2">
                    <label className="block text-sm font-medium">Base amplitude</label>
                    <div className="text-xs text-gray-600">{baseAmp.toFixed(4)}</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={baseAmpMax}
                    step={0.001}
                    value={baseAmp}
                    onChange={(e) => setBaseAmp(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className={`px-3 py-1.5 text-sm rounded border ${running ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => setRunning(v => !v)}>{running ? 'Pause' : 'Run'}</button>
                  <button className={`px-3 py-1.5 text-sm rounded border ${sweeping ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-800 border-gray-300'}`} onClick={() => {
                    if (sweeping) {
                      setSweeping(false);
                    } else {
                      sweepDir.current = nextSweepDirRef.current;
                      lastSweepDir.current = sweepDir.current;
                      setSweeping(true);
                    }
                  }}>{sweeping ? 'Stop sweep' : 'Start sweep'}</button>
                  <button className="px-3 py-1.5 text-sm rounded border bg-white text-gray-800 border-gray-300" onClick={() => {
                    if (systemDOF === '2DOF') {
                      // Impart initial displacement to both masses, superimposed on ongoing forcing
                      const A = 0.08; // m
                      state2DOFRef.current.x1 += A;
                      state2DOFRef.current.x2 += A * 0.6;
                    } else {
                      freeStartRef.current = performance.now();
                      freeAmpRef.current = 0.08;
                      nudgeActiveRef.current = true;
                    }
                  }}>Nudge mass</button>
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
          <main className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex items-stretch h-full lg:col-span-3 order-2">
            <div className="w-full max-w-xl h-full">
              <div className="flex items-center justify-center h-full">
                {/* Animation SVG refined to match schematic */}
                <div className="relative h-full">
                  {(() => {
                    const w = 280; const h = 400;
                    const baseY = 20; // fixed base at top
                    const xLeft = 85;  // damper column
                    const xRight = 185; // spring column
                    const link = "#0b61a4";
                    const baseOffset = basePx; // base motion px

                    // Mass position (moves with xPx)
                    const massW = massSize.w; const massH = massSize.h;
                    const massY = 240 + xPx; // mass vertical position
                    const massCenterX = 135; // centered between damper and spring
                    const massX = massCenterX - massW / 2;

                    // Crossbar position (above mass)
                    const crossbarY = massY - 18;

                    // Keep camera fixed to avoid shifting reference frame; improves perceived phase correctness
                    const yCam = 0;

                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
                        <defs>
                          <linearGradient id="massGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                          <linearGradient id="springGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a3a000" />
                            <stop offset="100%" stopColor="#6b7000" />
                          </linearGradient>
                          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="8" stroke="#374151" strokeWidth="2" />
                          </pattern>
                        </defs>

                        <g transform={`translate(0 ${yCam})`}>

                        {/* Fixed base at top with hatching */}
                        <g transform={`translate(0 ${baseOffset})`}>
                          <rect x="30" y={baseY - 15} width="220" height="15" fill="url(#hatch)" />
                          <rect x="30" y={baseY} width="220" height="12" fill="#6b7280" rx="2" />
                          {/* Base attachment points */}
                          <circle cx={xLeft} cy={baseY + 12} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                          <circle cx={xRight} cy={baseY + 12} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                        </g>

                        {/* Damper (left side) */}
                        <g>
                          {/* Rigid link from base to cylinder top */}
                          <line x1={xLeft} y1={baseY + 12 + baseOffset} x2={xLeft} y2={baseY + 35 + baseOffset} stroke={link} strokeWidth={6} strokeLinecap="round" />
                          
                          {/* Cylinder body (moves with base) */}
                          <rect x={xLeft - 16} y={baseY + 35 + baseOffset} width={32} height={85} rx={4} fill={link} opacity={0.15} stroke={link} strokeWidth={2} strokeOpacity={0.4} />
                          <rect x={xLeft - 11} y={baseY + 42 + baseOffset} width={22} height={71} rx={2} fill={damperInnerColor} />
                          
                          {/* Piston head and rod (extends to crossbar) */}
                          {(() => {
                            const cylTop = baseY + 35 + baseOffset;
                            const cylBot = cylTop + 85;
                            const relPx = xPx - basePx; // relative displacement
                            const pistonY = clamp(cylTop + 40 + relPx, cylTop + 10, cylBot - 15);
                            return (
                              <>
                                <rect x={xLeft - 14} y={pistonY} width={28} height={10} rx={2} fill={link} opacity={0.95} />
                                <line x1={xLeft} y1={pistonY + 10} x2={xLeft} y2={crossbarY} stroke={link} strokeWidth={6} strokeLinecap="round" />
                              </>
                            );
                          })()}
                        </g>

                        {/* Spring (right side) - coil spring */}
                        <g>
                          {/* Rigid link from base to spring top */}
                          <line x1={xRight} y1={baseY + 12 + baseOffset} x2={xRight} y2={baseY + 35 + baseOffset} stroke={link} strokeWidth={6} strokeLinecap="round" />
                          
                          {/* Coil spring from base to crossbar */}
                          {(() => {
                            const springTop = baseY + 35 + baseOffset;
                            const springBot = crossbarY;
                            const springLen = springBot - springTop;
                            const coils = 8;
                            const coilWidth = 18;
                            const segmentHeight = springLen / coils;
                            
                            let path = `M ${xRight} ${springTop}`;
                            for (let i = 0; i < coils; i++) {
                              const y1 = springTop + segmentHeight * i;
                              const y2 = springTop + segmentHeight * (i + 0.33);
                              const y3 = springTop + segmentHeight * (i + 0.67);
                              const y4 = springTop + segmentHeight * (i + 1);
                              path += ` L ${xRight + coilWidth} ${y2} L ${xRight - coilWidth} ${y3} L ${xRight} ${y4}`;
                            }
                            
                            return <path d={path} stroke="url(#springGrad)" strokeWidth={springStroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
                          })()}
                        </g>

                        {/* Horizontal crossbar connecting damper and spring to mass */}
                        <g>
                          {/* Main crossbar */}
                          <line x1={xLeft} y1={crossbarY} x2={xRight} y2={crossbarY} stroke={link} strokeWidth={6} strokeLinecap="round" />
                          
                          {/* Connection joints at ends of crossbar */}
                          <circle cx={xLeft} cy={crossbarY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                          <circle cx={xRight} cy={crossbarY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                          
                          {/* Vertical links from crossbar center to mass top */}
                          <line x1={massCenterX} y1={crossbarY} x2={massCenterX} y2={massY} stroke={link} strokeWidth={6} strokeLinecap="round" />
                          
                          {/* Connection joint at mass top center */}
                          <circle cx={massCenterX} cy={massY} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                        </g>

                        {/* Mass block */}
                        <rect x={massX} y={massY} width={massW} height={massH} rx={6} fill="url(#massGrad)" stroke="#0f172a" strokeWidth={2} strokeOpacity={0.3} />

                        {systemDOF === '2DOF' && (() => {
                          const mass2W = mass2Size.w; const mass2H = mass2Size.h;
                          const relPx2 = x2Px - xPx;
                          const linkGap = 120; // nominal rest separation between masses
                          const mass2Y = massY + massH + linkGap + relPx2;
                          const mass2X = massCenterX - mass2W / 2;
                          const base2Top = massY + massH;
                          
                          // Attachment points on bottom of mass 1
                          const attach2Left = massCenterX - 25;
                          const attach2Right = massCenterX + 25;
                          
                          return (
                            <>
                              {/* Attachment points on bottom of mass 1 */}
                              <circle cx={attach2Left} cy={base2Top} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                              <circle cx={attach2Right} cy={base2Top} r={5} fill="#fff" stroke={link} strokeWidth={2} />

                              {/* Inter-mass damper (left side) - directly from mass 1 to mass 2 */}
                              <g>
                                <line x1={attach2Left} y1={base2Top} x2={attach2Left} y2={base2Top + 15} stroke={link} strokeWidth={6} strokeLinecap="round" />
                                <rect x={attach2Left - 16} y={base2Top + 15} width={32} height={85} rx={4} fill={link} opacity={0.15} stroke={link} strokeWidth={2} strokeOpacity={0.4} />
                                <rect x={attach2Left - 11} y={base2Top + 22} width={22} height={71} rx={2} fill={damperInnerColor2} />
                                {(() => {
                                  const cylTop = base2Top + 15;
                                  const cylBot = cylTop + 85;
                                  const pistonY = clamp(cylTop + 40 + relPx2, cylTop + 10, cylBot - 15);
                                  return (
                                    <>
                                      <rect x={attach2Left - 14} y={pistonY} width={28} height={10} rx={2} fill={link} opacity={0.95} />
                                      <line x1={attach2Left} y1={pistonY + 10} x2={attach2Left} y2={mass2Y} stroke={link} strokeWidth={6} strokeLinecap="round" />
                                    </>
                                  );
                                })()}
                              </g>

                              {/* Inter-mass spring (right side) - directly from mass 1 to mass 2 */}
                              <g>
                                <line x1={attach2Right} y1={base2Top} x2={attach2Right} y2={base2Top + 15} stroke={link} strokeWidth={6} strokeLinecap="round" />
                                {(() => {
                                  const springTop = base2Top + 15;
                                  const springBot = mass2Y;
                                  const springLen = springBot - springTop;
                                  const coils = 6;
                                  const coilWidth = 18;
                                  const segmentHeight = springLen / coils;
                                  let path = `M ${attach2Right} ${springTop}`;
                                  for (let i = 0; i < coils; i++) {
                                    const y1 = springTop + segmentHeight * i;
                                    const y2 = springTop + segmentHeight * (i + 0.33);
                                    const y3 = springTop + segmentHeight * (i + 0.67);
                                    const y4 = springTop + segmentHeight * (i + 1);
                                    path += ` L ${attach2Right + coilWidth} ${y2} L ${attach2Right - coilWidth} ${y3} L ${attach2Right} ${y4}`;
                                  }
                                  return <path d={path} stroke="url(#springGrad)" strokeWidth={springStroke2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
                                })()}
                              </g>

                              {/* Attachment points on top of mass 2 */}
                              <circle cx={attach2Left} cy={mass2Y} r={5} fill="#fff" stroke={link} strokeWidth={2} />
                              <circle cx={attach2Right} cy={mass2Y} r={5} fill="#fff" stroke={link} strokeWidth={2} />

                              {/* Mass 2 block */}
                              <rect x={mass2X} y={mass2Y} width={mass2W} height={mass2H} rx={6} fill="url(#massGrad)" stroke="#0f172a" strokeWidth={2} strokeOpacity={0.3} />
                            </>
                          );
                        })()}
                      </g>
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
