import { pool } from '../src/database/connection'
import { connectDatabase } from '../src/database/connection'

const TABLES = [
  'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
  'success_criteria', 'best_practices', 'phases', 'resources',
  'quality_standards', 'deliverables', 'scope_items', 'activities'
]

;(async () => {
  try {
    await connectDatabase()
    
    console.log('🔍 Checking extraction table schemas...\n')
    
    for (const table of TABLES) {
      console.log(`\n📊 Table: ${table}`)
      console.log('─'.repeat(60))
      
      // Get columns
      const columnsResult = await pool!.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table])
      
      console.log('Columns:')
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
      })
      
      // Get constraints
      const constraintsResult = await pool!.query(`
        SELECT conname, contype, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = $1::regclass
      `, [table])
      
      if (constraintsResult.rows.length > 0) {
        console.log('\nConstraints:')
        constraintsResult.rows.forEach(con => {
          const type = {
            'p': 'PRIMARY KEY',
            'f': 'FOREIGN KEY',
            'u': 'UNIQUE',
            'c': 'CHECK'
          }[con.contype] || con.contype
          console.log(`  - ${con.conname} (${type}): ${con.definition}`)
        })
      }
    }
    
    await pool!.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await pool?.end()
    process.exit(1)
  }
})()

