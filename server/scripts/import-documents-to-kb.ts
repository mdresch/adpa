import dotenv from 'dotenv'
import path from 'path'

// Load from root .env
dotenv.config({ path: path.join(__dirname, '../../.env') })

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import { semanticSearchService } from '../src/services/semanticSearchService'

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')

/**
 * Import documents as knowledge base entries
 * Converts existing documents into KB entries for semantic search
 */

async function importDocumentsToKB() {
  // Initialize database connection
  await connectDatabase()
  try {
    logger.info('[IMPORT-KB] Starting document to KB conversion...')

    // Get all documents that don't have a corresponding KB entry
    const docsResult = await pool.query(`
      SELECT 
        d.id,
        d.title,
        d.description,
        d.file_path,
        COALESCE(d.content, d.description) as context,
        d.created_at,
        d.created_by
      FROM documents d
      WHERE d.title IS NOT NULL 
        AND d.description IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM knowledge_base_entries kb 
          WHERE kb.source_document_id = d.id
        )
      ORDER BY d.created_at DESC
      LIMIT 500  -- Process in batches to avoid timeouts
    `)

    const documents = docsResult.rows
    logger.info(`[IMPORT-KB] Found ${documents.length} documents to import`)

    if (documents.length === 0) {
      logger.info('[IMPORT-KB] No new documents to import')
      return { success: true, imported: 0, skipped: 0, failed: 0 }
    }

    let imported = 0
    let failed = 0

    for (const doc of documents) {
      try {
        // Create KB entry from document
        const result = await pool.query(`
          INSERT INTO knowledge_base_entries (
            entry_type,
            category,
            title,
            description,
            context,
            source_document_id,
            created_by,
            created_at,
            updated_at
          ) VALUES (
            'document_extract',
            'general',
            $1,
            $2,
            $3,
            $4,
            $5,
            NOW(),
            NOW()
          ) RETURNING id
        `, [
          doc.title,
          doc.description,
          doc.context || doc.description,
          doc.id,
          doc.created_by || 'system'
        ])

        imported++
        if (imported % 100 === 0) {
          logger.info(`[IMPORT-KB] Imported ${imported}/${documents.length}`)
        }
      } catch (error: any) {
        logger.error(`[IMPORT-KB] Failed to import doc ${doc.id}: ${error.message}`)
        failed++
      }
    }

    logger.info(`[IMPORT-KB] Document import complete: ${imported} imported, ${failed} failed`)

    // Generate embeddings for newly created entries
    logger.info('[IMPORT-KB] Starting embedding generation for new entries...')
    const embedResult = await semanticSearchService.generateKnowledgeBaseEmbeddings()

    logger.info(`[IMPORT-KB] Complete! Embeddings: ${JSON.stringify(embedResult)}`)

    return {
      success: true,
      imported,
      failed,
      embeddingStatus: embedResult
    }
  } catch (error: any) {
    logger.error('[IMPORT-KB] Fatal error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the import
importDocumentsToKB()
  .then(result => {
    console.log('\n✓ Import completed:', JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch(error => {
    console.error('\n✗ Import failed:', error)
    process.exit(1)
  })
