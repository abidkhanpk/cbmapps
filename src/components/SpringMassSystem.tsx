"use client";
import ControlPanel from './ControlPanel';
import SignalPlot from './SignalPlot';
import SpringMassAnimation from './SpringMassAnimation';
import { useState } from 'react';
import { Layout, Data } from 'plotly.js';

export default function SpringMassSystem() {
  type SpringParams = {
    mass: number;
    stiffness: number;
    damping: number;
    excitationFreq: number;
    excitationAmp: number;
  };
  type PlotData = {
    data: Data[];
    layout: Partial<Layout>;
  };
  type SpringData = {
    timePlot?: PlotData;
    bodePlot?: PlotData;
    phasePlot?: PlotData;
    animationData?: { x: number };
  };
  const [params, setParams] = useState<SpringParams>({
    mass: 1,
    stiffness: 10,
    damping: 0.1,
    excitationFreq: 5,
    excitationAmp: 1,
  });
  const [data, setData] = useState<SpringData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleChange = (newParams: SpringParams) => {
    setParams(newParams);
    fetch('/api/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newParams),
    })
      .then((res) => res.json())
      .then((d: SpringData) => setData(d));
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
            <h2 className="text-lg font-semibold mb-4">Spring-Mass Controls</h2>
            <ControlPanel params={params as Record<string, string | number>} onChange={(p) => handleChange(p as SpringParams)} />
          </div>
        )}
      </div>
      {/* Main Simulator Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">Spring-Mass System</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <SignalPlot title="Displacement (Time Domain)" data={data?.timePlot} />
          <SignalPlot title="Amplitude-Frequency (Bode)" data={data?.bodePlot} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-8">
          <SignalPlot title="Phase-Frequency" data={data?.phasePlot} />
          <SpringMassAnimation data={data?.animationData} />
        </div>
      </div>
    </div>
  );
}
