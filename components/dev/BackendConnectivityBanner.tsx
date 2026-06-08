'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ServerOff } from 'lucide-react'

type BannerState = 'hidden' | 'checking' | 'restarting' | 'initializing' | 'offline' | 'recovered'

const POLL_MS_ONLINE = 8_000
const POLL_MS_DOWN = 3_000
const RECOVERED_VISIBLE_MS = 4_000

/**
 * Dev-only banner when the Express backend is down or restarting (nodemon).
 * Reduces confusion when API calls fail during server reloads.
 */
export function BackendConnectivityBanner() {
  const [banner, setBanner] = useState<BannerState>('checking')
  const wasOnlineRef = useRef(false)
  const recoveredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return

    let cancelled = false
    let intervalMs = POLL_MS_DOWN
    let intervalId: ReturnType<typeof setInterval> | null = null

    const clearRecoveredTimer = () => {
      if (recoveredTimerRef.current) {
        clearTimeout(recoveredTimerRef.current)
        recoveredTimerRef.current = null
      }
    }

    const scheduleNext = () => {
      if (intervalId) clearInterval(intervalId)
      intervalId = setInterval(() => void probe(), intervalMs)
    }

    const probe = async () => {
      try {
        const response = await fetch('/api/dev/backend-health', { cache: 'no-store' })
        if (cancelled) return

        if (response.ok) {
          intervalMs = POLL_MS_ONLINE

          if (!wasOnlineRef.current) {
            wasOnlineRef.current = true
            clearRecoveredTimer()
            setBanner('hidden')
          } else {
            setBanner((current) => {
              if (current === 'restarting' || current === 'offline' || current === 'initializing') {
                clearRecoveredTimer()
                recoveredTimerRef.current = setTimeout(() => {
                  if (!cancelled) setBanner('hidden')
                }, RECOVERED_VISIBLE_MS)
                return 'recovered'
              }
              return 'hidden'
            })
          }
        } else {
          intervalMs = POLL_MS_DOWN
          clearRecoveredTimer()
          const payload = await response.json().catch(() => ({}))
          const initializing =
            payload?.status === 'initializing' ||
            (typeof payload?.readiness?.message === 'string' &&
              payload.readiness.message.toLowerCase().includes('not ready'))
          if (initializing) {
            setBanner('initializing')
          } else {
            setBanner(wasOnlineRef.current ? 'restarting' : 'offline')
          }
        }
      } catch {
        if (cancelled) return
        intervalMs = POLL_MS_DOWN
        clearRecoveredTimer()
        setBanner(wasOnlineRef.current ? 'restarting' : 'offline')
      }

      scheduleNext()
    }

    void probe()

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
      clearRecoveredTimer()
    }
  }, [])

  if (process.env.NODE_ENV === 'production') return null
  if (banner === 'hidden') return null

  const styles: Record<Exclude<BannerState, 'hidden'>, string> = {
    checking: 'bg-muted text-muted-foreground border-border',
    restarting: 'bg-amber-500/95 text-amber-950 border-amber-600',
    initializing: 'bg-sky-600/95 text-white border-sky-700',
    offline: 'bg-orange-600/95 text-white border-orange-700',
    recovered: 'bg-emerald-600/95 text-white border-emerald-700',
  }

  const icons: Record<Exclude<BannerState, 'hidden'>, ReactNode> = {
    checking: <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />,
    restarting: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />,
    initializing: <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />,
    offline: <ServerOff className="h-4 w-4 shrink-0" aria-hidden />,
    recovered: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />,
  }

  const copy: Record<Exclude<BannerState, 'hidden'>, { title: string; detail: string }> = {
    checking: {
      title: 'Checking backend…',
      detail: 'Verifying whether the Express API on port 5000 is reachable.',
    },
    restarting: {
      title: 'Backend is restarting',
      detail:
        'A code change triggered nodemon. API errors and blank panels are expected until the server terminal shows dependencies initialized (often 30s–2m on Windows).',
    },
    initializing: {
      title: 'Backend is up — database still connecting',
      detail:
        'Port 5000 is listening but `/api/auth/me` stays 503 until Postgres connects. Close stray `tsx scripts/*` processes, wait for `Background DB retry succeeded` in the server terminal, or use a direct DB URL (port 5432) if the Supabase pooler times out.',
    },
    offline: {
      title: 'Backend is not reachable',
      detail: 'Start it with `cd server && pnpm dev`. The UI will load but API calls will fail until the backend is up.',
    },
    recovered: {
      title: 'Backend is back online',
      detail: 'You can retry failed actions. First page loads may still compile slowly on F:.',
    },
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[100] border-b px-4 py-2.5 shadow-md ${styles[banner]}`}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3 text-sm">
        {icons[banner]}
        <div className="min-w-0">
          <p className="font-semibold">{copy[banner].title}</p>
          <p className="mt-0.5 text-[13px] leading-snug opacity-95">{copy[banner].detail}</p>
        </div>
      </div>
    </div>
  )
}
