/**
 * Re-enqueue entity persistence for an existing document (e.g. after generation completed without entities).
 *
 * Usage: npx tsx scripts/enqueue-document-entities.ts [documentId]
 */
import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'
import { enqueueEntityPersistence } from '../src/services/jobs/enqueueEntityPersistence'
import { hasInlineH8EntityTags } from '../src/services/inlineEntityParserService'

const SCOPE_TEMPLATE_ID = '31bf5ce4-97b7-4a41-b7b2-c9e26011ae68'

async function main() {
  const docIdArg = process.argv[2]
  await connectDatabase()

  let docId = docIdArg
  if (!docId) {
    const latest = await pool.query(
      `SELECT id, name FROM documents
       WHERE template_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [SCOPE_TEMPLATE_ID]
    )
    if (!latest.rows.length) throw new Error('No Scope Management Plan document found')
    docId = latest.rows[0].id
    console.log(`Using latest Scope doc: ${latest.rows[0].name} (${docId})`)
  }

  const doc = await pool.query(
    `SELECT id, name, project_id, created_by, length(content) AS content_len FROM documents WHERE id = $1`,
    [docId]
  )
  if (!doc.rows.length) throw new Error(`Document not found: ${docId}`)

  const row = doc.rows[0]
  const contentRes = await pool.query('SELECT content FROM documents WHERE id = $1', [docId])
  const content = contentRes.rows[0]?.content || ''

  const existing = await pool.query(
    `SELECT COUNT(*)::int AS n FROM entity_extractions WHERE document_id = $1 AND status != 'deleted'`,
    [docId]
  )

  console.log(`Document: ${row.name}`)
  console.log(`  content length: ${row.content_len}`)
  console.log(`  existing entity_extractions: ${existing.rows[0].n}`)
  console.log(`  hasInlineH8EntityTags: ${hasInlineH8EntityTags(content)}`)

  const jobId = await enqueueEntityPersistence({
    projectId: row.project_id,
    userId: row.created_by || 'system',
    documentId: docId!,
    content,
    triggeredBy: 'manual-backfill',
    autoTriggered: false,
  })

  console.log(jobId ? `Enqueued job: ${jobId}` : 'Nothing enqueued (empty content)')
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
