require('dotenv').config({ path: '.env' })
const { Pool } = require('pg')

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  })

  try {
    const staleBefore = await pool.query(
      "SELECT COUNT(*)::int AS c FROM jobs WHERE status = 'processing' AND COALESCE(processing_started_at, started_at, created_at) < NOW() - INTERVAL '60 minutes'"
    )

    const updateResult = await pool.query(
      `UPDATE jobs
       SET status = 'failed',
           completed_at = CURRENT_TIMESTAMP,
           error_message = CASE
             WHEN error_message IS NULL OR error_message = '' THEN 'Job stuck in processing - auto-cleaned'
             ELSE error_message
           END
       WHERE status = 'processing'
         AND COALESCE(processing_started_at, started_at, created_at) < NOW() - INTERVAL '60 minutes'
       RETURNING id`
    )

    const staleAfter = await pool.query(
      "SELECT COUNT(*)::int AS c FROM jobs WHERE status = 'processing' AND COALESCE(processing_started_at, started_at, created_at) < NOW() - INTERVAL '60 minutes'"
    )

    console.log('stale_before=', staleBefore.rows[0]?.c ?? 0)
    console.log('updated=', updateResult.rowCount ?? 0)
    console.log('stale_after=', staleAfter.rows[0]?.c ?? 0)
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error('cleanup_failed=', error.message)
  process.exit(1)
})
