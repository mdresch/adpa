import { pool, connectDatabase } from '../src/database/connection'

const projectId = 'b9a459aa-fe43-4107-a905-204ef435c645'

;(async () => {
  try {
    await connectDatabase()
    
    console.log('🔍 Checking for duplicate stakeholders...\n')
    
    // Check for exact duplicate names
    const duplicates = await pool!.query(`
      SELECT name, COUNT(*) as count, 
             array_agg(id) as ids,
             array_agg(role) as roles
      FROM stakeholders
      WHERE project_id = $1
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, [projectId])
    
    if (duplicates.rows.length > 0) {
      console.log('❌ EXACT DUPLICATES FOUND:\n')
      duplicates.rows.forEach(dup => {
        console.log(`  Name: "${dup.name}"`)
        console.log(`  Count: ${dup.count}`)
        console.log(`  Roles: ${dup.roles.join(', ')}`)
        console.log(`  IDs: ${dup.ids.join(', ')}`)
        console.log()
      })
    } else {
      console.log('✅ No exact duplicates found\n')
    }
    
    // Check for similar names (case-insensitive, trimmed)
    const similar = await pool!.query(`
      SELECT 
        LOWER(TRIM(name)) as normalized_name,
        COUNT(*) as count,
        array_agg(name) as original_names,
        array_agg(role) as roles
      FROM stakeholders
      WHERE project_id = $1
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, [projectId])
    
    if (similar.rows.length > 0) {
      console.log('⚠️  SIMILAR STAKEHOLDERS (case/whitespace differences):\n')
      similar.rows.forEach(sim => {
        console.log(`  Normalized: "${sim.normalized_name}"`)
        console.log(`  Count: ${sim.count}`)
        console.log(`  Original names: ${sim.original_names.join(', ')}`)
        console.log(`  Roles: ${sim.roles.join(', ')}`)
        console.log()
      })
    } else {
      console.log('✅ No similar stakeholders found\n')
    }
    
    // Show all stakeholders
    const all = await pool!.query(`
      SELECT name, role, interest_level, influence_level, created_at
      FROM stakeholders
      WHERE project_id = $1
      ORDER BY name
    `, [projectId])
    
    console.log(`\n📊 All ${all.rows.length} stakeholders:\n`)
    all.rows.forEach((s, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${s.name} (${s.role})`)
    })
    
    await pool!.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await pool?.end()
    process.exit(1)
  }
})()

