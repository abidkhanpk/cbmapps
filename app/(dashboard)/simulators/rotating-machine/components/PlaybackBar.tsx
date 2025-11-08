'use client'

import { useCallback } from 'react'

interface PlaybackBarProps {
  duration: number
  playhead: number
  onSeek: (ratio: number) => void
}

export function PlaybackBar({ duration, playhead, onSeek }: PlaybackBarProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSeek(Number(event.target.value))
    },
    [onSeek],
  )
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Playback</span>
        <span>
          {(playhead * duration).toFixed(2)}s / {duration.toFixed(2)}s
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={playhead}
        onChange={handleChange}
        aria-label="Playback scrubber"
        className="mt-2 w-full accent-sky-500"
      />
    </div>
  )
}
