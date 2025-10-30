import { pool, connectDatabase } from '../src/database/connection'

const projectId = 'b9a459aa-fe43-4107-a905-204ef435c645'

/**
 * Merge duplicate stakeholders in database
 * Keeps the first occurrence, deletes duplicates with similar normalized names
 */
;(async () => {
  try {
    await connectDatabase()
    
    console.log('🔍 Finding and merging duplicate stakeholders...\n')
    
    // Find groups of similar stakeholders (case-insensitive, without role suffixes)
    const similarGroups = await pool!.query(`
      WITH normalized AS (
        SELECT 
          id,
          name,
          role,
          LOWER(TRIM(REGEXP_REPLACE(name, '\\s*\\([^)]*\\)\\s*$', ''))) as normalized_name,
          created_at
        FROM stakeholders
        WHERE project_id = $1
      )
      SELECT 
        normalized_name,
        array_agg(id ORDER BY created_at) as ids,
        array_agg(name ORDER BY created_at) as names,
        array_agg(role ORDER BY created_at) as roles,
        COUNT(*) as count
      FROM normalized
      GROUP BY normalized_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, [projectId])
    
    if (similarGroups.rows.length === 0) {
      console.log('✅ No duplicate stakeholders found\n')
      await pool!.end()
      process.exit(0)
    }
    
    console.log(`Found ${similarGroups.rows.length} groups of duplicates:\n`)
    
    let totalMerged = 0
    
    for (const group of similarGroups.rows) {
      console.log(`📌 "${group.normalized_name}" (${group.count} entries):`)
      
      group.names.forEach((name: string, i: number) => {
        console.log(`   ${i === 0 ? '✅ KEEP' : '❌ DELETE'}: ${name} (${group.roles[i]})`)
      })
      
      // Keep the first ID, delete the rest
      const deleteIds = group.ids.slice(1)
      
      if (deleteIds.length > 0) {
        const deleteResult = await pool!.query(
          `DELETE FROM stakeholders WHERE id = ANY($1::uuid[]) RETURNING name`,
          [deleteIds]
        )
        
        console.log(`   🗑️  Deleted ${deleteResult.rowCount} duplicate(s)\n`)
        totalMerged += deleteResult.rowCount || 0
      }
    }
    
    console.log(`\n🎉 Merged ${totalMerged} duplicate stakeholders`)
    
    // Show final count
    const finalCount = await pool!.query(
      `SELECT COUNT(*) as count FROM stakeholders WHERE project_id = $1`,
      [projectId]
    )
    console.log(`📊 Final stakeholder count: ${finalCount.rows[0].count}\n`)
    
    await pool!.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await pool?.end()
    process.exit(1)
  }
})()

