#!/usr/bin/env tsx
/**
 * Verify and fix job status inconsistencies
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

async function main() {
  console.log('🔍 Verifying job statuses...\n')

  await connectDatabase()
  const pool = getDatabasePool()

  try {
    // Check for jobs that are "processing" but have error messages
    const inconsistent = await pool.query(
      `SELECT id, type, status, error_message, created_at
       FROM jobs 
       WHERE status = 'processing' 
       AND error_message IS NOT NULL
       ORDER BY created_at DESC`
    )

    console.log(`Found ${inconsistent.rows.length} inconsistent jobs\n`)

    if (inconsistent.rows.length > 0) {
      console.log('Sample jobs:')
      inconsistent.rows.slice(0, 5).forEach(job => {
        console.log(`  - ${job.id} | ${job.type} | Error: ${job.error_message?.substring(0, 60)}...`)
      })
      console.log()

      // Fix them
      console.log('Fixing inconsistent jobs...')
      const updateResult = await pool.query(
        `UPDATE jobs 
         SET status = 'failed',
             completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE status = 'processing' 
         AND error_message IS NOT NULL
         RETURNING id`
      )

      console.log(`✅ Updated ${updateResult.rowCount} jobs to 'failed' status\n`)

      // Verify fix
      const verify = await pool.query(
        `SELECT COUNT(*) as count
         FROM jobs 
         WHERE status = 'processing' 
         AND error_message IS NOT NULL`
      )

      const remaining = parseInt(verify.rows[0].count)
      if (remaining === 0) {
        console.log('✅ All inconsistent jobs fixed!')
      } else {
        console.log(`⚠️  ${remaining} jobs still inconsistent`)
      }
    } else {
      console.log('✅ No inconsistent jobs found!')
    }

    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

main()


