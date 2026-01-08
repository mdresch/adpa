import { NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const DATABASE_URL = process.env.DATABASE_URL

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

    // Note: This endpoint previously checked child job status in Redis/Bull queues.
    // The system now uses RabbitMQ for queue management.
    // Child job status should be checked via the database jobs table or RabbitMQ management UI.
    
    const results: Array<any> = childIds.map(cid => ({
      id: cid,
      note: 'Queue system migrated to RabbitMQ. Check database jobs table or RabbitMQ UI for status.'
    }))

    return NextResponse.json({ 
      job: { 
        id: job.id, 
        type: job.type, 
        status: job.status,
        worker_id: job.worker_id,
        worker_process_id: job.worker_process_id
      }, 
      children: results 
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  } finally {
    try { await client.end() } catch (_) {}
  }
}
