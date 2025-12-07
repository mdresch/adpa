/**
 * Fix Missing Queue Names
 * Updates jobs with NULL or missing queue_name based on their type
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

const QUEUE_NAME_MAP: Record<string, string> = {
  'ai-generate': 'ai-processing',
  'document-convert': 'document-processing',
  'pipeline-processing': 'pipeline-processing',
  'baseline-extract': 'baseline-processing',
  'process-flow': 'process-flow-processing',
  'document-regeneration': 'document-regeneration',
  'quality-audit': 'quality-audit',
  'extract-project-data': 'project-data-extraction',
}

async function fixMissingQueueNames() {
  console.log('🔧 Fixing Missing Queue Names...\n')

  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection pool not available')
    }

    // Find jobs with NULL or empty queue_name
    const jobsResult = await pool.query(`
      SELECT id, type, queue_name, status, created_at
      FROM jobs
      WHERE queue_name IS NULL OR queue_name = ''
      ORDER BY created_at DESC
      LIMIT 100
    `)

    console.log(`Found ${jobsResult.rows.length} jobs with missing queue_name\n`)

    if (jobsResult.rows.length === 0) {
      console.log('✅ No jobs need fixing')
      return
    }

    let fixed = 0
    let skipped = 0

    for (const job of jobsResult.rows) {
      const queueName = QUEUE_NAME_MAP[job.type]
      
      if (!queueName) {
        console.log(`⚠️  Skipping job ${job.id.substring(0, 8)}... - unknown type: ${job.type}`)
        skipped++
        continue
      }

      await pool.query(
        `UPDATE jobs 
         SET queue_name = $1
         WHERE id = $2`,
        [queueName, job.id]
      )

      console.log(`✅ Fixed job ${job.id.substring(0, 8)}... - type: ${job.type} → queue: ${queueName}`)
      fixed++
    }

    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total jobs checked: ${jobsResult.rows.length}`)
    console.log(`Fixed: ${fixed}`)
    console.log(`Skipped: ${skipped}`)
    console.log('\n✅ Done!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

fixMissingQueueNames()

