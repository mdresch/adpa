
import { connectDatabase, pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function resetStuckJob(jobId: string) {
    try {
        await connectDatabase()

        if (!pool) {
            throw new Error('Database pool not initialized')
        }

        const res = await pool.query(`
      UPDATE jobs 
      SET status = 'failed', 
          error_message = 'Job timed out or monitor process was lost. (Manual Reset)',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'processing'
    `, [jobId])

        if (res.rowCount === 0) {
            console.log('No job found with that ID or job is not in processing state.')
        } else {
            console.log(`Successfully reset job ${jobId} to failed state.`)
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message)
    } finally {
        if (pool) {
            await pool.end()
        }
    }
}

const jobId = process.argv[2]
if (!jobId) {
    console.log('Usage: npx tsx scripts/reset-stuck-job.ts <jobId>')
    process.exit(1)
}

resetStuckJob(jobId)
