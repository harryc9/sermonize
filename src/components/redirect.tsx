/**
 * Client-side redirect component that defers router.replace
 * to avoid calling setState during render.
 */
'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export function Redirect({ to }: { to: string }) {
  const router = useRouter()
  const pushed = useRef(false)

  if (!pushed.current) {
    pushed.current = true
    queueMicrotask(() => router.replace(to))
  }

  return null
}
