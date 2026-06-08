/**
 * One-off cleanup: zombie ai-generate, duplicate gkg-sync pending, stale extract-entity pending.
 */
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  console.log('Job backlog cleanup\n')

  const zombies = await pool.query(`
    UPDATE jobs
    SET status = 'failed',
        completed_at = CURRENT_TIMESTAMP,
        error_message = COALESCE(
          error_message,
          'Orphaned processing job — worker gone after dev restart (cleanup)'
        )
    WHERE type = 'ai-generate'
      AND status = 'processing'
      AND (worker_id IS NULL OR worker_id = '')
      AND COALESCE(progress, 0) = 0
    RETURNING id
  `)
  console.log(`1. Failed ${zombies.rowCount} zombie ai-generate jobs`)

  const gkgDupes = await pool.query(`
    WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) AS rn
      FROM jobs
      WHERE type = 'gkg-sync-project' AND status = 'pending'
    )
    UPDATE jobs j
    SET status = 'cancelled',
        completed_at = CURRENT_TIMESTAMP,
        error_message = COALESCE(error_message, 'Superseded by newer pending gkg-sync (cleanup)')
    FROM ranked r
    WHERE j.id = r.id AND r.rn > 1
    RETURNING j.id, j.project_id
  `)
  console.log(`2. Cancelled ${gkgDupes.rowCount} duplicate pending gkg-sync-project jobs`)

  const extractStale = await pool.query(`
    UPDATE jobs
    SET status = 'cancelled',
        completed_at = CURRENT_TIMESTAMP,
        error_message = COALESCE(error_message, 'Stale extract-entity child — parent run finished (cleanup)')
    WHERE type LIKE 'extract-entity-%'
      AND status = 'pending'
      AND created_at < NOW() - INTERVAL '1 day'
    RETURNING id
  `)
  console.log(`3. Cancelled ${extractStale.rowCount} stale pending extract-entity-* jobs`)

  const summary = await pool.query(`
    SELECT status, type, COUNT(*)::int AS n
    FROM jobs
    WHERE status IN ('pending', 'processing')
      AND (type = 'ai-generate' OR type = 'gkg-sync-project' OR type LIKE 'extract-entity-%')
    GROUP BY status, type
    ORDER BY type, status
  `)
  console.log('\nRemaining active backlog:')
  console.table(summary.rows)

  await pool.end()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
