
import { connectDatabase, pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function checkStuckJobs() {
    console.log('Starting checkStuckJobs script...')
    try {
        await connectDatabase()

        if (!pool) {
            console.error('FAILED: Database pool not initialized')
            return
        }

        console.log(`\n🔍 Checking for processing extraction jobs...\n`)

        const res = await pool.query(`
      SELECT id, project_id, status, progress, created_at, data 
      FROM jobs 
      WHERE status = 'processing' AND type = 'project-data-extraction' 
      ORDER BY created_at DESC
    `)

        console.log(`Found ${res.rows.length} processing parent extraction jobs.`)

        // Also check for child extraction jobs
        const childRes = await pool.query(`
      SELECT type, status, count(*) 
      FROM jobs 
      WHERE type LIKE 'extract-entity-%' 
      GROUP BY type, status
    `)
        console.log('\nChild Extraction Job Summary (from SQL):')
        if (childRes.rows.length > 0) {
            console.table(childRes.rows)
        } else {
            console.log('No child extraction jobs found in SQL table.')
        }

        if (res.rows.length === 0) {
            const lastJob = await pool.query(`
        SELECT id, project_id, status, progress, created_at, error_message
        FROM jobs 
        WHERE type = 'project-data-extraction' 
        ORDER BY created_at DESC 
        LIMIT 5
      `)

            console.log('\nLast 5 parent extraction jobs:')
            lastJob.rows.forEach(j => {
                console.log(`- ID: ${j.id}, Status: ${j.status}, Progress: ${j.progress}%, Created: ${j.created_at}`)
                if (j.error_message) console.log(`  Error: ${j.error_message.substring(0, 100)}`)
            })
            return
        }

        for (const job of res.rows) {
            console.log(`-------------------------------------------`)
            console.log(`Parent Job ID: ${job.id}`)
            console.log(`Project ID: ${job.project_id}`)
            console.log(`Progress: ${job.progress}%`)
            console.log(`Started: ${job.created_at}`)

            const childJobIds = job.data?.childJobIds || []
            console.log(`Child Jobs Count in data: ${childJobIds.length}`)

            if (childJobIds.length > 0) {
                // Find which child jobs are in the SQL jobs table
                // We filter out non-UUIDs if the table uses UUIDs
                const uuidChildIds = childJobIds.filter((id: any) =>
                    typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
                )
                const intChildIds = childJobIds.filter((id: any) =>
                    typeof id === 'number' || (typeof id === 'string' && id.match(/^\d+$/))
                )

                console.log(`UUID Children: ${uuidChildIds.length}, Integer/String Children: ${intChildIds.length}`)

                if (uuidChildIds.length > 0) {
                    const childStatus = await pool.query(`
            SELECT status, count(*) 
            FROM jobs 
            WHERE id = ANY($1::uuid[])
            GROUP BY status
          `, [uuidChildIds])

                    console.log('\nUUID Child Job Statuses (from SQL):')
                    console.table(childStatus.rows)
                }

                // If child jobs are not in the main jobs table, they might be in Bull only.
                // But some systems use the 'id' column for the Bull ID as well.
            }
        }

    } catch (error: any) {
        console.error('❌ Script Error:', error.message)
        console.error(error.stack)
    } finally {
        if (pool) {
            await pool.end()
        }
        console.log('\nScript finished.')
    }
}

checkStuckJobs()
