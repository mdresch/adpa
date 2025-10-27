/**
 * Clean Stuck Jobs from Database
 * Removes job records that are stuck in processing/pending state
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

async function cleanStuckJobs(): Promise<void> {
  console.log('🧹 Cleaning Stuck Jobs from Database...\n')

  try {
    // Get all stuck jobs (processing/pending for more than 10 minutes)
    const stuckJobs = await pool.query(`
      SELECT id, type, status, created_at, started_at
      FROM jobs
      WHERE status IN ('processing', 'pending')
      AND created_at < NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
    `)

    console.log(`📊 Found ${stuckJobs.rows.length} stuck jobs\n`)

    if (stuckJobs.rows.length === 0) {
      console.log('✅ No stuck jobs found!')
      return
    }

    // Display stuck jobs
    console.log('🔍 Stuck Jobs:')
    console.log('─'.repeat(80))
    for (const job of stuckJobs.rows) {
      const age = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 1000 / 60)
      console.log(`ID: ${job.id}`)
      console.log(`Type: ${job.type}`)
      console.log(`Status: ${job.status}`)
      console.log(`Age: ${age} minutes`)
      console.log(`Created: ${job.created_at}`)
      console.log('─'.repeat(80))
    }

    // Ask for confirmation (auto-yes in script)
    console.log(`\n⚠️  About to mark ${stuckJobs.rows.length} jobs as 'failed'...`)
    console.log('🔄 Processing...\n')

    // Mark stuck jobs as failed
    const result = await pool.query(`
      UPDATE jobs
      SET 
        status = 'failed',
        error_message = 'Job stuck in processing state - automatically failed by cleanup script',
        completed_at = NOW()
      WHERE status IN ('processing', 'pending')
      AND created_at < NOW() - INTERVAL '10 minutes'
      RETURNING id, type
    `)

    console.log(`✅ Marked ${result.rowCount} jobs as failed\n`)

    // Show updated jobs
    if (result.rows.length > 0) {
      console.log('📋 Updated Jobs:')
      for (const job of result.rows) {
        console.log(`   ✅ ${job.id} (${job.type})`)
      }
    }

    // Get summary
    const summary = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM jobs
      GROUP BY status
      ORDER BY status
    `)

    console.log('\n📊 Job Status Summary:')
    console.log('─'.repeat(40))
    for (const row of summary.rows) {
      console.log(`   ${row.status.padEnd(15)}: ${row.count}`)
    }

    console.log('\n✅ Database cleanup complete!')
    console.log('\n💡 You can now:')
    console.log('   1. Refresh the Jobs page in the UI')
    console.log('   2. Retry failed jobs')
    console.log('   3. Generate new documents')

  } catch (error: any) {
    console.error('❌ Error cleaning stuck jobs:', error.message)
    throw error
  } finally {
    await pool.end()
  }
}

// Run cleanup
cleanStuckJobs()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error)
    process.exit(1)
  })

