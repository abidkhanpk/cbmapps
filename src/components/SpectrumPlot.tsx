'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

export interface SpectrumPlotProps {
  freq: ArrayLike<number>;
  magSingle: ArrayLike<number>;
  magAveraged?: ArrayLike<number>;
  fs: number;
}

export const SpectrumPlot: React.FC<SpectrumPlotProps> = ({ freq, magSingle, magAveraged, fs }) => {
  const traces: Data[] = [
    {
      x: Array.from(freq),
      y: Array.from(magSingle),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#16a34a', width: 2 },
      name: 'Single FFT',
    },
  ];
  if (magAveraged) {
    traces.push({
      x: Array.from(freq),
      y: Array.from(magAveraged),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', width: 2 },
      name: 'Averaged',
    });
  }

  const nyquist = fs / 2;
  const layout: Partial<Layout> = {
    title: 'Magnitude Spectrum',
    margin: { l: 60, r: 20, t: 40, b: 40 },
    xaxis: { title: 'Frequency (Hz)', gridcolor: '#eee' },
    yaxis: { title: 'Magnitude', gridcolor: '#eee' },
    shapes: [
      {
        type: 'line',
        x0: nyquist,
        x1: nyquist,
        y0: 0,
        y1: 1,
        xref: 'x',
        yref: 'paper',
        line: { color: '#555', width: 1, dash: 'dot' },
      }
    ],
    annotations: [
      { x: nyquist, y: 1, xref: 'x', yref: 'paper', text: 'Nyquist', showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10, color: '#555' } }
    ],
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  };
  const config: Partial<Config> = { responsive: true, displaylogo: false };

  return (
    <div className="w-full">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '380px' }} />
    </div>
  );
};
