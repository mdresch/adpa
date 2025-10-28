/**
 * Run AI Provider Testing Tables Migration
 * Creates required tables for testing suite functionality
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
  console.log('🚀 Running AI Provider Testing Tables Migration...\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../server/migrations/058_ai_provider_testing_tables.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded')
    console.log('📊 Creating tables...\n')

    // Execute migration
    await pool.query(migrationSQL)

    console.log('✅ Tables created successfully!\n')

    // Verify tables exist
    const tables = ['ai_provider_health_metrics', 'ai_provider_test_results', 'ai_provider_test_configs']
    
    console.log('🔍 Verifying tables...\n')
    
    for (const tableName of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])

      const exists = result.rows[0].exists
      console.log(`${exists ? '✅' : '❌'} ${tableName}`)
    }

    console.log('\n✨ Migration complete!\n')
    console.log('📝 Next steps:')
    console.log('   1. Go to http://localhost:3000/ai-providers')
    console.log('   2. Click on "Testing Suite" tab')
    console.log('   3. Click "Run Full Test Suite" to populate data')
    console.log('')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    
    // Check if tables already exist
    if (error.message?.includes('already exists')) {
      console.log('\n⚠️  Tables already exist!')
      console.log('This is fine - the testing suite should work now.')
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
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

