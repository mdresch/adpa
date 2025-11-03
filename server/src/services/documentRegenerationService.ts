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
import { v4 as uuidv4 } from 'uuid'

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
        `SELECT d.*, 
                p.name as project_name, 
                p.framework, 
                t.name as template_name,
                t.prompt_version as current_template_version
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
      
      // Check if template version changed → force major version bump
      let actualVersionType = params.versionType
      const currentTemplateVersion = document.current_template_version
      const documentTemplateVersion = document.template_version
      
      if (currentTemplateVersion && documentTemplateVersion && 
          parseInt(currentTemplateVersion) !== parseInt(documentTemplateVersion)) {
        log.info(`Template version changed: v${documentTemplateVersion} → v${currentTemplateVersion}, forcing MAJOR version bump`)
        actualVersionType = 'major'
        
        await this.updateJobStatus(
          params.jobId, 
          'processing', 
          15, 
          `Template version changed (v${documentTemplateVersion} → v${currentTemplateVersion}), upgrading to major version...`
        )
        this.emitProgress({
          jobId: params.jobId,
          progress: 15,
          message: `Template version changed, upgrading to major version...`,
          userId: params.userId
        })
      }

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
      } catch (error: unknown) {
        // Handle missing tables gracefully
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        log.warn('Could not fetch all context stats, fetching available data', { error: errorMessage })
        
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
        } catch (fallbackError: unknown) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          log.warn('Could not fetch context stats, continuing without them', { error: fallbackMessage })
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

      // Calculate next version using the new function for documents
      // Use actualVersionType (may be upgraded to 'major' if template changed)
      const versionResult = await pool.query(
        `SELECT calculate_next_document_version($1::UUID, $2::VARCHAR(10)) as next_version`,
        [params.documentId, actualVersionType]
      )
      const nextVersion = versionResult.rows[0].next_version
      
      log.info(`Version calculation: ${actualVersionType} → ${nextVersion}`, {
        requestedType: params.versionType,
        actualType: actualVersionType,
        templateChanged: actualVersionType === 'major' && params.versionType !== 'major'
      })

      // Step 5: Save current version to history, then update in-place (85%)
      log.info(`Updating existing document to version ${nextVersion}`)
      await this.updateJobStatus(params.jobId, 'processing', 85, `Creating version ${nextVersion}...`)
      this.emitProgress({
        jobId: params.jobId,
        progress: 85,
        message: `Creating version ${nextVersion}...`,
        userId: params.userId
      })

      // Calculate word count
      const wordCount = aiResponse.content.trim().split(/\s+/).length
      const characterCount = aiResponse.content.length

      // Parse semantic version parts for integer increment
      const versionParts = nextVersion.split('.').map(v => parseInt(v) || 0)
      const nextIntegerVersion = document.version + 1

      // 📸 STEP 5A: Save current document state to document_versions table
      log.info(`Saving current version ${document.semantic_version} to history`)
      await pool.query(
        `INSERT INTO document_versions
         (id, document_id, version, semantic_version, content, author_id, created_at, change_type, change_description, generation_metadata)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
         ON CONFLICT (document_id, version) DO NOTHING`,
        [
          uuidv4(),
          params.documentId,
          document.version.toString(),
          document.semantic_version || '1.0.0',
          document.content,
          params.userId,
          actualVersionType === 'major' ? 'template_change' : 'ai_regeneration',
          `AI regeneration (${actualVersionType}) - previous version v${document.semantic_version}`,
          document.generation_metadata || null
        ]
      )

      // 📝 STEP 5B: Update existing document with new content and version
      log.info(`Updating document ${params.documentId} to version ${nextVersion}`)
      const updateResult = await pool.query(
        `UPDATE documents
         SET 
           content = $1,
           version = $2,
           semantic_version = $3,
           template_version = $4,
           word_count = $5,
           character_count = $6,
           updated_by = $7,
           updated_at = NOW(),
           is_regeneration = true,
           generation_metadata = $8::jsonb,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{regeneration}',
             jsonb_build_object(
               'regenerated_at', NOW(),
               'regenerated_by', $7::text,
               'previous_version', $9::text,
               'new_version', $3::text,
               'regeneration_type', $10::text,
               'template_changed', $11::boolean,
               'provider', $12::text,
               'model', $13::text
             )
           )
         WHERE id = $14
         RETURNING id, name, semantic_version`,
        [
          aiResponse.content,
          nextIntegerVersion,
          nextVersion,
          currentTemplateVersion?.toString() || '1',
          wordCount,
          characterCount,
          params.userId,
          JSON.stringify({
            provider: params.provider,
            model: params.model || 'default',
            temperature: params.temperature || 0.7,
            context_summary: aiResponse.context_summary,
            context_token_usage: aiResponse.context_token_usage,
            template_id: templateId,
            template_version: currentTemplateVersion,
            generated_at: new Date().toISOString(),
            regeneration_type: actualVersionType,
            requested_version_type: params.versionType,
            version_upgraded: actualVersionType !== params.versionType
          }),
          document.semantic_version || '1.0.0', // previous version
          actualVersionType, // change type
          actualVersionType === 'major', // template_changed boolean
          params.provider,
          params.model || 'default',
          params.documentId // WHERE id = ...
        ]
      )

      const updatedDocument = updateResult.rows[0]
      const newDocumentId = params.documentId // Use existing ID, not new one

      // Step 6: Complete job (100%)
      log.info('Regeneration completed successfully')
      await this.updateJobStatus(
        params.jobId, 
        'completed', 
        100, 
        'Regeneration completed successfully',
        newDocumentId
      )
      
      // Update job with context summary and version info
      await pool.query(
        `UPDATE regeneration_jobs 
         SET context_summary = $1,
             metadata = $2
         WHERE id = $3`,
        [
          JSON.stringify({
            documents: stats.doc_count,
            stakeholders: stats.stakeholder_count,
            baselines: stats.baseline_count,
            ai_summary: aiResponse.context_summary
          }),
          JSON.stringify({
            document_id: newDocumentId, // Same document ID (updated in-place)
            document_name: updatedDocument.name,
            previous_version: document.semantic_version,
            new_version: nextVersion,
            version_type: actualVersionType,
            template_changed: actualVersionType === 'major'
          }),
          params.jobId
        ]
      )

      // 🔥 Trigger quality audit after AI regeneration
      try {
        const { qualityAuditService } = await import('./qualityAuditService')
        
        log.info('[AI-REGENERATION] Triggering quality audit after version increment', {
          documentId: newDocumentId,
          documentName: updatedDocument.name,
          previousVersion: document.semantic_version,
          newVersion: nextVersion,
          versionType: actualVersionType,
          provider: params.provider,
          model: params.model
        })
        
        // Get project context for audit
        const projectQuery = await pool.query(
          'SELECT id, name, framework, description FROM projects WHERE id = $1',
          [projectId]
        )
        const projectContext = projectQuery.rows[0] || { id: projectId, name: 'Project' }
        
        // Trigger audit asynchronously (don't block response)
        qualityAuditService.auditDocument(
          newDocumentId,
          aiResponse.content,
          templateId,
          projectContext,
          params.userId
        ).catch((auditError: any) => {
          log.error('[AI-REGENERATION] Quality audit failed (non-blocking)', {
            documentId: newDocumentId,
            error: auditError.message
          })
        })
        
        log.info('[AI-REGENERATION] Quality audit triggered successfully (async)')
      } catch (error: any) {
        log.warn('[AI-REGENERATION] Failed to trigger quality audit', {
          documentId: newDocumentId,
          error: error.message
        })
      }

      this.emitComplete({
        jobId: params.jobId,
        userId: params.userId,
        versionId: newDocumentId,
        versionNumber: nextVersion,
        documentName: updatedDocument.name
      })

      log.info('Document regeneration job completed successfully')
      
    } catch (error: unknown) {
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
    documentName?: string
  }): void {
    if (io) {
      io.to(`user:${data.userId}`).emit('document:regeneration:completed', {
        jobId: data.jobId,
        versionId: data.versionId,
        versionNumber: data.versionNumber,
        documentName: data.documentName
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

