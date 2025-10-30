import { pool, connectDatabase } from '../src/database/connection'

async function fixDuplicates() {
  try {
    await connectDatabase()
    
    console.log('🔍 Checking for duplicate stakeholders...\n')
    
    // Find duplicates
    const duplicates = await pool!.query(`
      SELECT project_id, name, COUNT(*) as count
      FROM stakeholders
      GROUP BY project_id, name
      HAVING COUNT(*) > 1
    `)
    
    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicates found!')
    } else {
      console.log(`Found ${duplicates.rows.length} duplicate stakeholder(s):\n`)
      duplicates.rows.forEach(row => {
        console.log(`  - "${row.name}" (${row.count} copies)`)
      })
      
      console.log('\n🧹 Cleaning up duplicates (keeping newest)...\n')
      
      // Delete all but the newest for each duplicate
      await pool!.query(`
        DELETE FROM stakeholders
        WHERE id IN (
          SELECT id
          FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                     PARTITION BY project_id, name 
                     ORDER BY created_at DESC
                   ) as rn
            FROM stakeholders
          ) t
          WHERE t.rn > 1
        )
      `)
      
      console.log('✅ Duplicates removed!')
    }
    
    console.log('\n🔧 Adding unique constraint...\n')
    
    // Now add the constraint
    await pool!.query(`
      ALTER TABLE stakeholders 
      ADD CONSTRAINT stakeholders_project_name_unique 
      UNIQUE (project_id, name)
    `)
    
    console.log('✅ Unique constraint added to stakeholders table!')
    console.log('\n🎉 All done! Extraction can now safely upsert data.')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixDuplicates()

