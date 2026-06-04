import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

async function main() {
  await connectDatabase()
  const t = await pool.query(`SELECT id, name FROM templates WHERE name ILIKE '%communication%' ORDER BY name`)
  console.log('CMP TEMPLATES:', JSON.stringify(t.rows, null, 2))
  await pool.end()
}
main().catch(e => { console.error(e); process.exit(1) })
