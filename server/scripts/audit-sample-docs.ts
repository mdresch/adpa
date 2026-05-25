import dotenv from "dotenv"
import { connectDatabase, getDatabasePool } from "../src/database/connection"
dotenv.config()
const PROJECT_ID = "e8edf585-a14d-42dc-8009-660784d31387"
async function main() {
  await connectDatabase()
  const pool = getDatabasePool()
  const dist = await pool.query(
    `SELECT COUNT(DISTINCT source_document_id)::int AS distinct_docs,
            COUNT(*)::int AS total
     FROM requirements WHERE project_id = $1`,
    [PROJECT_ID]
  )
  const sample = await pool.query(
    `SELECT r.id, LEFT(r.name, 60) AS name, d.title AS doc_title
     FROM requirements r
     JOIN documents d ON d.id = r.source_document_id
     WHERE r.project_id = $1
     LIMIT 3`,
    [PROJECT_ID]
  )
  console.log(JSON.stringify({ distinctSourceDocs: dist.rows[0], sample: sample.rows }, null, 2))
  await pool.end()
}
main()
