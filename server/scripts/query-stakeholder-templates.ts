import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

async function main() {
  await connectDatabase()
  const r = await pool.query(
    `SELECT id, name, framework,
            jsonb_array_length(COALESCE(template_paragraphs, '[]'::jsonb)) as sections,
            length(COALESCE(system_prompt, '')) as sp_len
     FROM templates
     WHERE name ILIKE '%stakeholder%'
     ORDER BY name`
  )
  console.log(JSON.stringify(r.rows, null, 2))

  if (r.rows.length > 0) {
    const detail = await pool.query(
      `SELECT id, name, system_prompt, template_paragraphs
       FROM templates WHERE name ILIKE '%stakeholder%management%plan%' LIMIT 1`
    )
    if (detail.rows[0]) {
      const row = detail.rows[0]
      console.log('\n--- SMP detail ---')
      console.log('system_prompt length:', row.system_prompt?.length)
      console.log('paragraphs:', JSON.stringify(row.template_paragraphs, null, 2)?.slice(0, 8000))
    }
  }
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
