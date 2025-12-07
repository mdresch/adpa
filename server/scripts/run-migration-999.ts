/**
 * Migration Runner: Make resource_assignment_id nullable in task_assignments (migration 999)
 * Purpose: Allow task assignments for stakeholders who don't have project_resource_assignments entries
 * Usage: npm run migrate:999  (from server/ folder) or npx tsx server/scripts/run-migration-999.ts
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/999_make_resource_assignment_id_nullable.sql')

  try {
    logger.info('Starting migration 999: Make resource_assignment_id nullable in task_assignments')

    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()

    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }

    logger.info('Database connected successfully')

    // Read migration SQL
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8')

    logger.info('Applying migration SQL...')
    await pool.query(migrationSQL)

    // Verify the column is now nullable
    logger.info('Verifying column is nullable...')
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'task_assignments'
      AND column_name = 'resource_assignment_id'
    `)

    if (result.rows.length === 0) {
      throw new Error('Column resource_assignment_id not found in task_assignments table')
    }

    const column = result.rows[0]
    logger.info(`Column status: ${column.column_name} (${column.data_type}) - nullable: ${column.is_nullable}`)

    if (column.is_nullable !== 'YES') {
      throw new Error('Column resource_assignment_id is still NOT NULL after migration')
    }

    // Verify foreign key constraint still exists
    logger.info('Verifying foreign key constraint...')
    const fkResult = await pool.query(`
      SELECT conname, confrelid::regclass as referenced_table
      FROM pg_constraint
      WHERE conrelid = 'task_assignments'::regclass
      AND confrelid = 'project_resource_assignments'::regclass
      AND contype = 'f'
    `)

    if (fkResult.rows.length > 0) {
      logger.info(`Foreign key constraint found: ${fkResult.rows[0].conname}`)
    } else {
      logger.warn('Foreign key constraint not found - this may be expected if it was dropped')
    }

    logger.info('✅ Migration 999 completed successfully!')
    logger.info('✨ task_assignments.resource_assignment_id is now nullable')
    logger.info('✨ Stakeholder-based task assignments are now supported')

    process.exit(0)
  } catch (error) {
    logger.error('❌ Migration 999 failed:', error)
    logger.error('Error details:', error)

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

runMigration()
