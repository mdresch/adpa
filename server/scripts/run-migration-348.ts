/**
 * Run Migration 348: Fix risk_level trigger normalization
 * 
 * Updates the trigger function to normalize risk_level values (trim + lowercase)
 * before constraint check to prevent violations from whitespace/case issues
 */

const db = require('../src/lib/db')
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment variables')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Running Migration 348: Fix risk_level trigger normalization')
    console.log('   Normalize risk_level values in trigger before constraint check')
    console.log('')

    // Load migration SQL
    const migrationPath = path.join(__dirname, '../migrations/348_fix_risk_level_trigger_normalization.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 Migration size:', migrationSQL.length, 'characters')
    console.log('')

    // Execute migration in a transaction
    await client.query('BEGIN')
    
    try {
      console.log('🔄 Executing migration...')
      console.log('   ⏳ Updating trigger function...')
      
      await client.query(migrationSQL)
      
      await client.query('COMMIT')
      
      console.log('✅ Migration 348 completed successfully!')
      console.log('')
      console.log('📝 Changes applied:')
      console.log('   • Updated update_monthly_review_status() trigger function')
      console.log('   • Added risk_level normalization (trim + lowercase)')
      console.log('   • Prevents constraint violations from whitespace/case issues')
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    }
    
  } catch (error: any) {
    console.error('❌ Migration execution failed!')
    console.error('   Error:', error.message)
    if (error.detail) {
      console.error('   Detail:', error.detail)
    }
    if (error.code) {
      console.error('   Code:', error.code)
    }
    process.exit(1)
  } finally {
    client.release()
    try { await db.end() } catch (e) {}}
}

runMigration().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})





