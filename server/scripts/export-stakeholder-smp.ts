import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'
import { writeFileSync } from 'fs'

const ID = '8d66dba0-c4f2-4b4f-807a-ca4c71e395ad'

async function main() {
  await connectDatabase()
  const r = await pool.query(
    `SELECT id, name, framework, prompt_version, system_prompt, template_paragraphs, content
     FROM templates WHERE id = $1`,
    [ID]
  )
  writeFileSync(
    'scripts/stakeholder-smp-current.json',
    JSON.stringify(r.rows[0], null, 2),
    'utf8'
  )
  console.log('Wrote scripts/stakeholder-smp-current.json')
  console.log('prompt_version:', r.rows[0].prompt_version)
  console.log('system_prompt length:', r.rows[0].system_prompt?.length)
  await pool.end()
}

main().catch(console.error)
