const db = require('../src/lib/db')
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const dbUrl = new URL(process.env.DATABASE_URL!)
const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1).split('?')[0],
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const result = await db.query(`
    SELECT p.id, p.name, p.budget, p.actual_cost, p.internal_labor_cost, prog.name as program_name
    FROM projects p
    JOIN programs prog ON p.program_id = prog.id
    WHERE prog.name = 'Digital Transformation Initiative'
    ORDER BY p.name
  `)
  
  console.log('\n📋 Projects in "Digital Transformation Initiative":\n')
  for (const row of result.rows) {
    console.log(`Project: ${row.name}`)
    console.log(`  ID: ${row.id}`)
    console.log(`  Budget: $${row.budget}`)
    console.log(`  Actual: $${row.actual_cost}`)
    console.log(`  Internal Labor: $${row.internal_labor_cost}`)
    console.log(`  URL: http://localhost:3000/projects/${row.id}`)
    console.log('')
  }
  
  try { await db.end() } catch (e) {}}

main()

