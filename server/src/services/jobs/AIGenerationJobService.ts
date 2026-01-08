/**
 * AI Generation Job Service
 * Handles processing of AI generation jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 * 
 * Phase 5: Updated to support dependency injection while maintaining
 * backward compatibility with static methods.
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { aiService } from '../aiService'
import { ContextAwareAIService } from '../../modules/context/integration'
import { io } from '../../server'
import { v4 as uuidv4 } from 'uuid'
import type { IQueueJob } from './queue/IQueue'
// Phase 3: Use centralized types
import type { AIGenerationJobData, JobStatus, QueueName } from './types'
// Phase 5: Dependency injection
import type { QueueServiceDependencies } from './queue/QueueDependencies'

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: JobStatus, progress: number, workerId?: string, queueName?: QueueName | string, errorMessage?: string) => Promise<void>
  dependencies?: QueueServiceDependencies // Phase 5: Optional dependencies for DI
}

/**
 * Service class for processing AI generation jobs
 * Phase 5: Supports both static methods (backward compatibility) and instance methods (DI)
 */
export class AIGenerationJobService {
  // Phase 5: Instance properties for dependency injection
  private database: QueueServiceDependencies['database']
  private websocket: QueueServiceDependencies['websocket']
  private aiService: QueueServiceDependencies['aiService']
  private contextAwareAIService: QueueServiceDependencies['contextAwareAIService']
  private logger: QueueServiceDependencies['logger']

  /**
   * Phase 5: Constructor for dependency injection
   */
  constructor(dependencies?: QueueServiceDependencies) {
    if (dependencies) {
      this.database = dependencies.database
      this.websocket = dependencies.websocket
      this.aiService = dependencies.aiService
      this.contextAwareAIService = dependencies.contextAwareAIService
      this.logger = dependencies.logger
    } else {
      // Fallback to global imports for backward compatibility
      this.database = { query: pool.query.bind(pool), connect: pool.connect.bind(pool), end: pool.end.bind(pool) } as any
      this.websocket = io as any
      this.aiService = aiService as any
      this.contextAwareAIService = ContextAwareAIService as any
      this.logger = logger as any
    }
  }

  /**
   * Process an AI generation job (instance method with DI)
   */
  async processJob(job: IQueueJob, options: ProcessJobOptions): Promise<any> {
    return AIGenerationJobService.processJob(job, options, {
      database: this.database,
      websocket: this.websocket,
      aiService: this.aiService,
      contextAwareAIService: this.contextAwareAIService,
      logger: this.logger,
    } as QueueServiceDependencies)
  }

  /**
   * Process an AI generation job (static method for backward compatibility)
   * Phase 5: Now accepts optional dependencies parameter
   */
  static async processJob(job: IQueueJob, options: ProcessJobOptions, deps?: QueueServiceDependencies): Promise<any> {
    // Phase 5: Use injected dependencies or fall back to global imports
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const log = deps?.logger || logger
    const jobData = job.data as AIGenerationJobData
    const { jobId, provider } = jobData
    const { workerId, updateJobStatus } = options

    // Log job details for debugging
    log.info(`[AIGenerationJobService] Processing job:`, {
      bullJobId: job.id,
      jobIdFromData: jobId,
      workerId,
    })

    // Ensure we have a valid jobId
    const actualJobId = jobId || job.id.toString()

    try {
      // Update job status to processing and assign worker
      await updateJobStatus(actualJobId, "processing", 10, workerId, "ai-processing")

      // Phase 6: Start incremental progress heartbeat for AI generation (10% -> 45%)
      const aiHeartbeat = AIGenerationJobService.startProgressHeartbeat(
        actualJobId, 10, 45, updateJobStatus, workerId, deps, jobData
      )

      let result;
      try {
        // Generate content using AI service
        result = await AIGenerationJobService.generateContent(jobData, deps)
      } finally {
        clearInterval(aiHeartbeat)
      }

      // Update job status to 50%
      await updateJobStatus(actualJobId, "processing", 50, workerId, "ai-processing")

      // Update usage stats
      if (result.usage) {
        const ai = deps?.aiService || aiService
        await ai.updateUsageStats(provider || 'openai', result.usage)
      }

      // Phase 6: Start incremental progress heartbeat for document processing (50% -> 85%)
      const docHeartbeat = AIGenerationJobService.startProgressHeartbeat(
        actualJobId, 50, 85, updateJobStatus, workerId, deps, jobData
      )

      let createdDocumentId;
      try {
        // Create document from generated content
        createdDocumentId = await AIGenerationJobService.createDocument(jobData, result, deps)
      } finally {
        clearInterval(docHeartbeat)
      }

      // Update job status to 90%
      await updateJobStatus(actualJobId, "processing", 90, workerId, "ai-processing")

      // Validate document against baseline
      if (createdDocumentId) {
        await AIGenerationJobService.validateAgainstBaseline(jobData, createdDocumentId, result, deps)
      }

      // Save result to database
      const finalResult = {
        ai: result,
        documentId: createdDocumentId,
      }

      await db.query(
        `
        UPDATE jobs 
        SET status = 'completed', result = $1, progress = 100, 
            worker_id = COALESCE(worker_id, $3),
            started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
            processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
        [JSON.stringify(finalResult), actualJobId, workerId]
      )

      // Create audit log for AI analytics
      await AIGenerationJobService.createAuditLog(jobData, result, createdDocumentId, deps)

      // Emit real-time updates
      await AIGenerationJobService.emitCompletionEvents(jobData, finalResult, createdDocumentId, deps)

      log.info(`AI generation job completed: ${actualJobId}`)

      return finalResult
    } catch (error: any) {
      await AIGenerationJobService.handleError(actualJobId, jobData, error, options, deps)
      throw error
    }
  }

  /**
   * Generate content using AI service
   */
  private static async generateContent(jobData: AIGenerationJobData, deps?: QueueServiceDependencies): Promise<any> {
    const { prompt, provider, model, temperature, max_tokens, template_id, variables, userId, projectId, documentIds, use_context, include_integrations, custom_context } = jobData

    const useContext = !!use_context || !!projectId || !!documentIds || !!template_id
    const contextAI = deps?.contextAwareAIService || ContextAwareAIService
    const ai = deps?.aiService || aiService

    const fallbackProvider = jobData.fallback_provider
    const fallbackProviders = fallbackProvider ? [fallbackProvider] : undefined

    if (useContext) {
      return await contextAI.generateWithContext({
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
        user_id: userId,
        project_id: projectId,
        document_ids: documentIds,
        include_integrations,
        custom_context,
        fallback_providers: fallbackProviders
      } as any)
    } else {
      return await ai.generateWithFallback({
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
      }, fallbackProviders)
    }
  }

  /**
   * Create a document from generated content
   */
  private static async createDocument(jobData: AIGenerationJobData, result: any, deps?: QueueServiceDependencies): Promise<string | null> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const log = deps?.logger || logger
    const { jobId, userId, template_id, variables, projectId, documentIds, name, framework } = jobData

    let createdDocumentId: string | null = null

    try {
      const docNameProvided = name && name.trim() ? name.trim() : null
      const templateName = (variables?.template_name as string) || jobData.template_name || null
      const docName = docNameProvided || templateName || (template_id ? `Generated Document - ${template_id}` : `AI Generated Document ${new Date().toISOString()}`)

      const rawContent = result?.content ? result.content : result
      const docContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)
      const projectIdForDoc = projectId || variables?.project_id || null

      const { wordCount, characterCount, sentenceCount, paragraphCount } = AIGenerationJobService.calculateContentStats(docContent)

      const qualityMetrics = await AIGenerationJobService.calculateQualityMetrics(docContent, {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        templateId: template_id,
        framework,
        sourceDocCount: documentIds?.length || 0
      })

      const { provider, model } = jobData
      const inputTokens = result?.usage?.prompt_tokens || result?.usage?.input_tokens || 0
      const outputTokens = result?.usage?.completion_tokens || result?.usage?.output_tokens || 0
      const totalTokens = result?.usage?.total_tokens || (inputTokens + outputTokens)
      const estimatedCost = AIGenerationJobService.calculateAICost(provider || 'openai', model || 'unknown', inputTokens, outputTokens)

      const jobStartTime = jobData.started_at ? new Date(jobData.started_at) : new Date(jobData.timestamp || Date.now())
      const processingTimeSec = ((new Date().getTime() - jobStartTime.getTime()) / 1000).toFixed(2)

      const generationMetadata = AIGenerationJobService.buildGenerationMetadata({
        result,
        provider: provider || 'openai',
        model: model || 'unknown',
        temperature: jobData.temperature || 0.7,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        processingTimeMs: new Date().getTime() - jobStartTime.getTime(),
        processingTimeSec,
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        qualityMetrics,
        jobId,
        documentIds
      })

      const insertResult = await db.query(
        `
        INSERT INTO documents (project_id, name, content, template_id, status, created_by, updated_by, generation_metadata, word_count, character_count, sentence_count, paragraph_count)
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
        [projectIdForDoc, docName, docContent, template_id || null, 'draft', userId || null, JSON.stringify(generationMetadata), wordCount, characterCount, sentenceCount, paragraphCount]
      )

      if (insertResult.rows.length > 0) {
        createdDocumentId = insertResult.rows[0].id
        if (template_id) await AIGenerationJobService.incrementTemplateUsage(template_id, deps)
        if (projectIdForDoc && docContent.trim() && createdDocumentId) {
          await AIGenerationJobService.triggerAutoExtraction(
            jobId || 'unknown',
            projectIdForDoc as string,
            (userId || undefined) as string | undefined,
            createdDocumentId,
            docName,
            deps
          )
        }
      }
    } catch (docErr: any) {
      log.error(`Failed to create document for job ${jobId}:`, docErr)
    }

    return createdDocumentId
  }

  private static calculateContentStats(content: string) {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
    const characterCount = content.length
    const sentenceCount = (content.match(/[.!?]+/g) || []).length
    const paragraphCount = (content.match(/\n\n/g) || []).length + 1
    return { wordCount, characterCount, sentenceCount, paragraphCount }
  }

  private static async calculateQualityMetrics(content: string, metadata: any): Promise<any> {
    const { analyzeDocumentQuality } = await import('../../utils/documentMetadata')
    const tempMetadata = {
      ...metadata,
      lineCount: (content.match(/\n/g) || []).length + 1,
      estimatedReadingTime: Math.ceil(metadata.wordCount / 200)
    }
    return analyzeDocumentQuality(content, tempMetadata, metadata.sourceDocCount || 0)
  }

  private static calculateAICost(provider: string, model: string, inputTokens: number, outputTokens: number): string {
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
    const rates = pricing[key] || { input: 1, output: 3 }
    const totalCost = ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output)
    return totalCost < 0.01 ? '$0.00' : `$${totalCost.toFixed(4)}`
  }

  private static buildGenerationMetadata(options: any): any {
    const { result, provider, model, temperature, inputTokens, outputTokens, totalTokens, estimatedCost, processingTimeMs, processingTimeSec, wordCount, characterCount, sentenceCount, paragraphCount, qualityMetrics, jobId, documentIds } = options
    return {
      aiProcessing: {
        provider: result?.provider || provider,
        model: result?.model || model,
        temperature: temperature || 0.7,
        tokens: { input: inputTokens, output: outputTokens, total: totalTokens, cost: estimatedCost },
        processingTime: `${processingTimeSec}s`,
        processingTimeMs
      },
      generation: { generated_at: new Date().toISOString(), job_id: jobId, status: 'completed' },
      contentMetrics: { wordCount, characterCount, sentenceCount, paragraphCount },
      qualityMetrics,
      sourceDocuments: (documentIds || []).map((id: string, idx: number) => ({ id, order: idx + 1 }))
    }
  }

  private static async incrementTemplateUsage(templateId: string, deps?: QueueServiceDependencies): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    try {
      await db.query(`UPDATE templates SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1`, [templateId])
    } catch (err) { }
  }

  private static async triggerAutoExtraction(sourceJobId: string, projectId: string, userId: string | undefined, documentId: string, documentName: string, deps?: QueueServiceDependencies): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const log = deps?.logger || logger
    try {
      const extractionJobId = uuidv4()
      await db.query(`INSERT INTO jobs (id, type, status, data, created_by, project_id) VALUES ($1, $2, $3, $4, $5, $6)`, [extractionJobId, 'project-data-extraction', 'pending', JSON.stringify({ jobId: extractionJobId, projectId, documentIds: [documentId], sourceJobId }), userId || null, projectId])
      const { extractionQueue } = await import('../queueService')
      await extractionQueue.add('extract-project-data', { jobId: extractionJobId, projectId, userId: userId || null, documentIds: [documentId], sourceJobId }, { jobId: extractionJobId, priority: 5 })
    } catch (err) {
      log.error(`Auto-extraction failed`, err)
    }
  }

  private static async validateAgainstBaseline(jobData: AIGenerationJobData, documentId: string, result: any, deps?: QueueServiceDependencies): Promise<void> {
    const ws = deps?.websocket || io
    const projectId = (jobData.projectId || jobData.variables?.project_id) as string
    if (!projectId) return
    try {
      const { baselineService } = await import('../baselineService')
      const docContent = typeof result.content === 'string' ? result.content : JSON.stringify(result.content || result)
      const drifts = await baselineService.validateDocumentAgainstBaseline(projectId, documentId, docContent, jobData.name || 'Document')
      if (drifts.length > 0) {
        ws.to(`project:${projectId}`).emit("baseline:drift", { documentId, driftCount: drifts.length, drifts: drifts.map((d: any) => ({ type: d.detection_type, severity: d.drift_severity, description: d.drift_description })) })
      }
    } catch (err) {
      const log = deps?.logger || logger
      log.error(`Baseline validation failed for project ${projectId}:`, err)
    }
  }

  private static async createAuditLog(jobData: AIGenerationJobData, result: any, documentId: string | null, deps?: QueueServiceDependencies): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    try {
      const providerResult = await db.query('SELECT id FROM ai_providers WHERE name = $1 LIMIT 1', [jobData.provider || 'openai'])
      if (providerResult.rows.length > 0) {
        await db.query(`INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values) VALUES ($1, $2, $3, $4, $5)`, [jobData.userId || null, 'ai_generate', 'ai_provider', providerResult.rows[0].id, JSON.stringify({ provider: jobData.provider, model: jobData.model, template_id: jobData.template_id, document_id: documentId, job_id: jobData.jobId, usage: result?.usage || {} })])
      }
    } catch (err) { }
  }

  private static async emitCompletionEvents(jobData: AIGenerationJobData, finalResult: any, createdDocumentId: string | null, deps?: QueueServiceDependencies): Promise<void> {
    const ws = deps?.websocket || io
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const projectId = jobData.projectId || jobData.variables?.project_id || null
    ws.emit("job:completed", { jobId: jobData.jobId, userId: jobData.userId, status: "completed", result: finalResult, documentId: createdDocumentId, projectId })
    if (createdDocumentId && projectId) {
      const docResult = await db.query('SELECT * FROM documents WHERE id = $1', [createdDocumentId])
      ws.to(`project:${projectId}`).emit("document:created", { document: docResult.rows[0] || null, documentId: createdDocumentId, projectId })
    }
  }

  private static async handleError(jobId: string, jobData: AIGenerationJobData, error: any, options: ProcessJobOptions, deps?: QueueServiceDependencies): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const ws = deps?.websocket || io
    const log = deps?.logger || logger
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    log.error(`AI generation job failed: ${jobId}`, error)
    await db.query(`UPDATE jobs SET status = 'failed', error_message = $1, failed_at = CURRENT_TIMESTAMP WHERE id = $2`, [errorMessage, jobId])
    ws.emit("job:failed", { jobId, userId: jobData.userId, status: "failed", error: errorMessage, projectId: jobData.projectId || jobData.variables?.project_id })
  }

  /**
   * Start a progress heartbeat to give the user visual feedback for long-running tasks
   * Phase 6: Continuous progress updates
   */
  private static startProgressHeartbeat(
    jobId: string,
    startProgress: number,
    maxProgress: number,
    updateJobStatus: ProcessJobOptions['updateJobStatus'],
    workerId: string,
    deps?: QueueServiceDependencies,
    jobData?: AIGenerationJobData
  ): NodeJS.Timeout {
    const ws = deps?.websocket || io
    const log = deps?.logger || logger
    let currentProgress = startProgress

    return setInterval(() => {
      // Small random increments to make it feel natural (1-3%)
      const increment = Math.floor(Math.random() * 2) + 1
      if (currentProgress + increment < maxProgress) {
        currentProgress += increment

        // Update database using promise chaining to avoid top-level await in callbacks
        updateJobStatus(jobId, "processing", currentProgress, workerId, "ai-processing")
          .then(() => {
            log.info(`[HEARTBEAT] Job ${jobId} progress: ${currentProgress}%`)
            if (ws) {
              try {
                ws.emit("job:status", {
                  jobId,
                  userId: jobData?.userId,
                  progress: currentProgress,
                  status: "processing",
                  projectId: jobData?.projectId || jobData?.variables?.project_id,
                  message: "Processing..."
                })
              } catch (e) {
                // ignore websocket emit errors
              }
            }
          })
          .catch(() => {
            // Ignore heartbeat errors - not critical if we miss a step
            log.debug(`[HEARTBEAT] Failed to update progress for job ${jobId}`)
          })
      }
    }, 4000) // Update every 4 seconds
  }
}
