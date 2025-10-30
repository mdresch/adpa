import { pool, connectDatabase } from '../src/database/connection'

async function viewResults() {
  try {
    await connectDatabase()
    
    const projectId = 'b9a459aa-fe43-4107-a905-204ef435c645'
    
    console.log('\n🎉 EXTRACTION RESULTS\n')
    console.log('='  .repeat(60))
    
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
    
    let totalCount = 0
    
    for (const table of tables) {
      try {
        const result = await pool!.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE project_id = $1`,
          [projectId]
        )
        const count = parseInt(result.rows[0].count)
        totalCount += count
        
        const status = count > 0 ? '✅' : '⚠️ '
        const emoji = count > 0 ? '📊' : '  '
        
        console.log(`${status} ${emoji} ${table.padEnd(20)} ${count.toString().padStart(3)} entities`)
      } catch (error: any) {
        console.log(`❌    ${table.padEnd(20)} ERROR: ${error.message}`)
      }
    }
    
    console.log('='  .repeat(60))
    console.log(`\n🎯 TOTAL: ${totalCount} entities extracted!\n`)
    
    // Show sample of each type
    console.log('\n📋 SAMPLE DATA:\n')
    
    for (const table of tables) {
      try {
        const result = await pool!.query(
          `SELECT title FROM ${table} WHERE project_id = $1 LIMIT 3`,
          [projectId]
        )
        
        if (result.rows.length > 0) {
          console.log(`\n${table.toUpperCase()}:`)
          result.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. ${row.title}`)
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

viewResults()

