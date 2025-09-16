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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Collapsible Sidebar */}
      <div className={`transition-all duration-300 bg-white shadow-lg ${sidebarOpen ? 'w-80' : 'w-16'} flex flex-col`}>
        <button
          className="p-2 focus:outline-none text-gray-500 hover:text-blue-600"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? '⏴' : '⏵'}
        </button>
        {sidebarOpen && (
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Signal Generator Controls</h2>
            <ControlPanel params={params as Record<string, string | number>} onChange={(p: Record<string, string | number>) => handleChange(p as SignalParams)} />
          </div>
        )}
      </div>
      {/* Main Simulator Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Signal Generator & FFT</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <SignalPlot title="Time Domain" data={data?.timePlot} />
          <SignalPlot title="Frequency Spectrum" data={data?.fftPlot} />
        </div>
        {data?.comparisonPlot && (
          <div className="mt-8 w-full">
            <SignalPlot title="Comparison" data={data.comparisonPlot} />
          </div>
        )}
      </div>
    </div>
  );
}
