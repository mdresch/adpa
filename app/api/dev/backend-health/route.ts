import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROBE_TIMEOUT_MS = 15_000

/**
 * Dev-only probe: checks whether the Express backend is accepting traffic.
 * Kept on the Next server (not proxied) so the UI can detect nodemon restarts.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')

  try {
    const liveness = await fetch(`${backendUrl}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })

    if (!liveness.ok) {
      return NextResponse.json(
        {
          status: 'down',
          reason: 'unhealthy',
          httpStatus: liveness.status,
          backendUrl,
        },
        { status: 503 }
      )
    }

    const livenessBody = await liveness.json().catch(() => ({}))

    // Liveness passes before the readiness gate opens (DB still connecting).
    const readiness = await fetch(`${backendUrl}/api/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })

    const readinessBody = await readiness.json().catch(() => ({}))

    if (!readiness.ok) {
      return NextResponse.json(
        {
          status: 'initializing',
          backendUrl,
          ...livenessBody,
          readiness: readinessBody,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'up',
      backendUrl,
      ...livenessBody,
      readiness: readinessBody,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unreachable'
    return NextResponse.json(
      {
        status: 'down',
        reason: message,
        backendUrl,
      },
      { status: 503 }
    )
  }
}
