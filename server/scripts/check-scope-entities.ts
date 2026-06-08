import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const DOC = 'e77ab335-1a8e-40a5-a258-e94aec0a6b78'
const JOB = '9c8235cc-4818-4476-ae9b-69fe0b210eec'

async function main() {
  await connectDatabase()
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n, array_agg(DISTINCT entity_type) AS types
     FROM entity_extractions WHERE document_id = $1 AND status != 'deleted'`,
    [DOC]
  )
  const j = await pool.query(`SELECT id, status, progress, error_message FROM jobs WHERE id = $1`, [JOB])
  console.log('entities:', r.rows[0])
  console.log('job:', j.rows[0])
  await pool.end()
}

main()
