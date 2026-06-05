import { pool } from '../src/database/connection'

async function main() {
  // Find all Project Charter templates
  const templates = await pool.query(
    `SELECT id, name, category, framework FROM document_templates WHERE name ILIKE '%project charter%' ORDER BY name`
  )
  console.log('TEMPLATES:', JSON.stringify(templates.rows, null, 2))

  // Get full template_paragraphs schema
  const schema = await pool.query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'template_paragraphs' 
     ORDER BY ordinal_position`
  )
  console.log('\nTEMPLATE_PARAGRAPHS SCHEMA:', JSON.stringify(schema.rows, null, 2))

  for (const t of templates.rows) {
    const paragraphs = await pool.query(
      `SELECT id, section_name, section_type, "order", required, description, prompt_guidance 
       FROM template_paragraphs 
       WHERE template_id = '${t.id}' 
       ORDER BY "order"`
    )
    console.log(`\nPARAGRAPHS for "${t.name}" (${t.id}):`, JSON.stringify(paragraphs.rows, null, 2))
  }

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
