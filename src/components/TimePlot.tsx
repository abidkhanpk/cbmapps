'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });

export interface TimePlotProps {
  tAnalog: number[] | Float64Array;
  yAnalog: number[] | Float64Array;
  tSamples: number[] | Float64Array;
  ySamples: number[] | Float64Array;
  // optional windowed overlay (time & amplitude) to draw on top
  windowedT?: number[] | Float64Array;
  windowedY?: number[] | Float64Array;
  individualSignals?: Array<{
    tSamples: number[] | Float64Array;
    cleanSamples: number[] | Float64Array;
    tAnalog: number[] | Float64Array;
    analog: number[] | Float64Array;
    label: string;
  }>;
  showAnalog?: boolean;
  showDigitized?: boolean;
  title?: string;
  frames?: Array<{ t0: number; t1: number }>;
  framesData?: Array<{ t: number[]; y: number[] }>;
  // force x-axis span to a specific maximum (e.g., T * N)
  xAxisMax?: number;
  // bars drawn near the bottom to visualize overlap windows
  overlapBars?: Array<{ x0: number; x1: number }>;
}
export const TimePlot: React.FC<TimePlotProps> = ({
  tAnalog,
  yAnalog,
  tSamples,
  ySamples,
  individualSignals = [],
  windowedT,
  windowedY,
  frames,
  framesData,
  xAxisMax,
  overlapBars,
  showAnalog = true,
  showDigitized = true,
  title = 'Time Domain',
}) => {
  const traces: Data[] = [];
  if (showAnalog) {
    traces.push({
      x: Array.from(tAnalog),
      y: Array.from(yAnalog),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#6b7280', width: 1.5 },
      name: 'Analog (reference)',
    });
  }
  if (showDigitized) {
    traces.push({
      x: Array.from(tSamples),
      y: Array.from(ySamples),
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: '#1d4ed8', size: 5 },
      line: { color: '#1d4ed8', width: 2 },
      name: 'Digitized (sampled)',
    });
  }
  individualSignals.forEach((sig, idx) => {
    traces.push({
      x: Array.from(sig.tSamples),
      y: Array.from(sig.cleanSamples),
      type: 'scatter',
      mode: 'lines',
      line: { color: `hsl(${(idx * 60) % 360},70%,50%)`, width: 1 },
      name: sig.label,
    });
  });
  // windowed overlay (draw on top)
  if (windowedT && windowedY) {
    traces.push({
      x: Array.from(windowedT),
      y: Array.from(windowedY),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#d97706', width: 3 },
      name: 'Windowed time waveform',
    });
  }
  // render each frame's raw sampled data as a separate faint trace so frames are distinguishable
  if (frames && frames.length > 0 && framesData && framesData.length > 0) {
    framesData.forEach((fd: { t: number[]; y: number[] }, idx: number) => {
      traces.push({
        x: Array.from(fd.t),
        y: Array.from(fd.y),
        type: 'scatter',
        mode: 'lines',
  line: { color: `hsla(${(idx * 60) % 360},60%,50%,0.9)`, width: 1, dash: 'solid' },
        name: `Frame ${idx + 1}`,
      });
    });
  }
  const layout: Partial<Layout> = {
    title,
    uirevision: 'timeplot',
    margin: { l: 60, r: 20, t: 60, b: 40 },
    xaxis: { title: 'Time (s)', gridcolor: '#eee' },
    // allow autorange for the waveform; when overlap bars exist we'll reserve paper space via yaxis.domain
    yaxis: { title: 'Amplitude', gridcolor: '#eee', autorange: true },
    legend: { orientation: 'h', y: 1.02, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  };
  // If provided, force the x-axis to span from 0 to xAxisMax (e.g., T * N)
  if (typeof xAxisMax === 'number' && isFinite(xAxisMax)) {
    layout.xaxis = { ...(layout.xaxis ?? {}), range: [0, xAxisMax] };
  }
  // add shaded frame shapes if provided
  if (frames && frames.length > 0) {
    const shapes: NonNullable<Layout['shapes']> = frames.map((f, idx) => ({
      type: 'rect',
      x0: f.t0,
      x1: f.t1,
      y0: 0,
      y1: 1,
      xref: 'x',
      yref: 'paper',
      fillcolor: idx % 2 === 0 ? 'rgba(200,200,255,0.06)' : 'rgba(200,200,255,0.03)',
      line: { width: 0 },
    }));
    layout.shapes = [...(layout.shapes ?? []), ...shapes];
  }
  // add overlap bars stacked downward from a small offset above the x-axis when provided
  if (overlapBars && overlapBars.length > 0) {
    const barHeight = 0.03;
    const barGap = 0.005;
    const numBars = overlapBars.length;
  // Increase bottom margin so bars and tick labels have room
  layout.margin = { ...(layout.margin ?? {}), b: Math.max((layout.margin?.b as number) ?? 40, 48) };
  // Ensure the top margin leaves room for the legend placed above plot
  layout.margin = { ...(layout.margin ?? {}), t: Math.max((layout.margin?.t as number) ?? 60, 70) };
  // Vertical offset to move bars slightly below the x-axis ticks (small offset)
  const barVerticalOffset = 0.02; // how far below the x-axis (in paper coords)
    // Compute bar shapes positioned below the plot area (negative paper y values)
    const barShapes = overlapBars.map((b, idx) => {
      const yTop = -barVerticalOffset - idx * (barHeight + barGap);
      const yBottom = yTop - barHeight;
      return {
        type: 'rect',
        x0: b.x0,
        x1: b.x1,
        y0: yBottom,
        y1: yTop,
        xref: 'x',
        yref: 'paper',
        fillcolor: 'rgba(120,120,120,0.18)',
        line: { width: 1, color: 'rgba(100,100,100,0.9)' },
      } as unknown;
    }) as unknown as NonNullable<Layout['shapes']>;
    layout.shapes = [...(layout.shapes ?? []), ...barShapes];
    // Reserve the lower portion of the plot for bars and ticks by moving the waveform domain upward
    // Use a small reserved domain so bars are close to axis but do not overlap ticks; legend sits above plot
    const reserveDomainBottom = 0.09; // waveform will occupy [reserveDomainBottom, 1]
    layout.yaxis = { ...(layout.yaxis ?? {}), domain: [reserveDomainBottom, 1] };
  }
  const config: Partial<Config> = { responsive: true, displaylogo: false };
  return (
    <div className="w-full">
      <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: '360px' }} />
    </div>
  );
};
