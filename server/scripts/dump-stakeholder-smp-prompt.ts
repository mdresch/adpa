import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const IDS = [
  '8d66dba0-c4f2-4b4f-807a-ca4c71e395ad',
  '735907f3-3fbc-4385-ae28-cc1557ed3c24',
]

async function main() {
  await connectDatabase()
  for (const id of IDS) {
    const r = await pool.query(
      `SELECT id, name, framework, category, description, system_prompt
       FROM templates WHERE id = $1`,
      [id]
    )
    const row = r.rows[0]
    console.log('\n==========', row.name, row.id, '==========')
    console.log('framework:', row.framework, '| category:', row.category)
    console.log('description:', row.description?.slice(0, 200))
    console.log('\n--- system_prompt ---\n')
    console.log(row.system_prompt)
  }
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
