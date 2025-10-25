/**
 * Monitor pipeline execution in real-time
 * Useful for watching jobs as they execute
 */

import { config } from 'dotenv'
import { Client } from 'pg'

config()

async function monitorPipeline() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('👀 Monitoring pipeline executions...\n')
    console.log('Press Ctrl+C to stop\n')
    
    let lastCount = -1
    
    setInterval(async () => {
      try {
        // Get recent jobs
        const result = await client.query(`
          SELECT 
            job_id,
            status,
            progress,
            current_stage,
            created_at,
            started_at,
            completed_at
          FROM pipeline_executions
          ORDER BY created_at DESC
          LIMIT 5
        `)
        
        if (result.rows.length !== lastCount) {
          console.clear()
          console.log('👀 PIPELINE MONITOR')
          console.log('='.repeat(80))
          console.log(`\nTotal jobs: ${result.rows.length}`)
          console.log('\nRecent jobs:\n')
          
          if (result.rows.length === 0) {
            console.log('  No jobs yet. Click "Start Pipeline" in the UI...\n')
          } else {
            result.rows.forEach((job, index) => {
              const duration = job.completed_at 
                ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at || job.created_at).getTime()) / 1000)}s`
                : 'Running...'
              
              console.log(`${index + 1}. Job ${job.job_id.substring(0, 8)}`)
              console.log(`   Status: ${job.status}`)
              console.log(`   Progress: ${job.progress || 0}%`)
              console.log(`   Current Stage: ${job.current_stage || 'N/A'}`)
              console.log(`   Duration: ${duration}`)
              console.log(`   Created: ${new Date(job.created_at).toLocaleTimeString()}\n`)
            })
          }
          
          lastCount = result.rows.length
        }
        
      } catch (error: any) {
        console.error('Error monitoring:', error.message)
      }
    }, 1000) // Check every second
    
  } catch (error: any) {
    console.error('Failed to connect:', error.message)
    process.exit(1)
  }
}

monitorPipeline()

