/**
 * Verify Migration 400: Context Orchestrator Tables
 * 
 * Quick verification script to check table structure and data
 * 
 * Usage: npx ts-node server/scripts/verify-migration-400.ts
 */

import { Pool } from 'pg'
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

async function verifyTables() {
  console.log('🔍 Verifying Migration 400: Context Orchestrator Tables\n')
  console.log('='.repeat(60))

  try {
    // Test connection
    await pool.query('SELECT 1')
    console.log('✅ Database connected\n')

    const tables = [
      'context_gathering_metrics',
      'context_source_logs',
      'context_injection_metrics',
      'context_freshness_assessments',
      'context_refresh_results',
      'context_freshness_policy_results',
      'context_freshness_policy_evaluations'
    ]

    console.log('📊 Table Verification:\n')

    for (const tableName of tables) {
      // Check table exists
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        ) as exists`,
        [tableName]
      )

      if (!tableExists.rows[0].exists) {
        console.log(`❌ ${tableName}: Table does not exist`)
        continue
      }

      // Get column count
      const columnCount = await pool.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.columns 
         WHERE table_name = $1`,
        [tableName]
      )

      // Get row count
      const rowCount = await pool.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      )

      // Get index count
      const indexCount = await pool.query(
        `SELECT COUNT(*) as count 
         FROM pg_indexes 
         WHERE tablename = $1`,
        [tableName]
      )

      console.log(`📋 ${tableName}:`)
      console.log(`   ✅ Exists`)
      console.log(`   📊 Columns: ${columnCount.rows[0].count}`)
      console.log(`   📈 Rows: ${rowCount.rows[0].count}`)
      console.log(`   🔍 Indexes: ${indexCount.rows[0].count}`)

      // Show column names
      const columns = await pool.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
      )

      if (columns.rows.length > 0) {
        console.log(`   📝 Columns:`)
        columns.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          console.log(`      - ${col.column_name} (${col.data_type}) ${nullable}`)
        })
      }

      console.log('')
    }

    // Check indexes
    console.log('🔍 Index Verification:\n')
    const indexes = await pool.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename LIKE 'context_%'
        AND tablename IN (${tables.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY tablename, indexname
    `, tables)

    const indexesByTable: Record<string, string[]> = {}
    indexes.rows.forEach(row => {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = []
      }
      indexesByTable[row.tablename].push(row.indexname)
    })

    tables.forEach(tableName => {
      const tableIndexes = indexesByTable[tableName] || []
      console.log(`📋 ${tableName}: ${tableIndexes.length} indexes`)
      tableIndexes.forEach(idx => {
        console.log(`   ✅ ${idx}`)
      })
      if (tableIndexes.length === 0) {
        console.log(`   ⚠️  No indexes found`)
      }
      console.log('')
    })

    // Summary
    console.log('='.repeat(60))
    console.log('✅ Verification Complete!')
    console.log(`   Tables checked: ${tables.length}`)
    console.log(`   Total indexes: ${indexes.rows.length}`)

  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

verifyTables()

