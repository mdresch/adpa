import { ragService } from '../server/src/services/ragService'
import { connectDatabase, pool } from '../server/src/database/connection'

interface CliArgs {
  documentId?: string
  limit: number
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { limit: 25 }

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]
    if (token === '--document-id' && argv[index + 1]) {
      args.documentId = argv[index + 1]
      index += 1
      continue
    }
    if (token === '--limit' && argv[index + 1]) {
      const parsed = Number(argv[index + 1])
      if (Number.isFinite(parsed) && parsed > 0) {
        args.limit = Math.min(parsed, 200)
      }
      index += 1
    }
  }

  return args
}

async function run(): Promise<void> {
  await connectDatabase()

  if (!pool) {
    throw new Error('Database pool is not initialized')
  }

  const { documentId, limit } = parseArgs(process.argv.slice(2))

  if (documentId) {
    const result = await ragService.ingestDocument(documentId)
    console.log(`Ingested document ${documentId}: ${result.chunks} chunks`)
    return
  }

  const { rows } = await pool.query(
    `
      SELECT id
      FROM documents
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  )

  let success = 0
  let failed = 0

  for (const row of rows) {
    try {
      const result = await ragService.ingestDocument(row.id)
      success += 1
      console.log(`✔ ${row.id}: ${result.chunks} chunks`)
    } catch (error: any) {
      failed += 1
      console.error(`✖ ${row.id}: ${error.message}`)
    }
  }

  console.log(`Done. Success: ${success}, Failed: ${failed}, Total: ${rows.length}`)
}

run()
  .catch((error) => {
    console.error('chunk-documents failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    if (pool) {
      await pool.end()
    }
  })
