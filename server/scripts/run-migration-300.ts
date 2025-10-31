/**
 * Migration Runner: Add Worker Metadata to Jobs Table
 * Purpose: Run migration 300 to enable job monitor enhancement
 * Usage: npm run migrate:300 or ts-node scripts/run-migration-300.ts
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/300_add_worker_metadata_to_jobs.sql')
  
  try {
    logger.info('Starting migration 300: Add worker metadata to jobs table')
    
    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info('Database connected successfully')
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8')
    
    // Execute migration
    logger.info('Executing migration SQL...')
    await pool.query(migrationSQL)
    
    logger.info('✅ Migration 300 completed successfully!')
    
    // Verify columns were added
    logger.info('Verifying new columns...')
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'jobs'
      AND column_name IN ('worker_id', 'worker_process_id', 'queue_name', 'queue_position', 'queued_at', 'processing_started_at')
      ORDER BY column_name
    `)
    
    logger.info('New columns added:')
    result.rows.forEach(row => {
      logger.info(`  - ${row.column_name} (${row.data_type})`)
    })
    
    // Verify indexes were created
    logger.info('Verifying indexes...')
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'jobs'
      AND indexname LIKE 'idx_jobs_worker%' OR indexname LIKE 'idx_jobs_queue%' OR indexname LIKE 'idx_jobs_processing%'
      ORDER BY indexname
    `)
    
    logger.info('Indexes created:')
    indexResult.rows.forEach(row => {
      logger.info(`  - ${row.indexname}`)
    })
    
    logger.info('\n✨ Migration 300 completed successfully! ✨')
    logger.info('Job monitor enhancement database setup is ready.')
    
    process.exit(0)
  } catch (error) {
    logger.error('❌ Migration 300 failed:', error)
    logger.error('Error details:', error)
    
    logger.info('\nRollback instructions:')
    logger.info('  Run: npm run migrate:300:rollback')
    logger.info('  Or:  ts-node scripts/rollback-migration-300.ts')
    
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Migration interrupted by user')
  await pool.end()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  logger.info('Migration terminated')
  await pool.end()
  process.exit(1)
})

// Run migration
runMigration()

