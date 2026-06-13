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

      // Emit immediate update for UI visibility (QueueService doesn't emit)
      const ws = deps?.websocket || io
      if (ws) {
        ws.emit("job:status", {
          jobId: actualJobId,
          userId: jobData.userId,
          status: "processing",
          progress: 10,
          startTime: new Date().toISOString(),
          projectId: jobData.projectId || jobData.variables?.project_id,
          message: "Starting processing..."
        })
      }

      // Phase 6: Start incremental progress heartbeat for AI generation (10% -> 55%)
      // Long documents + GKG context can take 3-5+ minutes; extended range so bar keeps moving
      const aiHeartbeat = AIGenerationJobService.startProgressHeartbeat(
        actualJobId, 10, 55, updateJobStatus, workerId, deps, jobData
      )

      let result;
      try {
        // Generate content using AI service
        result = await AIGenerationJobService.generateContent(jobData, deps, actualJobId)
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
        
        // Phase 6: Multi-Level Summary Register
        if (createdDocumentId && result.content) {
          const { DocumentSummarizationService } = await Promise.resolve().then(() => require('../documentSummarizationService'))
          
          const summaries = result.summaries
          const hasSummaries = summaries && (Array.isArray(summaries) ? summaries.length > 0 : Object.keys(summaries).length > 0)

          if (hasSummaries) {
            // Normalize snapshots map to summaries array for relational storage
            const summariesArray = Array.isArray(summaries) 
              ? summaries 
              : Object.entries(summaries).map(([k, v]: [string, any]) => ({
                  level: parseInt(k.replace('p', ''), 10),
                  content: v.summary || v
                }))

            logger.info(`[SUMMARIZER] Saving ${summariesArray.length} in-band summaries for ${createdDocumentId}`)
            setImmediate(async () => {
              try {
                await DocumentSummarizationService.saveSummaries(
                  createdDocumentId!,
                  result.content,
                  summariesArray,
                  jobData.provider || 'default',
                  jobData.model || 'default'
                )
              } catch (saveError) {
                logger.error(`[SUMMARIZER] Failed to save in-band summaries for ${createdDocumentId}`, saveError)
              }
            })
          } else {
            // Fallback: Generate summaries in background if not provided in-band
            logger.info(`[SUMMARIZER] No in-band summaries found, triggering background generation for ${createdDocumentId}`)
            setImmediate(async () => {
              try {
                await DocumentSummarizationService.generateMultiLevelSummaries(
                  createdDocumentId!, 
                  result.content, 
                  jobData.userId || 'system'
                )
              } catch (sumError) {
                logger.error(`[SUMMARIZER] Background summarization failed for ${createdDocumentId}`, sumError)
              }
            })
          }
        }
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
   * Generate content using AI service.
   *
   * When a `template_id` is present the job is routed through the new
   * **agentic** DocumentGenerationService (section-planning + parallel
   * drafting) so that background jobs benefit from the same high-quality
   * multi-step pipeline as the synchronous route.
   *
   * For all other jobs (no template, or plain prompt jobs) we fall back to
   * the existing ContextAwareAI / aiService path so nothing else breaks.
   */
  private static async generateContent(jobData: AIGenerationJobData, deps?: QueueServiceDependencies, actualJobId?: string): Promise<any> {
    const { prompt, provider, model, temperature, max_tokens, template_id, variables, userId, projectId, documentIds, use_context, include_integrations, custom_context } = jobData

    // ── AGENTIC PATH ──────────────────────────────────────────────────────────
    // When a template is specified, use the new DocumentGenerationService which
    // runs the 3-phase agentic pipeline (plan → draft sections → assemble).
    if (template_id && projectId && prompt && userId) {
      const log = deps?.logger || logger
      log.info('[AIGenerationJobService] Routing to agentic DocumentGenerationService', {
        template_id,
        projectId,
        provider,
      })

      // Lazy import to avoid circular dependency at module load time
      const { documentGenerationService } = await Promise.resolve().then(() => require('../documentGenerationService'))

      const docId = uuidv4()

      const agenticResult = await documentGenerationService.generateDocument({
        jobId: jobData.jobId || actualJobId,
        projectId: projectId as string,
        templateId: template_id,
        userPrompt: prompt,
        provider: provider || 'mistral',
        model: model || undefined,
        temperature: temperature || 0.7,
        userId: userId as string,
        documentId: docId,
        name: jobData.name || undefined,
        sourceDocumentIds: documentIds?.length ? documentIds : undefined,
      })

      // Mission Draco: Integrity Check Log
      log.info(`[MISSION-DRACO] Integrity Check: Document ${docId} assembled. CUR Score: ${agenticResult.metadata.contextMatchingScore}%. Status: ${agenticResult.compliance_status}.`)

      // Normalise to the shape that createDocument() expects
      // (content string + optional usage object)
      return {
        content: agenticResult.content,
        documentId: docId,
        provider: agenticResult.metadata.provider,
        model: agenticResult.metadata.model,
        usage: {
          prompt_tokens: 0,
          completion_tokens: agenticResult.metadata.tokens_used || 0,
          total_tokens: agenticResult.metadata.tokens_used || 0,
        },
        // Pass through GKG snapshot so it can be stored in generation_metadata
        gkg_context_snapshot: agenticResult.gkg_context_snapshot,
        summaries: agenticResult.summaries,
        contextMatchingScore: agenticResult.metadata.contextMatchingScore,
        occurrenceConsistencyScore: agenticResult.metadata.occurrenceConsistencyScore,
        contextConsistencyStats: agenticResult.metadata.contextConsistencyStats,
        entityExtractionQuality: agenticResult.metadata.entityExtractionQuality,
        appliedContextEntities: agenticResult.metadata.appliedContextEntities,
        audit_log: agenticResult.audit_log,
        compliance_status: agenticResult.compliance_status,
        compliance_score: agenticResult.compliance_score
      }
    }

    // ── LEGACY PATH ───────────────────────────────────────────────────────────
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
      const documentId = result?.documentId || uuidv4()
      const docNameProvided = name && String(name).trim() ? String(name).trim() : null
      const templateName = (variables?.template_name as string) || jobData.template_name || null
      const docName = docNameProvided || templateName || (template_id ? `Generated Document - ${template_id}` : `AI Generated Document ${new Date().toISOString()}`)

      const rawContent = result?.content ? result.content : result
      const docContent = (typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)) || ''
      const projectIdForDoc = projectId || variables?.project_id || null

      // Mission Draco: Sync Verification Log
      log.info(`[MISSION-DRACO] [SYNC] Saving Document ${documentId}: ${docContent.length} characters. Source context pools: ${documentIds?.length || 0}.`)

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
          } else {
            log.warn('[AI-JOB] Project not found, adding project context placeholder', { projectId: projectIdForDoc })
            const projectContextEntry = {
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
            sourceDocuments.push(projectContextEntry)
          }
        } catch (error) {
          log.error('[AI-JOB] Failed to fetch project context', { projectId: projectIdForDoc, error })
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
          } catch (error) {
            log.error('[AI-JOB] Failed to fetch document details', { documentIds, error })
          }
        }

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

      let processingTimeMs = 0
      const actualJobId = jobId || jobData.jobId
      try {
        if (actualJobId) {
          const timingResult = await db.query(
            `SELECT created_at, started_at, processing_started_at, completed_at FROM jobs WHERE id = $1`,
            [actualJobId]
          )
          const row = timingResult.rows[0]
          const startRaw = row?.started_at || row?.processing_started_at || row?.created_at || jobData.started_at
          const endRaw = row?.completed_at
          if (startRaw && endRaw) {
            processingTimeMs = new Date(endRaw).getTime() - new Date(startRaw).getTime()
          } else if (startRaw) {
            processingTimeMs = Date.now() - new Date(startRaw).getTime()
          }
        }
      } catch {
        // Non-fatal — fall back below
      }

      if (processingTimeMs < 1000) {
        const fallbackStart = jobData.started_at
          ? new Date(jobData.started_at)
          : jobData.timestamp
            ? new Date(jobData.timestamp)
            : null
        if (fallbackStart) {
          processingTimeMs = Date.now() - fallbackStart.getTime()
        }
      }

      const processingTimeSec = (Math.max(processingTimeMs, 0) / 1000).toFixed(2)

      let generationMetadata = AIGenerationJobService.buildGenerationMetadata({
        result,
        provider: provider || 'openai',
        model: model || 'unknown',
        temperature: jobData.temperature || 0.7,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        processingTimeMs: Math.max(processingTimeMs, 0),
        processingTimeSec,
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        qualityMetrics,
        jobId,
        sourceDocuments,
        contextStats,
        contextMatchingScore: result?.contextMatchingScore,
        occurrenceConsistencyScore: result?.occurrenceConsistencyScore,
        contextConsistencyStats: result?.contextConsistencyStats,
        entityExtractionQuality: result?.entityExtractionQuality,
        appliedContextEntities: result?.appliedContextEntities,
      })

      // Merge any user-provided generation metadata
      if (jobData.generation_metadata) {
        generationMetadata = {
          ...generationMetadata,
          ...jobData.generation_metadata,
        }
      }

      const insertResult = await db.query(
        `
        INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, updated_by, generation_metadata, word_count, character_count, sentence_count, paragraph_count, entity_counts, context_snapshots)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          content = EXCLUDED.content,
          status = EXCLUDED.status,
          updated_by = EXCLUDED.updated_by,
          generation_metadata = EXCLUDED.generation_metadata,
          word_count = EXCLUDED.word_count,
          character_count = EXCLUDED.character_count,
          sentence_count = EXCLUDED.sentence_count,
          paragraph_count = EXCLUDED.paragraph_count,
          entity_counts = EXCLUDED.entity_counts,
          context_snapshots = EXCLUDED.context_snapshots
        RETURNING id
      `,
        [
          documentId, 
          projectIdForDoc, 
          docName, 
          docContent, 
          template_id || null, 
          'draft', 
          userId || null, 
          JSON.stringify(generationMetadata), 
          wordCount, 
          characterCount, 
          sentenceCount, 
          paragraphCount, 
          JSON.stringify(result.entityCounts || {}),
          JSON.stringify(result.summaries || {})
        ]
      )

      if (insertResult.rows.length > 0) {
        createdDocumentId = insertResult.rows[0].id

        if (generationMetadata.compliance_status === 'PENDING_HUMAN_APPROVAL' || generationMetadata.compliance_status === 'PENDING_APPROVAL') {
          try {
            const approvalRequestId = uuidv4()
            await db.query(
              `INSERT INTO approval_requests (id, request_type, change_request_id, status, priority, severity, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [approvalRequestId, 'document_generation', createdDocumentId, 'pending', 'medium', 'low', userId || null]
            )
            
            await db.query(`UPDATE documents SET status = 'pending_approval' WHERE id = $1`, [createdDocumentId])

            const { notificationService } = await Promise.resolve().then(() => require('../notificationService'))
            if (notificationService.sendNotification) {
              await notificationService.sendNotification({
                notification_type: 'APPROVAL_REQUEST',
                reference_type: 'document',
                reference_id: createdDocumentId,
                project_id: projectIdForDoc,
                recipients: [{ user_id: userId || undefined, destination: 'in_app', channel: 'in_app' }],
                variables: { documentName: docName, approvalRequestId }
              })
            }
            log.info(`[AI-JOB] Created approval request ${approvalRequestId} and sent notification for document ${createdDocumentId}`)
          } catch (approvalErr) {
            log.error(`[AI-JOB] Failed to create approval request for ${createdDocumentId}`, approvalErr)
          }
        }

        if (projectIdForDoc && docContent.trim()) {
          try {
            const { enqueueEntityPersistence } = await Promise.resolve().then(() => require('./enqueueEntityPersistence'))
            const entityJobId = await enqueueEntityPersistence({
              projectId: projectIdForDoc,
              userId: userId ?? null,
              documentId: createdDocumentId,
              content: docContent,
              parentJobId: jobId,
              triggeredBy: 'ai-generate',
              autoTriggered: true,
            })
            if (entityJobId) {
              log.info(`[AI-JOB] Enqueued entity persistence ${entityJobId} for document ${createdDocumentId}`)
            }
          } catch (enqueueErr) {
            log.error(`[AI-JOB] Failed to enqueue entity persistence for ${createdDocumentId}`, enqueueErr)
          }
        }

        if (template_id) {
          await AIGenerationJobService.incrementTemplateUsage(template_id, deps)
          await AIGenerationJobService.trackTemplateUsage({
            template_id,
            document_id: createdDocumentId,
            user_id: userId as string,
            project_id: projectIdForDoc as string,
            word_count: wordCount,
            quality_score: qualityMetrics?.score || 0.7
          }, deps);
          
          try {
            const { TemplateAnalyticsService } = await Promise.resolve().then(() => require('../templateAnalyticsService'))
            setImmediate(async () => {
              try {
                await TemplateAnalyticsService.updateTemplateEntityProfile(template_id)
                log.info(`[AI-JOB] Template entity profile updated for ${template_id}`)
              } catch (err) {
                log.warn(`[AI-JOB] Failed to update template entity profile (non-fatal)`, { template_id, error: err })
              }
            })
          } catch (err) { }
        }
        if (projectIdForDoc && docContent.trim() && createdDocumentId) {
          setImmediate(async () => {
            if (!process.env.VOYAGE_API_KEY) return
            try {
              const { ragService } = await Promise.resolve().then(() => require('../ragService'))
              const ingestIds = new Set<string>([createdDocumentId])
              if (documentIds?.length) {
                documentIds.forEach((id) => ingestIds.add(id))
              }
              for (const id of ingestIds) {
                try {
                  await ragService.ingestDocument(id)
                } catch (ingestErr) {
                  log.warn(`[AI-JOB] Post-save RAG ingest failed for ${id} (non-fatal)`, ingestErr)
                }
              }
            } catch (importErr) {
              log.warn('[AI-JOB] RAG ingest skipped (non-fatal)', importErr)
            }
          })
        }
      }

    } catch (docErr: any) {
      log.error(`Failed to create document for job ${jobId}:`, docErr)
    }

    return createdDocumentId
  }

  private static calculateContentStats(content: string) {
    const safeContent = String(content || '')
    const wordCount = safeContent.split(/\s+/).filter(w => w.length > 0).length
    const characterCount = safeContent.length
    const sentenceCount = (safeContent.match(/[.!?]+/g) || []).length
    const paragraphCount = (safeContent.match(/\n\n/g) || []).length + 1
    return { wordCount, characterCount, sentenceCount, paragraphCount }
  }

  private static async calculateQualityMetrics(content: string, metadata: any): Promise<any> {
    const { analyzeDocumentQuality } = await Promise.resolve().then(() => require('../../utils/documentMetadata'))
    const safeContent = String(content || '')
    const tempMetadata = {
      ...metadata,
      lineCount: (safeContent.match(/\n/g) || []).length + 1,
      estimatedReadingTime: Math.ceil((metadata.wordCount || 0) / 200)
    }
    return analyzeDocumentQuality(safeContent, tempMetadata, metadata.sourceDocCount || 0)
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
    const key = `${String(provider || '').toLowerCase()}-${String(model || '').toLowerCase()}`.replace(/\s+/g, '-')
    const rates = pricing[key] || { input: 1, output: 3 }
    const totalCost = ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output)
    return totalCost < 0.01 ? '$0.00' : `$${totalCost.toFixed(4)}`
  }

  private static buildGenerationMetadata(options: any): any {
    const {
      result, provider, model, temperature, inputTokens, outputTokens, totalTokens, estimatedCost,
      processingTimeMs, processingTimeSec, wordCount, characterCount, sentenceCount, paragraphCount,
      qualityMetrics, jobId, sourceDocuments, contextStats, contextMatchingScore,
      occurrenceConsistencyScore, contextConsistencyStats, entityExtractionQuality, appliedContextEntities,
    } = options

    const finalSourceDocuments = sourceDocuments || []

    return {
      job_id: jobId,
      aiProcessing: {
        provider: result?.provider || provider,
        model: result?.model || model,
        temperature: temperature || 0.7,
        tokens: { input: inputTokens, output: outputTokens, total: totalTokens, cost: estimatedCost },
        processingTime: `${processingTimeSec}s`,
        processingTimeMs
      },
      generation: { generated_at: new Date().toISOString(), job_id: jobId, status: 'completed' },
      contentMetrics: {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        readingTime: wordCount > 0 ? Math.ceil(wordCount / 250) : 0,
      },
      qualityMetrics,
      source_documents: finalSourceDocuments,
      context_stats: contextStats || null,
      contextMatchingScore: contextMatchingScore ?? result?.contextMatchingScore ?? 0,
      occurrenceConsistencyScore: occurrenceConsistencyScore ?? result?.occurrenceConsistencyScore ?? 0,
      contextConsistencyStats: contextConsistencyStats ?? result?.contextConsistencyStats ?? null,
      entityExtractionQuality: entityExtractionQuality ?? result?.entityExtractionQuality ?? null,
      appliedContextEntities: appliedContextEntities ?? result?.appliedContextEntities ?? [],
    }
  }

  private static async incrementTemplateUsage(templateId: string, deps?: QueueServiceDependencies): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    try {
      await db.query(
        `UPDATE templates SET usage_count = COALESCE(usage_count, 0) + 1, last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [templateId]
      )
    } catch (err) { }
  }

  private static async trackTemplateUsage(options: {
    template_id: string,
    document_id: string,
    user_id: string | null | undefined,
    project_id: string | null | undefined,
    word_count: number,
    quality_score: number
  }, deps?: QueueServiceDependencies): Promise<void> {
    const db = deps?.database || { query: pool.query.bind(pool) } as any
    const log = deps?.logger || logger
    
    try {
      await db.query(`
        INSERT INTO template_usage (
          template_id, document_id, user_id, project_id,
          used_at, word_count, quality_score, success
        )
        VALUES ($1, $2, $3, $4, NOW(), $5, $6, true)
      `, [
        options.template_id, 
        options.document_id, 
        options.user_id || null, 
        options.project_id || null, 
        options.word_count,
        options.quality_score
      ]);

      if (options.user_id) {
        await db.query(`SELECT update_template_validation($1, $2, $3)`, [
          options.template_id,
          options.quality_score,
          options.user_id
        ]);
      } else {
        await db.query(`
          UPDATE templates 
          SET validation_count = validation_count + 1,
              success_count = CASE WHEN $1 >= quality_threshold THEN success_count + 1 ELSE success_count END,
              last_validated_at = NOW()
          WHERE id = $2
        `, [options.quality_score, options.template_id]);
      }
    } catch (err) {
      log.warn(`[AI-JOB] Failed to track template usage details`, err);
    }
  }

  private static async validateAgainstBaseline(jobData: AIGenerationJobData, documentId: string, result: any, deps?: QueueServiceDependencies): Promise<void> {
    const ws = deps?.websocket || io
    const projectId = (jobData.projectId || jobData.variables?.project_id) as string
    if (!projectId) return
    try {
      const { baselineService } = await Promise.resolve().then(() => require('../baselineService'))
      const docContent = (typeof result.content === 'string' ? result.content : JSON.stringify(result.content || result)) || ''
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
    
    // Explicitly free memory upon failing document generation if GC is exposed
    if (global.gc) {
      log.info(`[WORKER] Freeing memory after failed document generation for job ${jobId}`);
      global.gc();
    } else {
      log.warn(`[WORKER] Memory freeing requested for job ${jobId} but global.gc is not available. Try starting node with --expose-gc`);
    }
  }

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
      const increment = 1
      if (currentProgress + increment <= maxProgress) {
        currentProgress += increment

        updateJobStatus(jobId, "processing", currentProgress, workerId, "ai-processing")
          .then(() => {
            if (ws) {
              try {
                ws.emit("job:status", {
                  jobId,
                  userId: jobData?.userId,
                  progress: currentProgress,
                  status: "processing",
                  startTime: jobData?.started_at || new Date().toISOString(),
                  projectId: jobData?.projectId || jobData?.variables?.project_id,
                  message: "Processing..."
                })
              } catch (e) { }
            }
          })
          .catch(() => { })
      }
    }, 4000)
  }
}
