/**
 * Run pipeline migration script
 * Reads DATABASE_URL from environment and runs migration
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

// Load environment variables
config()

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment')
    process.exit(1)
  }

  console.log('🔧 Running pipeline migration...')
  console.log(`📍 Database: ${databaseUrl.substring(0, 50)}...`)

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Read migration file
    const migrationPath = join(__dirname, '../migrations/011_pipeline_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📝 Executing migration...')
    await client.query(migrationSQL)

    console.log('✅ Pipeline tables created successfully!')
    console.log('\nCreated tables:')
    console.log('  - pipeline_executions')
    console.log('  - stage_executions')
    console.log('  - pipeline_configurations')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()

