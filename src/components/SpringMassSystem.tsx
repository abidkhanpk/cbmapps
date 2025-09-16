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
  import { Layout, Data } from 'plotly.js';
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
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Spring-Mass System</h1>
  <ControlPanel params={params as Record<string, string | number>} onChange={(p) => handleChange(p as SpringParams)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <SignalPlot title="Displacement (Time Domain)" data={data?.timePlot} />
        <SignalPlot title="Amplitude-Frequency (Bode)" data={data?.bodePlot} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <SignalPlot title="Phase-Frequency" data={data?.phasePlot} />
        <SpringMassAnimation data={data?.animationData} />
      </div>
    </div>
  );
}
