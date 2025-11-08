'use client'

import dynamic from 'next/dynamic'
import { memo, useMemo } from 'react'
import type { Data, Layout, Config } from 'plotly.js'
import type { PlotParams } from 'react-plotly.js'

import type { FaultMarker, SpectrumResult } from '../types'

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false })

interface SpectrumChartProps {
  spectrum?: SpectrumResult
  markers?: FaultMarker[]
  sensorOrder: string[]
  sensorLabels?: Record<string, string>
  fmax?: number
}

export const SpectrumChart = memo(function SpectrumChart({
  spectrum,
  markers = [],
  sensorOrder,
  sensorLabels,
  fmax,
}: SpectrumChartProps) {
  const traces = useMemo(() => buildSpectrumTraces(spectrum, sensorOrder, sensorLabels, fmax), [spectrum, sensorOrder, sensorLabels, fmax])

  if (!spectrum || !traces.length) {
    return <EmptyState message="FFT results pending…" />
  }

  const layout: Partial<Layout> = {
    title: 'Frequency Spectrum',
    uirevision: `spectrum-${sensorOrder.join('-')}`,
    margin: { l: 60, r: 20, t: 50, b: 40 },
    xaxis: {
      title: 'Frequency (Hz)',
      gridcolor: '#e2e8f0',
      rangemode: 'tozero',
      zeroline: false,
      range: fmax ? [0, fmax] : undefined,
    },
    yaxis: { title: 'Amplitude', gridcolor: '#e2e8f0' },
    legend: { orientation: 'h', y: 1.12, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    shapes: markers.map(marker => ({
      type: 'line',
      x0: marker.frequencyHz,
      x1: marker.frequencyHz,
      y0: 0,
      y1: 1,
      xref: 'x',
      yref: 'paper',
      line: { color: '#f97316', dash: 'dot', width: 1.5 },
    })),
    annotations: markers.map(marker => ({
      x: marker.frequencyHz,
      y: 1.02,
      xref: 'x',
      yref: 'paper',
      text: marker.label,
      showarrow: false,
      font: { size: 10, color: '#f97316' },
    })),
  }

  const config: Partial<Config> = {
    displaylogo: false,
    responsive: true,
  }

  return <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: 360 }} />
})

function buildSpectrumTraces(
  spectrum: SpectrumResult | undefined,
  sensorOrder: string[],
  sensorLabels: Record<string, string> | undefined,
  fmax?: number,
): Data[] {
  if (!spectrum) return []
  const colors = ['#0284c7', '#16a34a', '#f97316', '#8b5cf6', '#14b8a6']
  const traces: Data[] = []
  sensorOrder.forEach((sensorId, index) => {
    const channel = spectrum.magnitude[sensorId]
    if (!channel) return
    const stride = Math.max(1, Math.floor(channel.length / 4000))
    const x: number[] = []
    const y: number[] = []
    for (let i = 0; i < channel.length; i += stride) {
      const freqVal = spectrum.f[i]
      if (fmax && freqVal > fmax) break
      x.push(freqVal)
      y.push(channel[i])
    }
    traces.push({
      x,
      y,
      type: 'scatter',
      mode: 'lines',
      name: sensorLabels?.[sensorId] ?? sensorId,
      line: { color: colors[index % colors.length], width: 2 },
    })
  })
  return traces
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    {message}
  </div>
)
