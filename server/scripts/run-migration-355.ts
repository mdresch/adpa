/**
 * Migration Runner for 355_add_is_curated_to_risks.sql
 * Adds is_curated column to risks table
 */

import { getDatabasePool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  console.log('🚀 Starting migration 355: Add is_curated to risks')
  
  try {
    // Connect to database
    await connectDatabase()
    const pool = getDatabasePool()
    
    // Read migration SQL
    const migrationPath = path.join(__dirname, '../migrations/355_add_is_curated_to_risks.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Running migration SQL...')
    
    // Execute migration
    await pool.query(migrationSQL)
    
    // Verify column was added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'risks' AND column_name = 'is_curated'
    `)
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Migration 355 completed successfully!')
      console.log(`   Column: is_curated, Type: ${verifyResult.rows[0].data_type}, Default: ${verifyResult.rows[0].column_default}`)
    } else {
      console.log('⚠️ Column was not found after migration - this may indicate an issue')
    }
    
    await pool.end()
    process.exit(0)
    
  } catch (error: any) {
    console.error('❌ Migration 355 failed:', error.message)
    process.exit(1)
  }
}

runMigration()

