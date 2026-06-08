import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const ID = '8d66dba0-c4f2-4b4f-807a-ca4c71e395ad'

async function main() {
  await connectDatabase()
  const t = await pool.query(
    `SELECT prompt_version, framework, jsonb_array_length(template_paragraphs) AS sections, length(system_prompt) AS sp
     FROM templates WHERE id = $1`,
    [ID]
  )
  const v = await pool.query(
    `SELECT version_number, change_summary, paragraph_count, length(system_prompt) AS sp
     FROM template_versions WHERE template_id = $1 ORDER BY created_at DESC LIMIT 2`,
    [ID]
  )
  const h = await pool.query(
    `SELECT version_number, changes FROM template_version_history WHERE template_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [ID]
  )
  console.log('template:', t.rows[0])
  console.log('versions:', v.rows)
  console.log('history:', h.rows[0])
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
