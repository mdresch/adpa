/**
 * Cleanup and Reseed Financial Test Data
 * 
 * This script:
 * 1. Removes duplicate "Digital Transformation Initiative" programs
 * 2. Ensures migration 207 is applied (cost columns)
 * 3. Reseeds fresh financial test data
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env') })
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

async function cleanup() {
  console.log('\n🧹 Cleaning up duplicate test programs...\n')
  
  try {
    // Find all "Digital Transformation Initiative" programs
    await db.initDb()
    const result = await db.query(
      `SELECT id, name, created_at 
       FROM programs 
       WHERE name = 'Digital Transformation Initiative'
       ORDER BY created_at DESC`
    )
    
    if (result.rows.length === 0) {
      console.log('✅ No test programs found to clean up')
      return
    }
    
    console.log(`Found ${result.rows.length} test program(s)`)
    
    // Delete all test programs (cascade will delete related data)
      for (const program of result.rows) {
      console.log(`   Deleting: ${program.name} (${program.id})`)
      await db.query('DELETE FROM programs WHERE id = $1', [program.id])
    }
    
    console.log(`✅ Cleaned up ${result.rows.length} test program(s)\n`)
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Cleanup and Reseed Financial Test Data\n')
  console.log('============================================================')
  
  try {
    // Step 1: Cleanup
    await cleanup()
    
    // Step 2: Close pool
    await db.end()
    
    console.log('============================================================')
    console.log('✅ Cleanup complete!\n')
    console.log('📋 Next steps:')
    console.log('   1. Run: npm run migrate:financial   (to apply migration 207)')
    console.log('   2. Run: npm run seed:financial      (to create fresh test data)')
    console.log('============================================================\n')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Script failed:', error)
    await db.end()
    process.exit(1)
  }
}

main()

