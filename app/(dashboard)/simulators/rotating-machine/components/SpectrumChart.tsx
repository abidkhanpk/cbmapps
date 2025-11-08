'use client'

import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { FaultMarker, SpectrumResult } from '../types'

interface SpectrumChartProps {
  spectrum?: SpectrumResult
  markers?: FaultMarker[]
  sensorOrder: string[]
}

export const SpectrumChart = memo(function SpectrumChart({ spectrum, markers = [], sensorOrder }: SpectrumChartProps) {
  const data = useMemo(() => buildSpectrumData(spectrum, sensorOrder), [spectrum, sensorOrder])

  if (!spectrum || !data.length) {
    return <EmptyState message="FFT results pending…" />
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 20, left: 20, right: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="freq" tickFormatter={value => `${value.toFixed(0)} Hz`} />
        <YAxis tickFormatter={v => v.toFixed(2)} />
        <Tooltip formatter={(value: number) => value.toFixed(3)} labelFormatter={value => `${value.toFixed(1)} Hz`} />
        <Legend />
        {sensorOrder.map(sensorId => (
          <Line
            key={sensorId}
            type="monotone"
            dataKey={sensorId}
            name={sensorId}
            stroke={colors[sensorId.charCodeAt(0) % colors.length]}
            dot={false}
            isAnimationActive={false}
          />
        ))}
        {markers.map(marker => (
          <ReferenceLine
            key={marker.id}
            x={marker.frequencyHz}
            stroke="#f97316"
            strokeDasharray="4 4"
            label={{ value: marker.label, position: 'top', fill: '#f97316', fontSize: 10 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
})

function buildSpectrumData(spectrum: SpectrumResult | undefined, sensorOrder: string[]) {
  if (!spectrum) return []
  const length = spectrum.f.length
  const maxPoints = 1600
  const stride = Math.max(1, Math.floor(length / maxPoints))
  const rows: Array<Record<string, number>> = []

  for (let i = 0; i < length; i += stride) {
    const row: Record<string, number> = { freq: spectrum.f[i] }
    sensorOrder.forEach(sensorId => {
      const channel = spectrum.magnitude[sensorId]
      row[sensorId] = channel ? channel[i] ?? 0 : 0
    })
    rows.push(row)
  }

  return rows
}

const colors = ['#0284c7', '#16a34a', '#f97316', '#8b5cf6', '#14b8a6']

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    {message}
  </div>
)
