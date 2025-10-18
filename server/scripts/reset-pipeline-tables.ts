/**
 * Drop and recreate pipeline tables with the correct schema
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

config()

async function resetPipelineTables() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment')
    process.exit(1)
  }

  console.log('🔧 Resetting pipeline tables...')

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Drop existing tables
    console.log('🗑️  Dropping existing pipeline tables...')
    await client.query(`
      DROP TABLE IF EXISTS stage_executions CASCADE;
      DROP TABLE IF EXISTS pipeline_executions CASCADE;
      DROP TABLE IF EXISTS pipeline_configurations CASCADE;
    `)
    console.log('✅ Old tables dropped')

    // Read and execute migration
    const migrationPath = join(__dirname, '../migrations/011_pipeline_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📝 Creating new pipeline tables...')
    await client.query(migrationSQL)

    console.log('\n✅ Pipeline tables created successfully!')
    console.log('\nCreated tables:')
    console.log('  - pipeline_executions')
    console.log('  - stage_executions')
    console.log('  - pipeline_configurations')

    // Verify the new structure
    console.log('\n📋 Verifying pipeline_executions columns...')
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'pipeline_executions'
      ORDER BY ordinal_position
    `)
    
    result.rows.forEach(r => {
      console.log(`  ✓ ${r.column_name} (${r.data_type})`)
    })

  } catch (error) {
    console.error('❌ Reset failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

resetPipelineTables()

