'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

export interface TimePlotProps {
  t: ArrayLike<number>;
  y: ArrayLike<number>;
  yOverlay?: { data: ArrayLike<number>; name?: string; color?: string };
  title?: string;
}

export const TimePlot: React.FC<TimePlotProps> = ({ t, y, yOverlay, title = 'Time Domain' }) => {
  const traces: Data[] = [
    {
      x: Array.from(t),
      y: Array.from(y),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#2563eb', width: 2 },
      name: 'Signal',
    },
  ];
  if (yOverlay) {
    traces.push({
      x: Array.from(t),
      y: Array.from(yOverlay.data),
      type: 'scatter',
      mode: 'lines',
      line: { color: yOverlay.color ?? '#9ca3af', width: 1.5, dash: 'dot' },
      name: yOverlay.name ?? 'Overlay',
    });
  }
  const layout: Partial<Layout> = {
    title,
    margin: { l: 60, r: 20, t: 40, b: 40 },
    xaxis: { title: 'Time (s)', gridcolor: '#eee' },
    yaxis: { title: 'Amplitude', gridcolor: '#eee' },
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
