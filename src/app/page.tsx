"use client";
import React, { useState, useEffect } from 'react';
import { SignalControls } from '@/components/SignalControls';
import { WindowingControls } from '@/components/WindowingControls';
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
    // ensure n is one of pow2Options
    if (!pow2Options.includes(n)) n = pow2Options[0];
    setNumSamples(n);
    const idx = pow2Options.indexOf(n);
    setLor(lorOptions[idx]);
  };

  const handleSetLor = (l: number) => {
    const idx = lorOptions.indexOf(l);
    if (idx === -1) return; // ignore invalid
    const n = pow2Options[idx];
    setLor(l);
    setNumSamples(n);
  };

  const handleSetFs = (f: number) => {
    if (isNaN(f) || f <= 0) return;
    setFs(f);
    // keep Fmax as integer (rounded)
    setFmax(Math.round(f / 2.56));
  };

  const handleSetFmax = (fm: number) => {
    if (isNaN(fm) || fm <= 0) return;
    const fmInt = Math.round(fm);
    setFmax(fmInt);
    // keep fs integer as well (rounded)
    setFs(Math.round(fmInt * 2.56));
  };

  // Compute max frequency for revolution calculation
  const maxFreq = signals.reduce((max, sig) => Math.max(max, sig.frequency), 0);
  const period = maxFreq > 0 ? 1 / maxFreq : 1;
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
      // restore previous value when toggled off
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
  const individualSignalsPlot = individualSignals.map(sig => {
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
    // frame length in seconds is Twindow, number of frames = numAverages
    const frameLenSamples = Math.max(1, Math.round(Twindow * fs));
    // build frames starting at sample 0, successive frames
    frames = [];
    framesData = [];
    const totalSamples = tSamples.length;
    for (let k = 0; k < numAverages; k++) {
      const start = k * frameLenSamples;
      // collect frameLenSamples samples, wrap around using modulo if needed
      const tArr: number[] = [];
      const yArr: number[] = [];
      for (let n = 0; n < frameLenSamples; n++) {
        const idx = (start + n) % totalSamples;
        // compute time for wrapped samples: add multiples of total duration when wrapped
        const wrapCount = Math.floor((start + n) / totalSamples);
        const sampleTime = tSamples[idx] + wrapCount * (tSamples[totalSamples - 1] - tSamples[0] + (tSamples[1] - tSamples[0] || 0));
        tArr.push(sampleTime);
        yArr.push(noisySamples[idx]);
      }
      frames.push({ t0: tArr[0], t1: tArr[tArr.length - 1] });
      framesData.push({ t: tArr, y: yArr });
    }
    // do not modify state during render; desiredSegmentLength is computed above and passed to useSpectrum
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
  } catch (e) {
    // defensive: do nothing on error
    windowedT = undefined;
    windowedY = undefined;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 p-4 md:p-6">
        {/* Controls Sidebar */}
        <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-5 space-y-6 h-fit">
          <h1 className="text-lg font-semibold">Signal Simulator</h1>
          {/* Will replace with multi-signal controls in next step */}
          <SignalControls
            signals={signals}
            setSignals={setSignals}
            fs={fs}
            setFs={handleSetFs}
            noiseLevel={noiseLevel}
            setNoiseLevel={setNoiseLevel}
            numSamples={numSamples}
            setNumSamples={handleSetNumSamples}
            lor={lor}
            setLor={handleSetLor}
            fmax={fmax}
            setFmax={handleSetFmax}
            pow2Options={pow2Options}
            lorOptions={lorOptions}
            windowType={windowType}
          />
          <div className="border-t pt-4">
            <WindowingControls windowType={windowType} setWindowType={setWindowType} showWindowed={showWindowed} setShowWindowed={setShowWindowed} />
          </div>
          <div className="border-t pt-4">
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
              tAnalog={tAnalogPlot}
              yAnalog={yAnalogPlot}
              tSamples={tSamplesPlot}
              ySamples={ySamplesPlot}
              frames={frames}
              framesData={framesData}
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
