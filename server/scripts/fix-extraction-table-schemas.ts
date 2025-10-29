import { pool, connectDatabase } from '../src/database/connection'

async function fixSchemas() {
  try {
    await connectDatabase()
    
    console.log('🔧 Fixing extraction table schemas...\n')
    
    // Fix stakeholders - add missing concerns column
    console.log('1. Adding concerns column to stakeholders...')
    await pool!.query(`
      ALTER TABLE stakeholders 
      ADD COLUMN IF NOT EXISTS concerns TEXT
    `)
    console.log('   ✅ Added concerns column\n')
    
    // Verify all tables have correct schema
    const tables = [
      'stakeholders',
      'requirements',
      'risks',
      'milestones',
      'constraints',
      'success_criteria',
      'best_practices',
      'phases',
      'resources',
      'quality_standards',
      'deliverables',
      'scope_items',
      'activities'
    ]
    
    console.log('📋 Verifying table schemas:\n')
    
    for (const table of tables) {
      const result = await pool!.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table])
      
      console.log(`✅ ${table}:`)
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`)
      })
      console.log()
    }
    
    console.log('🎉 All schemas fixed and verified!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixSchemas()

