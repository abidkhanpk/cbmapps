'use client'

import dynamic from 'next/dynamic'
import { memo, useMemo } from 'react'
import type { Data, Layout, Config } from 'plotly.js'
import type { PlotParams } from 'react-plotly.js'
import type { SignalStats } from '../types'

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false })

interface WaveformSeries {
  id: string
  label: string
  color: string
  data?: Float32Array
  stats?: SignalStats
}

interface WaveformChartProps {
  series: WaveformSeries[]
  fs: number
  playhead: number
  duration: number
}

export const WaveformChart = memo(function WaveformChart({ series, fs, playhead, duration }: WaveformChartProps) {
  const traces = useMemo(() => buildTraces(series, fs), [series, fs])
  const playheadTime = playhead * duration

  if (!traces.length) {
    return <EmptyState message="Synthesizing waveform…" />
  }

  const layout: Partial<Layout> = {
    title: 'Time Waveform',
    uirevision: 'twf',
    margin: { l: 60, r: 20, t: 50, b: 40 },
    xaxis: { title: 'Time (s)', gridcolor: '#e2e8f0', zeroline: false },
    yaxis: { title: 'Amplitude', gridcolor: '#e2e8f0' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    legend: { orientation: 'h', y: 1.12, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
    shapes: [
      {
        type: 'line',
        x0: playheadTime,
        x1: playheadTime,
        y0: 0,
        y1: 1,
        xref: 'x',
        yref: 'paper',
        line: { color: '#0ea5e9', dash: 'dash', width: 2 },
      },
    ],
  }

  const config: Partial<Config> = {
    displaylogo: false,
    responsive: true,
  }

  return <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: 360 }} />
})

function buildTraces(series: WaveformSeries[], fs: number): Data[] {
  if (!series.length || !fs) return []
  const traces: Data[] = []
  series.forEach(item => {
    if (!item.data || item.data.length === 0) return
    const stride = Math.max(1, Math.floor(item.data.length / 4000))
    const x: number[] = []
    const y: number[] = []
    for (let i = 0; i < item.data.length; i += stride) {
      x.push(i / fs)
      y.push(item.data[i])
    }
    traces.push({
      x,
      y,
      type: 'scatter',
      mode: 'lines',
      name: item.label,
      line: { color: item.color, width: 2 },
    })
  })
  return traces
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    {message}
  </div>
)
