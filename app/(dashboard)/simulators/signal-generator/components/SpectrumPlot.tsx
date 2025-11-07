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
  // show colored pass/transition/stop bands
  showBands?: boolean;
  // transition band half-width in Hz (full transition width will be used as-is)
  transitionWidth?: number;
}
export const SpectrumPlot: React.FC<SpectrumPlotProps> = ({ freq, magSingle, freqAveraged, magAveraged, fs, filteredFreq, filteredMag, filterLines, filterType = 'none', showBands = false, transitionWidth = 0 }) => {
  // ...existing code...
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

  // Compute plotted y-range (data coordinates) so shapes align to the data axis baseline
  const magsAll: number[] = [];
  magsAll.push(...Array.from(magSingle as ArrayLike<number>));
  if (magAveraged) magsAll.push(...Array.from(magAveraged as ArrayLike<number>));
  if (filteredMag) magsAll.push(...Array.from(filteredMag as ArrayLike<number>));
  const yMax = magsAll.length > 0 ? Math.max(...magsAll) : 1;
  const yMin = magsAll.length > 0 ? Math.min(...magsAll) : 0;
  const yPad = (yMax - yMin) * 0.06 || 0.1;
  const yTop = yMax + yPad;

  const fmax = Math.round(fs / 2.56);
  const layout: Partial<Layout> = {
    title: 'Magnitude Spectrum',
    // include fmax in uirevision so reset/double-click restores to the current fmax range
    uirevision: `spectrumplot-${fmax}`,
    margin: { l: 60, r: 20, t: 40, b: 40 },
  xaxis: { title: 'Frequency (Hz)', gridcolor: '#eee', range: [0, fmax], autorange: false, zeroline: false },
    yaxis: { title: 'Magnitude', gridcolor: '#eee' },
    // Fmax guide/annotation removed per user preference
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  };

  // We force React to remount the Plot component whenever `fmax` changes by
  // using a key that includes fmax. This ensures Plotly's internal "initial
  // range" (used by the reset/double-click) corresponds to the current fmax
  // without importing plotly.js directly or calling relayout.
  
  // If user requested colored bands, create shapes for pass/transition/stop bands.
  if (filterLines && filterLines.length > 0 && showBands) {
    const shapes: Array<Record<string, unknown>> = [];
    const tw = Math.max(0, transitionWidth || 0);
    const passColor = 'rgba(144,238,144,0.35)';
    const transColor = 'rgba(173,216,230,0.28)';
    const stopColor = 'rgba(255,200,200,0.36)';
    const nyq = Math.round(fs / 2.56);
    const addRect = (x0: number, x1: number, color: string) => {
      const start = Math.max(0, Math.min(nyq, x0));
      const end = Math.max(0, Math.min(nyq, x1));
      if (end <= start) return;
      shapes.push({ type: 'rect', x0: start, x1: end, y0: 0, y1: yTop, xref: 'x', yref: 'y', fillcolor: color, line: { width: 0 }, layer: 'below' });
    };

    if (filterType === 'low') {
      const fc = filterLines[0] ?? 0;
      const passEnd = Math.min(nyq, fc);
      const transEnd = Math.min(nyq, fc + tw);
      addRect(0, passEnd, passColor);
      if (tw > 0) addRect(passEnd, transEnd, transColor);
      addRect(transEnd, nyq, stopColor);
    } else if (filterType === 'high') {
      const fc = filterLines[0] ?? 0;
      const passStart = Math.max(0, fc);
      const transStart = Math.max(0, fc - tw);
      addRect(0, transStart, stopColor);
      if (tw > 0) addRect(transStart, passStart, transColor);
      addRect(passStart, nyq, passColor);
    } else if (filterType === 'bandpass') {
      const lo = Math.min(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const hi = Math.max(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const lowerTransStart = Math.max(0, lo - tw);
      const upperTransEnd = Math.min(nyq, hi + tw);
      addRect(0, lowerTransStart, stopColor);
      if (tw > 0) addRect(lowerTransStart, lo, transColor);
      addRect(lo, hi, passColor);
      if (tw > 0) addRect(hi, upperTransEnd, transColor);
      addRect(upperTransEnd, nyq, stopColor);
    } else if (filterType === 'bandstop') {
      const lo = Math.min(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const hi = Math.max(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const lowerTransEnd = Math.min(hi, lo + tw);
      const upperTransStart = Math.max(lo, hi - tw);
      addRect(0, lo, passColor);
      if (tw > 0) addRect(lo, lowerTransEnd, transColor);
      addRect(lowerTransEnd, upperTransStart, stopColor);
      if (tw > 0) addRect(upperTransStart, hi, transColor);
      addRect(hi, nyq, passColor);
    }

    layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(shapes as unknown as NonNullable<Layout['shapes']>);
  }
  // Build explicit filled-area traces for stop-bands so the shaded region is always visible.
  const areaTraces: Data[] = [];

  if (filterLines && filterLines.length > 0 && showBands) {
    // Draw vertical cutoff lines using data y coordinates so they line up with the axis baseline
    const cutoffShapes = (filterLines || []).map((f) => ({ type: 'line', x0: f, x1: f, y0: 0, y1: yTop, xref: 'x', yref: 'y', line: { color: 'rgba(220,38,38,0.9)', width: 2, dash: 'solid' }, layer: 'above' }));
    layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(cutoffShapes as unknown as NonNullable<Layout['shapes']>);
    const cutoffAnnotations = (filterLines || []).map((f) => ({ x: f, y: yTop, xref: 'x', yref: 'y', text: `${f.toFixed(2)} Hz`, showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10, color: '#0ea5a0' } }));
    layout.annotations = ((layout.annotations ?? []) as NonNullable<Layout['annotations']>).concat(cutoffAnnotations as unknown as NonNullable<Layout['annotations']>);

    // Add shaded stop-band areas (darker) to highlight removed frequencies (use data y coords)
    const nyq = Math.round(fs / 2.56); // use same Fmax mapping as layout
    const tw = Math.max(0, transitionWidth || 0);
    const shaded: Array<Record<string, unknown>> = [];
    if (filterType === 'low') {
      const fc = filterLines[0] ?? 0;
      const stopStart = Math.min(nyq, fc + tw);
      shaded.push({ type: 'rect', x0: stopStart, x1: nyq, y0: 0, y1: yTop, xref: 'x', yref: 'y', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
      areaTraces.push({ x: [stopStart, stopStart, nyq, nyq], y: [0, yTop, yTop, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    } else if (filterType === 'high') {
      const fc = filterLines[0] ?? 0;
      const stopEnd = Math.max(0, fc - tw);
      shaded.push({ type: 'rect', x0: 0, x1: stopEnd, y0: 0, y1: yTop, xref: 'x', yref: 'y', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
      areaTraces.push({ x: [0, 0, stopEnd, stopEnd], y: [0, yTop, yTop, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    } else if (filterType === 'bandpass') {
      const lo = Math.min(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const hi = Math.max(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const lowStopEnd = Math.max(0, lo - tw);
      const highStopStart = Math.min(nyq, hi + tw);
      shaded.push({ type: 'rect', x0: 0, x1: lowStopEnd, y0: 0, y1: yTop, xref: 'x', yref: 'y', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
      shaded.push({ type: 'rect', x0: highStopStart, x1: nyq, y0: 0, y1: yTop, xref: 'x', yref: 'y', fillcolor: 'rgba(220,38,38,0.32)', line: { width: 0 }, layer: 'below' });
      areaTraces.push({ x: [0, 0, lowStopEnd, lowStopEnd], y: [0, yTop, yTop, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
      areaTraces.push({ x: [highStopStart, highStopStart, nyq, nyq], y: [0, yTop, yTop, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    } else if (filterType === 'bandstop') {
      const lo = Math.min(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const hi = Math.max(filterLines[0] ?? 0, filterLines[1] ?? 0);
      const coreStart = Math.min(hi, lo + tw);
      const coreEnd = Math.max(lo, hi - tw);
      const shadedStart = Math.min(coreStart, coreEnd);
      const shadedEnd = Math.max(coreStart, coreEnd);
      shaded.push({ type: 'rect', x0: shadedStart, x1: shadedEnd, y0: 0, y1: yTop, xref: 'x', yref: 'y', fillcolor: 'rgba(220,38,38,0.44)', line: { width: 0 }, layer: 'below' });
      areaTraces.push({ x: [shadedStart, shadedStart, shadedEnd, shadedEnd], y: [0, yTop, yTop, 0], type: 'scatter', fill: 'toself', fillcolor: 'rgba(220,38,38,0.18)', line: { width: 0 }, hoverinfo: 'skip', showlegend: false, opacity: 0.6 } as unknown as Data);
    }
    if (shaded.length > 0) layout.shapes = ((layout.shapes ?? []) as NonNullable<Layout['shapes']>).concat(shaded as unknown as NonNullable<Layout['shapes']>);
    // Prepend areaTraces so they draw below the FFT traces
    if (areaTraces.length > 0) traces.unshift(...areaTraces);
  }
  const config: Partial<Config> = { responsive: true, displaylogo: false };

  return (
    <div className="w-full">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '380px' }} key={`spectrum-${fmax}`} />
    </div>
  );
};
