import { pool } from '../src/database/connection'

const jobId = process.argv[2] || '2dccb7b7-27f8-4214-8bf7-669114c41e12'

;(async () => {
  try {
    const result = await pool.query(
      'SELECT id, status, progress, error_message, started_at, completed_at FROM jobs WHERE id = $1',
      [jobId]
    )
    
    console.log(JSON.stringify(result.rows[0], null, 2))
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    await pool.end()
    process.exit(1)
  }
})()

