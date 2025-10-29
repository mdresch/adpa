import { pool, connectDatabase } from '../src/database/connection'

async function checkTables() {
  try {
    await connectDatabase()
    
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
    
    console.log('\n🔍 Checking extraction tables...\n')
    
    for (const table of tables) {
      try {
        await pool!.query(`SELECT project_id FROM ${table} LIMIT 1`)
        console.log(`✅ ${table.padEnd(20)} - has project_id column`)
      } catch (error: any) {
        if (error.code === '42P01') {
          console.log(`⚠️  ${table.padEnd(20)} - TABLE DOES NOT EXIST`)
        } else if (error.code === '42703') {
          console.log(`❌ ${table.padEnd(20)} - MISSING project_id column`)
        } else {
          console.log(`❓ ${table.padEnd(20)} - ${error.message}`)
        }
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkTables()

