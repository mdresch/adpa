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

// Job processors
aiQueue.process("ai-generate", async (job) => {
  const { jobId, userId, prompt, provider, model, temperature, max_tokens, template_id, variables } = job.data

  try {
    // Update job status to processing and assign worker
    await updateJobStatus(jobId, "processing", 10, WORKER_ID)

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
    await updateJobStatus(jobId, "processing", 20, WORKER_ID)

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
    await updateJobStatus(jobId, "processing", 10, WORKER_ID)
    
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
    await updateJobStatus(jobId, "processing", 5, WORKER_ID)
    
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

// Job management functions
export async function addJob(type: string, data: any, options?: any): Promise<string> {
  try {
    const jobId = data.jobId
    
    // Extract project info for process-flow jobs
    let projectId = null
    let projectName = null
    let templateName = null
    
    if (type === 'process-flow' && data.config?.projectId) {
      projectId = data.config.projectId
      
      // Look up project name from database
      try {
        const projectResult = await pool.query(
          'SELECT name FROM projects WHERE id = $1',
          [projectId]
        )
        if (projectResult.rows.length > 0) {
          projectName = projectResult.rows[0].name
        }
        
        // Look up template name if templateId is provided
        if (data.config?.templateId) {
          const templateResult = await pool.query(
            'SELECT name FROM templates WHERE id = $1',
            [data.config.templateId]
          )
          if (templateResult.rows.length > 0) {
            templateName = templateResult.rows[0].name
          }
        }
      } catch (err) {
        logger.warn('Failed to lookup project/template name for job:', err)
      }
    }
    
    // Save job to database with project context
    await pool.query(
      `
      INSERT INTO jobs (id, type, status, data, created_by, project_id, project_name, template_name)
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)
    `,
      [jobId, type, JSON.stringify(data), data.userId, projectId, projectName, templateName]
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
      case "process-flow":
        queue = processFlowQueue
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

// Generate unique worker ID for this process
const WORKER_ID = `worker-${process.pid}-${Date.now()}`

export async function updateJobStatus(jobId: string, status: string, progress?: number, workerId?: string): Promise<void> {
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
      updateFields.push(`started_at = CURRENT_TIMESTAMP`)
      
      // Update data JSONB to include worker_id
      if (workerId) {
        paramCount++
        updateFields.push(`data = jsonb_set(COALESCE(data, '{}'::jsonb), '{worker_id}', to_jsonb($${paramCount}::text))`)
        params.push(workerId)
      }
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
    // Try to remove from ALL queues (including process-flow queue)
    const aiJob = await aiQueue.getJob(jobId)
    if (aiJob) {
      await aiJob.remove()
      logger.info(`Removed job ${jobId} from aiQueue`)
    }

    const docJob = await documentQueue.getJob(jobId)
    if (docJob) {
      await docJob.remove()
      logger.info(`Removed job ${jobId} from documentQueue`)
    }

    const pipelineJob = await pipelineQueue.getJob(jobId)
    if (pipelineJob) {
      await pipelineJob.remove()
      logger.info(`Removed job ${jobId} from pipelineQueue`)
    }

    const processFlowJob = await processFlowQueue.getJob(jobId)
    if (processFlowJob) {
      await processFlowJob.remove()
      logger.info(`Removed job ${jobId} from processFlowQueue`)
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
