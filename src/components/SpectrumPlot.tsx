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
    // area traces for shaded stop-bands will be prepended here if needed
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

  const fmax = Math.round(fs / 2.56);
  const layout: Partial<Layout> = {
    title: 'Magnitude Spectrum',
    uirevision: 'spectrumplot',
    margin: { l: 60, r: 20, t: 40, b: 40 },
    xaxis: { title: 'Frequency (Hz)', gridcolor: '#eee', range: [0, fmax], zeroline: false },
    yaxis: { title: 'Magnitude', gridcolor: '#eee' },
    // Fmax guide/annotation removed per user preference
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  };
  // Build explicit filled-area traces for stop-bands so the shaded region is always visible.
  const areaTraces: Data[] = [];
  const magsAll: number[] = [];
  magsAll.push(...Array.from(magSingle as ArrayLike<number>));
  if (magAveraged) magsAll.push(...Array.from(magAveraged as ArrayLike<number>));
  if (filteredMag) magsAll.push(...Array.from(filteredMag as ArrayLike<number>));
  const yMax = magsAll.length > 0 ? Math.max(...magsAll) : 1;

  if (filterLines && filterLines.length > 0) {
  const cutoffShapes = (filterLines || []).map((f) => ({ type: 'line', x0: f, x1: f, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: 'rgba(220,38,38,0.9)', width: 2, dash: 'solid' }, layer: 'above' }));
    layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(cutoffShapes as unknown as NonNullable<Layout['shapes']>);
    const cutoffAnnotations = (filterLines || []).map((f) => ({ x: f, y: 1, xref: 'x', yref: 'paper', text: `${f.toFixed(2)} Hz`, showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10, color: '#0ea5a0' } }));
    layout.annotations = ((layout.annotations ?? []) as NonNullable<Layout['annotations']>).concat(cutoffAnnotations as unknown as NonNullable<Layout['annotations']>);

    // Add shaded stop-band areas (darker) to highlight removed frequencies
    const nyq = Math.round(fs / 2.56); // use same Fmax mapping as layout
    const shaded: Array<Record<string, unknown>> = [];
    // Make shaded stop-band more visible (darker reddish tint)
    if (filterType === 'low') {
      const fc = filterLines[0];
      shaded.push({ type: 'rect', x0: fc, x1: nyq, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
      // add filled scatter rectangle from fc..nyq using y range [0,yMax]
  areaTraces.push({ x: [fc, fc, nyq, nyq], y: [0, yMax, yMax, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    } else if (filterType === 'high') {
      const fc = filterLines[0];
      shaded.push({ type: 'rect', x0: 0, x1: fc, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
  areaTraces.push({ x: [0, 0, fc, fc], y: [0, yMax, yMax, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    } else if (filterType === 'bandpass') {
      const lo = filterLines[0];
      const hi = filterLines[1];
      shaded.push({ type: 'rect', x0: 0, x1: lo, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
      shaded.push({ type: 'rect', x0: hi, x1: nyq, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
  areaTraces.push({ x: [0, 0, lo, lo], y: [0, yMax, yMax, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
  areaTraces.push({ x: [hi, hi, nyq, nyq], y: [0, yMax, yMax, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    } else if (filterType === 'bandstop') {
      const lo = filterLines[0];
      const hi = filterLines[1];
      shaded.push({ type: 'rect', x0: lo, x1: hi, y0: 0, y1: 1, xref: 'x', yref: 'paper', fillcolor: 'rgba(220,38,38,0.44)', line: { width: 0 }, layer: 'below' });
  areaTraces.push({ x: [lo, lo, hi, hi], y: [0, yMax, yMax, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    }
    if (shaded.length > 0) layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(shaded as unknown as NonNullable<Layout['shapes']>);
    // Prepend areaTraces so they draw below the FFT traces
    if (areaTraces.length > 0) traces.unshift(...areaTraces);
  }
  const config: Partial<Config> = { responsive: true, displaylogo: false };

  return (
    <div className="w-full">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '380px' }} />
    </div>
  );
};
