import { pool, connectDatabase } from '../src/database/connection'

async function fixColumns() {
  try {
    await connectDatabase()
    
    console.log('🔧 Making stakeholders columns nullable...\n')
    
    // Make email, phone, and department nullable (they're often not in documents)
    const columnsToFix = ['email', 'phone', 'department']
    
    for (const column of columnsToFix) {
      try {
        await pool!.query(`
          ALTER TABLE stakeholders 
          ALTER COLUMN ${column} DROP NOT NULL
        `)
        console.log(`✅ Made ${column} nullable`)
      } catch (error: any) {
        if (error.code === '42703') {
          console.log(`⚠️  Column ${column} does not exist`)
        } else if (error.message.includes('does not exist')) {
          console.log(`⚠️  NOT NULL constraint on ${column} already removed or doesn't exist`)
        } else {
          console.log(`❌ Failed to fix ${column}: ${error.message}`)
        }
      }
    }
    
    console.log('\n🎉 Stakeholders table fixed!')
    console.log('💡 Re-run extraction now - it should save all data\n')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixColumns()

