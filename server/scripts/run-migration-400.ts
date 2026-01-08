/**
 * Run Migration 400: Context Orchestrator Tables
 * 
 * Creates tables for enhanced context gathering and injection system:
 * - context_gathering_metrics
 * - context_source_logs
 * - context_injection_metrics
 * - context_freshness_assessments
 * - context_refresh_results
 * - context_freshness_policy_results
 * - context_freshness_policy_evaluations
 * 
 * Usage: npx ts-node server/scripts/run-migration-400.ts
 */

const db = require('../src/lib/db')
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
})

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await db.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = $1
    ) as exists`,
    [tableName]
  )
  return result.rows[0].exists
}

async function runMigration() {
  console.log('🚀 Running Migration 400: Context Orchestrator Tables\n')
  console.log('='.repeat(60))

  try {
    // Test database connection
    console.log('🔌 Testing database connection...')
    await db.query('SELECT 1')
    console.log('✅ Database connected successfully\n')

    // Read migration file
    const migrationPath = path.join(__dirname, '../src/database/migrations/400_context_orchestrator_tables.sql')
    const migrationSql = fs.readFileSync(migrationPath, 'utf8')

    // Check which tables already exist
    const tables = [
      'context_gathering_metrics',
      'context_source_logs',
      'context_injection_metrics',
      'context_freshness_assessments',
      'context_refresh_results',
      'context_freshness_policy_results',
      'context_freshness_policy_evaluations'
    ]

    console.log('📋 Checking existing tables...')
    const existingTables: string[] = []
    for (const table of tables) {
      const exists = await checkTableExists(table)
      if (exists) {
        existingTables.push(table)
        console.log(`   ✅ ${table} already exists`)
      } else {
        console.log(`   ⏳ ${table} needs to be created`)
      }
    }

    if (existingTables.length === tables.length) {
      console.log('\n✅ All tables already exist. Migration not needed.')
      return
    }

    // Run migration
    console.log('\n📝 Running migration SQL...')
    await db.query(migrationSql)
    console.log('✅ Migration SQL executed successfully\n')

    // Verify all tables were created
    console.log('📊 Verification:')
    const allCreated = []
    for (const table of tables) {
      const exists = await checkTableExists(table)
      if (exists) {
        allCreated.push(table)
        console.log(`   ✅ ${table}: exists`)
      } else {
        console.log(`   ❌ ${table}: missing`)
      }
    }

    if (allCreated.length === tables.length) {
      console.log('\n✅ All tables created successfully!')
      
      // Check indexes
      console.log('\n📊 Checking indexes...')
      const indexResult = await db.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename LIKE 'context_%' 
        ORDER BY tablename, indexname
      `)
      console.log(`   Found ${indexResult.rows.length} indexes`)
      indexResult.rows.forEach(row => {
        console.log(`   ✅ ${row.indexname}`)
      })
    } else {
      console.error('\n❌ Some tables failed to create.')
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    try { await db.end() } catch (e) {}}
}

runMigration()
