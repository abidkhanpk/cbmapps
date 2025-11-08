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
import type { SignalStats } from '../types'

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
  const chartData = useMemo(() => buildWaveformPoints(series, fs), [series, fs])
  const playheadTime = playhead * duration

  if (!chartData.length) {
    return <EmptyState message="Synthesizing waveform…" />
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={chartData} margin={{ top: 20, left: 20, right: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="time" tickFormatter={value => `${value.toFixed(2)}s`} />
        <YAxis />
        <Tooltip formatter={(value: number) => value.toFixed(3)} labelFormatter={value => `${value.toFixed(3)}s`} />
        <Legend />
        {series.map(item => (
          <Line
            key={item.id}
            type="natural"
            dataKey={item.id}
            name={item.label}
            stroke={item.color}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
        <ReferenceLine x={playheadTime} stroke="#0ea5e9" strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  )
})

function buildWaveformPoints(series: WaveformSeries[], fs: number) {
  if (!series.length || !fs) return []
  const base = series.find(item => item.data)?.data
  if (!base) return []
  const sampleLength = base.length
  const maxPoints = 1000
  const stride = Math.max(1, Math.floor(sampleLength / maxPoints))
  const rows: Array<Record<string, number>> = []

  for (let i = 0; i < sampleLength; i += stride) {
    const row: Record<string, number> = { time: i / fs }
    series.forEach(item => {
      if (item.data) {
        row[item.id] = item.data[i] ?? 0
      }
    })
    rows.push(row)
  }

  return rows
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    {message}
  </div>
)
