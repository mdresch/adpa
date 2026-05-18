/**
 * Keep-alive ping route for Render backend.
 *
 * Vercel calls this via cron (vercel.json) every 10 minutes.
 * It pings the Render health endpoint to prevent the free-tier
 * service from hibernating, eliminating cold-start 502s.
 */
export async function GET() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL

  if (!backendUrl) {
    return Response.json({ ok: false, reason: 'BACKEND_URL not configured' }, { status: 500 })
  }

  const target = `${backendUrl.replace(/\/$/, '')}/health`

  try {
    const res = await fetch(target, {
      method: 'GET',
      signal: AbortSignal.timeout(15_000), // 15s timeout
      headers: { 'User-Agent': 'ADPA-Keepalive/1.0' },
    })

    const body = await res.json().catch(() => ({}))

    return Response.json({
      ok: res.ok,
      status: res.status,
      target,
      backend: body,
      ts: new Date().toISOString(),
    })
  } catch (err: any) {
    return Response.json(
      { ok: false, target, error: err?.message, ts: new Date().toISOString() },
      { status: 502 }
    )
  }
}
