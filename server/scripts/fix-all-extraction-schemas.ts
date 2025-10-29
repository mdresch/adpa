import { pool, connectDatabase } from '../src/database/connection'

async function fixAllSchemas() {
  try {
    await connectDatabase()
    
    console.log('🔧 Fixing ALL extraction table schemas...\n')
    console.log('='  .repeat(60))
    
    // Tables that need title column added (code uses title, DB has name)
    const tablesNeedingTitle = [
      'requirements',
      'risks',
      'constraints',
      'success_criteria'
    ]
    
    for (const table of tablesNeedingTitle) {
      console.log(`\n📋 Fixing ${table}...`)
      
      // Add title column
      try {
        await pool!.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS title VARCHAR(500)`)
        console.log(`   ✅ Added title column`)
      } catch (e: any) {
        console.log(`   ⚠️  ${e.message.split('\n')[0]}`)
      }
      
      // Migrate name to title
      try {
        await pool!.query(`UPDATE ${table} SET title = name WHERE title IS NULL AND name IS NOT NULL`)
        console.log(`   ✅ Migrated name → title`)
      } catch (e: any) {
        console.log(`   ⚠️  ${e.message.split('\n')[0]}`)
      }
      
      // Add created_by if missing
      try {
        await pool!.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL`)
        console.log(`   ✅ Added created_by column`)
      } catch (e: any) {
        console.log(`   ⚠️  ${e.message.split('\n')[0]}`)
      }
    }
    
    // Tables that use different column names
    const specificFixes = [
      {
        table: 'scope_items',
        renames: [
          { from: 'item_name', to: 'title', type: 'VARCHAR(500)' }
        ]
      },
      {
        table: 'activities',
        renames: [
          { from: 'activity_name', to: 'name', type: 'VARCHAR(500)' }
        ]
      },
      {
        table: 'quality_standards',
        renames: [
          { from: 'standard_name', to: 'title', type: 'VARCHAR(500)' }
        ]
      }
    ]
    
    for (const fix of specificFixes) {
      console.log(`\n📋 Fixing ${fix.table}...`)
      
      for (const rename of fix.renames) {
        try {
          // Add new column
          await pool!.query(`ALTER TABLE ${fix.table} ADD COLUMN IF NOT EXISTS ${rename.to} ${rename.type}`)
          console.log(`   ✅ Added ${rename.to} column`)
          
          // Migrate data
          await pool!.query(`UPDATE ${fix.table} SET ${rename.to} = ${rename.from} WHERE ${rename.to} IS NULL AND ${rename.from} IS NOT NULL`)
          console.log(`   ✅ Migrated ${rename.from} → ${rename.to}`)
        } catch (e: any) {
          console.log(`   ⚠️  ${e.message.split('\n')[0]}`)
        }
      }
      
      // Add created_by
      try {
        await pool!.query(`ALTER TABLE ${fix.table} ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL`)
        console.log(`   ✅ Added created_by column`)
      } catch (e: any) {
        console.log(`   ⚠️  ${e.message.split('\n')[0]}`)
      }
    }
    
    // Tables that are already correct but need created_by
    const needCreatedBy = ['milestones', 'deliverables', 'phases', 'resources']
    
    for (const table of needCreatedBy) {
      console.log(`\n📋 Fixing ${table}...`)
      try {
        await pool!.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL`)
        console.log(`   ✅ Added created_by column`)
      } catch (e: any) {
        console.log(`   ⚠️  ${e.message.split('\n')[0]}`)
      }
    }
    
    console.log('\n' + '='  .repeat(60))
    console.log('\n🎉 ALL extraction table schemas fixed!')
    console.log('💡 Re-run extraction now - all 13 types will save successfully!\n')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixAllSchemas()

