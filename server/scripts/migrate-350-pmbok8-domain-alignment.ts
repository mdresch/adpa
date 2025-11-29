/**
 * Migration Runner for 350_pmbok8_domain_alignment.sql
 *
 * Applies the PMBOK 8 domain alignment migration to the database using the
 * same pool/connection config as the rest of the backend (no interactive prompts).
 *
 * Usage:
 *   npm run migrate:350
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { connectDatabase, getDatabasePool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

dotenv.config()

const log = logger.child({ service: 'migration-350' })
const migrationFile = path.join(__dirname, '../migrations/350_pmbok8_domain_alignment.sql')

async function run(): Promise<void> {
  try {
    log.info('🚀 Running Migration 350: PMBOK 8 Domain Alignment')

    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`)
    }

    const sql = fs.readFileSync(migrationFile, 'utf-8')
    if (!sql.trim()) {
      throw new Error('Migration file is empty')
    }

    log.info('📡 Connecting to database...')
    await connectDatabase()
    const pool = getDatabasePool()
    log.info('✅ Database connected successfully')

    const startTime = Date.now()

    log.info('🔄 Executing migration 350_pmbok8_domain_alignment.sql')

    await pool.query('BEGIN')
    try {
      await pool.query(sql)
      await pool.query('COMMIT')
    } catch (err) {
      await pool.query('ROLLBACK')
      throw err
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2)
    log.info(`✅ Migration 350 executed successfully in ${durationSec}s`)
  } catch (err: any) {
    log.error('❌ PMBOK 8 domain alignment migration 350 failed', {
      error: err?.message,
      stack: err?.stack
    })
    process.exit(1)
  } finally {
    try {
      const pool = getDatabasePool()
      await pool.end()
    } catch {
      // ignore
    }
  }
}

void run()


