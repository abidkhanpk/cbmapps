'use client'

import { useState } from 'react'
import { Download, Image as ImageIcon } from 'lucide-react'
import { toPng } from 'html-to-image'

import type { ExportPayload } from '../types'

interface ExportButtonsProps {
  data?: ExportPayload
  chartRef: React.RefObject<HTMLElement | null>
}

export function ExportButtons({ data, chartRef }: ExportButtonsProps) {
  const [busy, setBusy] = useState(false)

  const exportCsv = async () => {
    if (!data) return
    setBusy(true)
    try {
      const sensors = Object.keys(data.time)
      const length = data.time[sensors[0]]?.length ?? 0
      const lines: string[] = []
      lines.push(['time_s', ...sensors].join(','))
      for (let i = 0; i < length; i += 1) {
        const time = (i / data.fs).toFixed(6)
        const values = sensors.map(sensor => data.time[sensor][i]?.toFixed(6) ?? '0')
        lines.push([time, ...values].join(','))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, 'rotating-machine-signal.csv')
    } finally {
      setBusy(false)
    }
  }

  const exportPng = async () => {
    if (!chartRef.current) return
    setBusy(true)
    try {
      const url = await toPng(chartRef.current, { backgroundColor: '#ffffff' })
      triggerDownload(url, 'rotating-machine-chart.png')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={exportCsv}
        disabled={!data || busy}
        className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Export time waveform as CSV"
      >
        <Download className="h-4 w-4" />
        CSV
      </button>
      <button
        type="button"
        onClick={exportPng}
        disabled={!chartRef.current || busy}
        className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Export chart as PNG"
      >
        <ImageIcon className="h-4 w-4" />
        PNG
      </button>
    </div>
  )
}

function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
