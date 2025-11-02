/**
 * Diagnostic Script: Check Document Creation Issues
 * Purpose: Investigate why generated documents don't appear in project library
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function diagnose() {
  try {
    logger.info('🔍 Starting document creation diagnostic...')
    
    // Connect to database
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed')
    }
    
    logger.info('✅ Database connected')
    
    // Check recent completed jobs
    logger.info('\n📋 Checking recent completed jobs...')
    const recentJobs = await pool.query(`
      SELECT 
        j.id,
        j.type,
        j.status,
        j.project_id,
        j.project_name,
        j.created_at,
        j.completed_at,
        j.data->>'projectId' as data_project_id,
        j.data->'variables'->>'project_id' as variables_project_id,
        (j.result->>'documentId')::text as result_document_id
      FROM jobs j
      WHERE j.status = 'completed'
        AND j.type IN ('ai-generate', 'process-flow', 'document-regeneration')
        AND j.completed_at > NOW() - INTERVAL '1 hour'
      ORDER BY j.completed_at DESC
      LIMIT 10
    `)
    
    logger.info(`Found ${recentJobs.rows.length} recent completed jobs`)
    
    for (const job of recentJobs.rows) {
      logger.info(`\nJob ${job.id}:`)
      logger.info(`  Type: ${job.type}`)
      logger.info(`  Project ID (column): ${job.project_id}`)
      logger.info(`  Project ID (data): ${job.data_project_id}`)
      logger.info(`  Project ID (variables): ${job.variables_project_id}`)
      logger.info(`  Project Name: ${job.project_name}`)
      logger.info(`  Result Document ID: ${job.result_document_id}`)
      logger.info(`  Completed: ${job.completed_at}`)
      
      // Check if document exists
      if (job.result_document_id) {
        const docCheck = await pool.query(
          'SELECT id, name, project_id, status, deleted_at, parent_document_id FROM documents WHERE id = $1',
          [job.result_document_id]
        )
        
        if (docCheck.rows.length > 0) {
          const doc = docCheck.rows[0]
          logger.info(`  ✅ Document EXISTS:`)
          logger.info(`     - Name: ${doc.name}`)
          logger.info(`     - Project ID: ${doc.project_id}`)
          logger.info(`     - Status: ${doc.status}`)
          logger.info(`     - Deleted: ${doc.deleted_at ? 'YES' : 'NO'}`)
          logger.info(`     - Parent Doc ID: ${doc.parent_document_id || 'NULL'}`)
          
          // Check if it would be returned by the query
          if (doc.deleted_at === null && doc.parent_document_id === null) {
            logger.info(`     ✅ Should appear in library`)
          } else {
            logger.warn(`     ⚠️  Would be FILTERED OUT:`)
            if (doc.deleted_at) logger.warn(`        - Has deleted_at: ${doc.deleted_at}`)
            if (doc.parent_document_id) logger.warn(`        - Has parent_document_id: ${doc.parent_document_id}`)
          }
        } else {
          logger.error(`  ❌ Document NOT FOUND in database!`)
        }
      } else {
        logger.warn(`  ⚠️  No document ID in job result`)
      }
    }
    
    // Check documents for a specific project
    logger.info('\n\n📁 Checking documents in database...')
    const allDocs = await pool.query(`
      SELECT 
        d.id,
        d.name,
        d.project_id,
        d.status,
        d.created_at,
        d.deleted_at,
        d.parent_document_id,
        p.name as project_name
      FROM documents d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY d.created_at DESC
      LIMIT 20
    `)
    
    logger.info(`Found ${allDocs.rows.length} documents created in last hour`)
    
    for (const doc of allDocs.rows) {
      logger.info(`\nDocument ${doc.id}:`)
      logger.info(`  Name: ${doc.name}`)
      logger.info(`  Project: ${doc.project_name} (${doc.project_id})`)
      logger.info(`  Status: ${doc.status}`)
      logger.info(`  Created: ${doc.created_at}`)
      logger.info(`  Deleted: ${doc.deleted_at ? 'YES' : 'NO'}`)
      logger.info(`  Parent Doc ID: ${doc.parent_document_id || 'NULL'}`)
      
      // Check query filters
      const passesFilters = doc.deleted_at === null && doc.parent_document_id === null
      if (passesFilters) {
        logger.info(`  ✅ VISIBLE in library`)
      } else {
        logger.warn(`  ⚠️  HIDDEN from library:`)
        if (doc.deleted_at) logger.warn(`     - Deleted: ${doc.deleted_at}`)
        if (doc.parent_document_id) logger.warn(`     - Is version of: ${doc.parent_document_id}`)
      }
    }
    
    // Check for documents with project_id = NULL
    logger.info('\n\n⚠️  Checking for orphaned documents (no project_id)...')
    const orphanedDocs = await pool.query(`
      SELECT id, name, project_id, status, created_at
      FROM documents
      WHERE project_id IS NULL
        AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `)
    
    if (orphanedDocs.rows.length > 0) {
      logger.warn(`Found ${orphanedDocs.rows.length} orphaned documents!`)
      orphanedDocs.rows.forEach(doc => {
        logger.warn(`  - ${doc.name} (${doc.id}) - Created: ${doc.created_at}`)
      })
    } else {
      logger.info('✅ No orphaned documents found')
    }
    
    logger.info('\n\n✅ Diagnostic complete!')
    logger.info('Check the output above to identify the issue.')
    
    process.exit(0)
  } catch (error) {
    logger.error('❌ Diagnostic failed:', error)
    process.exit(1)
  }
}

// Run diagnostic
diagnose()

