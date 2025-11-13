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
  
  // Parse Railway/cloud Redis URL (rediss://default:password@host:port)
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
    timeout: 600000, // 10 minutes timeout for AI generation
  },
  settings: {
    lockDuration: 600000, // 10 minutes lock (AI generation can take time)
    stallInterval: 30000, // Check for stalls every 30 seconds
    maxStalledCount: 2, // Allow 2 stalls before failing
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
  settings: {
    lockDuration: 600000, // 10 minutes lock
    stallInterval: 30000, // Check every 30 seconds
    maxStalledCount: 2,
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
      delay: 10000,
    },
    timeout: 3600000, // 60 minutes timeout for process flow (compression is slow with many docs)
  },
  settings: {
    lockDuration: 3600000, // 60 minutes lock for long-running process flow (handles dynamic document sets with AI compression and caching)
    stallInterval: 60000, // Check every 60 seconds (less aggressive)
    maxStalledCount: 3, // Allow 3 stalls before failing
  },
}

export const processFlowQueue = new Bull("process-flow-processing", processFlowQueueOptions)

const regenerationQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    timeout: 600000, // 10 minutes timeout for regeneration
  },
  settings: {
    lockDuration: 600000, // 10 minutes lock
    stallInterval: 30000,
    maxStalledCount: 2,
  },
}

export const regenerationQueue = new Bull("document-regeneration", regenerationQueueOptions)

// Quality Audit Queue Options
const qualityAuditQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    timeout: 120000, // 2 minutes timeout for AI quality analysis
  },
}

export const qualityAuditQueue = new Bull("quality-audit", qualityAuditQueueOptions)

// Project Data Extraction Queue Options
const extractionQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    timeout: 600000, // 10 minutes timeout for AI extraction (13 parallel calls)
  },
}

export const extractionQueue = new Bull("project-data-extraction", extractionQueueOptions)

// Job processors
aiQueue.process("ai-generate", async (job) => {
  const { jobId, userId, prompt, provider, model, temperature, max_tokens, template_id, variables } = job.data

  try {
    // Update job status to processing and assign worker
    await updateJobStatus(jobId, "processing", 10, WORKER_ID, "ai-processing")

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
      // Content should be plain Markdown text for proper rendering
      // JSON.stringify is used as a safe fallback only if AI returns non-string content
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
      
      // Calculate AI cost based on token usage and provider
      const calculateAICost = (provider: string, model: string, inputTokens: number, outputTokens: number): string => {
        // Pricing per 1M tokens (as of 2024)
        const pricing: Record<string, { input: number, output: number }> = {
          'openai-gpt-4': { input: 30, output: 60 },
          'openai-gpt-4-turbo': { input: 10, output: 30 },
          'openai-gpt-3.5-turbo': { input: 0.50, output: 1.50 },
          'google-gemini-pro': { input: 0.50, output: 1.50 },
          'google-gemini-1.5-pro': { input: 3.50, output: 10.50 },
          'mistral-small': { input: 1, output: 3 },
          'mistral-medium': { input: 2.7, output: 8.1 },
          'mistral-large': { input: 4, output: 12 },
          'anthropic-claude-3-opus': { input: 15, output: 75 },
          'anthropic-claude-3-sonnet': { input: 3, output: 15 },
          'anthropic-claude-3-haiku': { input: 0.25, output: 1.25 }
        }
        
        const key = `${provider.toLowerCase()}-${model.toLowerCase()}`.replace(/\s+/g, '-')
        const rates = pricing[key] || { input: 1, output: 3 } // Default fallback
        
        const inputCost = (inputTokens / 1_000_000) * rates.input
        const outputCost = (outputTokens / 1_000_000) * rates.output
        const totalCost = inputCost + outputCost
        
        return totalCost < 0.01 ? '$0.00' : `$${totalCost.toFixed(4)}`
      }
      
      // Calculate processing duration from job data
      const jobStartTime = job.data.started_at ? new Date(job.data.started_at) : new Date(job.timestamp)
      const jobEndTime = new Date()
      const processingTimeMs = jobEndTime.getTime() - jobStartTime.getTime()
      const processingTimeSec = (processingTimeMs / 1000).toFixed(2)
      
      // Prepare token data
      const inputTokens = result?.usage?.prompt_tokens || result?.usage?.input_tokens || 0
      const outputTokens = result?.usage?.completion_tokens || result?.usage?.output_tokens || 0
      const totalTokens = result?.usage?.total_tokens || (inputTokens + outputTokens)
      const estimatedCost = calculateAICost(provider, model || 'unknown', inputTokens, outputTokens)
      
      // Build generation metadata for the document (matching frontend expected structure)
      const generationMetadata = {
        aiProcessing: {
          provider: result?.provider || provider,
          model: result?.model || model,
          temperature: temperature || 0.7,
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
            cost: estimatedCost
          },
          processingTime: `${processingTimeSec}s`,
          processingTimeMs: processingTimeMs
        },
        generation: {
          generated_at: new Date().toISOString(),
          job_id: jobId,
          status: 'completed',
          duration: processingTimeMs,
          durationFormatted: `${processingTimeSec}s`
        },
        context: {
          summary: result?.context_summary || null,
          warnings: result?.context_warnings || [],
          token_usage: result?.context_token_usage || null
        },
        contentMetrics: {
          wordCount,
          characterCount,
          sentenceCount,
          paragraphCount,
          avgWordsPerSentence: sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : 'N/A',
          readingTime: `${Math.ceil(wordCount / 200)} min`
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
        },
        sourceDocuments: job.data?.documentIds?.map((docId: string, idx: number) => ({
          id: docId,
          order: idx + 1
        })) || []
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
        
        // ⭐ INCREMENT TEMPLATE USAGE COUNT ⭐
        // This updates the template's usage statistics for analytics
        if (template_id) {
          try {
            await pool.query(
              `UPDATE templates 
               SET usage_count = usage_count + 1,
                   last_used_at = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [template_id]
            )
            logger.info(`✅ Template usage incremented: ${template_id}`)
          } catch (templateErr) {
            logger.error(`Failed to increment template usage for ${template_id}:`, templateErr)
            // Don't fail the job if template update fails
          }
        }
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
        // Content should be plain Markdown; JSON.stringify as safe fallback for non-string content
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

    // ⭐ CREATE AUDIT LOG FOR AI ANALYTICS ⭐
    // This ensures the AI Analytics dashboard shows correct generation counts
    try {
      // Get provider ID for audit log (needed by analytics queries)
      const providerResult = await pool.query(
        'SELECT id FROM ai_providers WHERE name = $1 LIMIT 1',
        [provider]
      )
      
      if (providerResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId || null,
            'ai_generate', // This action is what the analytics query counts
            'ai_provider',
            providerResult.rows[0].id,
            JSON.stringify({
              prompt_length: prompt?.length || 0,
              provider,
              model,
              template_id,
              document_id: createdDocumentId,
              job_id: jobId,
              usage: result?.usage || {},
              success: true,
              response_time: result?.response_time || 0
            })
          ]
        )
        logger.info(`✅ Audit log created for AI generation (job: ${jobId})`)
      }
    } catch (auditErr) {
      logger.error(`Failed to create audit log for job ${jobId}:`, auditErr)
      // Don't fail the job if audit logging fails
    }

    // Emit real-time update with rich notification data
    const templateName = job.data?.variables?.template_name || job.data?.template_name || null
    const projectName = job.data?.variables?.project_name || job.data?.projectName || null
    const documentName = templateName || 'Document'
    
    // FIX: Get projectId from job data (not from scoped variable)
    const projectIdForNotification = job.data?.projectId || job.data?.variables?.project_id || null
    
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      result: finalResult,
      message: `${documentName} generated successfully`,
      documentId: createdDocumentId,
      projectId: projectIdForNotification,
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
    await updateJobStatus(jobId, "processing", 20, WORKER_ID, "document-processing")

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
  const { jobId, userId, project_id, document_ids, ai_provider, ai_model } = job.data
  let { project_name } = job.data

  try {
    // Update job status to processing and assign worker
    await updateJobStatus(jobId, "processing", 10, WORKER_ID, "baseline-processing")
    
    // Look up project name if not provided
    if (!project_name && project_id) {
      const projectResult = await pool.query('SELECT name FROM projects WHERE id = $1', [project_id])
      if (projectResult.rows.length > 0) {
        project_name = projectResult.rows[0].name
      }
    }
    
    logger.info(`Starting baseline extraction for project ${project_id} (${project_name || 'Unknown'})`)
    
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

// Process Flow job processor
processFlowQueue.process("process-flow", async (job) => {
  const { jobId, userId, config } = job.data

  try {
    // Safety check: ensure pool is available
    if (!pool) {
      logger.error(`Process-flow job ${jobId}: Database connection pool is not available`)
      // Can't update status without pool, fail gracefully
      throw new Error('Database connection pool is not available')
    }
    
    // Update job status to processing
    await updateJobStatus(jobId, "processing", 5, WORKER_ID, "process-flow-processing")
    
    // Get project name for better job identification
    let projectName = 'Unknown Project'
    let documentName = config.documentName || config.templateName || 'Process Flow Document'
    try {
      const projectResult = await pool.query(
        'SELECT name FROM projects WHERE id = $1',
        [config.projectId]
      )
      if (projectResult.rows.length > 0) {
        projectName = projectResult.rows[0].name
      }
    } catch (error) {
      logger.warn(`Could not fetch project name for ${config.projectId}`)
    }
    
    logger.info(`Starting process-flow job ${jobId} for project: ${projectName} (${config.projectId})`)
    
    // Update job data with initial steps
    const totalSteps = config.includeStakeholders ? 7 : 6
    await pool.query(
      `UPDATE jobs 
       SET data = jsonb_set(
         COALESCE(data, '{}'::jsonb), 
         '{currentStep}', 
         to_jsonb($1::text)
       )
       WHERE id = $2`,
      ['Initializing workflow...', jobId]
    )
    
    // Get the ProcessFlowService
    const ProcessFlowService = (await import('./processFlowService')).default
    const processFlowService = new ProcessFlowService(pool)
    
    await updateJobStatus(jobId, "processing", 10)
    
    // Create a progress callback to update job status during processing
    const updateStepProgress = async (stepName: string, stepNumber: number, totalSteps: number) => {
      const progress = Math.floor(10 + (stepNumber / totalSteps) * 80) // 10% to 90%
      
      await pool.query(
        `UPDATE jobs 
         SET data = jsonb_set(
           jsonb_set(
             COALESCE(data, '{}'::jsonb), 
             '{currentStep}', 
             to_jsonb($1::text)
           ),
           '{stepProgress}',
           to_jsonb($2::int)
         ),
         progress = $3
         WHERE id = $4`,
        [stepName, stepNumber, progress, jobId]
      )
      
      // Emit real-time step update
      io.emit("job:step-update", {
        jobId,
        userId,
        currentStep: stepName,
        stepNumber,
        totalSteps,
        progress
      })
      
      logger.info(`Process-flow job ${jobId}: Step ${stepNumber}/${totalSteps} - ${stepName}`)
    }
    
    // Track documents with their start times across batches
    const documentStartTimes = new Map<string, number>()
    
    // Create progress callback for document compression
    const onCompressionProgress = async (stepName: string, current: number, total: number, details?: any) => {
      // Calculate progress: 10% (init) + up to 70% for compression + 20% for finalization
      const compressionProgress = Math.floor(10 + (current / total) * 70)
      
      // Track document start time when first seen
      if (details?.documentId && !documentStartTimes.has(details.documentId)) {
        documentStartTimes.set(details.documentId, Date.now())
      }
      
      // Get provider assignments from details (passed from processFlowService)
      const providerAssignments = details?.providerAssignments || []
      const assignedProvider = details?.assignedProvider
      
      // Build message showing current processing status
      const stepMessage = providerAssignments.length > 0
        ? `AI providers processing ${providerAssignments.length} document${providerAssignments.length > 1 ? 's' : ''} (${current}/${total} completed)`
        : `${stepName}: ${current}/${total} - ${details?.documentName || 'processing...'}`
      
      await pool.query(
        `UPDATE jobs 
         SET data = jsonb_set(
           jsonb_set(
             jsonb_set(
               jsonb_set(
                 COALESCE(data, '{}'::jsonb), 
                 '{currentStep}', 
                 to_jsonb($1::text)
               ),
               '{compressionProgress}',
               to_jsonb($2::jsonb)
             ),
             '{currentDocument}',
             to_jsonb($3::jsonb)
           ),
           '{providerAssignments}',
           to_jsonb($6::jsonb)
         ),
         progress = $4
         WHERE id = $5`,
        [
          stepMessage, 
          JSON.stringify({ current, total, percentage: Math.floor((current / total) * 100) }),
          JSON.stringify(details || {}),
          compressionProgress,
          jobId,
          JSON.stringify(providerAssignments)
        ]
      )
      
      // Emit real-time update with provider assignments
      io.emit("job:step-update", {
        jobId,
        userId,
        currentStep: stepMessage,
        compressionProgress: { current, total, percentage: Math.floor((current / total) * 100) },
        currentDocument: details,
        providerAssignments,
        parallelCount: providerAssignments.length,
        progress: compressionProgress,
        projectId: config?.projectId,
        projectName,
        documentName,
        templateName: config?.templateName
      })
    }
    
    await updateStepProgress('Initializing workflow', 1, totalSteps)
    
    // Run the workflow processing with progress callback
    const configWithCallback = {
      ...config,
      onProgress: onCompressionProgress
    }
    
    const result = await processFlowService.startWorkflowProcessing(configWithCallback)
    
    await updateJobStatus(jobId, "processing", 95)
    await updateStepProgress('Finalizing document...', totalSteps, totalSteps)
    
    // Update job to completed with detailed result
    await pool.query(
      `UPDATE jobs 
       SET status = 'completed', 
           result = $1, 
           progress = 100, 
           completed_at = CURRENT_TIMESTAMP,
           data = jsonb_set(
             COALESCE(data, '{}'::jsonb),
             '{currentStep}',
             to_jsonb('Completed'::text)
           )
       WHERE id = $2`,
      [JSON.stringify({
        workflowId: result.workflowId,
        documentId: result.savedDocument.id,
        documentName: result.savedDocument.name,
        stepsCompleted: result.steps.length,
        steps: result.steps,
        finalDocumentLength: result.finalDocument.length,
        totalTokens: result.steps.reduce((sum, step) => sum + step.tokens, 0)
      }), jobId]
    )
    
    // Emit success notification
    io.emit("job:completed", {
      jobId,
      userId,
      status: "completed",
      message: `Process flow workflow completed: ${result.savedDocument.name}`,
      projectId: config.projectId,
      documentId: result.savedDocument.id,
      documentName: result.savedDocument.name
    })
    
    logger.info(`Process-flow job completed: ${jobId}`)
    
  } catch (error: any) {
    logger.error(`Process-flow job failed: ${jobId}`, error)
    
    // Only update database if pool is available
    if (pool) {
      await pool.query(
        `UPDATE jobs 
         SET status = 'failed', 
             error_message = $1, 
             completed_at = CURRENT_TIMESTAMP,
             data = jsonb_set(
               COALESCE(data, '{}'::jsonb),
               '{currentStep}',
               to_jsonb('Failed'::text)
             )
         WHERE id = $2`,
        [error.message || "Process-flow job failed", jobId]
      )
    }
    
    io.emit("job:failed", {
      jobId,
      userId,
      status: "failed",
      error: error.message || "Process-flow job failed",
      projectId: config?.projectId,
    })
    
    throw error
  }
})

// Document Regeneration job processor
regenerationQueue.process("document-regeneration", async (job) => {
  const { jobId, documentId, templateId, provider, model, versionType, temperature, userId } = job.data

  try {
    logger.info(`Starting document regeneration job ${jobId} for document ${documentId}`)
    
    // Execute regeneration using the service
    const { DocumentRegenerationService } = await import('./documentRegenerationService')
    await DocumentRegenerationService.executeRegenerationJob({
      documentId,
      templateId,
      provider,
      model,
      versionType,
      temperature,
      userId,
      jobId
    })
    
    logger.info(`Document regeneration job completed: ${jobId}`)
    
    return { success: true, jobId }
  } catch (error) {
    logger.error(`Document regeneration job failed: ${jobId}`, error)
    throw error
  }
})

// Regeneration queue event listeners
regenerationQueue.on("completed", (job, result) => {
  logger.info(`Regeneration job completed: ${job.id}`)
})

regenerationQueue.on("failed", (job, err) => {
  logger.error(`Regeneration job failed: ${job.id}`, err)
})

// Quality Audit job processor
qualityAuditQueue.process("quality-audit", async (job) => {
  const { jobId, documentId, documentContent, documentType, projectContext, userId } = job.data

  try {
    // Update job status to processing and assign worker
    await updateJobStatus(jobId, "processing", 10, WORKER_ID, "quality-audit")

    logger.info(`[QUALITY-AUDIT-JOB] Starting quality audit job ${jobId} for document ${documentId}`)

    // Import quality audit service
    const { qualityAuditService } = await import('./qualityAuditService')

    // Run the audit
    const auditResult = await qualityAuditService.auditDocument(
      documentId,
      documentContent,
      documentType,
      projectContext,
      userId
    )

    // Update job status to completed
    await updateJobStatus(jobId, "completed", 100, WORKER_ID, "quality-audit")

    logger.info(`[QUALITY-AUDIT-JOB] Quality audit completed: ${jobId}`, {
      overallScore: auditResult.overallScore,
      grade: auditResult.overallGrade
    })

    return { success: true, auditResult, jobId }
  } catch (error) {
    logger.error(`[QUALITY-AUDIT-JOB] Quality audit job failed: ${jobId}`, error)
    
    // Update job status to failed
    await updateJobStatus(
      jobId, 
      "failed", 
      0, 
      WORKER_ID, 
      "quality-audit",
      error instanceof Error ? error.message : String(error)
    )
    
    throw error
  }
})

// Quality Audit queue event listeners
qualityAuditQueue.on("completed", (job, result) => {
  logger.info(`Quality audit job completed: ${job.id}`)
})

qualityAuditQueue.on("failed", (job, err) => {
  logger.error(`Quality audit job failed: ${job.id}`, err)
})

// Project Data Extraction job processor
// Define entity types for granular extraction
// Includes all PMBOK 8 performance domain entities
const ENTITY_TYPES = [
  'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
  'success_criteria', 'best_practices', 'phases', 'resources',
  'technologies', 'quality_standards', 'deliverables', 'scope_items', 'activities',
  // PMBOK 8 Performance Domain entities
  'team_agreements', 'development_approaches', 'project_iterations', 'work_items',
  'capacity_plans', 'performance_measurements', 'earned_value_metrics', 'opportunities', 'risk_responses',
  'performance_actuals'
] as const

type EntityType = typeof ENTITY_TYPES[number]

/**
 * Parent Job: Orchestrate extraction by creating child jobs for each entity type
 */
extractionQueue.process("extract-project-data", 1, async (job) => {
  const { jobId, projectId, userId, aiProvider, aiModel, documentIds } = job.data

  try {
    logger.info(`[EXTRACTION-PARENT] Starting orchestration: ${jobId}`, { projectId })
    
    await updateJobStatus(jobId, "processing", 5, WORKER_ID, "project-data-extraction")
    
    // Create child jobs for each entity type (resilient, independent extraction)
    const childJobPromises = ENTITY_TYPES.map((entityType, index) => {
      return extractionQueue.add(`extract-entity-${entityType}`, {
        parentJobId: jobId,
        projectId,
        userId,
        aiProvider,
        aiModel,
        documentIds,
        entityType,
        entityIndex: index,
        totalEntities: ENTITY_TYPES.length
      }, {
        attempts: 3, // Retry each entity extraction up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000 // Start with 5s delay
        }
      })
    })
    
    // Wait for all child jobs to be created
    const childJobs = await Promise.all(childJobPromises)
    
    logger.info(`[EXTRACTION-PARENT] Created ${childJobs.length} child extraction jobs`, { jobId })
    
    await updateJobStatus(jobId, "processing", 10, WORKER_ID)
    
    // Store child job IDs in parent job data
    await pool.query(
      `UPDATE jobs SET data = data || $1 WHERE id = $2`,
      [JSON.stringify({ childJobIds: childJobs.map(j => j.id) }), jobId]
    )
    
    // Monitor child job completion with execution guard to prevent race conditions
    let completedCount = 0
    let isChecking = false // Execution guard to prevent overlapping checks
    const checkInterval = setInterval(async () => {
      // Skip if previous check is still running
      if (isChecking) return
      
      isChecking = true
      try {
        const states = await Promise.all(
          childJobs.map(j => j.getState())
        )
        
        const completed = states.filter(s => s === 'completed').length
        const failed = states.filter(s => s === 'failed').length
        
        if (completed + failed === childJobs.length) {
          clearInterval(checkInterval)
          
          // Get details about failed jobs for better error reporting
          const failedJobs: Array<{ entityType: string; error: string }> = []
          if (failed > 0) {
            for (let i = 0; i < childJobs.length; i++) {
              if (states[i] === 'failed') {
                try {
                  const job = childJobs[i]
                  const entityType = job.data?.entityType || 'unknown'
                  
                  // Try to get error from job's failedReason or returnvalue
                  let errorMessage = 'Unknown error'
                  try {
                    // Bull stores error in failedReason property
                    if ((job as any).failedReason) {
                      errorMessage = (job as any).failedReason
                    } else {
                      // Try to get from returnvalue (if error was returned)
                      const returnValue = await job.getReturnvalue().catch(() => null)
                      if (returnValue?.error) {
                        errorMessage = returnValue.error
                      } else if (returnValue?.message) {
                        errorMessage = returnValue.message
                      }
                    }
                  } catch (err) {
                    // If we can't get error details, use generic message
                    errorMessage = 'Failed after retries'
                  }
                  
                  failedJobs.push({ entityType, error: errorMessage })
                  logger.error(`[EXTRACTION-PARENT] Failed entity type: ${entityType}`, {
                    jobId: job.id,
                    error: errorMessage,
                    parentJobId: jobId,
                    jobData: job.data
                  })
                } catch (err: any) {
                  logger.error(`[EXTRACTION-PARENT] Could not get failed job details: ${err?.message || err}`, {
                    jobId: childJobs[i].id,
                    error: err
                  })
                  // Still add to failed list with generic error
                  const entityType = childJobs[i].data?.entityType || 'unknown'
                  failedJobs.push({ entityType, error: `Could not retrieve error: ${err?.message || 'Unknown'}` })
                }
              }
            }
            
            // Log all failed entity types
            const failedTypes = failedJobs.map(f => f.entityType).join(', ')
            logger.warn(`[EXTRACTION-PARENT] ${failed} entity extraction(s) failed: ${failedTypes}`, {
              failedJobs,
              completed,
              total: childJobs.length
            })
            
            // Allow partial success if at least 50% succeeded
            const successRate = completed / childJobs.length
            if (successRate >= 0.5) {
              logger.info(`[EXTRACTION-PARENT] Allowing partial success: ${completed}/${childJobs.length} succeeded (${(successRate * 100).toFixed(1)}%)`)
              // Finalize with partial results
              await finalizeExtractionJob(jobId, projectId, failedJobs)
            } else {
              // Too many failures - fail the entire job
              const errorMessage = `${failed} entity extraction(s) failed: ${failedTypes}. Errors: ${failedJobs.map(f => `${f.entityType}: ${f.error}`).join('; ')}`
              throw new Error(errorMessage)
            }
          } else {
            // All succeeded - finalize parent job
            await finalizeExtractionJob(jobId, projectId)
          }
        } else {
          // Update progress based on completed child jobs
          const progress = 10 + Math.floor((completed / childJobs.length) * 85)
          await updateJobStatus(jobId, "processing", progress, WORKER_ID)
          completedCount = completed
        }
      } catch (error) {
        clearInterval(checkInterval)
        throw error
      } finally {
        isChecking = false // Release guard
      }
    }, 3000) // Check every 3 seconds
    
  } catch (error: any) {
    logger.error(`[EXTRACTION-PARENT] Failed: ${jobId} ${error.message}`, { stack: error.stack })
    await updateJobStatus(jobId, "failed", undefined, WORKER_ID, "project-data-extraction")
    await pool.query(
      `UPDATE jobs SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [error.message, jobId]
    )
    throw error
  }
})

/**
 * Child Job: Extract and save a single entity type
 * Register handlers for each entity type explicitly
 */
ENTITY_TYPES.forEach((entityType) => {
  extractionQueue.process(`extract-entity-${entityType}`, 5, async (job) => {
    const { parentJobId, projectId, userId, aiProvider, aiModel, documentIds } = job.data
    
    try {
      logger.info(`[EXTRACTION-CHILD] Extracting ${entityType} for job ${parentJobId}`)
      
      const { projectDataExtractionService } = await import('./projectDataExtractionService')
      
      // Extract this specific entity type
      const entities = await projectDataExtractionService.extractSingleEntityType(
        projectId,
        userId,
        entityType,
        { aiProvider, aiModel, documentIds }
      )
      
      logger.info(`[EXTRACTION-CHILD] Extracted ${entities.length} ${entityType}`)
      
      // Save immediately after extraction (resilient)
      await projectDataExtractionService.saveSingleEntityType(
        projectId,
        userId,
        entityType,
        entities
      )
      
      logger.info(`[EXTRACTION-CHILD] Saved ${entities.length} ${entityType}`)
      
      return { entityType, count: entities.length }
      
    } catch (error: any) {
      logger.error(`[EXTRACTION-CHILD] Failed to extract ${entityType}: ${error.message}`, {
        parentJobId,
        entityType,
        projectId,
        error: error.message,
        stack: error.stack,
        provider: aiProvider,
        model: aiModel
      })
      throw error // Bull will retry automatically (up to 3 attempts)
    }
  })
})

/**
 * Finalize parent job after all child jobs complete
 * @param failedJobs Optional array of failed entity types for partial success scenarios
 */
async function finalizeExtractionJob(jobId: string, projectId: string, failedJobs?: Array<{ entityType: string; error: string }>) {
  try {
    logger.info(`[EXTRACTION-PARENT] Finalizing job ${jobId}`)
    
    await updateJobStatus(jobId, "processing", 95, WORKER_ID, "project-data-extraction")
    
    // Query actual counts from database (child jobs already saved)
    // Includes all entity types including PMBOK 8 performance domain entities
    const countQueries = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM stakeholders WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM requirements WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM risks WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM milestones WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM constraints WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM success_criteria WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM best_practices WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM phases WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM resources WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM technologies WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM quality_standards WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM deliverables WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM scope_items WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM activities WHERE project_id = $1`, [projectId]),
      // PMBOK 8 Performance Domain entities
      pool.query(`SELECT COUNT(*) as count FROM team_agreements WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM development_approaches WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM project_iterations WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM work_items WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM capacity_plans WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM performance_measurements WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM earned_value_metrics WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM opportunities WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM risk_responses WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM performance_actuals WHERE project_id = $1`, [projectId])
    ])
    
    const counts = {
      stakeholders: parseInt(countQueries[0].rows[0].count),
      requirements: parseInt(countQueries[1].rows[0].count),
      risks: parseInt(countQueries[2].rows[0].count),
      milestones: parseInt(countQueries[3].rows[0].count),
      constraints: parseInt(countQueries[4].rows[0].count),
      successCriteria: parseInt(countQueries[5].rows[0].count),
      bestPractices: parseInt(countQueries[6].rows[0].count),
      phases: parseInt(countQueries[7].rows[0].count),
      resources: parseInt(countQueries[8].rows[0].count),
      technologies: parseInt(countQueries[9].rows[0].count),
      qualityStandards: parseInt(countQueries[10].rows[0].count),
      deliverables: parseInt(countQueries[11].rows[0].count),
      scopeItems: parseInt(countQueries[12].rows[0].count),
      activities: parseInt(countQueries[13].rows[0].count),
      // PMBOK 8 Performance Domain entities
      teamAgreements: parseInt(countQueries[14].rows[0].count),
      developmentApproaches: parseInt(countQueries[15].rows[0].count),
      projectIterations: parseInt(countQueries[16].rows[0].count),
      workItems: parseInt(countQueries[17].rows[0].count),
      capacityPlans: parseInt(countQueries[18].rows[0].count),
      performanceMeasurements: parseInt(countQueries[19].rows[0].count),
      earnedValueMetrics: parseInt(countQueries[20].rows[0].count),
      opportunities: parseInt(countQueries[21].rows[0].count),
      riskResponses: parseInt(countQueries[22].rows[0].count),
      performanceActuals: parseInt(countQueries[23].rows[0].count)
    }
    
    const totalEntities = Object.values(counts).reduce((sum, count) => sum + count, 0)
    
    logger.info(`[EXTRACTION-PARENT] Total entities extracted: ${totalEntities}`)
    
    // Get userId from job
    const jobData = await pool.query(`SELECT created_by FROM jobs WHERE id = $1`, [jobId])
    const userId = jobData.rows[0]?.created_by
    
    // Prepare result with optional failed entity info
    const result: any = {
      totalEntities,
      entityCounts: counts,
      success: true
    }
    
    if (failedJobs && failedJobs.length > 0) {
      result.partialSuccess = true
      result.failedEntityTypes = failedJobs.map(f => f.entityType)
      result.failedCount = failedJobs.length
      result.warnings = failedJobs.map(f => `${f.entityType}: ${f.error}`)
      logger.warn(`[EXTRACTION-PARENT] Partial success: ${failedJobs.length} entity types failed`, {
        failedTypes: result.failedEntityTypes
      })
    }
    
    // Update job to completed (status is VARCHAR(20), so we use 'completed' and store warnings in result)
    // Note: Status column is VARCHAR(20), so we can't use 'completed_with_warnings' (25 chars)
    // Instead, we store the partial success info in the result JSON
    await pool.query(
      `UPDATE jobs 
       SET status = 'completed', result = $1, progress = 100, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(result), jobId]
    )
    
    // Emit success notification (or warning if partial success)
    if (userId) {
      const message = failedJobs && failedJobs.length > 0
        ? `Extracted ${totalEntities} entities (${failedJobs.length} entity types failed: ${failedJobs.map(f => f.entityType).join(', ')})`
        : `Successfully extracted ${totalEntities} entities from project documents`
      
      // Emit job completion event (status is always 'completed', warnings are in the event data)
      io.emit("job:completed", {
        jobId,
        userId,
        status: "completed",
        message,
        projectId,
        totalEntities,
        partialSuccess: failedJobs && failedJobs.length > 0,
        warnings: failedJobs && failedJobs.length > 0 ? failedJobs : undefined
      })
    }
    
    // Emit project:entities-extracted event
    io.to(`project:${projectId}`).emit("project:entities-extracted", {
      projectId,
      totalEntities,
      entityCounts: counts
    })
    
    logger.info(`[EXTRACTION-PARENT] Extraction completed: ${jobId}`, { 
      projectId, 
      totalEntities 
    })
    
  } catch (error: any) {
    logger.error(`[EXTRACTION-PARENT] Failed to finalize: ${jobId} ${error.message}`)
    
    // Update job with error
    await pool.query(
      `UPDATE jobs 
       SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message || "Unknown error", jobId]
    )
    throw error
  }
}

// Extraction queue event listeners
extractionQueue.on("completed", (job, result) => {
  logger.info(`[EXTRACTION-JOB] Completed: ${job.id}`, { totalEntities: result.totalEntities })
})

extractionQueue.on("failed", (job, err) => {
  logger.error(`[EXTRACTION-JOB] Failed: ${job.id}`, err)
})

// Job management functions
export async function addJob(type: string, data: any, options?: any): Promise<string> {
  try {
    const jobId = data.jobId
    
    // Extract project info for ALL job types
    let projectId = null
    let projectName = null
    let templateName = null
    
    // Extract projectId from different possible locations based on job type
    if (type === 'process-flow' && data.config?.projectId) {
      projectId = data.config.projectId
    } else if (data.projectId) {
      // ai-generate, baseline-extract, etc.
      projectId = data.projectId
    } else if (data.variables?.project_id) {
      // From variables
      projectId = data.variables.project_id
    } else if (data.project_id) {
      // Alternative naming
      projectId = data.project_id
    }
    
    // Look up project and template names if we have IDs
    if (projectId) {
      try {
        const projectResult = await pool.query(
          'SELECT name FROM projects WHERE id = $1',
          [projectId]
        )
        if (projectResult.rows.length > 0) {
          projectName = projectResult.rows[0].name
        }
      } catch (err) {
        logger.warn('Failed to lookup project name for job:', err)
      }
    }
    
    // Extract template ID and look up name
    const templateId = data.template_id || data.config?.templateId || data.variables?.template_id || null
    if (templateId) {
      try {
        const templateResult = await pool.query(
          'SELECT name FROM templates WHERE id = $1',
          [templateId]
        )
        if (templateResult.rows.length > 0) {
          templateName = templateResult.rows[0].name
        }
      } catch (err) {
        logger.warn('Failed to lookup template name for job:', err)
      }
    }
    
    // Determine queue name based on type
    let queueName: string
    let queue: Bull.Queue
    switch (type) {
      case "ai-generate":
        queueName = "ai-processing"
        queue = aiQueue
        break
      case "document-convert":
        queueName = "document-processing"
        queue = documentQueue
        break
      case "pipeline-processing":
        queueName = "pipeline-processing"
        queue = pipelineQueue
        break
      case "baseline-extract":
        queueName = "baseline-processing"
        queue = baselineQueue
        break
      case "process-flow":
        queueName = "process-flow-processing"
        queue = processFlowQueue
        break
      case "document-regeneration":
        queueName = "document-regeneration"
        queue = regenerationQueue
        break
      case "quality-audit":
        queueName = "quality-audit"
        queue = qualityAuditQueue
        break
      case "extract-project-data":
        queueName = "project-data-extraction"
        queue = extractionQueue
        break
      default:
        throw new Error(`Unknown job type: ${type}`)
    }
    
    // Save job to database with project context and queue info
    await pool.query(
      `
      INSERT INTO jobs (id, type, status, data, created_by, project_id, project_name, template_name, queue_name, queued_at)
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `,
      [jobId, type, JSON.stringify(data), data.userId, projectId, projectName, templateName, queueName]
    )

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

// Generate unique worker ID for this process
const WORKER_ID = `worker-${process.pid}-${Date.now()}`

export async function updateJobStatus(
  jobId: string, 
  status: string, 
  progress?: number, 
  workerId?: string,
  queueName?: string
): Promise<void> {
  try {
    const updateFields = ["status = $2"]
    const params: any[] = [jobId, status]
    let paramCount = 2

    if (progress !== undefined) {
      paramCount++
      updateFields.push(`progress = $${paramCount}`)
      params.push(progress.toString())
    }

    // Add worker ID and process ID when job starts processing
    if (workerId) {
      paramCount++
      updateFields.push(`worker_id = $${paramCount}`)
      params.push(workerId)
      
      // Add worker process ID
      paramCount++
      updateFields.push(`worker_process_id = $${paramCount}`)
      params.push(process.pid)
      
      // Update data JSONB to include worker_id for backward compatibility
      paramCount++
      updateFields.push(`data = jsonb_set(COALESCE(data, '{}'::jsonb), '{worker_id}', to_jsonb($${paramCount}::text))`)
      params.push(workerId)
    }

    // Add queue name
    if (queueName) {
      paramCount++
      updateFields.push(`queue_name = $${paramCount}`)
      params.push(queueName)
    }

    if (status === "processing" && progress === 10) {
      updateFields.push(`started_at = CURRENT_TIMESTAMP`)
      updateFields.push(`processing_started_at = CURRENT_TIMESTAMP`)
    }

    await pool.query(
      `UPDATE jobs SET ${updateFields.join(", ")} WHERE id = $1`,
      params
    )

    // Emit real-time update with enriched data
    const jobResult = await pool.query(`
      SELECT j.*, 
             p.name as project_name, 
             t.name as template_name, 
             u.name as user_name,
             u.email as user_email
      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      LEFT JOIN templates t ON (j.data->>'template_id')::uuid = t.id
      LEFT JOIN users u ON j.created_by = u.id
      WHERE j.id = $1
    `, [jobId])
    
    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0]
      io.emit("job:status", {
        jobId,
        userId: job.created_by,
        status,
        progress,
        workerId,
        queueName,
        projectName: job.project_name,
        templateName: job.template_name,
        userName: job.user_name,
      })
    }
  } catch (error) {
    logger.error(`Failed to update job status: ${jobId}`, error)
  }
}

export async function cancelJob(jobId: string): Promise<boolean> {
  try {
    // Try to remove from ALL queues
    const queues = [
      { queue: aiQueue, name: 'aiQueue' },
      { queue: documentQueue, name: 'documentQueue' },
      { queue: pipelineQueue, name: 'pipelineQueue' },
      { queue: processFlowQueue, name: 'processFlowQueue' },
      { queue: regenerationQueue, name: 'regenerationQueue' },
      { queue: qualityAuditQueue, name: 'qualityAuditQueue' },
      { queue: extractionQueue, name: 'extractionQueue' },
      { queue: baselineQueue, name: 'baselineQueue' }
    ]

    let jobFound = false

    for (const { queue, name } of queues) {
      try {
        const job = await queue.getJob(jobId)
        if (job) {
          // Check if job is currently processing
          const state = await job.getState()
          
          if (state === 'active') {
            // Job is actively running - move to failed instead of removing
            await job.moveToFailed({ message: 'Cancelled by user' }, true)
            logger.info(`Moved active job ${jobId} from ${name} to failed (was processing)`)
          } else {
            // Job is waiting/delayed - safe to remove
            await job.remove()
            logger.info(`Removed job ${jobId} from ${name}`)
          }
          
          jobFound = true
          break // Found it, no need to check other queues
        }
      } catch (queueError: any) {
        // Queue doesn't have this job, continue to next
        logger.debug(`Job ${jobId} not in ${name}`)
      }
    }

    if (!jobFound) {
      logger.warn(`Job ${jobId} not found in any queue`)
    }

    // Update database
    await pool.query(
      `
      UPDATE jobs 
      SET status = 'cancelled', 
          completed_at = CURRENT_TIMESTAMP,
          data = jsonb_set(
            COALESCE(data, '{}'::jsonb),
            '{currentStep}',
            to_jsonb('Cancelled by user'::text)
          )
      WHERE id = $1 AND status IN ('pending', 'processing')
    `,
      [jobId]
    )

    logger.info(`Job cancelled: ${jobId}`)
    
    // Emit WebSocket event to notify UI
    io.emit("job:cancelled", {
      jobId,
      status: "cancelled",
      timestamp: new Date().toISOString()
    })
    
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

// Export queue service object
export const queueService = {
  addJob,
  getJobStatus,
  updateJobStatus,
  cancelJob,
  initializeQueues,
  aiQueue,
  documentQueue,
  pipelineQueue,
  baselineQueue,
  processFlowQueue,
  regenerationQueue,
  qualityAuditQueue,
}
