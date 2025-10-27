import { pool, connectDatabase } from '../src/database/connection'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  console.log('📊 Connecting to database...')
  await connectDatabase()
  
  const client = await pool.connect()
  
  try {
    console.log('🚀 Running migration 101: Add parent_document_id for document versioning...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/101_add_parent_document_id.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Execute the migration
    await client.query('BEGIN')
    await client.query(migrationSQL)
    await client.query('COMMIT')
    
    console.log('✅ Migration 101 completed successfully!')
    console.log('   - Added parent_document_id column to documents')
    console.log('   - Added is_regeneration flag')
    console.log('   - Added semantic_version column')
    console.log('   - Added generation_metadata column')
    console.log('   - Created get_document_versions() function')
    console.log('   - Created calculate_next_document_version() function')
    
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

