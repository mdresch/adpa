#!/usr/bin/env tsx
/**
 * Force mark ALL stuck jobs as failed
 * This script aggressively updates all jobs that are processing but have errors
 * or are old to ensure they show as failed in the UI
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

async function main() {
  console.log('🔧 Force Marking All Stuck Jobs as Failed')
  console.log('═'.repeat(60))
  console.log()

  await connectDatabase()
  const pool = getDatabasePool()

  try {
    // Find all jobs that are processing but should be failed
    const stuckJobs = await pool.query(
      `SELECT id, type, status, error_message, started_at, queue_name
       FROM jobs
       WHERE status = 'processing'
       AND (
         error_message IS NOT NULL
         OR started_at < NOW() - INTERVAL '30 minutes'
         OR processing_started_at < NOW() - INTERVAL '30 minutes'
       )
       ORDER BY started_at DESC`
    )

    console.log(`📊 Found ${stuckJobs.rows.length} stuck jobs to mark as failed\n`)

    if (stuckJobs.rows.length === 0) {
      console.log('✅ No stuck jobs found. All good!\n')
      await pool.end()
      process.exit(0)
    }

    // Force update ALL of them to failed
    const updateResult = await pool.query(
      `UPDATE jobs
       SET status = 'failed',
           completed_at = CURRENT_TIMESTAMP,
           error_message = CASE
             WHEN error_message IS NULL OR error_message = '' THEN
               'Job stuck in processing - automatically marked as failed'
             ELSE error_message
           END
       WHERE status = 'processing'
       AND (
         error_message IS NOT NULL
         OR started_at < NOW() - INTERVAL '30 minutes'
         OR processing_started_at < NOW() - INTERVAL '30 minutes'
       )
       RETURNING id, type, status`
    )

    console.log(`✅ Updated ${updateResult.rowCount} jobs to 'failed' status\n`)

    // Verify
    const verifyResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM jobs
       WHERE status = 'processing'
       AND (
         error_message IS NOT NULL
         OR started_at < NOW() - INTERVAL '30 minutes'
       )`
    )

    const remaining = parseInt(verifyResult.rows[0].count)
    
    console.log('═'.repeat(60))
    console.log('📊 Summary:')
    console.log('═'.repeat(60))
    console.log(`   Jobs updated: ${updateResult.rowCount}`)
    console.log(`   Remaining stuck jobs: ${remaining}`)
    console.log('═'.repeat(60))

    if (remaining === 0) {
      console.log('\n✅ All stuck jobs have been marked as failed!')
      console.log('   The UI should now show them correctly.\n')
    } else {
      console.log(`\n⚠️  Warning: ${remaining} stuck jobs still remain.`)
      console.log('   They may have been updated between queries.\n')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()

