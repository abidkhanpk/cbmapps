'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

export interface SpectrumPlotProps {
  freq: ArrayLike<number>;
  magSingle: ArrayLike<number>;
  freqAveraged?: ArrayLike<number>;
  magAveraged?: ArrayLike<number>;
  fs: number;
  // optional filtered spectrum to show
  filteredFreq?: ArrayLike<number>;
  filteredMag?: ArrayLike<number>;
  // vertical filter cutoff lines
  filterLines?: number[];
  // filter type to decide shaded stop area
  filterType?: 'none' | 'low' | 'high' | 'bandpass' | 'bandstop';
}
export const SpectrumPlot: React.FC<SpectrumPlotProps> = ({ freq, magSingle, freqAveraged, magAveraged, fs, filteredFreq, filteredMag, filterLines, filterType = 'none' }) => {
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
      x: Array.from(freqAveraged ?? freq),
      y: Array.from(magAveraged),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#ef4444', width: 2 },
      name: 'Averaged',
    });
  }
  if (filteredFreq && filteredMag) {
    traces.push({ x: Array.from(filteredFreq), y: Array.from(filteredMag), type: 'scatter', mode: 'lines', line: { color: '#0ea5a0', width: 2 }, name: 'Filtered FFT' });
  }

  const nyquist = fs / 2;
  const layout: Partial<Layout> = {
    title: 'Magnitude Spectrum',
    uirevision: 'spectrumplot',
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
  // add filter cutoff vertical lines if provided
  if (filterLines && filterLines.length > 0) {
    const cutoffShapes = (filterLines || []).map((f) => ({ type: 'line', x0: f, x1: f, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: '#0ea5a0', width: 1, dash: 'dash' } }));
    layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(cutoffShapes as unknown as NonNullable<Layout['shapes']>);
    const cutoffAnnotations = (filterLines || []).map((f) => ({ x: f, y: 1, xref: 'x', yref: 'paper', text: `${f.toFixed(2)} Hz`, showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10, color: '#0ea5a0' } }));
    layout.annotations = ((layout.annotations ?? []) as NonNullable<Layout['annotations']>).concat(cutoffAnnotations as unknown as NonNullable<Layout['annotations']>);

    // Add shaded stop-band areas (darker) to highlight removed frequencies
    const nyq = fs / 2;
  const shaded: Array<Record<string, unknown>> = [];
    if (filterType === 'low') {
      const fc = filterLines[0];
      shaded.push({ type: 'rect', x0: fc, x1: nyq, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(14,165,160,0.12)', line: { width: 0 } });
    } else if (filterType === 'high') {
      const fc = filterLines[0];
      shaded.push({ type: 'rect', x0: 0, x1: fc, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(14,165,160,0.12)', line: { width: 0 } });
    } else if (filterType === 'bandpass') {
      const lo = filterLines[0];
      const hi = filterLines[1];
      shaded.push({ type: 'rect', x0: 0, x1: lo, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(14,165,160,0.12)', line: { width: 0 } });
      shaded.push({ type: 'rect', x0: hi, x1: nyq, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(14,165,160,0.12)', line: { width: 0 } });
    } else if (filterType === 'bandstop') {
      const lo = filterLines[0];
      const hi = filterLines[1];
      shaded.push({ type: 'rect', x0: lo, x1: hi, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(14,165,160,0.18)', line: { width: 0 } });
    }
    if (shaded.length > 0) layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(shaded as unknown as NonNullable<Layout['shapes']>);
  }
  const config: Partial<Config> = { responsive: true, displaylogo: false };

  return (
    <div className="w-full">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '380px' }} />
    </div>
  );
};
