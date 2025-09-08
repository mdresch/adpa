import { pool } from './connection'
import { fileURLToPath } from 'url'

;(async () => {
  try {
    const res = await pool.query('SELECT NOW()')
    console.log('DB connection ok:', res.rows[0])
    process.exit(0)
  } catch (err) {
    console.error('DB connection failed:', err)
    process.exit(1)
  }
})()
