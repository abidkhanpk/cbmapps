'use client'

import dynamic from 'next/dynamic'
import { memo, useMemo } from 'react'
import type { Data, Layout, Config } from 'plotly.js'
import type { PlotParams } from 'react-plotly.js'

import type { SpectrumResult } from '../types'
import { relativePhase } from '../lib/phase'

const Plot = dynamic<PlotParams>(() => import('react-plotly.js'), { ssr: false })

interface PhaseChartProps {
  spectrum?: SpectrumResult
  primarySensor: string
  referenceSensor?: string
  fmax?: number
}

export const PhaseChart = memo(function PhaseChart({
  spectrum,
  primarySensor,
  referenceSensor,
  fmax,
}: PhaseChartProps) {
  const traces = useMemo(() => buildPhaseTraces(spectrum, primarySensor, referenceSensor, fmax), [spectrum, primarySensor, referenceSensor, fmax])
  if (!traces.length) {
    return <EmptyState message="Phase data pending…" />
  }

  const layout: Partial<Layout> = {
    title: 'Phase vs Frequency',
    margin: { l: 60, r: 20, t: 40, b: 40 },
    xaxis: { title: 'Frequency (Hz)', gridcolor: '#e2e8f0', zeroline: false },
    yaxis: { title: 'Phase (deg)', gridcolor: '#e2e8f0', range: [-190, 190] },
    legend: { orientation: 'h', y: 1.12, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
  }
  const config: Partial<Config> = {
    displaylogo: false,
    responsive: true,
  }

  return <Plot data={traces} layout={layout} config={config} style={{ width: '100%', height: 260 }} />
})

function buildPhaseTraces(
  spectrum: SpectrumResult | undefined,
  primarySensor: string,
  referenceSensor?: string,
  fmax?: number,
): Data[] {
  if (!spectrum) return []
  const primary = spectrum.phase[primarySensor]
  if (!primary) return []
  const reference = referenceSensor ? spectrum.phase[referenceSensor] : undefined
  const stride = Math.max(1, Math.floor(primary.length / 3000))
  const freq: number[] = []
  const phase: number[] = []
  const cross: number[] = []

  for (let i = 0; i < primary.length; i += stride) {
    const freqVal = spectrum.f[i]
    if (fmax && freqVal > fmax) break
    freq.push(freqVal)
    phase.push((primary[i] * 180) / Math.PI)
    if (reference && reference[i] !== undefined) {
      cross.push((relativePhase(primary[i], reference[i]) * 180) / Math.PI)
    }
  }

  const traces: Data[] = [
    {
      x: freq,
      y: phase,
      type: 'scatter',
      mode: 'lines',
      name: `${primarySensor} phase`,
      line: { color: '#0ea5e9', width: 2 },
    },
  ]
  if (cross.length) {
    traces.push({
      x: freq,
      y: cross,
      type: 'scatter',
      mode: 'lines',
      name: `${primarySensor}/${referenceSensor} cross-phase`,
      line: { color: '#f97316', width: 2 },
    })
  }
  return traces
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    {message}
  </div>
)
