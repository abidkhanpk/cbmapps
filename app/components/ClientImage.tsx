"use client"

import Image from 'next/image'
import { useState } from 'react'

type Props = React.ComponentProps<typeof Image> & {
  fallbackHide?: boolean
}

export default function ClientImage(props: Props) {
  const { src, alt, fallbackHide = true, ...rest } = props
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  return (
    <Image
      src={src as any}
      alt={alt ?? ''}
      onError={() => {
        if (fallbackHide) setHidden(true)
      }}
      {...(rest as unknown as Record<string, unknown>)}
    />
  )
}
