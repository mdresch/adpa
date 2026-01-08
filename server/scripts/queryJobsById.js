require('dotenv').config()

(async function(){ try{ await db.initDb() } catch(e){} })();
const db = require('../src/lib/db')

async function queryByIds(ids) {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in environment')
    process.exit(2)
  }
  const pool = new Pool({ connectionString: databaseUrl })
  try {
    const q = `SELECT id, type, status, queue_name, queued_at, processing_started_at, worker_id, error_message, created_at, data
               FROM jobs WHERE id = ANY($1::uuid[])`
    const res = await db.query(q, [ids])
    try { await db.end() } catch (e) {}return res.rows
  } catch (err) {
    try { try { await db.end() } catch (e) {}} catch (e) {}
    console.error('query error:', err.message || err)
    process.exit(3)
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (!args.length) {
    console.error('Usage: node queryJobsById.js <jobId1> <jobId2> ...')
    process.exit(1)
  }
  const rows = await queryByIds(args)
  console.log(JSON.stringify({ queried: args, count: rows.length, rows }, null, 2))
}

main()
