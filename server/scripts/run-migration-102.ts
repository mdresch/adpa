import { pool, connectDatabase } from '../src/database/connection'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  console.log('📊 Connecting to database...')
  await connectDatabase()
  
  const client = await pool.connect()
  
  try {
    console.log('🚀 Running migration 102: Fix regeneration_jobs foreign key...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/102_fix_regeneration_jobs_fkey.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Execute the migration
    await client.query('BEGIN')
    await client.query(migrationSQL)
    await client.query('COMMIT')
    
    console.log('✅ Migration 102 completed successfully!')
    console.log('   - Dropped old constraint: regeneration_jobs_new_version_id_fkey')
    console.log('   - Added new constraint: references documents(id) instead of document_versions(id)')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

