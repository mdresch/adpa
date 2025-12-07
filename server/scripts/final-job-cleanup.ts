#!/usr/bin/env tsx
/**
 * Final cleanup: Force all stuck jobs to failed status and prevent reprocessing
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

const STUCK_JOB_IDS = [
  'f2a56180-9dd2-4be6-b501-1d33facb6431',
  '31adb646-faf4-4189-8387-ec32cf3e0c25',
  '196216d4-aaaf-4f5f-9168-d91d57080cb3',
  '712ea236-c526-4c8c-aaf2-cbf902427a0c',
  '0a15bed1-da5d-4eda-bf00-baab37b67d68',
  'd6b09e4b-e3b4-4850-b36f-4faa68904f4a',
  '97a0ee17-ece4-43a3-b8e8-f985799be810',
  '7ff5b5e6-f0fe-441d-a4a2-976d1d70b255',
  '1f37570f-a164-4965-8a60-b8c16de8586a',
  '4dd94ae3-9bcf-4347-9ce0-92f8cb42175d',
  'b1da2bcd-b2ed-4e44-b86b-c9e88e6ebfe4',
  '73934bd7-3de6-4e15-a572-e424887e7990',
  '6bc3f15e-5f6c-49b9-8317-89ba0ccb6aae',
  '01536d37-c977-4b69-8b98-74909772ce19',
  '44977e28-85e7-40e2-9637-b32085b1d0a9',
  '2b19d183-3221-4b15-9146-c3b4369bc6d0',
  'dabb6c65-9d5e-47f7-bf76-350fc7c5b5ff',
  'a30c07d3-3294-4d39-a851-8b58f3726f5f',
  '35061e1b-aecf-4b81-b29e-82a052ac7f3c',
  'e0419aff-2339-46eb-a1b4-8d27e601dd55',
  'b371dc69-4177-464d-a46b-d58fe3e47e58',
  'f9416362-83e9-494c-aebf-a1e01c294822',
  '47554d4a-d742-4879-9991-338aef28ef89',
  '9ccc4d9d-901c-489e-8af0-1a8201abcf3d'
]

async function main() {
  console.log('🔧 Final Job Cleanup - Force to Failed Status')
  console.log('═'.repeat(60))
  console.log()

  await connectDatabase()
  const pool = getDatabasePool()

  try {
    // First, check current status
    console.log('📊 Checking current job statuses...\n')
    const checkResult = await pool.query(
      `SELECT id, status, error_message, started_at 
       FROM jobs 
       WHERE id = ANY($1::uuid[])
       ORDER BY started_at DESC`,
      [STUCK_JOB_IDS]
    )

    console.log(`Found ${checkResult.rows.length} jobs:\n`)
    checkResult.rows.forEach(job => {
      console.log(`  ${job.id.substring(0, 8)}... | ${job.status.padEnd(12)} | ${job.error_message ? job.error_message.substring(0, 50) + '...' : 'No error'}`)
    })
    console.log()

    // Force update ALL to failed, regardless of current status
    console.log('📝 Force updating all jobs to "failed" status...\n')
    const updateResult = await pool.query(
      `UPDATE jobs 
       SET status = 'failed',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
           error_message = COALESCE(
             error_message, 
             'Job stuck in processing - force cleaned up'
           )
       WHERE id = ANY($1::uuid[])
       RETURNING id, status, error_message`,
      [STUCK_JOB_IDS]
    )

    console.log(`✅ Updated ${updateResult.rowCount} jobs to "failed" status\n`)

    // Verify the update
    const verifyResult = await pool.query(
      `SELECT id, status 
       FROM jobs 
       WHERE id = ANY($1::uuid[])
       AND status != 'failed'`,
      [STUCK_JOB_IDS]
    )

    if (verifyResult.rows.length > 0) {
      console.log(`⚠️  Warning: ${verifyResult.rows.length} jobs still not marked as failed:`)
      verifyResult.rows.forEach(job => {
        console.log(`  - ${job.id}: ${job.status}`)
      })
    } else {
      console.log('✅ All jobs successfully marked as "failed"\n')
    }

    console.log('═'.repeat(60))
    console.log('📊 Summary:')
    console.log(`   Total jobs processed: ${STUCK_JOB_IDS.length}`)
    console.log(`   Jobs updated: ${updateResult.rowCount}`)
    console.log('═'.repeat(60))
    console.log('\n✅ Final cleanup complete!')
    console.log('\n⚠️  IMPORTANT: Restart the backend server for code changes to take effect.')
    console.log('   After restart, workers will skip these jobs automatically.\n')

    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    await pool.end()
    process.exit(1)
  }
}

main()


