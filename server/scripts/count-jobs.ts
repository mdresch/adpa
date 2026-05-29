import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

async function run() {
  await connectDatabase()
  if (!pool) return
  const res = await pool.query("SELECT count(*), status FROM jobs WHERE queue_name IS NULL OR queue_name = '' GROUP BY status")
  console.log('MISSING QUEUE NAMES BY STATUS:', res.rows)
  const res2 = await pool.query("SELECT count(*), type FROM jobs WHERE queue_name IS NULL OR queue_name = '' GROUP BY type")
  console.log('MISSING QUEUE NAMES BY TYPE:', res2.rows)
  const res3 = await pool.query("SELECT count(*) FROM jobs")
  console.log('TOTAL JOBS:', res3.rows[0].count)
  const res4 = await pool.query("SELECT count(*) FROM jobs WHERE queue_name IS NOT NULL AND queue_name != ''")
  console.log('TOTAL JOBS WITH QUEUE NAME:', res4.rows[0].count)
  process.exit(0)
}

run()
