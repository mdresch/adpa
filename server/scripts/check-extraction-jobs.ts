/**
 * Diagnostic Script: Check Extraction Jobs
 * Verifies if automatic extraction jobs are being created and processed
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: (process.env.DATABASE_URL?.includes('supabase.co') || process.env.DB_SSL === 'true')
    ? { rejectUnauthorized: false }
    : false
})

async function checkExtractionJobs() {
  try {
    console.log('🔍 Checking extraction jobs...\n')

    // Check recent extraction jobs
    const jobsResult = await pool.query(`
      SELECT 
        id,
        type,
        status,
        progress,
        created_at,
        started_at,
        completed_at,
        error_message,
        data->>'autoTriggered' as auto_triggered,
        data->>'sourceDocumentId' as source_document_id,
        data->>'sourceDocumentName' as source_document_name,
        data->>'projectId' as project_id,
        data->>'documentIds' as document_ids
      FROM jobs
      WHERE type = 'project-data-extraction'
      ORDER BY created_at DESC
      LIMIT 10
    `)

    console.log(`📊 Found ${jobsResult.rows.length} extraction job(s):\n`)

    if (jobsResult.rows.length === 0) {
      console.log('❌ No extraction jobs found!')
      console.log('   This means automatic extraction is NOT being triggered.\n')
      console.log('   Possible causes:')
      console.log('   1. Documents were created before automatic extraction was implemented')
      console.log('   2. Extraction trigger code has an error')
      console.log('   3. Content check is failing (empty content)')
      return
    }

    jobsResult.rows.forEach((job, i) => {
      console.log(`${i + 1}. Job ID: ${job.id}`)
      console.log(`   Status: ${job.status}`)
      console.log(`   Progress: ${job.progress || 0}%`)
      console.log(`   Auto-triggered: ${job.auto_triggered || 'false'}`)
      console.log(`   Document ID: ${job.source_document_id || 'N/A'}`)
      console.log(`   Document Name: ${job.source_document_name || 'N/A'}`)
      console.log(`   Project ID: ${job.project_id || 'N/A'}`)
      console.log(`   Created: ${job.created_at}`)
      if (job.started_at) {
        console.log(`   Started: ${job.started_at}`)
      }
      if (job.completed_at) {
        console.log(`   Completed: ${job.completed_at}`)
      }
      if (job.error_message) {
        console.log(`   ❌ Error: ${job.error_message}`)
      }
      console.log('')
    })

    // Check for pending jobs
    const pendingJobs = jobsResult.rows.filter(j => j.status === 'pending')
    if (pendingJobs.length > 0) {
      console.log(`⚠️  ${pendingJobs.length} job(s) are still pending - they may not be processed yet\n`)
    }

    // Check for failed jobs
    const failedJobs = jobsResult.rows.filter(j => j.status === 'failed')
    if (failedJobs.length > 0) {
      console.log(`❌ ${failedJobs.length} job(s) failed:\n`)
      failedJobs.forEach(job => {
        console.log(`   - ${job.id}: ${job.error_message || 'Unknown error'}`)
      })
      console.log('')
    }

    // Check for completed jobs
    const completedJobs = jobsResult.rows.filter(j => j.status === 'completed')
    if (completedJobs.length > 0) {
      console.log(`✅ ${completedJobs.length} job(s) completed successfully\n`)
    }

    // Check if entities were actually extracted
    const projectId = jobsResult.rows[0]?.project_id
    if (projectId) {
      console.log(`\n📈 Checking extracted entities for project ${projectId}...\n`)
      
      const entityCounts = await pool.query(`
        SELECT 
          'stakeholders' as entity_type, COUNT(*) as count FROM stakeholders WHERE project_id = $1
        UNION ALL
        SELECT 'risks', COUNT(*) FROM risks WHERE project_id = $1
        UNION ALL
        SELECT 'requirements', COUNT(*) FROM requirements WHERE project_id = $1
        UNION ALL
        SELECT 'milestones', COUNT(*) FROM milestones WHERE project_id = $1
        UNION ALL
        SELECT 'deliverables', COUNT(*) FROM deliverables WHERE project_id = $1
      `, [projectId])

      console.log('Extracted Entities:')
      entityCounts.rows.forEach(row => {
        console.log(`   ${row.entity_type}: ${row.count}`)
      })
    }

  } catch (error: any) {
    console.error('❌ Error checking extraction jobs:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

checkExtractionJobs()

