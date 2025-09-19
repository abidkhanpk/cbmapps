"use client";
import React, { useState } from 'react';
import { SignalControls } from '@/components/SignalControls';
import { WindowingControls } from '@/components/WindowingControls';
import { AveragingControls } from '@/components/AveragingControls';
import { TimePlot } from '@/components/TimePlot';
import { SpectrumPlot } from '@/components/SpectrumPlot';
import { useSignal, SignalType } from '@/hooks/useSignal';
import { useSpectrum, AveragingMode } from '@/hooks/useSpectrum';
import type { WindowType } from '@/lib/dsp';
import type { SingleSignalParams } from '@/hooks/useSignal';

export default function Home() {
  const [maxRevolutions, setMaxRevolutions] = useState(2);
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
  const [fs, setFs] = useState<number>(1000);
  const [noiseLevel, setNoiseLevel] = useState<number>(0);
  const [numSamples, setNumSamples] = useState<number>(1024);

  // Spectrum / FFT controls: allow selecting number of samples (power of two) and LOR (lines)
  const pow2Options = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  const lorOptions = pow2Options.map(n => Math.round(n / 2.56));
  const [lor, setLor] = useState<number>(Math.round(numSamples / 2.56));
  const [fmax, setFmax] = useState<number>(fs / 2.56);

  const [windowType, setWindowType] = useState<WindowType>('hanning');
  const [averagingMode, setAveragingMode] = useState<AveragingMode>('none');
  const [segmentLength, setSegmentLength] = useState<number>(256);
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
    setFmax(f / 2.56);
  };

  const handleSetFmax = (fm: number) => {
    if (isNaN(fm) || fm <= 0) return;
    setFmax(fm);
    setFs(fm * 2.56);
  };

  // Compute max frequency for revolution calculation
  const maxFreq = signals.reduce((max, sig) => Math.max(max, sig.frequency), 0);
  const period = maxFreq > 0 ? 1 / maxFreq : 1;
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

  const { single, averaged } = useSpectrum({
    signal: noisySamples,
    fs,
    windowType,
    averagingMode,
    segmentLength,
    overlapPercent,
  });

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
          />
          <div className="border-t pt-4">
            <WindowingControls windowType={windowType} setWindowType={setWindowType} />
          </div>
          <div className="border-t pt-4">
            <AveragingControls
              averagingMode={averagingMode}
              setAveragingMode={setAveragingMode}
              segmentLength={segmentLength}
              setSegmentLength={setSegmentLength}
              overlapPercent={overlapPercent}
              setOverlapPercent={setOverlapPercent}
            />
          </div>
          <div className="border-t pt-4 space-y-2">
            <label className="block text-sm font-medium">FFT / Spectrum info</label>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Lines (LOR)</div>
                <div className="font-medium">{lor}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Fmax (Hz)</div>
                <div className="font-medium">{fmax.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Delta F (df)</div>
                <div className="font-medium">
                  {(() => {
                    const mult = windowType === 'hanning' ? 1.5 : 1.0;
                    const df = (fmax / lor) * mult;
                    return df.toFixed(6);
                  })()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Time period T (s)</div>
                <div className="font-medium">
                  {(() => {
                    const T = lor / Math.max(1e-12, fmax);
                    return T.toFixed(6);
                  })()}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Note: Hanning window increases effective resolution by ~1.5× for df.</div>
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
              <label className="ml-4">Max Revolutions: <input type="number" min={1} max={20} value={maxRevolutions} onChange={e => setMaxRevolutions(Number(e.target.value))} className="w-16 ml-1 border rounded px-1" /></label>
            </div>
            <TimePlot
              tAnalog={tAnalogPlot}
              yAnalog={yAnalogPlot}
              tSamples={tSamplesPlot}
              ySamples={ySamplesPlot}
              individualSignals={showIndividuals ? individualSignalsPlot : []}
              showAnalog={showAnalog}
              showDigitized={showDigitized}
              title="Time-Domain Signal"
            />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <SpectrumPlot freq={single.freq} magSingle={single.mag} magAveraged={averaged?.mag} fs={fs} />
          </div>
        </main>
      </div>
    </div>
  );
}
