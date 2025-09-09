import Bull from "bull"
import { redisClient } from "../utils/redis"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { aiService } from "./aiService"
import { ContextAwareAIService } from "../modules/context/integration"
import { io } from "../server"

// Create job queues
const aiQueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: Number.parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: Number.parseInt(process.env.REDIS_DB || "0"),
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
}

export const aiQueue = process.env.REDIS_URL
  ? new Bull("ai-processing", process.env.REDIS_URL, aiQueueOptions)
  : new Bull("ai-processing", aiQueueOptions)

const documentQueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: Number.parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: Number.parseInt(process.env.REDIS_DB || "0"),
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
  },
}

export const documentQueue = process.env.REDIS_URL
  ? new Bull("document-processing", process.env.REDIS_URL, documentQueueOptions)
  : new Bull("document-processing", documentQueueOptions)

// Job processors
aiQueue.process("ai-generate", async (job) => {
  const { jobId, userId, prompt, provider, model, temperature, max_tokens, template_id, variables } = job.data

  try {
    // Update job status to processing
    await updateJobStatus(jobId, "processing", 10)

    // Generate content using AI service. Use ContextAwareAIService if job provides contextual identifiers
    const useContext = !!job.data.use_context || !!job.data.projectId || !!job.data.documentIds || !!job.data.template_id

    let result
    if (useContext) {
      result = await ContextAwareAIService.generateWithContext({
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
        user_id: userId,
        project_id: job.data.projectId,
        document_ids: job.data.documentIds,
        include_integrations: job.data.include_integrations,
        custom_context: job.data.custom_context,
      })
    } else {
      // Fallback to original aiService
      result = await aiService.generate({
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
      })
    }

    // Update job status to 50%
    await updateJobStatus(jobId, "processing", 50)

    // Update usage stats
    if (result.usage) {
      await aiService.updateUsageStats(provider, result.usage)
    }

    // Update job status to 90%
    await updateJobStatus(jobId, "processing", 90)

  // Attempt to create a document record from the generated content
  let createdDocumentId: string | null = null
  let createdDocumentRow: any = null
    try {
      // Determine document name and content; prefer user-provided name/description
      const docNameProvided = job.data?.name && job.data.name.trim() ? job.data.name.trim() : null
      const docDescProvided = job.data?.description && job.data.description.trim() ? job.data.description.trim() : null
      const docName = docNameProvided || (template_id ? `Generated Document - ${template_id}` : `AI Generated Document ${new Date().toISOString()}`)
      const rawContent = result?.content ? result.content : result
      // Attach description into metadata if provided
      const docContent = docDescProvided ? { text: typeof rawContent === 'string' ? rawContent : rawContent, description: docDescProvided } : rawContent

      const insertResult = await pool.query(
        `
        INSERT INTO documents (project_id, name, content, template_id, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING id
      `,
        [job.data.projectId || null, docName, JSON.stringify(docContent), template_id || null, 'draft', userId || null]
      )

      if (insertResult.rows.length > 0) {
        createdDocumentId = insertResult.rows[0].id
        createdDocumentRow = insertResult.rows[0]
      }
    } catch (docErr) {
      logger.error(`Failed to create document for job ${jobId}:`, docErr)
      // continue — document creation failure shouldn't block marking job as completed with AI result
    }

    // Save result to database including document id if created
    const finalResult = {
      ai: result,
      documentId: createdDocumentId,
    }

    await pool.query(
      `
      UPDATE jobs 
      SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [JSON.stringify(finalResult), jobId]
    )

    // Emit real-time update
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      result: finalResult,
    })

    // If a document was created, emit a document-created event so frontends can refresh
    try {
      if (createdDocumentRow) {
        // Emit only to the project room so clients who joined that room receive the event
        if (job.data?.projectId) {
          io.to(`project:${job.data.projectId}`).emit("document:created", { document: createdDocumentRow })
        }
      }
    } catch (emitErr) {
      logger.error(`Failed to emit document:created for job ${jobId}:`, emitErr)
    }

    logger.info(`AI generation job completed: ${jobId}`)

    return finalResult
  } catch (error) {
    logger.error(`AI generation job failed: ${jobId}`, error)

    // Update job with error
    await pool.query(
      `
      UPDATE jobs 
      SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [error instanceof Error ? error.message : "Unknown error", jobId]
    )

    // Emit real-time update
    io.emit("job:failed", {
      jobId,
      userId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    })

    throw error
  }
})

documentQueue.process("document-convert", async (job) => {
  const { jobId, userId, documentId, format } = job.data

  try {
    await updateJobStatus(jobId, "processing", 20)

    // Get document
    const docResult = await pool.query("SELECT * FROM documents WHERE id = $1", [documentId])
    if (docResult.rows.length === 0) {
      throw new Error("Document not found")
    }

    const document = docResult.rows[0]

    await updateJobStatus(jobId, "processing", 50)

    // Process document conversion (placeholder implementation)
    const convertedContent = await convertDocument(document, format)

    await updateJobStatus(jobId, "processing", 90)

    // Save converted document
    const result = {
      originalId: documentId,
      format,
      content: convertedContent,
      convertedAt: new Date().toISOString(),
    }

    await pool.query(
      `
      UPDATE jobs 
      SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [JSON.stringify(result), jobId]
    )

    // Emit real-time update
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      result,
    })

    logger.info(`Document conversion job completed: ${jobId}`)

    return result
  } catch (error) {
    logger.error(`Document conversion job failed: ${jobId}`, error)

    await pool.query(
      `
      UPDATE jobs 
      SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [error instanceof Error ? error.message : "Unknown error", jobId]
    )

    // Emit real-time update
    io.emit("job:failed", {
      jobId,
      userId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    })

    throw error
  }
})

// Job management functions
export async function addJob(type: string, data: any, options?: any): Promise<string> {
  try {
    const jobId = data.jobId
    
    // Save job to database
    await pool.query(
      `
      INSERT INTO jobs (id, type, status, data, created_by)
      VALUES ($1, $2, 'pending', $3, $4)
    `,
      [jobId, type, JSON.stringify(data), data.userId]
    )

    // Add to appropriate queue
    let queue: Bull.Queue
    switch (type) {
      case "ai-generate":
        queue = aiQueue
        break
      case "document-convert":
        queue = documentQueue
        break
      default:
        throw new Error(`Unknown job type: ${type}`)
    }

    await queue.add(type, data, {
      jobId,
      priority: data.priority || 0,
      delay: data.delay || 0,
      ...options,
    })

    logger.info(`Job added to queue: ${jobId} (${type})`)

    return jobId
  } catch (error) {
    logger.error("Failed to add job:", error)
    throw error
  }
}

export async function getJobStatus(jobId: string): Promise<any> {
  try {
    const result = await pool.query(
      "SELECT * FROM jobs WHERE id = $1",
      [jobId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  } catch (error) {
    logger.error(`Failed to get job status: ${jobId}`, error)
    return null
  }
}

export async function updateJobStatus(jobId: string, status: string, progress?: number): Promise<void> {
  try {
    const updateFields = ["status = $2"]
    const params = [jobId, status]
    let paramCount = 2

    if (progress !== undefined) {
      paramCount++
      updateFields.push(`progress = $${paramCount}`)
      params.push(progress.toString())
    }

    if (status === "processing" && progress === 10) {
      paramCount++
      updateFields.push(`started_at = CURRENT_TIMESTAMP`)
    }

    await pool.query(
      `UPDATE jobs SET ${updateFields.join(", ")} WHERE id = $1`,
      params
    )

    // Emit real-time update
    const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobId])
    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0]
      io.emit("job:status", {
        jobId,
        userId: job.created_by,
        status,
        progress,
      })
    }
  } catch (error) {
    logger.error(`Failed to update job status: ${jobId}`, error)
  }
}

export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    // Try to remove from all queues
    const aiJob = await aiQueue.getJob(jobId)
    if (aiJob) {
      await aiJob.remove()
    }

    const docJob = await documentQueue.getJob(jobId)
    if (docJob) {
      await docJob.remove()
    }

    // Update database
    await pool.query(
      `
      UPDATE jobs 
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status IN ('pending', 'processing')
    `,
      [jobId]
    )

    logger.info(`Job cancelled: ${jobId}`)
    return true
  } catch (error) {
    logger.error(`Failed to cancel job: ${jobId}`, error)
    return false
  }
}

// Placeholder document conversion function
async function convertDocument(document: any, format: string): Promise<any> {
  // This would integrate with actual document conversion services
  // For now, return a placeholder
  return {
    format,
    content: `Converted document: ${document.name}`,
    size: 1024,
  }
}

// Queue event handlers
aiQueue.on("completed", (job, result) => {
  logger.info(`AI job completed: ${job.id}`)
})

aiQueue.on("failed", (job, err) => {
  logger.error(`AI job failed: ${job.id}`, err)
})

documentQueue.on("completed", (job, result) => {
  logger.info(`Document job completed: ${job.id}`)
})

documentQueue.on("failed", (job, err) => {
  logger.error(`Document job failed: ${job.id}`, err)
})

// Initialize queues
export async function initializeQueues() {
  try {
    await aiService.initializeProviders()
    logger.info("Job queues initialized")
  } catch (error) {
    logger.error("Failed to initialize queues:", error)
  }
}
