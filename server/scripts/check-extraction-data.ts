import { pool, connectDatabase } from '../src/database/connection'

const projectId = 'b9a459aa-fe43-4107-a905-204ef435c645'

;(async () => {
  try {
    await connectDatabase()
    
    console.log('🔍 Checking extraction data for project:', projectId)
    console.log('─'.repeat(70))
    
    const tables = [
      'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
      'success_criteria', 'best_practices', 'phases', 'resources',
      'quality_standards', 'deliverables', 'scope_items', 'activities'
    ]
    
    let totalEntities = 0
    
    for (const table of tables) {
      const result = await pool!.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE project_id = $1`,
        [projectId]
      )
      const count = parseInt(result.rows[0].count)
      totalEntities += count
      
      const status = count > 0 ? '✅' : '❌'
      console.log(`${status} ${table.padEnd(20)} ${count.toString().padStart(4)} entities`)
    }
    
    console.log('─'.repeat(70))
    console.log(`📊 TOTAL: ${totalEntities} entities`)
    
    await pool!.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await pool?.end()
    process.exit(1)
  }
})()

