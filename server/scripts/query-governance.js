const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
const { Pool } = require('pg')

async function run(projectId) {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) { console.error('No DATABASE_URL'); process.exit(1) }
  const pool = new Pool({ connectionString, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false })
  try {
    const res = await pool.query('SELECT id, project_id, decision_id, description, source_document_id, created_by, created_at FROM governance_decisions WHERE project_id = $1 ORDER BY created_at', [projectId])
    console.log('Rows:', res.rows.length)
    res.rows.forEach(r => console.log(r))
  } catch (err) {
    console.error('Query failed:', err.message || err)
  } finally {
    try { await pool.end() } catch (e) {}
  }
}

const projectId = process.argv[2]
if (!projectId) { console.error('Usage: node query-governance.js <project_id>'); process.exit(1) }
run(projectId)
