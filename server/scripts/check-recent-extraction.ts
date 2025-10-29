import { pool, connectDatabase } from '../src/database/connection'

async function checkRecent() {
  try {
    await connectDatabase()
    
    const tables = [
      'milestones',
      'success_criteria',
      'constraints',
      'deliverables',
      'resources',
      'best_practices',
      'activities',
      'quality_standards',
      'scope_items',
      'requirements',
      'risks',
      'phases',
      'stakeholders'
    ]
    
    console.log('\n🔍 Entities Created in Last 10 Minutes:\n')
    console.log('='  .repeat(60))
    
    let totalNew = 0
    
    for (const table of tables) {
      try {
        const result = await pool!.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE created_at > NOW() - INTERVAL '10 minutes'`
        )
        const count = parseInt(result.rows[0].count)
        totalNew += count
        
        if (count > 0) {
          console.log(`✅ ${table.padEnd(25)} ${count.toString().padStart(4)} NEW entities`)
        } else {
          console.log(`⚠️  ${table.padEnd(25)}    0 entities`)
        }
      } catch (error: any) {
        console.log(`❌ ${table.padEnd(25)} ERROR: ${error.message.split('\n')[0]}`)
      }
    }
    
    console.log('='  .repeat(60))
    console.log(`\n🎯 TOTAL NEW ENTITIES: ${totalNew}\n`)
    
    if (totalNew === 0) {
      console.log('⚠️  NO NEW DATA - Database save may have failed!')
      console.log('💡 Check logs for transaction rollback or constraint errors\n')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkRecent()

