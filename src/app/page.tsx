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

export default function Home() {
  // Defaults: sine, 10 Hz, 1 amplitude, 0 phase, 1000 Hz sampling, 1024 samples
  const [signalType, setSignalType] = useState<SignalType>('sine');
  const [amplitude, setAmplitude] = useState<number>(1);
  const [frequency, setFrequency] = useState<number>(10);
  const [phaseDeg, setPhaseDeg] = useState<number>(0);
  const [fs, setFs] = useState<number>(1000);
  const [noiseLevel, setNoiseLevel] = useState<number>(0);
  const [numSamples, setNumSamples] = useState<number>(1024);
  const [chirpStartFreq, setChirpStartFreq] = useState<number>(5);
  const [chirpEndFreq, setChirpEndFreq] = useState<number>(100);

  const [windowType, setWindowType] = useState<WindowType>('hanning');
  const [averagingMode, setAveragingMode] = useState<AveragingMode>('none');
  const [segmentLength, setSegmentLength] = useState<number>(256);
  const [overlapPercent, setOverlapPercent] = useState<number>(50);

  const { tSamples, noisySamples, cleanSamples, tAnalog, analog } = useSignal({
    type: signalType,
    amplitude,
    frequency,
    phaseDeg,
    fs,
    noiseLevel,
    numSamples,
    chirpStartFreq,
    chirpEndFreq,
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
          <SignalControls
            signalType={signalType}
            setSignalType={setSignalType}
            amplitude={amplitude}
            setAmplitude={setAmplitude}
            frequency={frequency}
            setFrequency={setFrequency}
            phaseDeg={phaseDeg}
            setPhaseDeg={setPhaseDeg}
            fs={fs}
            setFs={setFs}
            noiseLevel={noiseLevel}
            setNoiseLevel={setNoiseLevel}
            numSamples={numSamples}
            setNumSamples={setNumSamples}
            chirpStartFreq={chirpStartFreq}
            setChirpStartFreq={setChirpStartFreq}
            chirpEndFreq={chirpEndFreq}
            setChirpEndFreq={setChirpEndFreq}
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
            <TimePlot tAnalog={tAnalog} yAnalog={analog} tSamples={tSamples} ySamples={noisySamples} title="Time-Domain Signal" />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4">
            <SpectrumPlot freq={single.freq} magSingle={single.mag} magAveraged={averaged?.mag} fs={fs} />
          </div>
        </main>
      </div>
    </div>
  );
}
