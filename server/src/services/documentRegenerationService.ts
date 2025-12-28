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
import { ConflictDetectionService, ConflictResolutionMethod } from './document/ConflictDetectionService'

interface RegenerationJobParams {
  documentId: string
  templateId?: string
  provider: string
  model?: string
  versionType: 'patch' | 'minor' | 'major'
  temperature?: number
  max_tokens?: number
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
   * Execute document regeneration job with versioning, conflict detection, and approval workflow integration
   */
  static async executeRegenerationJob(params: RegenerationJobParams): Promise<void> {
    const log = childLogger({
      jobId: params.jobId,
      documentId: params.documentId
    })

    try {
      log.info('Starting document regeneration job')

      // Update job status to processing
      await this.updateJobStatus(params.jobId, 'processing', 0, 'Starting regeneration...');
      this.emitProgress({
        jobId: params.jobId,
        progress: 0,
        message: 'Starting regeneration...',
        userId: params.userId
      });

      // Step 0: Check for template conflicts before proceeding
      const conflictResult = await this.detectTemplateConflicts(params);
      if (conflictResult.conflict) {
        log.info('Template conflict detected, requiring resolution', { conflictResult });
        await this.handleTemplateConflict(params, conflictResult);
        return; // Exit after conflict handling
      }

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
        max_tokens: params.max_tokens || 8000,
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

      // Calculate next version using the VersioningService
      // Use actualVersionType (may be upgraded to 'major' if template changed)
      const { VersioningService } = await import('./document/VersioningService');
      const versioningService = new VersioningService();

      const currentVersion = await versioningService.getCurrentVersion(params.documentId);

      // Create new version using the proper method
      const newVersion = await versioningService.createVersion(
        params.documentId,
        actualVersionType === 'major' ? 'template_update' : 'ai_regeneration',
        {
          content: aiResponse.content,
          userId: params.userId,
          changeDescription: `AI regeneration (${actualVersionType}) - previous version v${document.semantic_version}`,
          metadata: {
            provider: params.provider,
            model: params.model || 'default',
            temperature: params.temperature || 0.7,
            regeneration_type: actualVersionType,
            template_changed: actualVersionType === 'major',
            context_summary: aiResponse.context_summary,
            context_token_usage: aiResponse.context_token_usage
          }
        }
      );

      const nextVersion = newVersion.semantic_version;
      const nextIntegerVersion = newVersion.version_number;

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

      // Use the version number from the newly created version
      const versionParts = nextVersion.split('.').map(v => parseInt(v) || 0)

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
           content = $1::text,
           version = $2::integer,
           semantic_version = $3::varchar,
           template_version = $4::varchar,
           word_count = $5::integer,
           character_count = $6::integer,
           updated_by = $7::uuid,
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
         WHERE id = $14::uuid
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

      // Update job with context summary, version info, and conflict status
      await pool.query(
        `UPDATE regeneration_jobs
          SET context_summary = $1,
              metadata = $2,
              conflict_id = NULL
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

        // Enqueue quality audit job (async, non-blocking)
        const { getQueueService } = await import('./queueService')
        const auditJobId = uuidv4()

        getQueueService().addJob('quality-audit', {
          jobId: auditJobId,
          documentId: newDocumentId,
          documentContent: aiResponse.content,
          documentType: templateId,
          projectContext,
          userId: params.userId
        }).catch((auditError: any) => {
          log.error('[AI-REGENERATION] Failed to enqueue quality audit (non-blocking)', {
            documentId: newDocumentId,
            error: auditError.message
          })
        })

        log.info('[AI-REGENERATION] Quality audit job enqueued', { auditJobId })
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
      );

      // Check if there's an active conflict and update it
      const activeConflict = await pool.query(
        `SELECT conflict_id FROM regeneration_jobs WHERE id = $1 AND conflict_id IS NOT NULL`,
        [params.jobId]
      );

      if (activeConflict.rows.length > 0 && activeConflict.rows[0].conflict_id) {
        const conflictService = new ConflictDetectionService();
        await conflictService.resolveConflict(
          activeConflict.rows[0].conflict_id,
          'cancel',
          {
            userId: params.userId,
            notes: 'Regeneration failed, automatically cancelling conflict'
          }
        );
      }

      this.emitFailed({
        jobId: params.jobId,
        userId: params.userId,
        error: errorMessage
      });

      throw error;
    }

  }

  /**
   * Detect template conflicts before regeneration
   */
  private static async detectTemplateConflicts(params: RegenerationJobParams): Promise<any> {
    const log = childLogger({
      jobId: params.jobId,
      documentId: params.documentId
    });

    try {
      const conflictService = new ConflictDetectionService();

      // Get document and template information
      const documentResult = await pool.query(
        `SELECT d.project_id, d.template_id
         FROM documents d
         WHERE d.id = $1`,
        [params.documentId]
      );

      if (documentResult.rows.length === 0) {
        log.warn('Document not found for conflict detection');
        return { conflict: false };
      }

      const document = documentResult.rows[0];
      const templateId = params.templateId || document.template_id;
      const projectId = document.project_id;

      if (!templateId) {
        log.warn('No template associated with document, skipping conflict detection');
        return { conflict: false };
      }

      // Detect conflicts using the conflict detection service
      const conflictResult = await conflictService.detectTemplateConflicts(
        templateId,
        projectId,
        { userId: params.userId }
      );

      return conflictResult;
    } catch (error) {
      log.error('Failed to detect template conflicts', {
        error: error instanceof Error ? error.message : String(error)
      });
      // If conflict detection fails, assume no conflict to avoid blocking regeneration
      return { conflict: false };
    }
  }

  /**
   * Handle template conflicts by prompting user for resolution
   */
  private static async handleTemplateConflict(
    params: RegenerationJobParams,
    conflictResult: any
  ): Promise<void> {
    const log = childLogger({
      jobId: params.jobId,
      documentId: params.documentId
    });

    try {
      // Create conflict record
      const conflictService = new ConflictDetectionService();
      const conflictId = await conflictService.createConflictRecord(
        params.templateId || conflictResult.template.id,
        conflictResult.existingDocuments[0]?.projectId,
        params.userId,
        conflictResult
      );

      // Add audit trail entry for conflict detection
      await pool.query(
        `INSERT INTO document_audit_trail
         (id, document_id, event_type, event_data, user_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          uuidv4(),
          params.documentId,
          'conflict_detected',
          JSON.stringify({
            conflictId,
            conflictDetails: conflictResult,
            jobId: params.jobId,
            templateId: params.templateId || conflictResult.template.id,
            projectId: conflictResult.existingDocuments[0]?.projectId
          }),
          params.userId
        ]
      );

      // Update job status to indicate conflict
      await this.updateJobStatus(
        params.jobId,
        'conflict_detected',
        0,
        `Template conflict detected: ${conflictResult.template.name} already exists in this project`,
        undefined,
        conflictId
      );

      // Emit conflict event to client
      this.emitConflictDetected({
        jobId: params.jobId,
        userId: params.userId,
        conflictId,
        conflictResult
      });

      log.info('Template conflict detected and recorded', { conflictId });
    } catch (error) {
      log.error('Failed to handle template conflict', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Update job status to failed if conflict handling fails
      await this.updateJobStatus(
        params.jobId,
        'failed',
        0,
        'Failed to handle template conflict'
      );

      this.emitFailed({
        jobId: params.jobId,
        userId: params.userId,
        error: 'Failed to handle template conflict'
      });
    }
  }

  /**
   * Emit conflict detected event via WebSocket
   */
  private static emitConflictDetected(data: {
    jobId: string
    userId: string
    conflictId: string
    conflictResult: any
  }): void {
    if (io) {
      io.to(`user:${data.userId}`).emit('document:regeneration:conflict_detected', {
        jobId: data.jobId,
        conflictId: data.conflictId,
        conflictDetails: data.conflictResult,
        resolutionOptions: data.conflictResult.resolutionOptions
      });
    }
  }

  /**
   * Resolve conflict and continue regeneration
   */
  static async resolveConflictAndRegenerate(
    jobId: string,
    resolutionMethod: ConflictResolutionMethod,
    options: {
      userId: string
      notes?: string
      newContent?: string
    }
  ): Promise<void> {
    const log = childLogger({ jobId });

    try {
      // Get job details
      const jobResult = await pool.query(
        `SELECT * FROM regeneration_jobs WHERE id = $1`,
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error(`Regeneration job ${jobId} not found`);
      }

      const job = jobResult.rows[0];
      const jobParams = {
        documentId: job.document_id,
        templateId: job.template_id,
        provider: job.provider,
        model: job.model,
        versionType: job.version_type,
        temperature: job.temperature,
        userId: job.user_id,
        jobId: job.id
      };

      // Resolve the conflict
      const conflictService = new ConflictDetectionService();
      const resolutionResult = await conflictService.resolveConflict(
        job.conflict_id,
        resolutionMethod,
        {
          userId: options.userId,
          notes: options.notes,
          newContent: options.newContent
        }
      );

      if (!resolutionResult.success) {
        throw new Error(`Conflict resolution failed: ${resolutionResult.message}`);
      }

      // Add audit trail entry for conflict resolution
      await pool.query(
        `INSERT INTO document_audit_trail
          (id, document_id, event_type, event_data, user_id, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          uuidv4(),
          job.document_id,
          'conflict_resolved',
          JSON.stringify({
            conflictId: job.conflict_id,
            resolutionMethod,
            resolutionDetails: resolutionResult,
            jobId: job.id
          }),
          options.userId
        ]
      );

      // Update job to remove conflict reference
      await pool.query(
        `UPDATE regeneration_jobs SET conflict_id = NULL WHERE id = $1`,
        [jobId]
      );

      log.info('Conflict resolved successfully, continuing regeneration', {
        resolutionMethod,
        resolutionResult
      });

      // Continue with regeneration
      await this.executeRegenerationJob(jobParams);
    } catch (error) {
      log.error('Failed to resolve conflict and regenerate', {
        error: error instanceof Error ? error.message : String(error)
      });

      await this.updateJobStatus(
        jobId,
        'failed',
        0,
        'Failed to resolve conflict and regenerate document'
      );

      this.emitFailed({
        jobId,
        userId: options.userId,
        error: 'Failed to resolve conflict and regenerate document'
      });
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
    newVersionId?: string,
    conflictId?: string
  ): Promise<void> {
    const updateFields: string[] = [
      'status = $2',
      'progress = $3',
      'progress_message = $4'
    ];
    const values: any[] = [jobId, status, progress, progressMessage];

    if (status === 'processing' && progress === 0) {
      updateFields.push('started_at = NOW()');
    }

    if (status === 'completed' || status === 'failed') {
      updateFields.push('completed_at = NOW()');
    }

    if (status === 'failed') {
      updateFields.push('error_message = $4');
    }

    if (newVersionId) {
      updateFields.push(`new_version_id = $${values.length + 1}`);
      values.push(newVersionId);
    }

    let query = `UPDATE regeneration_jobs
      SET ${updateFields.join(', ')}`;

    // Add conflict_id for conflict_detected status
    if (status === 'conflict_detected' && conflictId) {
      query += `, conflict_id = $${values.length + 1}`;
      values.push(conflictId);
    }

    // Clear conflict_id for non-conflict states
    if (status !== 'conflict_detected') {
      query += `, conflict_id = NULL`;
    }

    query += ' WHERE id = $1';

    await pool.query(query, values);
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

