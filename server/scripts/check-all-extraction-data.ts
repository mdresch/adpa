import { pool, connectDatabase } from '../src/database/connection'

async function checkAll() {
  try {
    await connectDatabase()
    
    console.log('\n🔍 CHECKING ALL EXTRACTION DATA ACROSS ALL PROJECTS\n')
    console.log('='  .repeat(70))
    
    const tables = [
      'stakeholders',
      'requirements', 
      'deliverables',
      'scope_items',
      'success_criteria',
      'constraints',
      'milestones',
      'quality_standards',
      'phases',
      'risks',
      'resources',
      'best_practices',
      'activities'
    ]
    
    let grandTotal = 0
    
    for (const table of tables) {
      try {
        // Get total count
        const result = await pool!.query(`SELECT COUNT(*) as count FROM ${table}`)
        const count = parseInt(result.rows[0].count)
        grandTotal += count
        
        // Get breakdown by project
        const byProject = await pool!.query(`
          SELECT project_id, COUNT(*) as count
          FROM ${table}
          GROUP BY project_id
          ORDER BY count DESC
        `)
        
        const status = count > 0 ? '✅' : '⚠️ '
        const emoji = count > 0 ? '📊' : '  '
        
        console.log(`${status} ${emoji} ${table.padEnd(25)} ${count.toString().padStart(4)} entities`)
        
        if (byProject.rows.length > 0) {
          byProject.rows.forEach(row => {
            console.log(`      └─ Project ${row.project_id.substring(0, 8)}... : ${row.count} items`)
          })
        }
      } catch (error: any) {
        console.log(`❌    ${table.padEnd(25)} ERROR: ${error.message}`)
      }
    }
    
    console.log('='  .repeat(70))
    console.log(`\n🎯 GRAND TOTAL: ${grandTotal} entities across all projects!\n`)
    
    // Show some sample data
    console.log('\n📋 SAMPLE DATA FROM EACH TABLE:\n')
    
    for (const table of tables) {
      try {
        const result = await pool!.query(`
          SELECT * FROM ${table} 
          ORDER BY created_at DESC 
          LIMIT 3
        `)
        
        if (result.rows.length > 0) {
          console.log(`\n${table.toUpperCase()}:`)
          result.rows.forEach((row, i) => {
            const name = row.name || row.title || row.standard_name || row.item_name || row.activity_name || 'N/A'
            const project = row.project_id.substring(0, 8)
            console.log(`  ${i + 1}. ${name} (Project: ${project}...)`)
          })
        }
      } catch (error) {
        // Skip if table has issues
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAll()

