import 'dotenv/config'
import { connectDatabase, pool } from '../src/database/connection.js'

async function main() {
  await connectDatabase()
  const r = await pool.query(`
    SELECT id, name,
      jsonb_array_length(COALESCE(template_paragraphs, '[]'::jsonb)) AS sections,
      length(system_prompt::text) AS sp_len,
      length(content::text) AS content_len
    FROM templates
    WHERE name ILIKE '%schedule management%'
    ORDER BY name
  `)
  console.log(JSON.stringify(r.rows, null, 2))
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
