/**
 * Diagnose entity extraction for latest Scope Management Plan document.
 */
import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'
import { hasInlineH8EntityTags, INLINE_H8_ENTITY_LINE_REGEX } from '../src/services/inlineEntityParserService'

const SCOPE_TEMPLATE_ID = '31bf5ce4-97b7-4a41-b7b2-c9e26011ae68'

async function main() {
  await connectDatabase()

  const docs = await pool.query(
    `SELECT id, name, project_id, template_id, created_at,
            length(content) AS content_len,
            entity_counts,
            generation_metadata->>'jobId' AS job_id
     FROM documents
     WHERE template_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 3`,
    [SCOPE_TEMPLATE_ID]
  )

  console.log('Recent Scope documents:', docs.rows.length)
  for (const doc of docs.rows) {
    const contentRes = await pool.query('SELECT content FROM documents WHERE id = $1', [doc.id])
    const content = contentRes.rows[0]?.content || ''
    const h8Lines = content.split(/\r?\n/).filter((l: string) => INLINE_H8_ENTITY_LINE_REGEX.test(l))
    const entities = await pool.query(
      `SELECT COUNT(*)::int AS n, array_agg(DISTINCT entity_type) AS types
       FROM entity_extractions WHERE document_id = $1 AND status != 'deleted'`,
      [doc.id]
    )
    const jobs = await pool.query(
      `SELECT id, type, status, progress, error_message, created_at
       FROM jobs
       WHERE (data->>'documentId' = $1 OR data->>'sourceDocumentId' = $1 OR data->>'parentJobId' = $2)
       ORDER BY created_at DESC
       LIMIT 8`,
      [doc.id, doc.job_id || '']
    )

    console.log('\n---', doc.name, doc.id)
    console.log('  created:', doc.created_at, 'content_len:', doc.content_len, 'job:', doc.job_id)
    console.log('  entity_counts:', doc.entity_counts)
    console.log('  hasInlineH8EntityTags:', hasInlineH8EntityTags(content))
    console.log('  h8 line count:', h8Lines.length)
    if (h8Lines.length > 0) console.log('  sample H8:', h8Lines[0].slice(0, 120))
    console.log('  entity_extractions:', entities.rows[0])
    console.log('  related jobs:', jobs.rows.map((j) => `${j.type} ${j.status} ${j.progress}%`))
  }

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
