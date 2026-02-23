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
import { io } from '@/socket'
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

      // Phase 6: Start incremental progress heartbeat for AI generation (10% -> 55%)
      // Long documents + GKG context can take 3-5+ minutes; extended range so bar keeps moving
      const aiHeartbeat = AIGenerationJobService.startProgressHeartbeat(
        actualJobId, 10, 55, updateJobStatus, workerId, deps, jobData
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

    // 🔍 DEBUG: Log jobData to see what we received
    log.info('[AI-JOB] createDocument called with jobData:', {
      hasJobId: !!jobId,
      hasUserId: !!userId,
      hasTemplateId: !!template_id,
      hasVariables: !!variables,
      hasProjectId: !!projectId,
      projectIdValue: projectId,
      variablesProjectId: variables?.project_id,
      hasDocumentIds: !!documentIds,
      documentIdsCount: documentIds?.length || 0,
      hasName: !!name,
      hasFramework: !!framework
    })

    let createdDocumentId: string | null = null

    try {
      const docNameProvided = name && name.trim() ? name.trim() : null
      const templateName = (variables?.template_name as string) || jobData.template_name || null
      const docName = docNameProvided || templateName || (template_id ? `Generated Document - ${template_id}` : `AI Generated Document ${new Date().toISOString()}`)

      const rawContent = result?.content ? result.content : result
      const docContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)
      const projectIdForDoc = projectId || variables?.project_id || null

      // 🔍 DEBUG: Log projectId resolution
      log.info('[AI-JOB] Project ID resolution:', {
        projectIdFromJobData: projectId,
        projectIdFromVariables: variables?.project_id,
        resolvedProjectId: projectIdForDoc,
        willAddProjectContext: !!projectIdForDoc
      })

      const { wordCount, characterCount, sentenceCount, paragraphCount } = AIGenerationJobService.calculateContentStats(docContent)

      // 🆕 Build source documents array with project context and document details
      let sourceDocuments: any[] = []
      let contextStats: any = null

      // Always add project context if projectId exists
      if (projectIdForDoc) {
        try {
          const projectResult = await db.query(
            `SELECT name, description, framework FROM projects WHERE id = $1`,
            [projectIdForDoc]
          )

          if (projectResult.rows.length > 0) {
            const project = projectResult.rows[0]
            const projectContextEntry = {
              id: `project_context:${projectIdForDoc}`,
              title: `Project Context: ${project.name || 'Project'}`,
              name: `Project Context: ${project.name || 'Project'}`,
              type: 'Project Context',
              template_id: null,
              status: 'active',
              lifecycle_phase: 0,
              phase_name: 'Foundation',
              priority_rank: 0,
              character_count: (project.description?.length || 0) + (project.name?.length || 0) + (project.framework?.length || 0),
              word_count: Math.round(((project.description?.length || 0) + (project.name?.length || 0) + (project.framework?.length || 0)) / 5),
              reading_time_minutes: 0,
              is_project_context: true
            }
            sourceDocuments.push(projectContextEntry)
            log.info('[AI-JOB] Project context added to source documents', {
              projectId: projectIdForDoc,
              projectName: project.name || 'Unknown',
              sourceDocumentsCount: sourceDocuments.length
            })
          } else {
            // Project not found, but still add placeholder
            log.warn('[AI-JOB] Project not found, adding project context placeholder', { projectId: projectIdForDoc })
            const projectContextEntry = {
              id: `project_context:${projectIdForDoc}`,
              title: `Project Context: Project ${projectIdForDoc.substring(0, 8)}...`,
              name: `Project Context: Project ${projectIdForDoc.substring(0, 8)}...`,
              type: 'Project Context',
              template_id: null,
              status: 'active',
              lifecycle_phase: 0,
              phase_name: 'Foundation',
              priority_rank: 0,
              character_count: 0,
              word_count: 0,
              reading_time_minutes: 0,
              is_project_context: true
            }
            sourceDocuments.push(projectContextEntry)
          }
        } catch (error) {
          log.error('[AI-JOB] Failed to fetch project context, adding placeholder', {
            projectId: projectIdForDoc,
            error: error instanceof Error ? error.message : String(error)
          })
          const projectContextEntry = {
            id: `project_context:${projectIdForDoc}`,
            title: `Project Context: Project ${projectIdForDoc.substring(0, 8)}...`,
            name: `Project Context: Project ${projectIdForDoc.substring(0, 8)}...`,
            type: 'Project Context',
            template_id: null,
            status: 'active',
            lifecycle_phase: 0,
            phase_name: 'Foundation',
            priority_rank: 0,
            character_count: 0,
            word_count: 0,
            reading_time_minutes: 0,
            is_project_context: true
          }
          sourceDocuments.push(projectContextEntry)
        }

        // Fetch document details for documentIds if provided
        if (documentIds && documentIds.length > 0) {
          try {
            const placeholders = documentIds.map((_, idx) => `$${idx + 1}`).join(',')
            const docsResult = await db.query(
              `SELECT d.id, d.name, d.content, d.template_id, d.status, d.word_count, d.character_count,
                      t.name as template_name
               FROM documents d
               LEFT JOIN templates t ON d.template_id = t.id
               WHERE d.id IN (${placeholders})`,
              documentIds
            )

            const otherDocuments = docsResult.rows.map((doc: any, index: number) => {
              const charCount = doc.character_count || (typeof doc.content === 'string' ? doc.content.length : 0)
              const wordCount = doc.word_count || Math.round(charCount / 5)
              const readingTimeMinutes = Math.round((wordCount / 250) * 10) / 10

              return {
                id: doc.id,
                title: doc.name,
                name: doc.name,
                type: doc.template_name || 'Document',
                template_id: doc.template_id,
                status: doc.status,
                lifecycle_phase: 99,
                phase_name: 'Other',
                priority_rank: index + 1,
                character_count: charCount,
                word_count: wordCount,
                reading_time_minutes: readingTimeMinutes
              }
            })

            sourceDocuments.push(...otherDocuments)
            log.info('[AI-JOB] Added document details to source documents', {
              documentIdsCount: documentIds.length,
              documentsFound: otherDocuments.length,
              totalSourceDocuments: sourceDocuments.length
            })
          } catch (error) {
            log.error('[AI-JOB] Failed to fetch document details for source documents', {
              documentIds,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }

        // Build context stats
        contextStats = {
          project_context_used: true,
          documents_used: sourceDocuments.filter((doc: any) => !doc.is_project_context).length,
          total_documents: sourceDocuments.length
        }
      }

      const qualityMetrics = await AIGenerationJobService.calculateQualityMetrics(docContent, {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        templateId: template_id,
        framework,
        sourceDocCount: sourceDocuments.length
      })

      const { provider, model } = jobData
      const inputTokens = result?.usage?.prompt_tokens || result?.usage?.input_tokens || 0
      const outputTokens = result?.usage?.completion_tokens || result?.usage?.output_tokens || 0
      const totalTokens = result?.usage?.total_tokens || (inputTokens + outputTokens)
      const estimatedCost = AIGenerationJobService.calculateAICost(provider || 'openai', model || 'unknown', inputTokens, outputTokens)

      const jobStartTime = jobData.started_at ? new Date(jobData.started_at) : new Date(jobData.timestamp || Date.now())
      const processingTimeSec = ((new Date().getTime() - jobStartTime.getTime()) / 1000).toFixed(2)

      // 🔍 CRITICAL: Verify project context was added before saving
      // If we have a projectId but no source documents, add project context as emergency fallback
      if (projectIdForDoc && sourceDocuments.length === 0) {
        log.error('[AI-JOB] ⚠️ CRITICAL: sourceDocuments is empty! Adding project context as fallback', { projectId: projectIdForDoc })
        const emergencyProjectContext = {
          id: `project_context:${projectIdForDoc}`,
          title: `Project Context: Project ${projectIdForDoc.substring(0, 8)}...`,
          name: `Project Context: Project ${projectIdForDoc.substring(0, 8)}...`,
          type: 'Project Context',
          template_id: null,
          status: 'active',
          lifecycle_phase: 0,
          phase_name: 'Foundation',
          priority_rank: 0,
          character_count: 0,
          word_count: 0,
          reading_time_minutes: 0,
          is_project_context: true
        }
        sourceDocuments.push(emergencyProjectContext)
        // Also ensure contextStats is set
        if (!contextStats) {
          contextStats = {
            project_context_used: true,
            documents_used: 0,
            total_documents: 1
          }
        }
      }

      // 🔍 FINAL SAFETY CHECK: If we still don't have sourceDocuments but have projectIdForDoc, 
      // try one more time to get project context (this should never happen, but just in case)
      if (projectIdForDoc && sourceDocuments.length === 0) {
        log.error('[AI-JOB] ⚠️⚠️⚠️ DOUBLE-CHECK FAILED: sourceDocuments still empty after fallback!', {
          projectId: projectIdForDoc,
          hasProjectId: !!projectId,
          hasVariablesProjectId: !!variables?.project_id
        })
        // Last resort: create minimal project context entry
        const lastResortContext = {
          id: `project_context:${projectIdForDoc}`,
          title: `Project Context`,
          name: `Project Context`,
          type: 'Project Context',
          template_id: null,
          status: 'active',
          lifecycle_phase: 0,
          phase_name: 'Foundation',
          priority_rank: 0,
          character_count: 0,
          word_count: 0,
          reading_time_minutes: 0,
          is_project_context: true
        }
        sourceDocuments.push(lastResortContext)
        contextStats = {
          project_context_used: true,
          documents_used: 0,
          total_documents: 1
        }
      }

      // 🔍 DEBUG: Log what we're saving
      log.info('[AI-JOB] Generation metadata being saved:', {
        hasSourceDocuments: sourceDocuments.length > 0,
        sourceDocumentsCount: sourceDocuments.length,
        sourceDocumentsIds: sourceDocuments.map((doc: any) => doc.id),
        hasProjectContext: sourceDocuments.some((doc: any) => doc.is_project_context),
        hasContextStats: !!contextStats,
        contextStatsProjectContextUsed: contextStats?.project_context_used,
        firstSourceDocId: sourceDocuments[0]?.id,
        firstSourceDocType: sourceDocuments[0]?.type
      })

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
        sourceDocuments, // Pass full source documents array
        contextStats // Pass context stats
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
    const { result, provider, model, temperature, inputTokens, outputTokens, totalTokens, estimatedCost, processingTimeMs, processingTimeSec, wordCount, characterCount, sentenceCount, paragraphCount, qualityMetrics, jobId, sourceDocuments, contextStats } = options

    // Use provided sourceDocuments array if available, otherwise fall back to empty array
    const finalSourceDocuments = sourceDocuments || []

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
      source_documents: finalSourceDocuments, // Use full source documents array with project context
      context_stats: contextStats || null // Include context stats if available
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
      // 1% every 4s so bar keeps moving for ~3 min during long AI calls (e.g. large docs + GKG context)
      const increment = 1
      if (currentProgress + increment <= maxProgress) {
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
