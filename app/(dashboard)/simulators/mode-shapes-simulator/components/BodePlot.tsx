"use client";
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { PlotParams } from 'react-plotly.js';
const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false });
import { useModeShapesStore } from '../hooks/useModeShapesStore';

function computeBode(fn: [number, number, number], zeta: number, fmax: number) {
  const N = 700;
  const f: number[] = new Array(N);
  const amp: number[] = new Array(N);
  const phase: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const fi = (i / (N - 1)) * fmax; f[i] = fi;
    const om = 2 * Math.PI * fi;
    let Hmag = 0;
    let Pdeg = 0;
    for (let k = 0; k < 3; k++) {
      const omN = 2 * Math.PI * fn[k];
      const r = omN > 0 ? om / omN : 0;
      const denom = Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
      const mag = 1 / Math.max(denom, 1e-9);
      Hmag += mag; // simple superposition for visualization
      Pdeg += Math.atan2(2 * zeta * r, 1 - r * r) * 180 / Math.PI;
    }
    // Wrap phase into [0, 180] by mapping >180 to (phase - 180)
    const wrapped = ((Pdeg % 360) + 360) % 360; // 0..360
    phase[i] = wrapped > 180 ? (wrapped - 180) : wrapped; // 0..180 with rollover
    amp[i] = Hmag;
  }
  return { f, amp, phase };
}

export default function BodePlot() {
  const { fn, zeta, forceFreqHz, xAxisMax, setXAxisMax } = useModeShapesStore();
  const bode = useMemo(() => computeBode(fn, zeta, Math.max(1, xAxisMax)), [fn, zeta, xAxisMax]);
  const [revision, setRevision] = useState(0);

  useEffect(() => { setRevision(r => r + 1); }, [forceFreqHz]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded border border-gray-200 p-2">
        <Plot
          data={[{ x: bode.f, y: bode.amp, type: 'scatter', mode: 'lines', line: { color: 'rgba(2,132,199,1)', width: 2 }, name: 'Amplitude' },
                  { x: [fn[0], fn[0]], y: [0, Math.max(...bode.amp)], mode: 'lines', line: { color: 'rgba(16,185,129,0.8)', width: 1.5, dash: 'dash' }, name: 'f1' },
                  { x: [fn[1], fn[1]], y: [0, Math.max(...bode.amp)], mode: 'lines', line: { color: 'rgba(234,88,12,0.8)', width: 1.5, dash: 'dash' }, name: 'f2' },
                  { x: [fn[2], fn[2]], y: [0, Math.max(...bode.amp)], mode: 'lines', line: { color: 'rgba(99,102,241,0.8)', width: 1.5, dash: 'dash' }, name: 'f3' },
                  { x: [forceFreqHz, forceFreqHz], y: [0, Math.max(...bode.amp)], mode: 'lines', line: { color: 'rgba(220,38,38,0.9)', width: 2 }, name: 'forcing' }] as any}
          layout={{ autosize: true, height: 240, margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: 'Frequency (Hz)', range: [0, Math.max(10, xAxisMax)] }, yaxis: { title: 'Amplitude (arb.)', rangemode: 'tozero' }, uirevision: revision as any }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: '100%', height: 240 }}
          onRelayout={(e: any) => {
            const ex = e as Record<string, any>;
            const xr1 = ex['xaxis.range[1]'];
            const xr = ex['xaxis.range'];
            const xmax = typeof xr1 === 'number' ? xr1 : (Array.isArray(xr) ? xr[1] : undefined);
            if (typeof xmax === 'number' && isFinite(xmax)) setXAxisMax(xmax);
          }}
        />
      </div>
      <div className="bg-white rounded border border-gray-200 p-2">
        <Plot
          data={[{ x: bode.f, y: bode.phase, type: 'scatter', mode: 'lines', line: { color: 'rgba(234,88,12,1)', width: 2 }, name: 'Phase' },
                  { x: [forceFreqHz, forceFreqHz], y: [0, 180], mode: 'lines', line: { color: 'rgba(220,38,38,0.9)', width: 2 }, name: 'forcing' }] as any}
          layout={{ autosize: true, height: 200, margin: { l: 55, r: 10, t: 10, b: 40 }, xaxis: { title: 'Frequency (Hz)', range: [0, Math.max(10, xAxisMax)] }, yaxis: { title: 'Phase (deg)' }, uirevision: revision as any }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: '100%', height: 200 }}
          onRelayout={(e: any) => {
            const ex = e as Record<string, any>;
            const xr1 = ex['xaxis.range[1]'];
            const xr = ex['xaxis.range'];
            const xmax = typeof xr1 === 'number' ? xr1 : (Array.isArray(xr) ? xr[1] : undefined);
            if (typeof xmax === 'number' && isFinite(xmax)) setXAxisMax(xmax);
          }}
        />
      </div>
    </div>
  );
}
