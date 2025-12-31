import { NextResponse } from 'next/server'
import { Client } from 'pg'
import Queue from 'bull'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const DATABASE_URL = process.env.DATABASE_URL
  const REDIS_URL = process.env.REDIS_URL || process.env.REDIS

  if (!DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 })
  }

  const client = new Client({ connectionString: DATABASE_URL })
  try {
    await client.connect()
    const res = await client.query('SELECT id, type, status, worker_id, worker_process_id, data FROM jobs WHERE id=$1', [id])
    if (!res.rows.length) return NextResponse.json({ error: 'job not found' }, { status: 404 })
    const job = res.rows[0]
    const data = typeof job.data === 'string' ? JSON.parse(job.data || '{}') : job.data || {}
    const childIds: string[] = data.childJobIds || data.childJobs || []

    const results: Array<any> = []

    if (!REDIS_URL) {
      // Return basic info only if no Redis configured
      for (const cid of childIds) {
        results.push({ id: cid, found: false, reason: 'no_redis' })
      }
      return NextResponse.json({ job: { id: job.id, type: job.type, status: job.status }, children: results })
    }

    const queue = new Queue('project-data-extraction', REDIS_URL)
    for (const cid of childIds) {
      let found = false
      let state: string | null = null
      try {
        // try as string id first, then numeric
        let qjob = await queue.getJob(cid)
        if (!qjob && /^\d+$/.test(cid)) qjob = await queue.getJob(Number(cid))
        if (qjob) {
          found = true
          try { state = await qjob.getState() } catch (e) { state = 'unknown' }
        }
      } catch (e) {
        // ignore per-child failures
      }
      results.push({ id: cid, found, state, legacyNumeric: /^\d+$/.test(cid) })
    }
    await queue.close()

    return NextResponse.json({ job: { id: job.id, type: job.type, status: job.status }, children: results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  } finally {
    try { await client.end() } catch (_) {}
  }
}
