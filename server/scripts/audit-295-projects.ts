import dotenv from "dotenv"
import { connectDatabase, getDatabasePool } from "../src/database/connection"

dotenv.config()

async function main() {
  await connectDatabase()
  const pool = getDatabasePool()
  const r = await pool.query(`
    SELECT p.id, p.name, COUNT(req.id)::int AS req_count
    FROM projects p
    JOIN requirements req ON req.project_id = p.id
    GROUP BY p.id, p.name
    HAVING COUNT(req.id) BETWEEN 280 AND 310
    ORDER BY COUNT(req.id)
  `)
  console.log(JSON.stringify(r.rows, null, 2))
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
