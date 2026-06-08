/**
 * Run save-inline-entities synchronously for a document (bypasses RabbitMQ queue).
 *
 * Usage: npx tsx scripts/run-save-inline-entities.ts [documentId]
 */
import 'dotenv/config'
import { pool, connectDatabase } from '../src/database/connection'
import { InlineEntityParserService, hasInlineH8EntityTags } from '../src/services/inlineEntityParserService'

const DOC = process.argv[2] || 'e77ab335-1a8e-40a5-a258-e94aec0a6b78'

async function main() {
  await connectDatabase()

  const doc = await pool.query(
    `SELECT id, name, project_id, created_by, length(content) AS len FROM documents WHERE id = $1`,
    [DOC]
  )
  if (!doc.rows.length) throw new Error(`Document not found: ${DOC}`)
  const row = doc.rows[0]

  const contentRes = await pool.query('SELECT content FROM documents WHERE id = $1', [DOC])
  const content = contentRes.rows[0]?.content || ''

  console.log(`Document: ${row.name} (${DOC})`)
  console.log(`  content length: ${row.len}`)
  console.log(`  hasInlineH8EntityTags: ${hasInlineH8EntityTags(content)}`)

  const h8Lines = content.split(/\r?\n/).filter((l: string) => /^#{8}\s+/.test(l))
  console.log(`  H8 tag lines (########): ${h8Lines.length}`)

  let providedEntities: unknown[] = []
  try {
    const projectRes = await pool.query(
      `SELECT metadata->'existing_entities' as existing_entities FROM projects WHERE id = $1`,
      [row.project_id]
    )
    providedEntities = projectRes.rows[0]?.existing_entities || []
  } catch {
    providedEntities = []
  }

  console.log('Parsing and persisting inline entities...')
  const parseResult = await InlineEntityParserService.parseAndProcess({
    projectId: row.project_id,
    userId: row.created_by || 'system',
    documentId: DOC,
    markdown: content,
    providedEntities,
    persist: true,
  })

  if (parseResult.extractedCount > 0) {
    const counts = parseResult.extractedCountByType || {}
    const total = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0)
    await pool.query(
      `UPDATE documents SET entity_counts = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ ...counts, total }), DOC]
    )
  }

  const entities = await pool.query(
    `SELECT COUNT(*)::int AS n, array_agg(DISTINCT entity_type) AS types
     FROM entity_extractions WHERE document_id = $1 AND status != 'deleted'`,
    [DOC]
  )

  console.log('parseResult:', {
    extractedCount: parseResult.extractedCount,
    extractedCountByType: parseResult.extractedCountByType,
  })
  console.log('entity_extractions:', entities.rows[0])
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
