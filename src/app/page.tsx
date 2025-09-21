"use client";
import React, { useState, useEffect } from 'react';
import { SignalControls } from '@/components/SignalControls';
import { WindowingControls } from '@/components/WindowingControls';
import { Collapsible, Accordion } from '@/components/Collapsible';
import { AveragingControls } from '@/components/AveragingControls';
import { TimePlot } from '@/components/TimePlot';
import { SpectrumPlot } from '@/components/SpectrumPlot';
import { useSignal, SignalType } from '@/hooks/useSignal';
import { useSpectrum, AveragingMode } from '@/hooks/useSpectrum';
import { getWindow, applyWindow } from '@/lib/dsp';
import type { WindowType } from '@/lib/dsp';
import type { SingleSignalParams } from '@/hooks/useSignal';

export default function Home() {
  const [maxRevolutions, setMaxRevolutions] = useState(5);
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
    const period = maxFreq > 0 ? 1 / maxFreq : 1;
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
  // remember previous manual maxRevolutions to restore when toggling off
  const [prevMaxRevolutions, setPrevMaxRevolutions] = useState<number>(5);
  const [averagingMode, setAveragingMode] = useState<AveragingMode>('none');
  const [segmentLength, setSegmentLength] = useState<number>(256);
  const [numAverages, setNumAverages] = useState<number>(5);
  const [overlapPercent, setOverlapPercent] = useState<number>(50);

  // Use new multi-signal hook signature
  const { tSamples, noisySamples, cleanSamples, tAnalog, analog, individualSignals } = useSignal({
    signals,
    fs,
    noiseLevel,
    numSamples,
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

  const handleSetFmax = (fm: number) => {
    if (isNaN(fm) || fm <= 0) return;
    const fmInt = Math.round(fm);
    setFmax(fmInt);
    setFs(Math.round(fmInt * 2.56));
  };

  // Auto-adjust maxRevolutions when showWindowed toggles. Use effect to avoid state changes during render.
  useEffect(() => {
    if (showWindowed) {
      if (fmax > 0 && lor > 0) {
        const Twindow = lor / fmax; // seconds
        const needed = Math.max(1, Math.ceil(Twindow / Math.max(period, 1e-12)));
        if (needed !== maxRevolutions) {
          setPrevMaxRevolutions(maxRevolutions);
          setMaxRevolutions(needed);
        }
      }
    } else {
      if (prevMaxRevolutions && prevMaxRevolutions !== maxRevolutions) {
        setMaxRevolutions(prevMaxRevolutions);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWindowed, fmax, lor]);

  const maxTime = maxRevolutions * period;
  // Filter time waveform data
  const filterByTime = (tArr: Float64Array | number[], yArr: Float64Array | number[]) => {
    const idx = tArr.findIndex(t => t > maxTime);
    const endIdx = idx === -1 ? tArr.length : idx;
    return [Array.from(tArr).slice(0, endIdx), Array.from(yArr).slice(0, endIdx)];
  };
  const [tAnalogPlot, yAnalogPlot] = filterByTime(tAnalog, analog);
  const [tSamplesPlot, ySamplesPlot] = filterByTime(tSamples, cleanSamples);
  let individualSignalsPlot = individualSignals.map(sig => {
    const [tS, yS] = filterByTime(sig.tSamples, sig.cleanSamples);
    return { ...sig, tSamples: tS, cleanSamples: yS };
  });

  // determine segment length to use for spectrum computation
  let desiredSegmentLength = segmentLength;
  if (averagingMode === 'linear') {
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
  if (averagingMode !== 'none' && numAverages > 0) {
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    frames = [];
    framesData = [];
    const totalSamples = tSamples.length;
    const dt = 1 / fs;
    for (let k = 0; k < numAverages; k++) {
      const start = k * frameLenSamples;
      const tArr: number[] = [];
      const yArr: number[] = [];
      for (let n = 0; n < frameLenSamples; n++) {
        const idx = (start + n) % totalSamples;
        tArr.push(n * dt);
        yArr.push(noisySamples[idx]);
      }
      frames.push({ t0: k * Twindow, t1: (k + 1) * Twindow });
      framesData.push({ t: tArr, y: yArr });
    }
  }


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

  // If linear averaging is active, build appended sampled & analog arrays so the time waveform equals N * Twindow
  let tAnalogPlotFinal = tAnalogPlot;
  let yAnalogPlotFinal = yAnalogPlot;
  let tSamplesPlotFinal = tSamplesPlot;
  let ySamplesPlotFinal = ySamplesPlot;
  if (averagingMode === 'linear' && typeof framesData !== 'undefined' && framesData.length > 0) {
    const Twindow = lor / Math.max(fmax, 1e-12);
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    const totalSamples = tSamples.length;
    const appendedSampledT: number[] = [];
    const appendedSampledY: number[] = [];
    const appendedAnalogT: number[] = [];
    const appendedAnalogY: number[] = [];
    for (let k = 0; k < framesData.length; k++) {
      const fd = framesData[k];
      const start = k * frameLenSamples;
      for (let n = 0; n < fd.t.length; n++) {
        const idx = (start + n) % totalSamples;
        const tRel = fd.t[n];
        appendedSampledT.push(k * Twindow + tRel);
        appendedSampledY.push(cleanSamples[idx]);
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
  // For linear averaging we want to show the full concatenated N * Twindow waveform.
  tAnalogPlotFinal = appendedAnalogT;
  yAnalogPlotFinal = appendedAnalogY;
  tSamplesPlotFinal = appendedSampledT;
  ySamplesPlotFinal = appendedSampledY;

    // If windowed overlay exists and linear averaging, expand it to span all frames (if not already done)
    if (windowedT && windowedY && windowedT.length <= frameLenSamples) {
      const appendedWT: number[] = [];
      const appendedWY: number[] = [];
      for (let k = 0; k < framesData.length; k++) {
        for (let n = 0; n < windowedY.length; n++) {
          appendedWT.push(k * Twindow + (windowedT[n] - windowedT[0]));
          appendedWY.push(windowedY[n]);
        }
      }
      windowedT = appendedWT;
      windowedY = appendedWY;
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 p-4 md:p-6">
        {/* Controls Sidebar */}
        <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-6 h-fit">
          <h1 className="text-lg font-semibold">Signal Simulator</h1>
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
                    <label className="block text-sm font-medium">Sampling frequency (Hz)</label>
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
              </Accordion>
            </div>
          
          <div className="text-xs text-gray-500 border-t pt-3">
            Tip: Use the camera icon on each plot to export as PNG.
          </div>
        </aside>

        {/* Plots Panel */}
        <main className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <div className="flex gap-4 mb-2">
              <label><input type="checkbox" checked={showAnalog} onChange={e => setShowAnalog(e.target.checked)} /> Analog</label>
              <label><input type="checkbox" checked={showDigitized} onChange={e => setShowDigitized(e.target.checked)} /> Digitized</label>
              <label><input type="checkbox" checked={showIndividuals} onChange={e => setShowIndividuals(e.target.checked)} /> Individual Signals</label>
              <label className="ml-4">Max Revolutions: <input type="number" min={1} max={20} value={maxRevolutions} onChange={e => setMaxRevolutions(Number(e.target.value))} className="w-16 ml-1 border rounded px-1" disabled={showWindowed} /></label>
              {showWindowed && <span className="text-xs text-gray-500 ml-2">(auto for window: shows full T)</span>}
            </div>
            <TimePlot
              tAnalog={tAnalogPlotFinal}
              yAnalog={yAnalogPlotFinal}
              tSamples={tSamplesPlotFinal}
              ySamples={ySamplesPlotFinal}
              frames={averagingMode === 'linear' ? undefined : frames}
              framesData={averagingMode === 'linear' ? undefined : framesData}
              windowedT={windowedT}
              windowedY={windowedY}
              individualSignals={showIndividuals ? individualSignalsPlot : []}
              showAnalog={showAnalog}
              showDigitized={showDigitized}
              title="Time-Domain Signal"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <SpectrumPlot freq={single.freq} magSingle={single.mag} freqAveraged={averaged?.freq} magAveraged={averaged?.mag} fs={fs} />
          </div>
        </main>
      </div>
    </div>
  );
}
