import { pool, connectDatabase } from '../src/database/connection'

async function fixRequirements() {
  try {
    await connectDatabase()
    
    console.log('🔧 Fixing requirements table schema...\n')
    
    // Add title column (extraction uses title, not name)
    console.log('1. Adding title column...')
    await pool!.query(`
      ALTER TABLE requirements 
      ADD COLUMN IF NOT EXISTS title VARCHAR(500)
    `)
    console.log('   ✅ Added title column\n')
    
    // Copy name to title for existing records
    console.log('2. Migrating existing data from name to title...')
    await pool!.query(`
      UPDATE requirements 
      SET title = name 
      WHERE title IS NULL AND name IS NOT NULL
    `)
    console.log('   ✅ Migrated existing data\n')
    
    // Add created_by column if missing (extraction service uses it)
    console.log('3. Adding created_by column...')
    await pool!.query(`
      ALTER TABLE requirements 
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL
    `)
    console.log('   ✅ Added created_by column\n')
    
    console.log('🎉 Requirements table fixed!')
    console.log('💡 Extraction can now save all requirements\n')
    
    process.exit(0)
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('   ⚠️  Column already exists, skipping...')
      process.exit(0)
    }
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixRequirements()

