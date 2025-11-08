'use client'

import { memo, useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { SpectrumResult } from '../types'
import { relativePhase } from '../lib/phase'

interface PhaseChartProps {
  spectrum?: SpectrumResult
  primarySensor: string
  referenceSensor?: string
}

export const PhaseChart = memo(function PhaseChart({
  spectrum,
  primarySensor,
  referenceSensor,
}: PhaseChartProps) {
  const data = useMemo(() => buildPhaseData(spectrum, primarySensor, referenceSensor), [spectrum, primarySensor, referenceSensor])
  if (!data.length) {
    return <EmptyState message="Phase data pending…" />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, left: 20, right: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="freq" tickFormatter={value => `${value.toFixed(0)} Hz`} />
        <YAxis tickFormatter={value => `${value.toFixed(0)}°`} domain={[-180, 180]} />
        <Tooltip formatter={(value: number) => `${value.toFixed(1)}°`} labelFormatter={value => `${value.toFixed(1)} Hz`} />
        <Line type="monotone" dataKey="phase" stroke="#0ea5e9" dot={false} isAnimationActive={false} name="Phase" />
        {referenceSensor && <Line type="monotone" dataKey="cross" stroke="#f97316" dot={false} isAnimationActive={false} name="Cross Phase" />}
      </LineChart>
    </ResponsiveContainer>
  )
})

function buildPhaseData(
  spectrum: SpectrumResult | undefined,
  primarySensor: string,
  referenceSensor?: string,
) {
  if (!spectrum) return []
  const primary = spectrum.phase[primarySensor]
  if (!primary) return []
  const reference = referenceSensor ? spectrum.phase[referenceSensor] : undefined
  const rows: Array<Record<string, number>> = []
  const maxPoints = 1000
  const stride = Math.max(1, Math.floor(primary.length / maxPoints))

  for (let i = 0; i < primary.length; i += stride) {
    const deg = (primary[i] * 180) / Math.PI
    const row: Record<string, number> = { freq: spectrum.f[i], phase: deg }
    if (reference && reference[i] !== undefined) {
      row.cross = (relativePhase(primary[i], reference[i]) * 180) / Math.PI
    }
    rows.push(row)
  }

  return rows
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    {message}
  </div>
)
