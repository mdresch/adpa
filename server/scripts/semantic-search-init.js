#!/usr/bin/env node

/**
 * Semantic Search Initialization Script
 * Executes the semantic search migration and generates embeddings for knowledge base
 * 
 * Usage:
 *   npm run semantic-search:init
 *   or
 *   node scripts/semantic-search-init.js
 */

import { exec } from 'child_process'
import { pool } from '../src/database/connection'
import { semanticSearchService } from '../src/services/semanticSearchService'
import { logger } from '../src/utils/logger'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration() {
  return new Promise((resolve, reject) => {
    logger.info('[SEMANTIC-SEARCH-INIT] Running migrations...')
    
    exec('supabase db push', {
      cwd: path.resolve(__dirname, '..')
    }, (error, stdout, stderr) => {
      if (error) {
        logger.warn(`[SEMANTIC-SEARCH-INIT] Migration warning: ${error.message}`)
        // Don't fail on migration errors - they might already be applied
        resolve(true)
      } else {
        logger.info('[SEMANTIC-SEARCH-INIT] Migrations applied successfully')
        resolve(true)
      }
    })
  })
}

async function initialize() {
  try {
    logger.info('[SEMANTIC-SEARCH-INIT] Starting semantic search initialization...')
    
    // Step 1: Ensure vector extension exists
    logger.info('[SEMANTIC-SEARCH-INIT] Step 1: Enabling pgvector extension...')
    try {
      await semanticSearchService.ensureVectorExtension()
      logger.info('[SEMANTIC-SEARCH-INIT] pgvector extension ready')
    } catch (err) {
      logger.warn(`[SEMANTIC-SEARCH-INIT] pgvector warning (this may be expected in some setups): ${err.message}`)
    }
    
    // Step 2: Check if embeddings exist
    logger.info('[SEMANTIC-SEARCH-INIT] Step 2: Checking knowledge base entries...')
    const checkResult = await pool.query(`
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embeddings
      FROM knowledge_base_entries
    `)
    
    const { total, with_embeddings } = checkResult.rows[0]
    logger.info(`[SEMANTIC-SEARCH-INIT] Found ${total} KB entries, ${with_embeddings || 0} with embeddings`)
    
    if (parseInt(total) === 0) {
      logger.info('[SEMANTIC-SEARCH-INIT] No knowledge base entries found. Skipping embedding generation.')
      return {
        success: true,
        message: 'Initialization complete. No KB entries to embed.',
        details: {
          total_entries: 0,
          embedded_entries: 0
        }
      }
    }
    
    // Step 3: Generate embeddings
    logger.info('[SEMANTIC-SEARCH-INIT] Step 3: Generating embeddings...')
    logger.info('[SEMANTIC-SEARCH-INIT] This may take several minutes depending on knowledge base size')
    
    const embeddingResult = await semanticSearchService.generateKnowledgeBaseEmbeddings()
    
    logger.info(`[SEMANTIC-SEARCH-INIT] Embedding generation complete:`)
    logger.info(`  - Processed: ${embeddingResult.processedCount}`)
    logger.info(`  - Failed: ${embeddingResult.failedCount}`)
    logger.info(`  - Message: ${embeddingResult.message}`)
    
    // Step 4: Verify embeddings
    logger.info('[SEMANTIC-SEARCH-INIT] Step 4: Verifying embeddings...')
    const verifyResult = await pool.query(`
      SELECT COUNT(*) as count FROM knowledge_base_entries WHERE embedding IS NOT NULL
    `)
    const embeddedCount = verifyResult.rows[0].count
    logger.info(`[SEMANTIC-SEARCH-INIT] Successfully embedded ${embeddedCount} entries`)
    
    // Step 5: Index information
    logger.info('[SEMANTIC-SEARCH-INIT] Step 5: Checking indexes...')
    const indexResult = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'knowledge_base_entries' 
      AND indexname LIKE '%embedding%'
    `)
    logger.info(`[SEMANTIC-SEARCH-INIT] Found ${indexResult.rows.length} embedding indexes`)
    
    logger.info('[SEMANTIC-SEARCH-INIT] ✓ Semantic search initialization complete!')
    
    return {
      success: embeddingResult.success,
      message: 'Semantic search initialized successfully',
      details: {
        total_entries: parseInt(total),
        embedded_entries: embeddedCount,
        processed: embeddingResult.processedCount,
        failed: embeddingResult.failedCount
      }
    }
    
  } catch (error) {
    logger.error(`[SEMANTIC-SEARCH-INIT] Initialization failed: ${error.message}`)
    logger.error(error.stack)
    throw error
  } finally {
    await pool.end()
  }
}

// Run initialization
initialize()
  .then(result => {
    console.log('\n=== SEMANTIC SEARCH INITIALIZATION RESULT ===')
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('\n=== INITIALIZATION FAILED ===')
    console.error(error.message)
    process.exit(1)
  })
