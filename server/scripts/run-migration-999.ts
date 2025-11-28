/**
 * Migration Runner: Seed development-friendly KB samples (migration 999)
 * Purpose: Run migration 999 to insert deterministic dev sample project + KB entry + recommendation
 * Usage: npm run migrate:999  (from server/ folder) or npx tsx server/scripts/run-migration-999.ts
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/999_dev_seed_knowledge_base_samples.sql')

  try {
    logger.info('Starting migration 999: Dev seed knowledge base samples')

    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()

    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }

    logger.info('Database connected successfully')

    // Read migration SQL and only run the UP portion. Migration files include a DOWN section
    // after the UP which may reference tables that don't exist in all schemas. To be
    // tolerant we only apply the UP portion when running a dev-only seeding migration.
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8')
    const upSql = migrationSQL.split(/\n--\s*DOWN\b/)[0]

    logger.info('Applying migration SQL (UP section only)...')
    await pool.query(upSql)

    // Quick verification: report which of the deterministic dev records exist now
    const [projectRes, kbRes, recRes] = await Promise.all([
      pool.query("SELECT id FROM projects WHERE id = '11111111-1111-1111-1111-111111111111' LIMIT 1"),
      pool.query("SELECT id FROM knowledge_base_entries WHERE id = '22222222-2222-2222-2222-222222222222' LIMIT 1"),
      pool.query("SELECT id FROM knowledge_base_recommendations WHERE id = '33333333-3333-3333-3333-333333333333' LIMIT 1")
        .catch(() => ({ rowCount: 0 }))
    ])

    logger.info('✅ Migration 999 applied successfully! (dev seed inserted if not present)', {
      project_present: !!(projectRes?.rowCount),
      knowledge_entry_present: !!(kbRes?.rowCount),
      recommendation_present: !!(recRes?.rowCount)
    })

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
