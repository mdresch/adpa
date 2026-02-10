
import "./src/tracing"
import dotenv from "dotenv"
import path from "path"
dotenv.config()

import { connectDatabase, getDatabasePool } from "./src/database/connection"
import { connectRedis } from "./src/utils/redis"
import { logger } from "./src/utils/logger"
import {
    aiQueue,
    documentQueue,
    pipelineQueue,
    processFlowQueue,
    baselineQueue,
    regenerationQueue,
    qualityAuditQueue,
    extractionQueue
} from "./src/services/queueService"

const typeToQueue: Record<string, any> = {
    'ai-generate': aiQueue,
    'document-convert': documentQueue,
    'pipeline-processing': pipelineQueue,
    'baseline-extract': baselineQueue,
    'process-flow': processFlowQueue,
    'document-regeneration': regenerationQueue,
    'quality-audit': qualityAuditQueue,
    'extract-project-data': extractionQueue
}

async function requeueOrphaned() {
    await connectDatabase()
    const pool = getDatabasePool()
    await connectRedis()

    logger.info("🔍 Checking for orphaned pending jobs...")

    // Find pending jobs older than 1 minute (since we just restarted the server, anything older than 1m is likely orphaned)
    const res = await pool.query(
        `SELECT id, type, queue_name, data
     FROM jobs
     WHERE status = 'pending'
       AND COALESCE(queued_at, created_at) < NOW() - INTERVAL '1 minute'
     ORDER BY created_at DESC
     LIMIT 5000`

    )

    if (res.rows.length === 0) {
        logger.info("✅ No orphaned pending jobs found.")
        process.exit(0)
    }

    logger.info(`Found ${res.rows.length} orphaned jobs. Re-queueing via direct RabbitMQ publish...`)

    let success = 0
    let skipped = 0
    let failed = 0

    for (const job of res.rows) {
        try {
            const queueName = job.queue_name || 'project-data-extraction'
            let q = typeToQueue[job.type]

            // Special handling for extraction child jobs
            if (!q && job.type.startsWith('extract-entity-')) {
                q = extractionQueue
            }

            if (!q) {
                logger.warn(`⚠️ No queue found for type: ${job.type} (job ${job.id})`)
                skipped++
                continue
            }

            const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : (job.data || {})

            // Directly add to the RabbitMQ adapter - bypasses DB insert
            await q.add(job.type, {
                ...jobData,
                jobId: job.id,
                isRequeued: true
            }, {
                jobId: job.id
            })

            success++
            if (success % 100 === 0) logger.info(`... Re-queued ${success} jobs`)
        } catch (err: any) {
            logger.error(`❌ Failed to re-queue job ${job.id}: ${err.message}`)
            failed++
        }
    }

    logger.info(`✨ Re-queue complete: ${success} success, ${skipped} skipped, ${failed} failed.`)
    // Small delay to ensure RabbitMQ handles publish
    setTimeout(() => process.exit(0), 1000)
}

requeueOrphaned().catch(err => {
    console.error(err)
    process.exit(1)
})
