/**
 * Quick cleanup of duplicate test programs
 * Simple SQL delete - no fancy logic
 */

import { connectDatabase, pool } from '../src/database/connection'

async function main() {
  try {
    console.log('🧹 Deleting all "Digital Transformation Initiative" programs...\n')
    
    // Initialize database connection
    await connectDatabase()
    
    const result = await pool!.query(
      `DELETE FROM programs WHERE name = 'Digital Transformation Initiative' RETURNING id, name`
    )
    
    console.log(`✅ Deleted ${result.rows.length} program(s):\n`)
    for (const row of result.rows) {
      console.log(`   - ${row.name} (${row.id})`)
    }
    
    console.log('\n✅ Cleanup complete! Now run: npm run seed:financial\n')
    
    await pool!.end()
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error:', error)
    if (pool) await pool.end()
    process.exit(1)
  }
}

main()

