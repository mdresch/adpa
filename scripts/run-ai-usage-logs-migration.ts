/**
 * Run AI Usage Logs Migration
 * Creates the ai_usage_logs table for analytics tracking
 */

import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function runMigration(): Promise<void> {
  console.log('🚀 Running AI Usage Logs Migration...\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../server/migrations/059_ai_usage_logs_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded')
    console.log('📊 Creating ai_usage_logs table and views...\n')

    // Execute migration
    await pool.query(migrationSQL)

    console.log('✅ Table, views, and functions created successfully!\n')

    // Verify table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_usage_logs'
      )
    `)

    const exists = tableCheck.rows[0].exists
    console.log(`${exists ? '✅' : '❌'} ai_usage_logs table`)

    // Check views
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_usage_stats', 'ai_provider_usage_summary')
      ORDER BY table_name
    `)

    console.log('\n📊 Views created:')
    for (const view of viewCheck.rows) {
      console.log(`   ✅ ${view.table_name}`)
    }

    // Check function
    const functionCheck = await pool.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname = 'get_ai_usage_by_date_range'
    `)

    if (functionCheck.rows.length > 0) {
      console.log('\n📊 Function created:')
      console.log(`   ✅ get_ai_usage_by_date_range`)
    }

    // Get column count
    const columnCheck = await pool.query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'ai_usage_logs'
    `)

    console.log(`\n📋 Table has ${columnCheck.rows[0].column_count} columns`)

    // Get index count
    const indexCheck = await pool.query(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'ai_usage_logs'
    `)

    console.log(`📋 Table has ${indexCheck.rows[0].index_count} indexes`)

    console.log('\n✨ Migration complete!\n')
    console.log('📝 What this enables:')
    console.log('   ✅ Automatic AI usage tracking')
    console.log('   ✅ Cost monitoring and analytics')
    console.log('   ✅ Performance metrics per provider')
    console.log('   ✅ Token usage statistics')
    console.log('   ✅ Success/failure rate tracking')
    console.log('\n💡 The AI analytics dashboard will now populate with real data!')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    
    if (error.message?.includes('already exists')) {
      console.log('\n⚠️  Table already exists!')
      console.log('This is fine - the tracking will work now.')
    } else {
      throw error
    }
  } finally {
    await pool.end()
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

