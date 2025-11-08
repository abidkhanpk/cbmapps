'use client'

import { useEffect, useRef, useState } from 'react'

interface ClockOptions {
  playing: boolean
  slowmo: number
  duration: number
  startProgress: number
}

export function useAnimationClock({ playing, slowmo, duration, startProgress }: ClockOptions) {
  const frameRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const clampedProgress = Number.isFinite(startProgress) ? Math.min(1, Math.max(0, startProgress)) : 0
    const startOffset = clampedProgress * duration

    if (!playing) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      startRef.current = null
      setTime(startOffset)
      return () => undefined
    }

    const tick = (timestamp: number) => {
      if (startRef.current === null) {
        const denom = slowmo === 0 ? 1 : slowmo
        startRef.current = timestamp - (startOffset / denom) * 1000
      }
      const denom = slowmo === 0 ? 1 : slowmo
      const elapsed = ((timestamp - startRef.current) / 1000) * denom
      const wrapped = duration > 0 ? elapsed % duration : 0
      setTime(wrapped)
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      startRef.current = null
    }
  }, [playing, slowmo, duration, startProgress])

  return time
}
