const { Client } = require('pg')

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const res = await client.query(
      `SELECT id, type, status, queue_name, progress, worker_id, started_at, processing_started_at, queued_at, data->>'currentStep' AS current_step, data
       FROM jobs
       WHERE status IN ('pending','processing')
       ORDER BY queued_at DESC
       LIMIT 100`
    )

    if (!res || !res.rows) {
      console.log('No jobs found')
      return
    }

    console.log(`Found ${res.rows.length} jobs (status pending/processing):\n`)
    for (const row of res.rows) {
      console.log('---')
      console.log(`id: ${row.id}`)
      console.log(`type: ${row.type}`)
      console.log(`queue: ${row.queue_name}`)
      console.log(`status: ${row.status}`)
      console.log(`progress: ${row.progress}`)
      console.log(`currentStep: ${row.current_step}`)
      console.log(`worker: ${row.worker_id}`)
      console.log(`queued_at: ${row.queued_at}`)
      console.log(`started_at: ${row.started_at}`)
      console.log(`processing_started_at: ${row.processing_started_at}`)
      // limit data printing
      try {
        const data = row.data
        if (data) {
          if (typeof data === 'string') {
            const parsed = JSON.parse(data)
            console.log('data keys:', Object.keys(parsed))
          } else if (typeof data === 'object') {
            console.log('data keys:', Object.keys(data))
          }
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.error('Query failed', err)
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
