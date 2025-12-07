/**
 * AI Generation Job Service
 * Handles processing of AI generation jobs from the queue
 * 
 * Extracted from queueService.ts as part of Phase 2 refactoring
 * to improve code organization and maintainability.
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { aiService } from '../aiService'
import { ContextAwareAIService } from '../../modules/context/integration'
import { io } from '../../server'
import { v4 as uuidv4 } from 'uuid'
import type Bull from 'bull'

interface AIGenerationJobData {
  jobId: string
  userId?: string
  prompt: string
  provider?: string
  model?: string
  temperature?: number
  max_tokens?: number
  template_id?: string
  variables?: any
  projectId?: string
  documentIds?: string[]
  use_context?: boolean
  include_integrations?: boolean
  custom_context?: any
  name?: string
  description?: string
  framework?: string
  started_at?: string
  timestamp?: number
  project_name?: string
  projectName?: string
}

interface ProcessJobOptions {
  workerId: string
  updateJobStatus: (jobId: string, status: string, progress: number, workerId?: string, queueName?: string, errorMessage?: string) => Promise<void>
}

/**
 * Service class for processing AI generation jobs
 */
export class AIGenerationJobService {
  /**
   * Process an AI generation job
   */
  static async processJob(job: Bull.Job, options: ProcessJobOptions): Promise<any> {
    const { jobId, userId, prompt, provider, model, temperature, max_tokens, template_id, variables } = job.data as AIGenerationJobData
    const { workerId, updateJobStatus } = options

    try {
      // Update job status to processing and assign worker
      await updateJobStatus(jobId, "processing", 10, workerId, "ai-processing")

      // Generate content using AI service
      const result = await this.generateContent(job.data as AIGenerationJobData)

      // Update job status to 50%
      await updateJobStatus(jobId, "processing", 50)

      // Update usage stats
      if (result.usage) {
        await aiService.updateUsageStats(provider || 'openai', result.usage)
      }

      // Update job status to 90%
      await updateJobStatus(jobId, "processing", 90)

      // Create document from generated content
      const { documentId: createdDocumentId, documentRow: createdDocumentRow } = await this.createDocument(job.data as AIGenerationJobData, result)

      // Validate document against baseline
      if (createdDocumentId) {
        await this.validateAgainstBaseline(job.data as AIGenerationJobData, createdDocumentId, result)
      }

      // Save result to database
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

      // Create audit log for AI analytics
      await this.createAuditLog(job.data as AIGenerationJobData, result, createdDocumentId)

      // Emit real-time updates
      this.emitCompletionEvents(job.data as AIGenerationJobData, finalResult, createdDocumentId)

      logger.info(`AI generation job completed: ${jobId}`)

      return finalResult
    } catch (error: any) {
      await this.handleError(jobId, job.data as AIGenerationJobData, error, options)
      throw error
    }
  }

  /**
   * Generate content using AI service
   */
  private static async generateContent(jobData: AIGenerationJobData): Promise<any> {
    const { prompt, provider, model, temperature, max_tokens, template_id, variables, userId, projectId, documentIds, use_context, include_integrations, custom_context } = jobData
    
    const useContext = !!use_context || !!projectId || !!documentIds || !!template_id

    if (useContext) {
      return await ContextAwareAIService.generateWithContext({
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
      })
    } else {
      return await aiService.generateWithFallback({
        prompt,
        provider,
        model,
        temperature,
        max_tokens,
        template_id,
        variables,
      })
    }
  }

  /**
   * Create a document from generated content
   */
  private static async createDocument(jobData: AIGenerationJobData, result: any): Promise<string | null> {
    const { jobId, userId, template_id, variables, projectId, documentIds, name, description, framework } = jobData

    let createdDocumentId: string | null = null

    try {
      // Determine document name and content
      const docNameProvided = name && name.trim() ? name.trim() : null
      const templateName = variables?.template_name || jobData.template_name || null
      const docName = docNameProvided || templateName || (template_id ? `Generated Document - ${template_id}` : `AI Generated Document ${new Date().toISOString()}`)
      
      const rawContent = result?.content ? result.content : result
      const docContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)
      const projectIdForDoc = projectId || variables?.project_id || null

      // Calculate content statistics
      const { wordCount, characterCount, sentenceCount, paragraphCount } = this.calculateContentStats(docContent)

      // Calculate quality metrics
      const qualityMetrics = await this.calculateQualityMetrics(docContent, {
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        templateId: template_id,
        framework,
        sourceDocCount: documentIds?.length || 0
      })

      // Calculate AI cost
      const { provider, model } = jobData
      const inputTokens = result?.usage?.prompt_tokens || result?.usage?.input_tokens || 0
      const outputTokens = result?.usage?.completion_tokens || result?.usage?.output_tokens || 0
      const totalTokens = result?.usage?.total_tokens || (inputTokens + outputTokens)
      const estimatedCost = this.calculateAICost(provider || 'openai', model || 'unknown', inputTokens, outputTokens)

      // Calculate processing duration
      const jobStartTime = jobData.started_at ? new Date(jobData.started_at) : new Date(jobData.timestamp || Date.now())
      const jobEndTime = new Date()
      const processingTimeMs = jobEndTime.getTime() - jobStartTime.getTime()
      const processingTimeSec = (processingTimeMs / 1000).toFixed(2)

      // Build generation metadata
      const generationMetadata = this.buildGenerationMetadata({
        result,
        provider: provider || 'openai',
        model: model || 'unknown',
        temperature: jobData.temperature || 0.7,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        processingTimeMs,
        processingTimeSec,
        wordCount,
        characterCount,
        sentenceCount,
        paragraphCount,
        qualityMetrics,
        jobId,
        documentIds
      })

      // Insert document into database
      const insertResult = await pool.query(
        `
        INSERT INTO documents (project_id, name, content, template_id, status, created_by, updated_by, generation_metadata, word_count, character_count, sentence_count, paragraph_count)
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `,
        [projectIdForDoc, docName, docContent, template_id || null, 'draft', userId || null, JSON.stringify(generationMetadata), wordCount, characterCount, sentenceCount, paragraphCount]
      )

      if (insertResult.rows.length > 0) {
        createdDocumentId = insertResult.rows[0].id
        const createdDocumentRow = insertResult.rows[0]
        logger.info(`Document created: ${createdDocumentId} (project: ${projectIdForDoc || 'none'}) - ${wordCount} words, ${characterCount} chars`)

        // Increment template usage count
        if (template_id) {
          await this.incrementTemplateUsage(template_id)
        }

        // Trigger automatic entity extraction
        if (projectIdForDoc && docContent && docContent.trim().length > 0) {
          await this.triggerAutoExtraction(jobId, projectIdForDoc, userId, createdDocumentId, docName)
        }
      }
    } catch (docErr: any) {
      logger.error(`Failed to create document for job ${jobId}:`, docErr)
      // Continue - document creation failure shouldn't block marking job as completed
    }

    return createdDocumentId
  }

  /**
   * Calculate content statistics
   */
  private static calculateContentStats(content: string): {
    wordCount: number
    characterCount: number
    sentenceCount: number
    paragraphCount: number
  } {
    const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length
    const characterCount = content.length
    const sentenceCount = (content.match(/[.!?]+/g) || []).length
    const paragraphCount = (content.match(/\n\n/g) || []).length + 1

    return { wordCount, characterCount, sentenceCount, paragraphCount }
  }

  /**
   * Calculate quality metrics for document
   */
  private static async calculateQualityMetrics(content: string, metadata: any): Promise<any> {
    const { analyzeDocumentQuality } = await import('../../utils/documentMetadata')
    
    const tempMetadata = {
      wordCount: metadata.wordCount,
      characterCount: metadata.characterCount,
      sentenceCount: metadata.sentenceCount,
      paragraphCount: metadata.paragraphCount,
      lineCount: (content.match(/\n/g) || []).length + 1,
      estimatedReadingTime: Math.ceil(metadata.wordCount / 200),
      templateId: metadata.templateId || undefined,
      framework: metadata.framework || undefined
    }

    return analyzeDocumentQuality(content, tempMetadata, metadata.sourceDocCount || 0)
  }

  /**
   * Calculate AI cost based on token usage
   */
  private static calculateAICost(provider: string, model: string, inputTokens: number, outputTokens: number): string {
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
    const rates = pricing[key] || { input: 1, output: 3 }

    const inputCost = (inputTokens / 1_000_000) * rates.input
    const outputCost = (outputTokens / 1_000_000) * rates.output
    const totalCost = inputCost + outputCost

    return totalCost < 0.01 ? '$0.00' : `$${totalCost.toFixed(4)}`
  }

  /**
   * Build generation metadata object
   */
  private static buildGenerationMetadata(options: any): any {
    const {
      result,
      provider,
      model,
      temperature,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      processingTimeMs,
      processingTimeSec,
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      qualityMetrics,
      jobId,
      documentIds
    } = options

    return {
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
      sourceDocuments: (documentIds || []).map((docId: string, idx: number) => ({
        id: docId,
        order: idx + 1
      }))
    }
  }

  /**
   * Increment template usage count
   */
  private static async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE templates 
         SET usage_count = usage_count + 1,
             last_used_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [templateId]
      )
      logger.info(`✅ Template usage incremented: ${templateId}`)
    } catch (templateErr: any) {
      logger.error(`Failed to increment template usage for ${templateId}:`, templateErr)
      // Don't fail the job if template update fails
    }
  }

  /**
   * Trigger automatic entity extraction for newly created document
   */
  private static async triggerAutoExtraction(
    sourceJobId: string,
    projectId: string,
    userId: string | undefined,
    documentId: string,
    documentName: string
  ): Promise<void> {
    try {
      logger.info(`[AUTO-EXTRACTION] Triggering extraction for document ${documentId} in project ${projectId}`)

      // Create extraction job record
      const extractionJobId = uuidv4()
      await pool.query(
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
            documentIds: [documentId],
            autoTriggered: true,
            sourceDocumentId: documentId,
            sourceDocumentName: documentName,
            sourceJobId
          }),
          userId || null,
          projectId
        ]
      )

      // Enqueue extraction job (dynamic import to avoid circular dependency)
      const { extractionQueue } = await import('../queueService')
      await extractionQueue.add('extract-project-data', {
        jobId: extractionJobId,
        projectId,
        userId: userId || null,
        documentIds: [documentId],
        autoTriggered: true,
        sourceDocumentId: documentId,
        sourceDocumentName: documentName,
        sourceJobId
      }, {
        jobId: extractionJobId,
        priority: 5 // Lower priority than manual extractions
      })

      logger.info(`✅ [AUTO-EXTRACTION] Extraction job ${extractionJobId} queued for document ${documentId}`)
    } catch (extractionErr: any) {
      logger.error(`❌ [AUTO-EXTRACTION] Failed to trigger extraction for document ${documentId}:`, extractionErr)
      // Don't fail the AI generation job if extraction trigger fails
    }
  }

  /**
   * Validate document against project baseline
   */
  private static async validateAgainstBaseline(
    jobData: AIGenerationJobData,
    documentId: string,
    result: any
  ): Promise<void> {
    const projectIdForValidation = jobData.projectId || jobData.variables?.project_id

    if (!projectIdForValidation) {
      return
    }

    try {
      const { baselineService } = await import('../baselineService')
      const rawContent = result?.content ? result.content : result
      const documentContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)
      const docName = (jobData.name && jobData.name.trim()) ? jobData.name.trim() : 'Generated Document'

      logger.info(`[Baseline Validation] Checking document ${documentId} against project ${projectIdForValidation} baseline`)
      
      const drifts = await baselineService.validateDocumentAgainstBaseline(
        projectIdForValidation,
        documentId,
        documentContent,
        docName
      )

      if (drifts.length > 0) {
        logger.warn(`[Baseline Validation] Detected ${drifts.length} drift(s) in document ${documentId}`)
        // Emit drift alert to project room
        io.to(`project:${projectIdForValidation}`).emit("baseline:drift", {
          documentId,
          driftCount: drifts.length,
          drifts: drifts.map((d: any) => ({
            type: d.detection_type,
            severity: d.drift_severity,
            description: d.drift_description
          }))
        })
      } else {
        logger.info(`[Baseline Validation] No drift detected in document ${documentId}`)
      }
    } catch (baselineErr: any) {
      logger.error(`[Baseline Validation] Failed to validate document ${documentId}:`, baselineErr)
      // Don't fail the job if baseline validation fails
    }
  }

  /**
   * Create audit log for AI analytics
   */
  private static async createAuditLog(
    jobData: AIGenerationJobData,
    result: any,
    documentId: string | null
  ): Promise<void> {
    try {
      const provider = jobData.provider || 'openai'
      
      // Get provider ID for audit log
      const providerResult = await pool.query(
        'SELECT id FROM ai_providers WHERE name = $1 LIMIT 1',
        [provider]
      )

      if (providerResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            jobData.userId || null,
            'ai_generate',
            'ai_provider',
            providerResult.rows[0].id,
            JSON.stringify({
              prompt_length: jobData.prompt?.length || 0,
              provider,
              model: jobData.model,
              template_id: jobData.template_id,
              document_id: documentId,
              job_id: jobData.jobId,
              usage: result?.usage || {},
              success: true,
              response_time: result?.response_time || 0
            })
          ]
        )
        logger.info(`✅ Audit log created for AI generation (job: ${jobData.jobId})`)
      }
    } catch (auditErr: any) {
      logger.error(`Failed to create audit log for job ${jobData.jobId}:`, auditErr)
      // Don't fail the job if audit logging fails
    }
  }

  /**
   * Emit completion events via WebSocket
   */
  private static emitCompletionEvents(
    jobData: AIGenerationJobData,
    finalResult: any,
    createdDocumentId: string | null
  ): void {
    const templateName = jobData.variables?.template_name || jobData.template_name || null
    const projectName = jobData.variables?.project_name || jobData.projectName || null
    const documentName = templateName || 'Document'
    const projectIdForNotification = jobData.projectId || jobData.variables?.project_id || null

    // Emit job completion event
    io.emit("job:completed", {
      jobId: jobData.jobId,
      userId: jobData.userId,
      status: "completed",
      result: finalResult,
      message: `${documentName} generated successfully`,
      documentId: createdDocumentId,
      projectId: projectIdForNotification,
      provider: jobData.provider,
      model: jobData.model,
    })

    // Emit document created event if document was created
    if (createdDocumentId && projectIdForNotification) {
      try {
        // Fetch document row for complete event data
        const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [createdDocumentId])
        const createdDocumentRow = docResult.rows[0] || null
        
        io.to(`project:${projectIdForNotification}`).emit("document:created", {
          document: createdDocumentRow,
          documentId: createdDocumentId,
          documentName,
          projectId: projectIdForNotification,
          projectName,
          provider: jobData.provider,
          model: jobData.model,
        })
      } catch (emitErr: any) {
        logger.error(`Failed to emit document:created for job ${jobData.jobId}:`, emitErr)
      }
    }
  }

  /**
   * Handle errors during job processing
   */
  private static async handleError(
    jobId: string,
    jobData: AIGenerationJobData,
    error: any,
    options: ProcessJobOptions
  ): Promise<void> {
    logger.error(`AI generation job failed: ${jobId}`, error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Update job with error
    await pool.query(
      `
      UPDATE jobs 
      SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [errorMessage, jobId]
    )

    // Emit real-time update
    const templateName = jobData.variables?.template_name || jobData.template_name || null
    const documentName = templateName || 'Document'

    io.emit("job:failed", {
      jobId,
      userId: jobData.userId,
      status: "failed",
      error: errorMessage,
      message: `Failed to generate ${documentName}`,
      projectId: jobData.projectId || jobData.variables?.project_id,
      provider: jobData.provider,
      model: jobData.model,
    })
  }
}

