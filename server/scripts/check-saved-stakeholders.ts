import { pool, connectDatabase } from '../src/database/connection'

async function checkStakeholders() {
  try {
    await connectDatabase()
    
    const projectId = 'b9a459aa-fe43-4107-a905-204ef435c645'
    
    // Check recent stakeholders
    const recent = await pool!.query(`
      SELECT COUNT(*) as count, MAX(created_at) as latest 
      FROM stakeholders 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `)
    
    // Check project-specific
    const project = await pool!.query(`
      SELECT COUNT(*) as count 
      FROM stakeholders 
      WHERE project_id = $1
    `, [projectId])
    
    // Get total
    const total = await pool!.query(`SELECT COUNT(*) as count FROM stakeholders`)
    
    console.log('\n📊 Stakeholders Data:\n')
    console.log(`✅ Saved in last hour: ${recent.rows[0].count}`)
    console.log(`✅ For this project:   ${project.rows[0].count}`)
    console.log(`✅ Total in database:  ${total.rows[0].count}`)
    
    if (recent.rows[0].latest) {
      console.log(`\n⏰ Latest save: ${recent.rows[0].latest}`)
    }
    
    // Sample data
    if (parseInt(project.rows[0].count) > 0) {
      const sample = await pool!.query(`
        SELECT name, role, interest_level, influence_level 
        FROM stakeholders 
        WHERE project_id = $1 
        ORDER BY created_at DESC 
        LIMIT 5
      `, [projectId])
      
      console.log('\n📋 Sample Stakeholders:')
      sample.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.name} - ${row.role} (Interest: ${row.interest_level}, Influence: ${row.influence_level})`)
      })
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkStakeholders()

