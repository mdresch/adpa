import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'

const jobId = process.argv[2] || 'dca98576-3919-409d-b2f4-10e2fc8caaab'
const costId = 'cacb97d0-ee8c-4b32-9be5-bc330c868338'

async function main() {
  await connectDatabase()

  const job = await pool.query(
    `SELECT id, status, progress, error_message, metadata->>'phase' as phase, updated_at
     FROM jobs WHERE id = $1`,
    [jobId]
  )
  console.log('=== Scope Generation Job ===')
  console.log(JSON.stringify(job.rows[0] ?? { error: 'not found' }, null, 2))

  const costTpl = await pool.query(
    `SELECT id, name, framework,
            jsonb_array_length(COALESCE(template_paragraphs, '[]'::jsonb)) as sections,
            length(system_prompt) as prompt_len
     FROM templates WHERE id = $1`,
    [costId]
  )
  console.log('\n=== Cost Template ===')
  console.log(JSON.stringify(costTpl.rows[0] ?? { error: 'not found' }, null, 2))

  const audits = await pool.query(
    `SELECT id, status, verdict, overall_score, governance_score, resilience_score,
            compliance_gaps, governance_recommendations, challenger_recommendations,
            governance_findings, challenger_findings,
            logical_vulnerabilities, error_message, created_at, completed_at
     FROM template_audits WHERE template_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [costId]
  )
  console.log('\n=== Latest Cost Template Audit ===')
  const a = audits.rows[0]
  if (a) {
    console.log(JSON.stringify(a, null, 2))
  } else {
    console.log('No audits found')
  }

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
