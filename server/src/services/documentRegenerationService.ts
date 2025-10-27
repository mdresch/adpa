/**
 * Document Regeneration Service
 * 
 * Handles regeneration of document versions with updated project context using AI.
 * Supports background job processing with progress tracking via WebSocket.
 */

import { pool } from '../database/connection'
import { logger, childLogger } from '../utils/logger'
import { ContextAwareAIService, EnhancedAIRequest } from '../modules/context/integration'
import { io } from '../server'

interface RegenerationJobParams {
  documentId: string
  templateId?: string
  provider: string
  model?: string
  versionType: 'patch' | 'minor' | 'major'
  temperature?: number
  userId: string
  jobId: string
}

interface RegenerationProgress {
  jobId: string
  progress: number
  message: string
  userId: string
}

export class DocumentRegenerationService {
  /**
   * Execute document regeneration job
   */
  static async executeRegenerationJob(params: RegenerationJobParams): Promise<void> {
    const log = childLogger({ 
      jobId: params.jobId,
      documentId: params.documentId 
    })
    
    try {
      log.info('Starting document regeneration job')
      
      // Update job status to processing
      await this.updateJobStatus(params.jobId, 'processing', 0, 'Starting regeneration...')
      this.emitProgress({
        jobId: params.jobId,
        progress: 0,
        message: 'Starting regeneration...',
        userId: params.userId
      })

      // Step 1: Fetch document and project information (10%)
      log.info('Fetching document metadata')
      await this.updateJobStatus(params.jobId, 'processing', 10, 'Fetching document metadata...')
      this.emitProgress({
        jobId: params.jobId,
        progress: 10,
        message: 'Fetching document metadata...',
        userId: params.userId
      })

      const documentResult = await pool.query(
        `SELECT d.*, p.name as project_name, p.framework, t.name as template_name
         FROM documents d
         LEFT JOIN projects p ON d.project_id = p.id
         LEFT JOIN templates t ON d.template_id = t.id
         WHERE d.id = $1`,
        [params.documentId]
      )

      if (documentResult.rows.length === 0) {
        throw new Error('Document not found')
      }

      const document = documentResult.rows[0]
      const projectId = document.project_id

      // Step 2: Gather project context (30%)
      log.info('Gathering project context')
      await this.updateJobStatus(params.jobId, 'processing', 30, 'Gathering project context...')
      this.emitProgress({
        jobId: params.jobId,
        progress: 30,
        message: 'Gathering project context...',
        userId: params.userId
      })

      // Get document count for context summary
      let stats = { doc_count: 0, stakeholder_count: 0, baseline_count: 0 }
      
      try {
        const contextStats = await pool.query(
          `SELECT 
            (SELECT COUNT(*) FROM documents WHERE project_id = $1 AND id != $2) as doc_count,
            (SELECT COUNT(*) FROM stakeholders WHERE project_id = $1) as stakeholder_count,
            (SELECT COUNT(*) FROM baselines WHERE project_id = $1) as baseline_count`,
          [projectId, params.documentId]
        )
        stats = contextStats.rows[0]
      } catch (error: any) {
        // Handle missing tables gracefully
        log.warn('Could not fetch all context stats, fetching available data', { error: error.message })
        
        try {
          // Try without baselines table
          const contextStats = await pool.query(
            `SELECT 
              (SELECT COUNT(*) FROM documents WHERE project_id = $1 AND id != $2) as doc_count,
              (SELECT COUNT(*) FROM stakeholders WHERE project_id = $1) as stakeholder_count,
              0 as baseline_count`,
            [projectId, params.documentId]
          )
          stats = contextStats.rows[0]
        } catch (fallbackError: any) {
          log.warn('Could not fetch context stats, continuing without them', { error: fallbackError.message })
          // Continue with default stats
        }
      }

      // Step 3: Generate content with AI (50%)
      log.info('Generating document content with AI')
      await this.updateJobStatus(params.jobId, 'processing', 50, 'Generating content with AI...')
      this.emitProgress({
        jobId: params.jobId,
        progress: 50,
        message: 'Generating content with AI...',
        userId: params.userId
      })

      // Prepare AI request with context
      const templateId = params.templateId || document.template_id
      
      // Build context description based on what's available
      const contextParts = []
      if (stats.doc_count > 0) contextParts.push(`${stats.doc_count} related document(s)`)
      if (stats.stakeholder_count > 0) contextParts.push(`${stats.stakeholder_count} stakeholder(s)`)
      if (stats.baseline_count > 0) contextParts.push(`${stats.baseline_count} baseline(s)`)
      
      const contextDescription = contextParts.length > 0 
        ? `Available context: ${contextParts.join(', ')}.`
        : 'Generating with available project information.'
      
      const userPrompt = `Regenerate this ${document.name || 'document'} with updated project context. 
Original document type: ${document.template_name || 'General Document'}
Project: ${document.project_name}
Framework: ${document.framework || 'General'}
${contextDescription}

Please generate a comprehensive, updated version that incorporates all recent project information.`

      const aiRequest: EnhancedAIRequest = {
        prompt: userPrompt,
        provider: params.provider,
        model: params.model || 'gpt-4',
        temperature: params.temperature || 0.7,
        max_tokens: 4000,
        project_id: projectId,
        template_id: templateId,
        include_integrations: true,
        max_context_tokens: 8000,
        user_id: params.userId
      }

      const aiResponse = await ContextAwareAIService.generateWithContext(aiRequest)

      // Step 4: Calculate version number (70%)
      log.info('Calculating version number')
      await this.updateJobStatus(params.jobId, 'processing', 70, 'Creating new version...')
      this.emitProgress({
        jobId: params.jobId,
        progress: 70,
        message: 'Creating new version...',
        userId: params.userId
      })

      // Calculate next version (templateId already declared on line 111)
      const versionResult = await pool.query(
        `SELECT calculate_next_version($1, $2) as next_version`,
        [params.documentId, params.versionType]
      )
      const nextVersion = versionResult.rows[0].next_version

      // Step 5: Create document version (85%)
      log.info(`Creating version ${nextVersion}`)
      await this.updateJobStatus(params.jobId, 'processing', 85, `Creating version ${nextVersion}...`)
      this.emitProgress({
        jobId: params.jobId,
        progress: 85,
        message: `Creating version ${nextVersion}...`,
        userId: params.userId
      })

      const versionId = await pool.query(
        `SELECT create_document_version(
          $1::UUID, $2::VARCHAR(20), $3::VARCHAR(20), $4::TEXT, $5::VARCHAR(100),
          $6::UUID, $7::JSONB, $8::JSONB
        ) as version_id`,
        [
          params.documentId,
          nextVersion,
          params.versionType,
          `Regenerated with updated project context`,
          `AI regeneration using ${params.provider}`,
          params.userId,
          JSON.stringify({ content: aiResponse.content }),
          JSON.stringify({
            provider: params.provider,
            model: params.model || 'default',
            temperature: params.temperature || 0.7,
            context_summary: aiResponse.context_summary,
            context_token_usage: aiResponse.context_token_usage,
            template_id: templateId,
            generated_at: new Date().toISOString()
          })
        ]
      )

      const newVersionId = versionId.rows[0].version_id

      // Step 6: Complete job (100%)
      log.info('Regeneration completed successfully')
      await this.updateJobStatus(
        params.jobId, 
        'completed', 
        100, 
        'Regeneration completed successfully',
        newVersionId
      )
      
      // Update job with context summary
      await pool.query(
        `UPDATE regeneration_jobs 
         SET context_summary = $1
         WHERE id = $2`,
        [
          JSON.stringify({
            documents: stats.doc_count,
            stakeholders: stats.stakeholder_count,
            baselines: stats.baseline_count,
            ai_summary: aiResponse.context_summary
          }),
          params.jobId
        ]
      )

      this.emitComplete({
        jobId: params.jobId,
        userId: params.userId,
        versionId: newVersionId,
        versionNumber: nextVersion
      })

      log.info('Document regeneration job completed successfully')
      
    } catch (error) {
      log.error('Document regeneration failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      await this.updateJobStatus(
        params.jobId,
        'failed',
        0,
        errorMessage
      )

      this.emitFailed({
        jobId: params.jobId,
        userId: params.userId,
        error: errorMessage
      })

      throw error
    }
  }

  /**
   * Update job status in database
   */
  private static async updateJobStatus(
    jobId: string,
    status: string,
    progress: number,
    progressMessage: string,
    newVersionId?: string
  ): Promise<void> {
    const updateFields: string[] = [
      'status = $2',
      'progress = $3',
      'progress_message = $4'
    ]
    const values: any[] = [jobId, status, progress, progressMessage]

    if (status === 'processing' && progress === 0) {
      updateFields.push('started_at = NOW()')
    }

    if (status === 'completed' || status === 'failed') {
      updateFields.push('completed_at = NOW()')
    }

    if (status === 'failed') {
      updateFields.push('error_message = $4')
    }

    if (newVersionId) {
      updateFields.push(`new_version_id = $${values.length + 1}`)
      values.push(newVersionId)
    }

    const query = `
      UPDATE regeneration_jobs 
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `

    await pool.query(query, values)
  }

  /**
   * Emit progress update via WebSocket
   */
  private static emitProgress(data: RegenerationProgress): void {
    if (io) {
      io.to(`user:${data.userId}`).emit('document:regeneration:progress', {
        jobId: data.jobId,
        progress: data.progress,
        message: data.message
      })
    }
  }

  /**
   * Emit completion event via WebSocket
   */
  private static emitComplete(data: {
    jobId: string
    userId: string
    versionId: string
    versionNumber: string
  }): void {
    if (io) {
      io.to(`user:${data.userId}`).emit('document:regeneration:completed', {
        jobId: data.jobId,
        versionId: data.versionId,
        versionNumber: data.versionNumber
      })
    }
  }

  /**
   * Emit failure event via WebSocket
   */
  private static emitFailed(data: {
    jobId: string
    userId: string
    error: string
  }): void {
    if (io) {
      io.to(`user:${data.userId}`).emit('document:regeneration:failed', {
        jobId: data.jobId,
        error: data.error
      })
    }
  }
}

export default DocumentRegenerationService

