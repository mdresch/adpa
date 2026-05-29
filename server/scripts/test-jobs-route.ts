import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

function getQueueNameFromType(jobType: string): string {
  const queueMap: Record<string, string> = {
    'ai-generate': 'ai-processing',
    'document-convert': 'document-processing',
    'pipeline-processing': 'pipeline-processing',
    'baseline-extract': 'baseline-processing',
    'process-flow': 'process-flow-processing',
    'document-regeneration': 'document-regeneration',
    'quality-audit': 'quality-audit',
    'extract-project-data': 'project-data-extraction',
  }
  if (queueMap[jobType]) return queueMap[jobType]
  if (jobType.startsWith('extract-entity-')) return 'project-data-extraction'
  return jobType + '-queue'
}

async function run() {
  await connectDatabase()
  if (!pool) return

  const result = await pool.query(`
    SELECT j.*, p.name as project_name 
    FROM jobs j 
    LEFT JOIN projects p ON j.project_id = p.id 
    ORDER BY j.created_at DESC 
    LIMIT 5
  `)

  console.log('--- RAW DB ROWS ---')
  console.log(result.rows.map(r => ({ id: r.id, type: r.type, queue_name: r.queue_name })))

  const formatted = result.rows.map(job => {
    return {
      id: job.id,
      type: job.type,
      queue: job.queue_name || getQueueNameFromType(job.type),
      queue_name: job.queue_name
    }
  })

  console.log('--- FORMATTED ROWS ---')
  console.log(formatted)
  process.exit(0)
}

run()
