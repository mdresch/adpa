import { pool, connectDatabase } from '../src/database/connection'

async function main() {
  await connectDatabase()

  const jobs = await pool.query(`
    SELECT
      id,
      status,
      progress,
      type,
      error_message,
      data->>'retryOf' AS retry_of,
      data->>'projectId' AS project_id,
      data->>'template_id' AS template_id,
      data->>'documentId' AS document_id,
      created_at,
      updated_at,
      llm_insights
    FROM jobs
    WHERE type = 'ai-generate'
    ORDER BY created_at DESC
    LIMIT 15
  `)

  console.log(`Found ${jobs.rows.length} ai-generate jobs\n`)
  for (const job of jobs.rows) {
    const insights = job.llm_insights as { requests?: unknown[]; llmProgressSteps?: unknown[] } | null
    const requests = insights?.requests ?? []
    const steps = insights?.llmProgressSteps ?? []
    console.log('---')
    console.log(`ID: ${job.id}`)
    console.log(`Status: ${job.status} | Progress: ${job.progress}%`)
    console.log(`Project: ${job.project_id} | Template: ${job.template_id}`)
    console.log(`Document: ${job.document_id} | RetryOf: ${job.retry_of ?? 'none'}`)
    console.log(`Created: ${job.created_at} | Updated: ${job.updated_at}`)
    if (job.error_message) console.log(`Error: ${job.error_message}`)
    console.log(`LLM requests: ${Array.isArray(requests) ? requests.length : 0}`)
    console.log(`Progress steps: ${Array.isArray(steps) ? steps.length : 0}`)
    if (Array.isArray(steps) && steps.length) {
      const pending = steps.filter((s: any) => s.status === 'pending' || s.status === 'in_progress')
      const completed = steps.filter((s: any) => s.status === 'completed')
      console.log(`  Steps completed: ${completed.length} / ${steps.length}`)
      if (pending.length) {
        console.log(`  Next pending: ${JSON.stringify(pending.slice(0, 3).map((s: any) => s.label || s.phase))}`)
      }
    }
  }

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
