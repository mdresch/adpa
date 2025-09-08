import { pool } from './connection'

;(async () => {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name IN ('priority', 'rate_limits')`)
    console.log('Columns present:', res.rows)
    process.exit(0)
  } catch (err) {
    console.error('Check failed:', err)
    process.exit(1)
  }
})()
