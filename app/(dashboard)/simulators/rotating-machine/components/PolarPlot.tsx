'use client'

import type { MotionDescriptor } from '../types'

interface PolarPlotProps {
  motion?: MotionDescriptor
}

export function PolarPlot({ motion }: PolarPlotProps) {
  if (!motion) {
    return <EmptyState />
  }
  const size = 260
  const center = size / 2
  const scale = Math.max(1, motion.orbitMajor || 1)
  const major = (motion.orbitMajor / scale) * (size / 2 - 20)
  const minor = (motion.orbitMinor / scale) * (size / 2 - 20)
  const angle = motion.phaseLag

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Polar / Orbit</span>
        <span>{motion.cue.highlight}</span>
      </div>
      <svg width={size} height={size} role="img" aria-label="Polar orbit plot">
        <defs>
          <linearGradient id="orbit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={motion.cue.color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={motion.cue.color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={center - 20} fill="none" stroke="#e2e8f0" strokeDasharray="4 4" />
        <ellipse
          cx={center}
          cy={center}
          rx={Math.max(2, major)}
          ry={Math.max(2, minor)}
          fill="url(#orbit)"
          stroke={motion.cue.color}
          strokeWidth={2}
          transform={`rotate(${(angle * 180) / Math.PI} ${center} ${center})`}
        />
        <line
          x1={center}
          y1={center}
          x2={center + Math.cos(angle) * (center - 30)}
          y2={center - Math.sin(angle) * (center - 30)}
          stroke="#0ea5e9"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={center} cy={center} r={4} fill="#0ea5e9" />
      </svg>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-500">Orbit</dt>
          <dd className="font-semibold text-slate-900">
            {motion.orbitMajor.toFixed(2)} / {motion.orbitMinor.toFixed(2)} mm
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Axial</dt>
          <dd className="font-semibold text-slate-900">{motion.axial.toFixed(2)} mm</dd>
        </div>
        <div>
          <dt className="text-slate-500">Torsional</dt>
          <dd className="font-semibold text-slate-900">{motion.torsional.toFixed(2)} mrad</dd>
        </div>
        <div>
          <dt className="text-slate-500">Phase Lag</dt>
          <dd className="font-semibold text-slate-900">{((motion.phaseLag * 180) / Math.PI).toFixed(1)}°</dd>
        </div>
      </dl>
    </div>
  )
}

const EmptyState = () => (
  <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
    Polar plot pending…
  </div>
)
