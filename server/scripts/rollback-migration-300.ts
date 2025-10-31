/**
 * Migration Rollback: Remove Worker Metadata from Jobs Table
 * Purpose: Rollback migration 300 if needed
 * Usage: npm run migrate:300:rollback or ts-node scripts/rollback-migration-300.ts
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function rollbackMigration() {
  const rollbackFile = path.join(__dirname, '../migrations/300_rollback_worker_metadata.sql')
  
  try {
    logger.warn('⚠️  Starting rollback of migration 300: Remove worker metadata from jobs table')
    logger.warn('This will remove the following columns: worker_id, worker_process_id, queue_name, queue_position, queued_at, processing_started_at')
    
    // Wait 3 seconds to allow user to cancel
    logger.info('Starting rollback in 3 seconds... (Press Ctrl+C to cancel)')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info('Database connected successfully')
    
    // Read rollback SQL
    const rollbackSQL = fs.readFileSync(rollbackFile, 'utf-8')
    
    // Execute rollback
    logger.info('Executing rollback SQL...')
    await pool.query(rollbackSQL)
    
    logger.info('✅ Rollback completed successfully!')
    
    // Verify columns were removed
    logger.info('Verifying columns were removed...')
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'jobs'
      AND column_name IN ('worker_id', 'worker_process_id', 'queue_name', 'queue_position', 'queued_at', 'processing_started_at')
    `)
    
    if (result.rows.length === 0) {
      logger.info('✅ All worker metadata columns removed successfully')
    } else {
      logger.warn('⚠️  Some columns may still exist:', result.rows.map(r => r.column_name))
    }
    
    // Verify indexes were removed
    logger.info('Verifying indexes were removed...')
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'jobs'
      AND (indexname LIKE 'idx_jobs_worker%' OR indexname LIKE 'idx_jobs_queue%' OR indexname LIKE 'idx_jobs_processing_started%')
    `)
    
    if (indexResult.rows.length === 0) {
      logger.info('✅ All worker metadata indexes removed successfully')
    } else {
      logger.warn('⚠️  Some indexes may still exist:', indexResult.rows.map(r => r.indexname))
    }
    
    logger.info('\n✨ Rollback completed successfully! ✨')
    logger.info('Database has been restored to pre-migration state.')
    
    process.exit(0)
  } catch (error) {
    logger.error('❌ Rollback failed:', error)
    logger.error('Error details:', error)
    
    logger.error('\nManual intervention may be required.')
    logger.error('Please check the database state and contact the development team.')
    
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Rollback interrupted by user')
  await pool.end()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logger.info('Rollback terminated')
  await pool.end()
  process.exit(1)
})

// Run rollback
rollbackMigration()

