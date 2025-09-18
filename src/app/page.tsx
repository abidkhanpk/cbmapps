'use client';
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
            setFs={setFs}
            noiseLevel={noiseLevel}
            setNoiseLevel={setNoiseLevel}
            numSamples={numSamples}
            setNumSamples={setNumSamples}
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
            </div>
            <TimePlot
              tAnalog={tAnalog}
              yAnalog={analog}
              tSamples={tSamples}
              ySamples={cleanSamples}
              individualSignals={showIndividuals ? individualSignals : []}
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
