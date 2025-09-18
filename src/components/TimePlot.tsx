'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

export interface TimePlotProps {
  tAnalog: ArrayLike<number>;
  yAnalog: ArrayLike<number>;
  tSamples: ArrayLike<number>;
  ySamples: ArrayLike<number>;
  title?: string;
}

export const TimePlot: React.FC<TimePlotProps> = ({ tAnalog, yAnalog, tSamples, ySamples, title = 'Time Domain' }) => {
  const traces: Data[] = [
    {
      x: Array.from(tAnalog),
      y: Array.from(yAnalog),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#6b7280', width: 1.5 },
      name: 'Analog (reference)',
    },
    {
      x: Array.from(tSamples),
      y: Array.from(ySamples),
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: '#1d4ed8', size: 5 },
      line: { color: '#1d4ed8', width: 2 },
      name: 'Digitized (sampled)',
    },
  ];
  const layout: Partial<Layout> = {
    title,
    uirevision: 'timeplot',
    margin: { l: 60, r: 20, t: 40, b: 40 },
    xaxis: { title: 'Time (s)', gridcolor: '#eee' },
    yaxis: { title: 'Amplitude', gridcolor: '#eee' },
    legend: { orientation: 'h' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  };
  const config: Partial<Config> = { responsive: true, displaylogo: false };
  return (
    <div className="w-full">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '360px' }} />
    </div>
  );
};
