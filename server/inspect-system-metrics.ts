/**
 * Database Schema Inspector
 * Quick script to inspect system_metrics table structure
 * Run with: node -r ts-node/register inspect-system-metrics.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })

async function inspectSchema() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('🔍 Inspecting system_metrics table schema...\n')

    // Get column information
    const columnsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'system_metrics'
      ORDER BY ordinal_position
    `)

    if (columnsResult.rows.length === 0) {
      console.error('❌ system_metrics table not found or has no columns')
      process.exit(1)
    }

    console.log('📋 Columns in system_metrics table:')
    console.log('──────────────────────────────────────────────────')
    
    columnsResult.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. ${row.column_name}`)
      console.log(`   Type: ${row.data_type}`)
      console.log(`   Nullable: ${row.is_nullable}`)
      if (row.column_default) {
        console.log(`   Default: ${row.column_default}`)
      }
      console.log()
    })

    console.log('📊 Copy/paste this for systemMonitoring.ts:')
    console.log('──────────────────────────────────────────────────')
    const columnNames = columnsResult.rows.map((r: any) => r.column_name)
    console.log(`Columns: ${columnNames.join(', ')}`)
    console.log()

    // Get a sample row if table has data
    const sampleResult = await pool.query('SELECT * FROM system_metrics LIMIT 1')
    if (sampleResult.rows.length > 0) {
      console.log('📝 Sample row structure:')
      console.log(JSON.stringify(sampleResult.rows[0], null, 2))
    } else {
      console.log('ℹ️  Table is empty (no sample data)')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

inspectSchema()
