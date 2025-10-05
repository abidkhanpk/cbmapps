"use client"

import Image from 'next/image'
import { useMemo, useState } from 'react'

type Props = React.ComponentProps<typeof Image> & {
  fallbackHide?: boolean
}

const PLACEHOLDER_SVG_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="560" height="400" viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g fill="none" stroke="#60a5fa" stroke-width="6" opacity="0.9">
    <rect x="40" y="40" width="480" height="320" rx="16" ry="16"/>
  </g>
  <g fill="#e5e7eb" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" text-anchor="middle">
    <text x="280" y="190" font-size="42" font-weight="700">Coming Soon</text>
    <text x="280" y="230" font-size="16" opacity="0.9">This feature is under active development</text>
  </g>
</svg>`)

export default function ClientImage(props: Props) {
  const { src, alt, fallbackHide = true, ...rest } = props

  // Provide a built-in placeholder if the missing asset path is used
  const initialSrc = useMemo(() => {
    const s = typeof src === 'string' ? src : ''
    if (s.endsWith('/coming-soon.png')) return PLACEHOLDER_SVG_DATA_URL
    return src as any
  }, [src])

  const [currentSrc, setCurrentSrc] = useState<any>(initialSrc)
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  return (
    <Image
      src={currentSrc}
      alt={alt ?? ''}
      onError={() => {
        // Fallback to placeholder once; if that also fails, optionally hide
        if (currentSrc !== PLACEHOLDER_SVG_DATA_URL) {
          setCurrentSrc(PLACEHOLDER_SVG_DATA_URL)
        } else if (fallbackHide) {
          setHidden(true)
        }
      }}
      {...(rest as unknown as Record<string, unknown>)}
    />
  )
}
