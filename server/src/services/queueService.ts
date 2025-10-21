import Bull from "bull"
import { redisClient } from "../utils/redis"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { aiService } from "./aiService"
import { ContextAwareAIService } from "../modules/context/integration"
import { io } from "../server"

// Helper function to parse Redis URL for Bull
function parseBullRedisConfig() {
  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    // Fallback to localhost
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
  
  // Parse Upstash/cloud Redis URL (rediss://default:password@host:port)
  try {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      username: url.username !== 'default' ? url.username : undefined,
      tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null, // Important for cloud Redis
      enableReadyCheck: false,
    }
  } catch (error) {
    logger.error('Failed to parse REDIS_URL, using localhost', error)
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}

const bullRedisConfig = parseBullRedisConfig()

// Create job queues using parsed Redis configuration
const aiQueueOptions = {
  redis: bullRedisConfig,
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

export const aiQueue = new Bull("ai-processing", aiQueueOptions)

const documentQueueOptions = {
  redis: bullRedisConfig,
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

export const documentQueue = new Bull("document-processing", documentQueueOptions)

const pipelineQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    timeout: 600000, // 10 minutes timeout for pipeline jobs
  },
}

export const pipelineQueue = new Bull("pipeline-processing", pipelineQueueOptions)

const baselineQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep baseline jobs for audit
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    timeout: 300000, // 5 minutes timeout for baseline extraction
  },
}

export const baselineQueue = new Bull("baseline-processing", baselineQueueOptions)

const processFlowQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    timeout: 600000, // 10 minutes timeout for process flow
  },
}

export const processFlowQueue = new Bull("process-flow-processing", processFlowQueueOptions)

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
      // FIX: Use template_name from variables if available
      const templateName = job.data?.variables?.template_name || job.data?.template_name || null
      const docName = docNameProvided || templateName || (template_id ? `Generated Document - ${template_id}` : `AI Generated Document ${new Date().toISOString()}`)
      const rawContent = result?.content ? result.content : result
      // FIX: Store content as plain Markdown text, not JSON-stringified
      // The content should be stored directly as a string for proper markdown rendering
      const docContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)

      // FIX: project_id can be in job.data.projectId OR job.data.variables.project_id
      const projectId = job.data.projectId || job.data.variables?.project_id || null;
      
      // Calculate content statistics
      const wordCount = docContent.split(/\s+/).filter((word: string) => word.length > 0).length
      const characterCount = docContent.length
      const sentenceCount = (docContent.match(/[.!?]+/g) || []).length
      const paragraphCount = (docContent.match(/\n\n/g) || []).length + 1
      
      // Calculate quality metrics using the document analysis utility
      const { analyzeDocumentQuality } = await import('../utils/documentMetadata')
      
      // Create minimal metadata object for quality analysis
      const tempMetadata = {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        lineCount: (docContent.match(/\n/g) || []).length + 1,
        estimatedReadingTime: Math.ceil(wordCount / 200) // 200 words per minute
      } as any
      
      // Get source document count for research complexity calculation
      const sourceDocCount = job.data?.documentIds?.length || 0
      
      // Calculate quality metrics
      const qualityMetrics = analyzeDocumentQuality(docContent, tempMetadata, sourceDocCount)
      
      // Build generation metadata for the document (matching frontend expected structure)
      const generationMetadata = {
        aiProcessing: {
          provider: result?.provider || provider,
          model: result?.model || model,
          temperature: temperature || 0.7,
          tokens: {
            input: result?.usage?.prompt_tokens || 0,
            output: result?.usage?.completion_tokens || 0,
            total: result?.usage?.total_tokens || 0,
            cost: 'N/A' // Calculate if cost data available
          }
        },
        generation: {
          generated_at: new Date().toISOString(),
          job_id: jobId,
          status: 'completed',
          duration: null // Will be calculated if we have timing data
        },
        context: {
          summary: result?.context_summary || null,
          warnings: result?.context_warnings || [],
          token_usage: result?.context_token_usage || null
        },
        qualityMetrics: {
          overallQuality: qualityMetrics.overallQuality,
          completeness: qualityMetrics.completeness,
          structureScore: qualityMetrics.structureScore,
          formattingScore: qualityMetrics.formattingScore,
          contentDepth: qualityMetrics.contentDepth,
          accuracy: qualityMetrics.accuracy,
          consistency: qualityMetrics.consistency,
          contextRelevance: qualityMetrics.contextRelevance,
          professionalQuality: qualityMetrics.professionalQuality,
          standardsCompliance: qualityMetrics.standardsCompliance,
          complexityScore: qualityMetrics.complexityScore,
          recommendations: qualityMetrics.recommendations
        }
      };
      
      const insertResult = await pool.query(
        `
        INSERT INTO documents (project_id, name, content, template_id, status, created_by, updated_by, generation_metadata, word_count, character_count, sentence_count, paragraph_count)
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
        [projectId, docName, docContent, template_id || null, 'draft', userId || null, JSON.stringify(generationMetadata), wordCount, characterCount, sentenceCount, paragraphCount]
      )

      if (insertResult.rows.length > 0) {
        createdDocumentId = insertResult.rows[0].id
        createdDocumentRow = insertResult.rows[0]
        logger.info(`Document created: ${createdDocumentId} (project: ${projectId || 'none'}) - ${wordCount} words, ${characterCount} chars`)
      }
    } catch (docErr) {
      logger.error(`Failed to create document for job ${jobId}:`, docErr)
      // continue — document creation failure shouldn't block marking job as completed with AI result
    }

    // CR-2026-001: Automatically validate document against project baseline
    // FIX: Check both projectId locations
    const projectIdForValidation = job.data?.projectId || job.data?.variables?.project_id;
    if (createdDocumentId && projectIdForValidation) {
      try {
        const { baselineService } = await import('./baselineService')
        const rawContent = result?.content ? result.content : result
        const documentContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)
        const docName = job.data?.name && job.data.name.trim() ? job.data.name.trim() : 'Generated Document'
        
        logger.info(`[Baseline Validation] Checking document ${createdDocumentId} against project ${projectIdForValidation} baseline`)
        const drifts = await baselineService.validateDocumentAgainstBaseline(
          projectIdForValidation,
          createdDocumentId,
          documentContent,
          docName
        )
        
        if (drifts.length > 0) {
          logger.warn(`[Baseline Validation] Detected ${drifts.length} drift(s) in document ${createdDocumentId}`)
          // Emit drift alert to project room
          io.to(`project:${projectIdForValidation}`).emit("baseline:drift", {
            documentId: createdDocumentId,
            driftCount: drifts.length,
            drifts: drifts.map(d => ({
              type: d.detection_type,
              severity: d.drift_severity,
              description: d.drift_description
            }))
          })
        } else {
          logger.info(`[Baseline Validation] No drift detected in document ${createdDocumentId}`)
        }
      } catch (baselineErr) {
        logger.error(`[Baseline Validation] Failed to validate document ${createdDocumentId}:`, baselineErr)
        // Don't fail the job if baseline validation fails
      }
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

    // Emit real-time update with rich notification data
    const templateName = job.data?.variables?.template_name || job.data?.template_name || null
    const projectName = job.data?.variables?.project_name || job.data?.projectName || null
    const documentName = templateName || 'Document'
    
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      result: finalResult,
      message: `${documentName} generated successfully`,
      documentId: createdDocumentId,
      projectId: projectId,
      provider: job.data?.provider,
      model: job.data?.model,
    })

    // If a document was created, emit a document-created event so frontends can refresh
    try {
      if (createdDocumentId) {
        // Emit only to the project room so clients who joined that room receive the event
        // FIX: Check both projectId locations
        const projectIdForEmit = job.data?.projectId || job.data?.variables?.project_id;
        if (projectIdForEmit) {
          io.to(`project:${projectIdForEmit}`).emit("document:created", { 
            document: createdDocumentRow,
            documentId: createdDocumentId,
            documentName: documentName,
            projectId: projectIdForEmit,
            projectName: projectName,
            provider: job.data?.provider,
            model: job.data?.model,
          })
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

    // Emit real-time update with rich notification data
    const templateName = job.data?.variables?.template_name || job.data?.template_name || null
    const projectName = job.data?.variables?.project_name || job.data?.projectName || null
    const documentName = templateName || 'Document'
    
    io.emit("job:failed", {
      jobId,
      userId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      message: `Failed to generate ${documentName}`,
      projectId: job.data?.projectId || job.data?.variables?.project_id,
      provider: job.data?.provider,
      model: job.data?.model,
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

// Baseline extraction job processor
baselineQueue.process("baseline-extract", async (job) => {
  const { jobId, userId, project_id, document_ids, ai_provider, ai_model, project_name } = job.data

  try {
    // Update job status to processing
    await updateJobStatus(jobId, "processing", 10)
    
    logger.info(`Starting baseline extraction for project ${project_id}`)
    
    // Extract baseline using AI (this takes 3-10 seconds)
    const { baselineService } = await import('./baselineService')
    
    await updateJobStatus(jobId, "processing", 30)
    
    const extractionResult = await baselineService.extractBaselineFromCorpus(
      project_id,
      userId,
      {
        includeDocumentIds: document_ids,
        aiProvider: ai_provider,
        aiModel: ai_model
      }
    )
    
    await updateJobStatus(jobId, "processing", 70)
    
    // Create baseline in database
    const corpus = document_ids || (await baselineService.getProjectDocumentCorpus(project_id)).map((d: any) => d.id)
    const baseline = await baselineService.createBaseline(
      project_id,
      userId,
      extractionResult,
      corpus
    )
    
    await updateJobStatus(jobId, "processing", 90)
    
    // Update job to completed
    await pool.query(
      `UPDATE jobs 
       SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify({ baseline_id: baseline.id, baseline }), jobId]
    )
    
    // Emit success notification
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      message: `Baseline extracted successfully for ${project_name || 'project'}`,
      projectId: project_id,
      baselineId: baseline.id,
    })
    
    // Emit baseline:created event to project room
    io.to(`project:${project_id}`).emit("baseline:created", {
      baselineId: baseline.id,
      projectId: project_id,
      projectName: project_name,
    })
    
    logger.info(`Baseline extraction job completed: ${jobId}`)
    
    return { baseline_id: baseline.id, baseline }
  } catch (error) {
    logger.error(`Baseline extraction job failed: ${jobId}`, error)
    
    // Update job with error
    await pool.query(
      `UPDATE jobs 
       SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error instanceof Error ? error.message : "Unknown error", jobId]
    )
    
    // Emit failure notification
    io.emit("job:failed", {
      jobId,
      userId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      message: `Failed to extract baseline for ${project_name || 'project'}`,
      projectId: project_id,
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
      case "pipeline-processing":
        queue = pipelineQueue
        break
      case "baseline-extract":
        queue = baselineQueue
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

// Pipeline queue processor
pipelineQueue.process("pipeline-processing", async (job) => {
  const { processPipelineJob } = await import("../workers/pipelineWorker")
  return await processPipelineJob(job)
})

// Pipeline queue event listeners
pipelineQueue.on("completed", (job, result) => {
  logger.info(`Pipeline job completed: ${job.id}`, { jobId: job.data.jobId })
})

pipelineQueue.on("failed", (job, err) => {
  logger.error(`Pipeline job failed: ${job.id}`, { jobId: job.data.jobId, error: err.message })
})

pipelineQueue.on("progress", (job, progress) => {
  logger.debug(`Pipeline job progress: ${job.id} - ${progress}%`)
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
