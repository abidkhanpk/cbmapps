"use client";
import ControlPanel from './ControlPanel';
import SignalPlot from './SignalPlot';
import { useState } from 'react';
import { Layout, Data } from 'plotly.js';

export default function SignalGenerator() {
  type SignalParams = {
    frequency: number;
    amplitude: number;
    phase: number;
    noise: number;
    sampling: number;
    window: string;
    averaging: string;
    type: string;
  };
  type PlotData = {
    data: Data[];
    layout: Partial<Layout>;
  };
  type SignalData = {
    timePlot?: PlotData;
    fftPlot?: PlotData;
    comparisonPlot?: PlotData;
  };
  const [params, setParams] = useState<SignalParams>({
    frequency: 10,
    amplitude: 1,
    phase: 0,
    noise: 0,
    sampling: 100,
    window: 'Hanning',
    averaging: 'Linear',
    type: 'Sine',
  });
  const [data, setData] = useState<SignalData | null>(null);

  const handleChange = (newParams: SignalParams) => {
    setParams(newParams);
    fetch('/api/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newParams),
    })
      .then((res) => res.json())
      .then((d: SignalData) => setData(d));
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Signal Generator & FFT</h1>
  <ControlPanel params={params as Record<string, string | number>} onChange={(p: Record<string, string | number>) => handleChange(p as SignalParams)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <SignalPlot title="Time Domain" data={data?.timePlot} />
        <SignalPlot title="Frequency Spectrum" data={data?.fftPlot} />
      </div>
      {data?.comparisonPlot && (
        <div className="mt-8">
          <SignalPlot title="Comparison" data={data.comparisonPlot} />
        </div>
      )}
    </div>
  );
}
