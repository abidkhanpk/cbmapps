'use client'

import { AlertTriangle } from 'lucide-react'

interface FaultBadgeProps {
  label: string
  description: string
  severity: number
  hint: string
  indicators?: string[]
}

export function FaultBadge({ label, description, severity, hint, indicators = [] }: FaultBadgeProps) {
  const color = severity > 0.75 ? 'bg-red-500/15 text-red-600' : severity > 0.45 ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div className={`rounded-full p-2 ${color}`}>
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span className="ml-auto text-xs font-semibold text-slate-500">{Math.round(severity * 100)}%</span>
      </div>
      <div className="mb-2 h-1.5 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500" style={{ width: `${Math.min(100, severity * 100)}%` }} />
      </div>
      <p className="text-xs font-medium text-slate-600">{hint}</p>
      {indicators.length > 0 && (
        <ul className="mt-2 space-y-1">
          {indicators.slice(0, 3).map(item => (
            <li key={item} className="text-xs text-slate-500">
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
