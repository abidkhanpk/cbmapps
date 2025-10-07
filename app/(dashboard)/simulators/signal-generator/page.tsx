"use client";
import React, { useState, useEffect } from 'react';
import { SignalControls } from './components/SignalControls';
import { WindowingControls } from './components/WindowingControls';
import { Collapsible, Accordion } from './components/Collapsible';
import { AveragingControls } from './components/AveragingControls';
import { TimePlot } from './components/TimePlot';
import { SpectrumPlot } from './components/SpectrumPlot';
import { useSignal, SignalType } from './hooks/useSignal';
import { useSpectrum, AveragingMode } from './hooks/useSpectrum';
import { getWindow, applyWindow } from './lib/dsp';
import FFT from 'fft.js';
import type { WindowType } from './lib/dsp';
import type { SingleSignalParams } from './hooks/useSignal';

// metadata is defined at a higher level; client components cannot export metadata in Next.js

export default function SignalGenerator() {
  const [twReady, setTwReady] = useState(false);
  useEffect(() => {
    const hasTailwindStyles = () => {
      if (typeof window === 'undefined') return false;
      try {
        for (const style of Array.from(document.querySelectorAll('style'))) {
          if (style.textContent && style.textContent.includes('--tw')) return true;
        }
      } catch {}
      return false;
    };

    if (hasTailwindStyles()) { setTwReady(true); return; }

    // Fallback injection if Tailwind CDN hasn't loaded yet (e.g. after client-side nav)
    const existingCdn = document.querySelector('script[data-tailwind-cdn]');
    if (!existingCdn) {
      // config must be defined before the CDN script executes
      const config = document.createElement('script');
      config.setAttribute('data-tailwind-config', 'true');
      config.innerHTML = 'tailwind = { config: { corePlugins: { preflight: false } } }';
      document.head.appendChild(config);

      const cdn = document.createElement('script');
      cdn.src = 'https://cdn.tailwindcss.com';
      cdn.setAttribute('data-tailwind-cdn', 'true');
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
  // maxRevolutions removed - time window length will be driven by LOR / Fmax (Twindow)
  // Multi-signal state: array of signal parameter objects
  const [signals, setSignals] = useState<SingleSignalParams[]>([
    {
      type: 'sine' as SignalType,
      amplitude: 1,
      frequency: 10,
      phaseDeg: 0,
      chirpStartFreq: undefined,
      chirpEndFreq: undefined,
    },
  ]);
    const maxFreq = signals.reduce((max, sig) => Math.max(max, sig.frequency), 0);
  // const period = maxFreq > 0 ? 1 / maxFreq : 1; // unused
  // Signal visibility state
  const [showAnalog, setShowAnalog] = useState(true);
  const [showDigitized, setShowDigitized] = useState(true);
  const [showIndividuals, setShowIndividuals] = useState(false);
  // Shared parameters
  const [fs, setFs] = useState<number>(1024);
  const [noiseLevel, setNoiseLevel] = useState<number>(0);
  const [numSamples, setNumSamples] = useState<number>(1024);

  // Spectrum / FFT controls: allow selecting number of samples (power of two) and LOR (lines)
  const pow2Options = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  const lorOptions = pow2Options.map(n => Math.round(n / 2.56));
  const [lor, setLor] = useState<number>(Math.round(numSamples / 2.56));
  const [fmax, setFmax] = useState<number>(fs / 2.56);

  const [windowType, setWindowType] = useState<WindowType>('hanning');
  const [showWindowed, setShowWindowed] = useState<boolean>(false);
  // previous maxRevolutions removed
  const [averagingMode, setAveragingMode] = useState<AveragingMode>('none');
  const [segmentLength, setSegmentLength] = useState<number>(256);
  const [numAverages, setNumAverages] = useState<number>(5);
  const [overlapPercent, setOverlapPercent] = useState<number>(50);
  // Filters
  const [filterType, setFilterType] = useState<'none' | 'low' | 'high' | 'bandpass' | 'bandstop'>('none');
  const [cutoffLow, setCutoffLow] = useState<number>(10);
  const [cutoffHigh, setCutoffHigh] = useState<number>(100);
  const [filterOrder, setFilterOrder] = useState<number>(51);
  // UI for colored bands (checked by default)
  const [showBands, setShowBands] = useState<boolean>(true);
  const [transitionWidth, setTransitionWidth] = useState<number>(0);
  // Optional analog anti-alias filter (disabled by default)
  const [antiAliasEnabled, setAntiAliasEnabled] = useState<boolean>(false);
  // initialize cutoff to current fmax mapping; keep a 'touched' flag so user's
  // manual edits aren't overwritten when fmax changes.
  const [antiAliasCutoff, setAntiAliasCutoff] = useState<number>(Math.round(fmax));
  const [antiAliasTouched, setAntiAliasTouched] = useState<boolean>(false);
  // antialiasing removed per user request
  // per-frame visibility toggles (for showing each windowed frame individually)
  const [visibleFrames, setVisibleFrames] = useState<boolean[]>([]);

  // Use new multi-signal hook signature
  const { tSamples, noisySamples, cleanSamples, tAnalog, analog, individualSignals } = useSignal({
    signals,
    fs,
    noiseLevel,
    numSamples,
    antiAlias: { enabled: antiAliasEnabled, cutoffHz: antiAliasCutoff },
  });

  // Sync handlers between samples <-> LOR and fs <-> fmax
  const handleSetNumSamples = (n: number) => {
    if (!pow2Options.includes(n)) n = pow2Options[0];
    setNumSamples(n);
    const idx = pow2Options.indexOf(n);
    setLor(lorOptions[idx]);
  };

  const handleSetLor = (l: number) => {
    const idx = lorOptions.indexOf(l);
    if (idx === -1) return;
    const n = pow2Options[idx];
    setLor(l);
    setNumSamples(n);
  };

  const handleSetFs = (f: number) => {
    if (isNaN(f) || f <= 0) return;
    setFs(f);
    setFmax(Math.round(f / 2.56));
  };

  // keep antiAliasCutoff in sync with fmax unless the user has manually edited it
  useEffect(() => {
    if (!antiAliasTouched) setAntiAliasCutoff(Math.round(fmax));
  }, [fmax, antiAliasTouched]);

  const handleSetFmax = (fm: number) => {
    if (isNaN(fm) || fm <= 0) return;
    const fmInt = Math.round(fm);
    setFmax(fmInt);
    setFs(Math.round(fmInt * 2.56));
  };

  // when the user enables anti-aliasing, default the cutoff to current fmax if they
  // haven't manually chosen a cutoff yet
  useEffect(() => {
    if (antiAliasEnabled && !antiAliasTouched) {
      setAntiAliasCutoff(Math.round(fmax));
    }
  }, [antiAliasEnabled, antiAliasTouched, fmax]);

  // Determine display time window.
  // For single (no averaging) case we use Twindow = LOR / Fmax (period of lines). For averaging modes, frames and concatenation logic will set the display span.
  const Twindow = lor / Math.max(fmax, 1e-12);
  const maxTime = (averagingMode === 'none') ? Twindow : undefined;
  // Filter time waveform data
  const filterByTime = (tArr: Float64Array | number[], yArr: Float64Array | number[]) => {
    if (typeof maxTime === 'undefined') return [Array.from(tArr), Array.from(yArr)];
    const idx = tArr.findIndex(t => t > (maxTime as number));
    const endIdx = idx === -1 ? tArr.length : idx;
    return [Array.from(tArr).slice(0, endIdx), Array.from(yArr).slice(0, endIdx)];
  };
  const [tAnalogPlot, yAnalogPlot] = filterByTime(tAnalog, analog);
  const [tSamplesPlot, ySamplesPlot] = filterByTime(tSamples, noisySamples);
  let individualSignalsPlot = individualSignals.map(sig => {
    const [tS, yS] = filterByTime(sig.tSamples, sig.cleanSamples);
    return { ...sig, tSamples: tS, cleanSamples: yS };
  });

  // determine segment length to use for spectrum computation
  let desiredSegmentLength = segmentLength;
  if (averagingMode === 'linear' || averagingMode === 'overlap') {
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    // choose nearest power of two <= frameLenSamples
    let p = 1;
    while (p * 2 <= frameLenSamples) p *= 2;
    desiredSegmentLength = Math.min(p, numSamples);
  }

  // Compute frames for plotting when averaging selected
  let frames: Array<{ t0: number; t1: number }> | undefined = undefined;
  let framesData: Array<{ t: number[]; y: number[] }> | undefined = undefined;
  // For overlap bar visualization and x-axis forcing
  let xAxisMax: number | undefined = undefined;
  let overlapBars: Array<{ x0: number; x1: number }> | undefined = undefined;
  if (averagingMode !== 'none' && numAverages > 0) {
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    // compute stepSamples based on overlap mode; for linear averaging step==frameLenSamples
    const ov = averagingMode === 'overlap' ? Math.min(90, Math.max(0, overlapPercent)) : 0;
    const stepSamples = Math.max(1, Math.round(frameLenSamples * (1 - ov / 100)));
    const stepT = stepSamples / fs;
    frames = [];
    framesData = [];
    const totalSamples = tSamples.length;
    const dt = 1 / fs;
    // Build exactly numAverages frames starting every stepSamples (wrap-around using modulo as before)
    for (let k = 0; k < numAverages; k++) {
      const start = k * stepSamples;
      const tArr: number[] = [];
      const yArr: number[] = [];
      for (let n = 0; n < frameLenSamples; n++) {
        const idx = (start + n) % totalSamples;
        tArr.push(n * dt);
        yArr.push(noisySamples[idx]);
      }
      frames.push({ t0: k * stepT, t1: k * stepT + Twindow });
      framesData.push({ t: tArr, y: yArr });
    }
    // Force x-axis span to T * N (full span) for both linear and overlap visualization
    xAxisMax = Twindow * numAverages;

    // Visualize bars at their actual start times (stepT defined above)
    overlapBars = [];
    for (let k = 0; k < numAverages; k++) {
      const x0 = k * stepT;
      overlapBars.push({ x0, x1: x0 + Twindow });
    }
  }

  // Ensure visibleFrames length matches framesData when framesData changes
  useEffect(() => {
    if (typeof framesData === 'undefined' || framesData.length === 0) {
      setVisibleFrames([]);
    } else {
      setVisibleFrames(prev => {
        if (prev.length === framesData.length) return prev;
        const next = new Array(framesData.length).fill(true);
        for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
        return next;
      });
    }
  }, [framesData]);


  const framesForSpectrum = (averagingMode === 'linear' && typeof framesData !== 'undefined') ? framesData.map(fd => {
    const a = new Float64Array(fd.y.length);
    for (let i = 0; i < fd.y.length; i++) a[i] = fd.y[i];
    return a;
  }) : undefined;

  const { single, averaged } = useSpectrum({
    signal: noisySamples,
    fs,
    windowType,
    averagingMode,
    segmentLength: desiredSegmentLength,
    overlapPercent,
    numAverages,
    frames: framesForSpectrum,
  });

  // compute windowed sampled waveform (overlay). Use the window of length numSamples applied to cleanSamples.
  let windowedT: number[] | undefined = undefined;
  let windowedY: number[] | undefined = undefined;
  // per-frame windowed overlays (absolute times) to pass to TimePlot
  let windowedFrames: Array<{ t: number[]; y: number[] }> | undefined = undefined;
  try {
    if (showWindowed) {
      // compute the desired window duration (seconds) from LOR and fmax
      const Twindow = lor / Math.max(fmax, 1e-12);
      // window length in samples
      let Lw = Math.max(1, Math.round(Twindow * fs));
      Lw = Math.min(Lw, numSamples);
      // create window of length Lw and apply to the first Lw samples
      const w = getWindow(windowType, Lw);
      const seg = new Float64Array(Lw);
      for (let i = 0; i < Lw; i++) seg[i] = cleanSamples[i] ?? 0;
      const yw = applyWindow(seg, w);
      windowedT = Array.from(tSamples).slice(0, Lw);
      windowedY = Array.from(yw);
    }
  } catch {
    // defensive: do nothing on error
    windowedT = undefined;
    windowedY = undefined;
  }

  // Compute filtered arrays using ideal frequency-domain masking (FFT)
  let tFiltered: number[] | undefined = undefined;
  let yFiltered: number[] | undefined = undefined;
  // Also compute filtered FFT (for plotting) and filter lines
  let filteredFreq: Float64Array | undefined = undefined;
  let filteredMag: Float64Array | undefined = undefined;
  let filterLines: number[] = [];
  try {
    if (filterType !== 'none') {
      const N = noisySamples.length;
      const fft = new FFT(N);
      const data = fft.createComplexArray();
      const out = fft.createComplexArray();
      // fill time-domain data with sampled noisy signal
      for (let i = 0; i < N; i++) {
        data[2 * i] = noisySamples[i] as number;
        data[2 * i + 1] = 0;
      }
      fft.transform(out, data);

      // construct mask over frequencies (bins 0..N-1) using signed frequency
      for (let k = 0; k < N; k++) {
        const freq = (k <= N / 2) ? (k * fs) / N : ((k - N) * fs) / N; // signed freq
        let pass = false;
        const af = Math.abs(freq);
        if (filterType === 'low') pass = af <= cutoffLow;
        else if (filterType === 'high') pass = af >= cutoffLow;
        else if (filterType === 'bandpass') pass = af >= cutoffLow && af <= cutoffHigh;
        else if (filterType === 'bandstop') pass = !(af >= cutoffLow && af <= cutoffHigh);
        const m = pass ? 1 : 0;
        out[2 * k] *= m;
        out[2 * k + 1] *= m;
      }

      // inverse FFT to get filtered time waveform using conjugation trick
      const conjIn = fft.createComplexArray();
      for (let i = 0; i < N; i++) {
        conjIn[2 * i] = out[2 * i];
        conjIn[2 * i + 1] = -out[2 * i + 1];
      }
      const temp = fft.createComplexArray();
      fft.transform(temp, conjIn);
      // conjugate and normalize by N
      const yf: number[] = new Array(N);
      for (let i = 0; i < N; i++) {
        yf[i] = temp[2 * i] / N; // real part after conjugation
      }
      tFiltered = Array.from(tSamples);
      yFiltered = yf;

      // compute filtered magnitude spectrum for positive frequencies
      const half = Math.floor(N / 2);
      const mag = new Float64Array(half + 1);
      const freqArr = new Float64Array(half + 1);
      for (let k = 0; k <= half; k++) {
        const re = out[2 * k];
        const im = out[2 * k + 1];
        mag[k] = (2 / N) * Math.hypot(re, im);
        freqArr[k] = (k * fs) / N;
      }
      filteredFreq = freqArr;
      filteredMag = mag;

      // filter lines for plotting: single cutoff for low/high, both for band filters
      if (filterType === 'low' || filterType === 'high') filterLines = [cutoffLow];
      else filterLines = [cutoffLow, cutoffHigh];
    }
  } catch {
    tFiltered = undefined;
    yFiltered = undefined;
    filteredFreq = undefined;
    filteredMag = undefined;
    filterLines = [];
  }

  // Ensure filtered time waveform doesn't extend beyond the displayed sampling/averaging span.
  // If averaging is active and we built concatenated sampled display arrays, map the filtered
  // samples onto the concatenated display times so the filtered trace length matches the displayed sampled waveform.
  if ((averagingMode === 'linear' || averagingMode === 'overlap') && typeof framesData !== 'undefined' && framesData.length > 0 && tFiltered && yFiltered) {
    // Build concatenated display times as done below for sampled traces
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    const ov = averagingMode === 'overlap' ? Math.min(90, Math.max(0, overlapPercent)) : 0;
    const stepSamples = Math.max(1, Math.round(frameLenSamples * (1 - ov / 100)));
    const totalSamples = tSamples.length;
    const appendedSampledT: number[] = [];
    const appendedSampledY: number[] = [];
    for (let k = 0; k < framesData.length; k++) {
      const start = k * stepSamples;
      for (let n = 0; n < framesData[k].t.length; n++) {
        const idx = (start + n) % totalSamples;
        const tRel = framesData[k].t[n];
        appendedSampledT.push(k * Twindow + tRel);
        appendedSampledY.push(yFiltered[idx]);
      }
    }
    tFiltered = appendedSampledT;
    yFiltered = appendedSampledY;
  }

  // Non-averaging case: ensure filtered arrays are limited to sampling display length
  if (!(averagingMode === 'linear' || averagingMode === 'overlap') && tFiltered && yFiltered) {
    // Trim to same length as tSamplesPlot/ySamplesPlot (the un-averaged display)
    const L = Math.min(tFiltered.length, tSamplesPlot.length);
    tFiltered = tFiltered.slice(0, L);
    yFiltered = yFiltered.slice(0, L);
  }

  // If linear averaging is active, build appended sampled & analog arrays so the time waveform equals N * Twindow
  let tAnalogPlotFinal = tAnalogPlot;
  let yAnalogPlotFinal = yAnalogPlot;
  let tSamplesPlotFinal = tSamplesPlot;
  let ySamplesPlotFinal = ySamplesPlot;
  if ((averagingMode === 'linear' || averagingMode === 'overlap') && typeof framesData !== 'undefined' && framesData.length > 0) {
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    const ov = averagingMode === 'overlap' ? Math.min(90, Math.max(0, overlapPercent)) : 0;
    const stepSamples = Math.max(1, Math.round(frameLenSamples * (1 - ov / 100)));
    const stepT = stepSamples / fs;
    const totalSamples = tSamples.length;
    const appendedSampledT: number[] = [];
    const appendedSampledY: number[] = [];
    const appendedAnalogT: number[] = [];
    const appendedAnalogY: number[] = [];
    for (let k = 0; k < framesData.length; k++) {
      const fd = framesData[k];
      const start = k * stepSamples;
      for (let n = 0; n < fd.t.length; n++) {
        const idx = (start + n) % totalSamples;
        const tRel = fd.t[n];
        // display-time aligned to k * Twindow so total shown time equals N * Twindow (same as linear)
        appendedSampledT.push(k * Twindow + tRel);
        appendedSampledY.push(noisySamples[idx]);
        // find closest analog index
        let ai = 0;
        while (ai < tAnalog.length - 1 && tAnalog[ai] < tSamples[idx]) ai++;
        let chosen = ai;
        if (ai > 0) {
          const d0 = Math.abs(tAnalog[ai] - tSamples[idx]);
          const d1 = Math.abs(tAnalog[ai - 1] - tSamples[idx]);
          if (d1 < d0) chosen = ai - 1;
        }
        appendedAnalogT.push(k * Twindow + tRel);
        appendedAnalogY.push(analog[chosen]);
      }
    }
  // For linear and overlap averaging we want to show the full concatenated N * Twindow waveform.
  tAnalogPlotFinal = appendedAnalogT;
  yAnalogPlotFinal = appendedAnalogY;
  tSamplesPlotFinal = appendedSampledT;
  ySamplesPlotFinal = appendedSampledY;

  // If windowed overlay exists and linear/overlap averaging, expand it to span all frames (if not already done)
    if (windowedT && windowedY && windowedT.length <= frameLenSamples) {
      const appendedWT: number[] = [];
      const appendedWY: number[] = [];
      for (let k = 0; k < framesData.length; k++) {
        for (let n = 0; n < windowedY.length; n++) {
          appendedWT.push(k * stepT + (windowedT[n] - windowedT[0]));
          appendedWY.push(windowedY[n]);
        }
      }
      windowedT = appendedWT;
      windowedY = appendedWY;
    }

    // Compute per-frame windowed traces (apply the same window to each frame's samples) so overlapping windows can be toggled
    if (showWindowed && framesData && framesData.length > 0) {
      windowedFrames = [];
      for (let k = 0; k < framesData.length; k++) {
        if (!visibleFrames[k]) {
          windowedFrames.push({ t: [], y: [] });
          continue;
        }
        const fd = framesData[k];
        const Lw = Math.min(fd.t.length, windowedY ? windowedY.length : fd.t.length);
        // create window
        const w = getWindow(windowType, Lw);
        const seg = new Float64Array(Lw);
        for (let i = 0; i < Lw; i++) seg[i] = fd.y[i] ?? 0;
        const yw = applyWindow(seg, w);
        const tarr: number[] = [];
        const yarr: number[] = [];
        for (let i = 0; i < Lw; i++) {
          tarr.push(k * stepT + fd.t[i]);
          yarr.push(yw[i]);
        }
        windowedFrames.push({ t: tarr, y: yarr });
      }
    }

    // (individual signals expansion moved later to run for any averaging mode when framesData is available)
  }

  // Expand individual signals across all frames (T * N) whenever framesData exists (i.e., averaging is active)
  if (typeof framesData !== 'undefined' && framesData.length > 0) {
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    const totalSamples = tSamples.length;
    const expandedIndividuals = individualSignals.map(sig => {
      const appendedT: number[] = [];
      const appendedY: number[] = [];
      for (let k = 0; k < framesData.length; k++) {
        const start = k * frameLenSamples;
        for (let n = 0; n < framesData[k].t.length; n++) {
          const idx = (start + n) % totalSamples;
          const tRel = framesData[k].t[n];
          appendedT.push(k * Twindow + tRel);
          appendedY.push(sig.cleanSamples[idx]);
        }
      }
      return { ...sig, tSamples: appendedT, cleanSamples: appendedY };
    });
    // keep full concatenated arrays so individual signals span T * N (match analog/digitized)
    individualSignalsPlot = expandedIndividuals.map(sig => ({ ...sig }));
  }

  return (
    <div style={{ visibility: twReady ? 'visible' : 'hidden' }} className="min-h-screen bg-gray-50 text-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 p-4 md:p-6">
        {/* Controls Sidebar */}
        <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-6 h-fit">
          <h1 className="text-lg font-semibold">Signal Generator</h1>
            <div className="mt-2">
              {/* Collapsible groups to save vertical space */}
              <Accordion>
              <Collapsible id="signals" title="Signals" defaultOpen={false}>
                <SignalControls
                  signals={signals}
                  setSignals={setSignals}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium">Noise level (0-1)</label>
                  <input type="range" min={0} max={1} step={0.01} value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} className="mt-2 w-full" />
                  <div className="text-xs text-gray-600">{noiseLevel.toFixed(2)}</div>
                </div>
              </Collapsible>

              <Collapsible id="sampling" title="Sampling" defaultOpen={false}>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-sm font-medium">Sampling Rate (Hz)</label>
                    <input type="number" value={fs} onChange={e => handleSetFs(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={1} step={1} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Fmax (Hz)</label>
                    <input type="number" value={Math.round(fmax ?? (fs / 2.56))} onChange={e => handleSetFmax(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" min={1} step={1} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-sm font-medium">Samples (N)</label>
                    <select value={numSamples} onChange={e => handleSetNumSamples(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
                      {pow2Options.map((n: number) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Lines (LOR)</label>
                    <select value={lor ?? Math.round(numSamples / 2.56)} onChange={e => handleSetLor(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
                      {lorOptions.map((l: number) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-[11px] text-gray-500">Delta F (df)</div>
                    <div className="text-[13px] font-mono font-medium text-gray-800">{(() => {
                      const L = lor ?? Math.round(numSamples / 2.56);
                      const fm = fmax ?? (fs / 2.56);
                      const mult = (windowType === 'hanning') ? 1.5 : 1.0;
                      const df = fm / Math.max(1, L) * mult;
                      return df.toFixed(6);
                    })()}</div>
                  </div>

                  <div>
                    <div className="text-[11px] text-gray-500">Time period T (s)</div>
                    <div className="text-[13px] font-mono font-medium text-gray-800">{(() => {
                      const L = lor ?? Math.round(numSamples / 2.56);
                      const fm = fmax ?? (fs / 2.56);
                      const T = L / Math.max(1e-12, fm);
                      return T.toFixed(6);
                    })()}</div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-500 col-span-2">{(() => {
                  const map: Record<string, number> = {
                    rectangular: 1.0,
                    hanning: 1.5,
                    hamming: 1.36,
                    blackman: 1.73,
                  };
                  const name = (windowType ?? 'rectangular');
                  const factor = map[name] ?? 1.0;
                  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
                  if (factor === 1.0) return `Window: ${displayName} (factor ${factor.toFixed(2)}×) — no effective df increase.`;
                  return `Window: ${displayName} (factor ${factor.toFixed(2)}×) — effective df scaled by ~${factor.toFixed(2)}×.`;
                })()}</div>
              </Collapsible>

              <Collapsible id="windows" title="Windows & Averaging" defaultOpen={false}>
                <WindowingControls windowType={windowType} setWindowType={setWindowType} showWindowed={showWindowed} setShowWindowed={setShowWindowed} />
                <div className="mt-3">
                  <AveragingControls
                    averagingMode={averagingMode}
                    setAveragingMode={setAveragingMode}
                    segmentLength={segmentLength}
                    setSegmentLength={setSegmentLength}
                    overlapPercent={overlapPercent}
                    setOverlapPercent={setOverlapPercent}
                    numAverages={numAverages}
                    setNumAverages={setNumAverages}
                  />
                </div>
              </Collapsible>
                  <Collapsible id="filters" title="Filters" defaultOpen={false}>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-sm font-medium">Filter Type</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value as 'none' | 'low' | 'high' | 'bandpass' | 'bandstop')} className="mt-1 w-full rounded border p-2 bg-white text-gray-800">
                          <option value="none">None</option>
                          <option value="low">Low-pass</option>
                          <option value="high">High-pass</option>
                          <option value="bandpass">Band-pass</option>
                          <option value="bandstop">Band-stop</option>
                        </select>
                      </div>
                      {(filterType === 'low' || filterType === 'high') && (
                        <div>
                          <label className="block text-sm font-medium">Cutoff (Hz)</label>
                          <input type="number" value={cutoffLow} onChange={e => setCutoffLow(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
                        </div>
                      )}
                      {(filterType === 'bandpass' || filterType === 'bandstop') && (
                        <>
                          <div>
                            <label className="block text-sm font-medium">Cutoff Low (Hz)</label>
                            <input type="number" value={cutoffLow} onChange={e => setCutoffLow(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium">Cutoff High (Hz)</label>
                            <input type="number" value={cutoffHigh} onChange={e => setCutoffHigh(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-sm font-medium">Filter Order (odd)</label>
                        <input type="number" min={3} step={2} value={filterOrder} onChange={e => setFilterOrder(Math.max(3, Number(e.target.value) | 1))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Show colored bands</label>
                        <input type="checkbox" className="mt-2" checked={showBands} onChange={e => setShowBands(e.target.checked)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Transition width (Hz)</label>
                        <input type="number" min={0} value={transitionWidth} onChange={e => setTransitionWidth(Number(e.target.value))} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
                        <div className="text-xs text-gray-500">Set {'>'}0 to visualize transition bands (half-width)</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Enable analog anti-alias filter</label>
                        <input type="checkbox" className="mt-2" checked={antiAliasEnabled} onChange={e => setAntiAliasEnabled(e.target.checked)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Anti-alias cutoff (Hz)</label>
                        <input type="number" min={1} value={antiAliasCutoff} onChange={e => { setAntiAliasCutoff(Number(e.target.value)); setAntiAliasTouched(true); }} className="mt-1 w-full rounded border p-2 bg-white text-gray-800" />
                        <div className="text-xs text-gray-500">Apply low-pass to analog waveform before sampling when enabled. Default is current Fmax mapping.</div>
                      </div>
                    </div>
                  </Collapsible>
              </Accordion>
            </div>
          
          {/* tip removed per user request */}
        </aside>

        {/* Plots Panel */}
        <main className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex gap-4 mb-2">
              <label><input type="checkbox" checked={showAnalog} onChange={e => setShowAnalog(e.target.checked)} /> Analog</label>
              <label><input type="checkbox" checked={showDigitized} onChange={e => setShowDigitized(e.target.checked)} /> Digitized</label>
              <label><input type="checkbox" checked={showIndividuals} onChange={e => setShowIndividuals(e.target.checked)} /> Individual Signals</label>
              {/* Max Revolutions removed - display span controlled by LOR / Fmax or averaging mode */}
            </div>
            {/* Frame buttons removed: use legend to toggle overlays if needed */}
            <TimePlot
              tAnalog={tAnalogPlotFinal}
              yAnalog={yAnalogPlotFinal}
              tSamples={tSamplesPlotFinal}
              ySamples={ySamplesPlotFinal}
              frames={undefined}
              framesData={undefined}
              windowedFrames={windowedFrames}
              windowedT={windowedT}
              windowedY={windowedY}
              tFiltered={tFiltered}
              yFiltered={yFiltered}
              individualSignals={showIndividuals ? individualSignalsPlot : []}
              showAnalog={showAnalog}
              showDigitized={showDigitized}
              xAxisMax={xAxisMax}
              overlapBars={overlapBars}
              title="Time-Domain Signal"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <SpectrumPlot
              freq={single.freq}
              magSingle={single.mag}
              freqAveraged={averaged?.freq}
              magAveraged={averaged?.mag}
              fs={fs}
              filteredFreq={filteredFreq}
              filteredMag={filteredMag}
              filterLines={filterLines}
              filterType={filterType}
              showBands={showBands}
              transitionWidth={transitionWidth}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
