import Bull from "bull"
import { redisClient } from "../utils/redis"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { aiService } from "./aiService"
import { ContextAwareAIService } from "../modules/context/integration"
import { io } from "../server"
import { v4 as uuidv4 } from "uuid"
import { PMBOK_DOMAINS } from "@/types/pmbok"
import type { PmbokDomain } from "@/types/pmbok"

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
      // Fallback to original aiService with multi-provider fallback
      result = await aiService.generateWithFallback({
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
        estimatedReadingTime: Math.ceil(wordCount / 200), // 200 words per minute
        templateId: template_id || undefined,
        framework: job.data?.framework || undefined
      } as any
      
      // Get source document count for research complexity calculation
      const sourceDocCount = job.data?.documentIds?.length || 0
      
      // Calculate quality metrics (includes compliance metrics)
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
        complianceMetrics: {
          pmbokGuide: qualityMetrics.complianceMetrics.pmbokGuide,
          gdpr: qualityMetrics.complianceMetrics.gdpr,
          hipaa: qualityMetrics.complianceMetrics.hipaa,
          soc2: qualityMetrics.complianceMetrics.soc2,
          industryStandards: qualityMetrics.complianceMetrics.industryStandards,
          bestPractices: qualityMetrics.complianceMetrics.bestPractices,
          templateAdherence: qualityMetrics.complianceMetrics.templateAdherence,
          overallComplianceRating: qualityMetrics.complianceMetrics.overallComplianceRating
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

        // 🚀 Automatic Entity Extraction: Trigger extraction for newly created document
        // This runs asynchronously and doesn't block the AI generation job
        if (projectId && docContent && docContent.trim().length > 0) {
          try {
            logger.info(`[AUTO-EXTRACTION] Triggering extraction for document ${createdDocumentId} in project ${projectId}`)
            
            // Create extraction job record
            const extractionJobId = uuidv4()
            const extractionJobResult = await pool.query(
              `INSERT INTO jobs (
                id, type, status, data, created_by, project_id
              ) VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id`,
              [
                extractionJobId,
                'project-data-extraction',
                'pending',
                JSON.stringify({ 
                  jobId: extractionJobId,
                  projectId, 
                  documentIds: [createdDocumentId], // Extract only from this newly created document
                  autoTriggered: true,
                  sourceDocumentId: createdDocumentId,
                  sourceDocumentName: docName,
                  sourceJobId: jobId // Link back to the AI generation job
                }),
                userId || null,
                projectId
              ]
            )

            // Enqueue extraction job
            await extractionQueue.add('extract-project-data', {
              jobId: extractionJobId,
              projectId,
              userId: userId || null,
              documentIds: [createdDocumentId],
              autoTriggered: true,
              sourceDocumentId: createdDocumentId,
              sourceDocumentName: docName,
              sourceJobId: jobId
            }, {
              jobId: extractionJobId,
              priority: 5 // Lower priority than manual extractions
            })

            logger.info(`✅ [AUTO-EXTRACTION] Extraction job ${extractionJobId} queued for document ${createdDocumentId}`)
          } catch (extractionErr) {
            logger.error(`❌ [AUTO-EXTRACTION] Failed to trigger extraction for document ${createdDocumentId}:`, extractionErr)
            // Don't fail the AI generation job if extraction trigger fails
          }
        } else {
          if (!projectId) {
            logger.info(`[AUTO-EXTRACTION] Skipped: Document ${createdDocumentId} has no project_id`)
          } else if (!docContent || docContent.trim().length === 0) {
            logger.info(`[AUTO-EXTRACTION] Skipped: Document ${createdDocumentId} has no content`)
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
      "quality-audit"
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
// Includes all PMBOK 8 performance domain entities and knowledge area domain entities
const ENTITY_TYPES = [
  // Core entities (existing)
  'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
  'success_criteria', 'best_practices', 'phases', 'resources',
  'technologies', 'quality_standards', 'compliance_security', 'deliverables', 'scope_items', 'activities',
  
  // PMBOK 8 Performance Domain entities
  'team_agreements', 'development_approaches', 'project_iterations', 'work_items',
  'capacity_plans', 'performance_measurements', 'earned_value_metrics', 'opportunities', 'risk_responses',
  'performance_actuals',
  
  // PMBOK 8 Knowledge Area Domain entities (Tier 2)
  // Governance Domain
  'governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance',
  // Scope Domain
  'scope_baselines', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
  // Schedule Domain
  'schedule_baselines', 'schedule_activities', 'critical_path_activities', 'schedule_variances', 'schedule_forecasts',
  // Finance Domain
  'budget_baselines', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs',
  // Resources Domain
  'resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding',
  // Risk Domain
  'risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics',
  // Stakeholders Ops Domain
  'engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health'
] as const

type EntityType = typeof ENTITY_TYPES[number]

const DEFAULT_DOMAIN_ORDER: PmbokDomain[] = [...PMBOK_DOMAINS]

const DOMAIN_ENTITY_MAP: Record<PmbokDomain, EntityType[]> = {
  // =========================================================================
  // TIER 1: Performance Domains (PMBOK 8)
  // =========================================================================
  stakeholders: ['stakeholders', 'success_criteria'],
  team: ['resources', 'team_agreements', 'capacity_plans'],
  development_approach: ['development_approaches', 'phases', 'project_iterations', 'activities'],
  planning: ['milestones', 'requirements', 'constraints', 'scope_items', 'phases', 'activities'],
  project_work: ['work_items', 'performance_actuals', 'capacity_plans'],
  delivery: ['deliverables', 'scope_items', 'best_practices'],
  measurement: ['success_criteria', 'performance_measurements', 'earned_value_metrics'],
  uncertainty: ['risks', 'opportunities', 'risk_responses', 'constraints'],
  
  // =========================================================================
  // TIER 2: Knowledge Area Domains (PMBOK 8 Supplementary)
  // =========================================================================
  governance: ['governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance'],
  scope: ['scope_baselines', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification'],
  schedule: ['schedule_baselines', 'schedule_activities', 'critical_path_activities', 'schedule_variances', 'schedule_forecasts'],
  finance: ['budget_baselines', 'cost_actuals', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs'],
  resources: ['resource_assignments', 'resource_pool', 'capacity_forecasts', 'utilization_records', 'resource_conflicts', 'onboarding_offboarding'],
  risk: ['risk_assessments', 'risk_response_plans', 'risk_triggers', 'risk_reviews', 'contingency_reserves', 'risk_metrics'],
  stakeholders_ops: ['engagement_actions', 'communication_logs', 'satisfaction_surveys', 'stakeholder_issues', 'relationship_health']
}

type DomainCountSummary = {
  // Core entities
  stakeholders: number
  requirements: number
  risks: number
  milestones: number
  constraints: number
  successCriteria: number
  bestPractices: number
  phases: number
  resources: number
  technologies: number
  qualityStandards: number
  complianceSecurity: number
  deliverables: number
  scopeItems: number
  activities: number
  // Performance Domain entities
  teamAgreements: number
  developmentApproaches: number
  projectIterations: number
  workItems: number
  capacityPlans: number
  performanceMeasurements: number
  earnedValueMetrics: number
  opportunities: number
  riskResponses: number
  performanceActuals: number
  // Knowledge Area Domain entities
  governanceDecisions: number
  approvalWorkflows: number
  steeringCommittees: number
  changeControlBoards: number
  policyCompliance: number
  scopeBaselines: number
  wbsNodes: number
  scopeChangeRequests: number
  requirementsTraceability: number
  scopeVerification: number
  scheduleBaselines: number
  scheduleActivities: number
  criticalPathActivities: number
  scheduleVariances: number
  scheduleForecasts: number
  budgetBaselines: number
  costActuals: number
  costEstimates: number
  fundingTranches: number
  financialVariances: number
  procurementCosts: number
  resourceAssignments: number
  resourcePool: number
  capacityForecasts: number
  utilizationRecords: number
  resourceConflicts: number
  onboardingOffboarding: number
  riskAssessments: number
  riskResponsePlans: number
  riskTriggers: number
  riskReviews: number
  contingencyReserves: number
  riskMetrics: number
  engagementActions: number
  communicationLogs: number
  satisfactionSurveys: number
  stakeholderIssues: number
  relationshipHealth: number
}

const ENTITY_COUNT_KEY_MAP: Record<EntityType, keyof DomainCountSummary> = {
  // Core entities
  stakeholders: 'stakeholders',
  requirements: 'requirements',
  risks: 'risks',
  milestones: 'milestones',
  constraints: 'constraints',
  success_criteria: 'successCriteria',
  best_practices: 'bestPractices',
  phases: 'phases',
  resources: 'resources',
  technologies: 'technologies',
  quality_standards: 'qualityStandards',
  compliance_security: 'complianceSecurity',
  deliverables: 'deliverables',
  scope_items: 'scopeItems',
  activities: 'activities',
  // Performance Domain entities
  team_agreements: 'teamAgreements',
  development_approaches: 'developmentApproaches',
  project_iterations: 'projectIterations',
  work_items: 'workItems',
  capacity_plans: 'capacityPlans',
  performance_measurements: 'performanceMeasurements',
  earned_value_metrics: 'earnedValueMetrics',
  opportunities: 'opportunities',
  risk_responses: 'riskResponses',
  performance_actuals: 'performanceActuals',
  // Governance Domain
  governance_decisions: 'governanceDecisions',
  approval_workflows: 'approvalWorkflows',
  steering_committees: 'steeringCommittees',
  change_control_boards: 'changeControlBoards',
  policy_compliance: 'policyCompliance',
  // Scope Domain
  scope_baselines: 'scopeBaselines',
  wbs_nodes: 'wbsNodes',
  scope_change_requests: 'scopeChangeRequests',
  requirements_traceability: 'requirementsTraceability',
  scope_verification: 'scopeVerification',
  // Schedule Domain
  schedule_baselines: 'scheduleBaselines',
  schedule_activities: 'scheduleActivities',
  critical_path_activities: 'criticalPathActivities',
  schedule_variances: 'scheduleVariances',
  schedule_forecasts: 'scheduleForecasts',
  // Finance Domain
  budget_baselines: 'budgetBaselines',
  cost_actuals: 'costActuals',
  cost_estimates: 'costEstimates',
  funding_tranches: 'fundingTranches',
  financial_variances: 'financialVariances',
  procurement_costs: 'procurementCosts',
  // Resources Domain
  resource_assignments: 'resourceAssignments',
  resource_pool: 'resourcePool',
  capacity_forecasts: 'capacityForecasts',
  utilization_records: 'utilizationRecords',
  resource_conflicts: 'resourceConflicts',
  onboarding_offboarding: 'onboardingOffboarding',
  // Risk Domain
  risk_assessments: 'riskAssessments',
  risk_response_plans: 'riskResponsePlans',
  risk_triggers: 'riskTriggers',
  risk_reviews: 'riskReviews',
  contingency_reserves: 'contingencyReserves',
  risk_metrics: 'riskMetrics',
  // Stakeholders Ops Domain
  engagement_actions: 'engagementActions',
  communication_logs: 'communicationLogs',
  satisfaction_surveys: 'satisfactionSurveys',
  stakeholder_issues: 'stakeholderIssues',
  relationship_health: 'relationshipHealth'
}

type DomainRunIdMap = Partial<Record<PmbokDomain, string>>

const resolveEntityTypesForDomains = (domains?: PmbokDomain[]): EntityType[] => {
  const domainList = domains && domains.length ? domains : DEFAULT_DOMAIN_ORDER
  const collected = domainList.flatMap((domain) => DOMAIN_ENTITY_MAP[domain] || [])
  const deduped = Array.from(new Set(collected)) as EntityType[]
  if (deduped.length === 0) {
    logger.warn('[EXTRACTION-PARENT] No domain-specific entity map found, falling back to full set.')
    return [...ENTITY_TYPES]
  }
  return deduped
}

const normalizeDomains = (domainsInput?: unknown): PmbokDomain[] => {
  if (!Array.isArray(domainsInput)) {
    return DEFAULT_DOMAIN_ORDER
  }
  const filtered = domainsInput.filter(
    (domain): domain is PmbokDomain =>
      typeof domain === 'string' && (PMBOK_DOMAINS as readonly string[]).includes(domain as PmbokDomain)
  )
  return filtered.length ? filtered : DEFAULT_DOMAIN_ORDER
}

/**
 * Parent Job: Orchestrate extraction by creating child jobs for each entity type
 */
logger.info('[EXTRACTION-QUEUE] Registering extraction queue processor for "extract-project-data"')
extractionQueue.process("extract-project-data", 1, async (job) => {
  const { jobId, projectId, userId, aiProvider, aiModel, documentIds, domains } = job.data
  const selectedDomains = normalizeDomains(domains)
  const entityTypesForRun = resolveEntityTypesForDomains(selectedDomains)

  try {
    logger.info(`[EXTRACTION-PARENT] 🚀 Starting orchestration: ${jobId}`, { 
      projectId, 
      userId,
      documentIds,
      domains: selectedDomains,
      autoTriggered: job.data.autoTriggered || false,
      sourceDocumentId: job.data.sourceDocumentId
    })
    
    await updateJobStatus(jobId, "processing", 5, WORKER_ID, "project-data-extraction")

    const domainRunIds = await registerDomainRuns({
      jobId,
      projectId,
      userId,
      aiProvider,
      aiModel,
      documentIds,
      domains: selectedDomains
    })

    // ensure job data reflects selected domains for downstream processing
    job.data.domains = selectedDomains
    job.data.domainRunIds = domainRunIds
    
    // Create child jobs for each entity type (resilient, independent extraction)
    const childJobPromises = entityTypesForRun.map((entityType, index) => {
      return extractionQueue.add(`extract-entity-${entityType}`, {
        parentJobId: jobId,
        projectId,
        userId,
        aiProvider,
        aiModel,
        documentIds,
        entityType,
        entityIndex: index,
        totalEntities: entityTypesForRun.length
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
      [
        JSON.stringify({
          childJobIds: childJobs.map(j => j.id),
          domains: selectedDomains,
          domainRunIds
        }),
        jobId
      ]
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
                      const returnValue = job.returnvalue ?? null
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
    await failDomainRuns(job.data.domainRunIds, error.message)
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
    // Includes all entity types including PMBOK 8 Performance and Knowledge Area Domain entities
    // Helper to safely query count (returns 0 if table doesn't exist)
    const safeCount = async (table: string): Promise<number> => {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table} WHERE project_id = $1`, [projectId])
        return parseInt(result.rows[0].count)
      } catch {
        // Table might not exist yet (e.g., for new Knowledge Area tables)
        return 0
      }
    }
    
    // Core entities (indices 0-14)
    const countQueries = await Promise.all([
      safeCount('stakeholders'),
      safeCount('requirements'),
      safeCount('risks'),
      safeCount('milestones'),
      safeCount('constraints'),
      safeCount('success_criteria'),
      safeCount('best_practices'),
      safeCount('phases'),
      safeCount('resources'),
      safeCount('technologies'),
      safeCount('quality_standards'),
      safeCount('compliance_security'),
      safeCount('deliverables'),
      safeCount('scope_items'),
      safeCount('activities'),
      // Performance Domain entities (indices 15-24)
      safeCount('team_agreements'),
      safeCount('development_approaches'),
      safeCount('project_iterations'),
      safeCount('work_items'),
      safeCount('capacity_plans'),
      safeCount('performance_measurements'),
      safeCount('earned_value_metrics'),
      safeCount('opportunities'),
      safeCount('risk_responses'),
      safeCount('performance_actuals'),
      // Knowledge Area Domain entities (indices 25-62)
      // Governance (5)
      safeCount('governance_decisions'),
      safeCount('approval_workflows'),
      safeCount('steering_committees'),
      safeCount('change_control_boards'),
      safeCount('policy_compliance'),
      // Scope (5)
      safeCount('scope_baselines'),
      safeCount('wbs_nodes'),
      safeCount('scope_change_requests'),
      safeCount('requirements_traceability'),
      safeCount('scope_verification'),
      // Schedule (5)
      safeCount('schedule_baselines'),
      safeCount('schedule_activities'),
      safeCount('critical_path_activities'),
      safeCount('schedule_variances'),
      safeCount('schedule_forecasts'),
      // Finance (6)
      safeCount('budget_baselines'),
      safeCount('cost_actuals'),
      safeCount('cost_estimates'),
      safeCount('funding_tranches'),
      safeCount('financial_variances'),
      safeCount('procurement_costs'),
      // Resources (6)
      safeCount('resource_assignments'),
      safeCount('resource_pool'),
      safeCount('capacity_forecasts'),
      safeCount('utilization_records'),
      safeCount('resource_conflicts'),
      safeCount('onboarding_offboarding'),
      // Risk (6)
      safeCount('risk_assessments'),
      safeCount('risk_response_plans'),
      safeCount('risk_triggers'),
      safeCount('risk_reviews'),
      safeCount('contingency_reserves'),
      safeCount('risk_metrics'),
      // Stakeholders Ops (5)
      safeCount('engagement_actions'),
      safeCount('communication_logs'),
      safeCount('satisfaction_surveys'),
      safeCount('stakeholder_issues'),
      safeCount('relationship_health')
    ])
    
    const counts: DomainCountSummary = {
      // Core entities
      stakeholders: countQueries[0],
      requirements: countQueries[1],
      risks: countQueries[2],
      milestones: countQueries[3],
      constraints: countQueries[4],
      successCriteria: countQueries[5],
      bestPractices: countQueries[6],
      phases: countQueries[7],
      resources: countQueries[8],
      technologies: countQueries[9],
      qualityStandards: countQueries[10],
      complianceSecurity: countQueries[11],
      deliverables: countQueries[12],
      scopeItems: countQueries[13],
      activities: countQueries[14],
      // Performance Domain entities
      teamAgreements: countQueries[15],
      developmentApproaches: countQueries[16],
      projectIterations: countQueries[17],
      workItems: countQueries[18],
      capacityPlans: countQueries[19],
      performanceMeasurements: countQueries[20],
      earnedValueMetrics: countQueries[21],
      opportunities: countQueries[22],
      riskResponses: countQueries[23],
      performanceActuals: countQueries[24],
      // Knowledge Area Domain entities
      // Governance
      governanceDecisions: countQueries[25],
      approvalWorkflows: countQueries[26],
      steeringCommittees: countQueries[27],
      changeControlBoards: countQueries[28],
      policyCompliance: countQueries[29],
      // Scope
      scopeBaselines: countQueries[30],
      wbsNodes: countQueries[31],
      scopeChangeRequests: countQueries[32],
      requirementsTraceability: countQueries[33],
      scopeVerification: countQueries[34],
      // Schedule
      scheduleBaselines: countQueries[35],
      scheduleActivities: countQueries[36],
      criticalPathActivities: countQueries[37],
      scheduleVariances: countQueries[38],
      scheduleForecasts: countQueries[39],
      // Finance
      budgetBaselines: countQueries[40],
      costActuals: countQueries[41],
      costEstimates: countQueries[42],
      fundingTranches: countQueries[43],
      financialVariances: countQueries[44],
      procurementCosts: countQueries[45],
      // Resources
      resourceAssignments: countQueries[46],
      resourcePool: countQueries[47],
      capacityForecasts: countQueries[48],
      utilizationRecords: countQueries[49],
      resourceConflicts: countQueries[50],
      onboardingOffboarding: countQueries[51],
      // Risk
      riskAssessments: countQueries[52],
      riskResponsePlans: countQueries[53],
      riskTriggers: countQueries[54],
      riskReviews: countQueries[55],
      contingencyReserves: countQueries[56],
      riskMetrics: countQueries[57],
      // Stakeholders Ops
      engagementActions: countQueries[58],
      communicationLogs: countQueries[59],
      satisfactionSurveys: countQueries[60],
      stakeholderIssues: countQueries[61],
      relationshipHealth: countQueries[62]
    }
    
    const entityCountLookup = Object.entries(ENTITY_COUNT_KEY_MAP).reduce(
      (acc, [entityType, key]) => {
        acc[entityType as EntityType] = counts[key]
        return acc
      },
      {} as Record<EntityType, number>
    )

    const jobData = await pool.query(`SELECT created_by, data FROM jobs WHERE id = $1`, [jobId])
    const jobRow = jobData.rows[0] || {}
    const jobDataJson = (jobRow.data as Record<string, any>) || {}
    const selectedDomains = normalizeDomains(jobDataJson.domains)
    const domainRunIds: DomainRunIdMap = jobDataJson.domainRunIds || {}

    const domainCounts = selectedDomains.reduce((acc, domain) => {
      const keys = DOMAIN_ENTITY_MAP[domain] || []
      acc[domain] = keys.reduce((sum, entityKey) => sum + (entityCountLookup[entityKey] || 0), 0)
      return acc
    }, {} as Record<PmbokDomain, number>)

    const failedEntityTypes = failedJobs?.map(f => f.entityType) || []

    await completeDomainRuns({
      domainRunIds,
      domainCounts,
      failedEntityTypes
    })

    const totalEntities = Object.values(counts).reduce((sum, count) => sum + count, 0)
    
    logger.info(`[EXTRACTION-PARENT] Total entities extracted: ${totalEntities}`)
    
    const userId = jobRow?.created_by
    
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

async function registerDomainRuns(params: {
  jobId: string
  projectId: string
  userId?: string
  aiProvider?: string
  aiModel?: string
  documentIds?: string[]
  domains: PmbokDomain[]
}): Promise<DomainRunIdMap> {
  const {
    jobId,
    projectId,
    userId,
    aiProvider,
    aiModel,
    documentIds,
    domains
  } = params

  const domainRunIds: DomainRunIdMap = {}
  const docIds = documentIds && documentIds.length ? documentIds : null

  for (const domain of domains) {
    const entityTypes = DOMAIN_ENTITY_MAP[domain] || []
    const result = await pool.query(
      `INSERT INTO domain_extraction_runs (
        project_id,
        domain,
        job_id,
        user_id,
        ai_provider,
        ai_model,
        document_ids,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        projectId,
        domain,
        jobId,
        userId || null,
        aiProvider || null,
        aiModel || null,
        docIds,
        JSON.stringify({ entityTypes })
      ]
    )
    domainRunIds[domain] = result.rows[0].id
  }

  return domainRunIds
}

async function completeDomainRuns(params: {
  domainRunIds: DomainRunIdMap
  domainCounts: Record<PmbokDomain, number>
  failedEntityTypes: string[]
}): Promise<void> {
  const { domainRunIds, domainCounts, failedEntityTypes } = params
  if (!domainRunIds) return

  const failedSet = new Set(failedEntityTypes)
  const updates = Object.entries(domainRunIds).map(async ([domainKey, runId]) => {
    if (!runId) return
    const domain = domainKey as PmbokDomain
    const entityTypes = DOMAIN_ENTITY_MAP[domain] || []
    const failedForDomain = entityTypes.filter((entity) => failedSet.has(entity))
    const hasFailures = failedForDomain.length > 0
    const totalEntities = domainCounts[domain] ?? 0
    const totalEntityTypes = entityTypes.length
    const successRate =
      totalEntityTypes === 0 ? 100 : ((totalEntityTypes - failedForDomain.length) / totalEntityTypes) * 100
    const status = hasFailures ? (totalEntities > 0 ? 'partial' : 'failed') : 'completed'

    await pool.query(
      `UPDATE domain_extraction_runs
         SET status = $1,
             completed_at = CURRENT_TIMESTAMP,
             total_entities = $2,
             success_rate = $3,
             metadata = metadata || $4
       WHERE id = $5`,
      [
        status,
        totalEntities,
        successRate,
        JSON.stringify({ failedEntityTypes: failedForDomain }),
        runId
      ]
    )
  })

  await Promise.all(updates)
}

async function failDomainRuns(domainRunIds?: DomainRunIdMap, reason?: string): Promise<void> {
  if (!domainRunIds) return
  const entries = Object.values(domainRunIds).filter((id): id is string => Boolean(id))
  if (!entries.length) return
  await Promise.all(
    entries.map((runId) =>
      pool.query(
        `UPDATE domain_extraction_runs
           SET status = 'failed',
               completed_at = CURRENT_TIMESTAMP,
               metadata = metadata || $1
         WHERE id = $2`,
        [JSON.stringify({ error: reason || 'Extraction job failed' }), runId]
      )
    )
  )
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
  extractionQueue, // Add extraction queue to exports
}
