/**
 * Pipeline Worker
 * Processes pipeline jobs from the queue
 */

import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { PipelineOrchestrator } from '../modules/multiStageDocumentProcessor/services/pipelineOrchestrator'
import type { DocumentProcessingRequest } from '../modules/multiStageDocumentProcessor/types'

const pipelineOrchestrator = new PipelineOrchestrator()

export async function processPipelineJob(job: any) {
  const {
    jobId,
    requestId,
    templateId,
    projectId,
    userId,
    contextBundle,
    processingConfig,
    enhancementConfig,
    qualityConfig,
    outputConfig
  } = job.data

  logger.info('Processing pipeline job', { jobId, requestId, templateId, projectId })

  try {
    // Update status to running
    await pool.query(
      `
      UPDATE pipeline_executions
      SET status = 'running', started_at = NOW(), updated_at = NOW()
      WHERE job_id = $1
      `,
      [jobId]
    )

    // Build document processing request
    const request: DocumentProcessingRequest = {
      request_id: requestId,
      template_id: templateId,
      project_id: projectId,
      user_id: userId,
      context_bundle: contextBundle || {},
      processing_config: processingConfig || {},
      enhancement_config: enhancementConfig || {},
      quality_config: qualityConfig || {},
      output_config: outputConfig || {},
      created_at: new Date()
    }

    // Execute the pipeline
    const stageResults = await pipelineOrchestrator.executePipeline(request, jobId)

    // Calculate overall quality score
    const qualityScores = stageResults
      .filter(r => r.quality_score !== undefined)
      .map(r => r.quality_score!)
    
    const overallQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : null

    // Find the final document from output formatting stage
    const outputFormattingResult = stageResults.find(r => r.stage_type === 'output_formatting')
    let finalDocumentId = outputFormattingResult?.output?.output_data?.document_id || null

    logger.info('🔍 Output formatting result check', {
      hasOutputFormattingResult: !!outputFormattingResult,
      hasOutput: !!outputFormattingResult?.output,
      hasOutputData: !!outputFormattingResult?.output?.output_data,
      outputDataKeys: outputFormattingResult?.output?.output_data ? Object.keys(outputFormattingResult.output.output_data) : [],
      finalDocumentId
    })

    // If no document ID, create a new document in the documents table
    if (!finalDocumentId && outputFormattingResult) {
      try {
        // Extract content from output formatting stage
        // The structure is: output_data.formatted_document.formatted_outputs[primary_format].content
        const formattedDocument = outputFormattingResult.output?.output_data?.formatted_document
        const formattingMetadata = outputFormattingResult.output?.output_data?.formatting_metadata
        const primaryFormat = formattingMetadata?.primary_format || 'markdown'
        
        const finalContent = formattedDocument?.formatted_outputs?.[primaryFormat]?.content ||
                            formattedDocument?.document?.content ||
                            outputFormattingResult.output?.output_data?.content
        
        logger.info('🔍 Attempting to extract final content', {
          hasFormattedDocument: !!formattedDocument,
          hasFormattedOutputs: !!formattedDocument?.formatted_outputs,
          primaryFormat,
          hasContentInPrimaryFormat: !!formattedDocument?.formatted_outputs?.[primaryFormat]?.content,
          hasDocumentContent: !!formattedDocument?.document?.content,
          finalContentLength: finalContent?.length || 0,
          formattedOutputsKeys: formattedDocument?.formatted_outputs ? Object.keys(formattedDocument.formatted_outputs) : []
        })
        
        if (finalContent) {
          // Get template info for document name and metadata
          const templateResult = await pool.query(
            'SELECT name, framework, content, category, description FROM templates WHERE id = $1',
            [templateId]
          )
          const templateName = templateResult.rows[0]?.name || 'Untitled Template'
          const framework = templateResult.rows[0]?.framework || 'N/A'
          const templateVersion = 1  // Templates don't have version column
          const templateCategory = templateResult.rows[0]?.category || 'General'
          const templateTags = []  // Templates don't have tags column
          const templateDescription = templateResult.rows[0]?.description || ''
          
          // Get user info
          const userResult = await pool.query(
            'SELECT name, email FROM users WHERE id = $1',
            [userId]
          )
          const userName = userResult.rows[0]?.name || 'Unknown User'
          const userEmail = userResult.rows[0]?.email || ''
          
          // Calculate file metrics
          const contentBytes = Buffer.byteLength(finalContent, 'utf8')
          const contentSizeKB = (contentBytes / 1024).toFixed(2)
          const wordCount = finalContent.split(/\s+/).filter(w => w.length > 0).length
          const characterCount = finalContent.length
          
          // Generate file hash (SHA-256)
          const crypto = require('crypto')
          const fileHash = crypto.createHash('sha256').update(finalContent).digest('hex')
          
          // Calculate compression ratio (if compression was applied)
          const aiGenResult = stageResults.find(r => r.stage_type === 'ai_generation')
          const originalLength = aiGenResult?.input?.input_data?.processed_template?.content?.length || finalContent.length
          const compressionRatio = originalLength > 0 ? (finalContent.length / originalLength).toFixed(3) : '1.000'
          
          // Calculate total tokens used across all AI calls
          const totalTokens = stageResults.reduce((sum, stage) => {
            const tokens = stage.output?.output_data?.generation_results?.[0]?.tokens_used ||
                         stage.output?.output_data?.total_tokens ||
                         0
            return sum + tokens
          }, 0)
          
          // Estimate generation cost (rough estimate based on tokens)
          // Gemini Flash: ~$0.00001 per 1K tokens (very rough estimate)
          const costPer1kTokens = 0.00001
          const estimatedCost = (totalTokens / 1000) * costPer1kTokens
          
          // Build comprehensive metadata from all pipeline stages
          const pipelineMetadata = {
            // Document Properties
            document: {
              name: `${templateName} - ${new Date().toLocaleDateString()}`,
              template_name: templateName,
              template_id: templateId,
              template_version: templateVersion,
              template_description: templateDescription,
              framework: framework,
              category: templateCategory,
              tags: templateTags,
              generated_at: new Date().toISOString(),
              last_updated: new Date().toISOString(),
              language: 'en', // TODO: Auto-detect language
              encoding: 'UTF-8',
              mime_type: 'text/markdown'
            },
            
            // Author Information
            author: {
              user_id: userId,
              name: userName,
              email: userEmail,
              role: 'Document Author',
              generated_at: new Date().toISOString()
            },
            
            // File Metrics
            file_metrics: {
              word_count: wordCount,
              character_count: characterCount,
              file_size_bytes: contentBytes,
              file_size_kb: contentSizeKB,
              file_hash: fileHash,
              compression_ratio: parseFloat(compressionRatio)
            },
            
            // Pipeline execution info
            pipeline: {
              job_id: jobId,
              request_id: requestId,
              completed_at: new Date().toISOString(),
              total_duration_ms: stageResults.reduce((sum, r) => sum + (r.execution_time || 0), 0),
              total_duration_seconds: (stageResults.reduce((sum, r) => sum + (r.execution_time || 0), 0) / 1000).toFixed(2),
              overall_quality_score: overallQualityScore,
              stages_completed: stageResults.length,
              framework: framework
            },
            
            // AI Usage & Cost
            ai_usage: {
              provider_used: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.provider_used || 'unknown',
              model_used: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.model_used || 'unknown',
              total_tokens: totalTokens,
              estimated_cost_usd: estimatedCost.toFixed(6),
              ai_calls_made: stageResults.filter(r => 
                r.stage_type === 'ai_generation' || 
                r.stage_type === 'template_processing'
              ).length
            },
            
            // Stage-by-stage metrics
            stages: stageResults.map(stage => ({
              stage_id: stage.stage_id,
              stage_type: stage.stage_type,
              status: stage.status,
              execution_time_ms: stage.execution_time,
              quality_score: stage.quality_score,
              started_at: stage.started_at,
              completed_at: stage.completed_at
            })),
            
            // Context gathering metrics
            context_gathering: stageResults.find(r => r.stage_type === 'context_gathering')?.output?.output_data,
            
            // Template processing metrics
            template_processing: {
              variables_resolved: stageResults.find(r => r.stage_type === 'template_processing')?.output?.output_data?.variables_resolved?.length || 0,
              ai_enhancements_applied: stageResults.find(r => r.stage_type === 'template_processing')?.output?.output_data?.ai_enhancements?.length || 0,
              quality_score: stageResults.find(r => r.stage_type === 'template_processing')?.quality_score
            },
            
            // AI generation metrics
            ai_generation: {
              sections_generated: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.sections_generated || 0,
              ai_provider_used: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.provider_used,
              model_used: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.model_used,
              total_tokens: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.tokens_used,
              quality_score: stageResults.find(r => r.stage_type === 'ai_generation')?.quality_score,
              refinements_applied: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.refinements_applied || 0
            },
            
            // Context injection metrics
            context_injection: {
              injections_applied: stageResults.find(r => r.stage_type === 'context_injection')?.output?.output_data?.context_injections || 0,
              personalization_modifications: stageResults.find(r => r.stage_type === 'context_injection')?.output?.output_data?.personalization_modifications || 0,
              quality_score: stageResults.find(r => r.stage_type === 'context_injection')?.quality_score
            },
            
            // Quality assurance metrics
            quality_assurance: {
              assessments_performed: stageResults.find(r => r.stage_type === 'quality_assurance')?.output?.output_data?.assessments_performed || 0,
              issues_found: stageResults.find(r => r.stage_type === 'quality_assurance')?.output?.output_data?.issues_found || 0,
              quality_score: stageResults.find(r => r.stage_type === 'quality_assurance')?.quality_score
            },
            
            // Output formatting metrics
            output_formatting: {
              primary_format: outputFormattingResult?.output?.output_data?.primary_format?.format || 'markdown',
              formats_generated: outputFormattingResult?.output?.output_data?.formats_generated || 1,
              quality_score: outputFormattingResult?.quality_score
            },
            
            // Comprehensive Quality Metrics
            quality_metrics: {
              overall_score: overallQualityScore,
              context_quality: stageResults.find(r => r.stage_type === 'context_gathering')?.quality_score,
              template_quality: stageResults.find(r => r.stage_type === 'template_processing')?.quality_score,
              generation_quality: stageResults.find(r => r.stage_type === 'ai_generation')?.quality_score,
              injection_quality: stageResults.find(r => r.stage_type === 'context_injection')?.quality_score,
              assurance_quality: stageResults.find(r => r.stage_type === 'quality_assurance')?.quality_score,
              formatting_quality: stageResults.find(r => r.stage_type === 'output_formatting')?.quality_score,
              assessments_performed: stageResults.find(r => r.stage_type === 'quality_assurance')?.output?.output_data?.assessments_performed || 0,
              issues_found: stageResults.find(r => r.stage_type === 'quality_assurance')?.output?.output_data?.issues_found || 0
            },
            
            // Generated timestamp
            generated_at: new Date().toISOString(),
            generated_by_pipeline: true,
            pipeline_version: '1.0.0'
          }
          
          // Create document in the documents table
          const documentResult = await pool.query(
            `INSERT INTO documents (
              id, name, content, project_id, template_id, created_by,
              status, word_count, character_count, version, metadata, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
            ) RETURNING id`,
            [
              `${templateName} - ${new Date().toLocaleDateString()}`,
              finalContent,
              projectId,
              templateId,
              userId,
              'generated', // AI-generated, requires human review before publishing
              wordCount,
              characterCount,
              1, // Version
              JSON.stringify(pipelineMetadata) // All comprehensive pipeline metrics
            ]
          )
          
          finalDocumentId = documentResult.rows[0].id
          logger.info('📄 Final document saved to project library with comprehensive metadata', {
            documentId: finalDocumentId,
            documentName: `${templateName} - ${new Date().toLocaleDateString()}`,
            projectId,
            templateId,
            templateVersion,
            templateCategory,
            templateTags: templateTags.join(', '),
            framework,
            author: userName,
            authorEmail: userEmail,
            wordCount,
            characterCount,
            fileSizeKB: contentSizeKB,
            fileHash: fileHash.substring(0, 16) + '...',
            aiProvider: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.provider_used,
            aiModel: stageResults.find(r => r.stage_type === 'ai_generation')?.output?.output_data?.generation_results?.[0]?.model_used,
            totalTokens,
            estimatedCostUSD: estimatedCost.toFixed(6),
            overallQuality: overallQualityScore,
            processingTimeSeconds: (stageResults.reduce((sum, r) => sum + (r.execution_time || 0), 0) / 1000).toFixed(2),
            stagesCompleted: stageResults.length
          })
        } else {
          logger.warn('⚠️ No final content extracted - document not saved', {
            hasOutputFormattingResult: !!outputFormattingResult,
            hasFormattedDocument: !!outputFormattingResult?.output?.output_data?.formatted_document,
            hasPrimaryFormat: !!outputFormattingResult?.output?.output_data?.primary_format,
            hasContent: !!outputFormattingResult?.output?.output_data?.content
          })
        }
      } catch (error) {
        logger.error('Failed to save final document:', error)
        // Continue anyway - pipeline completed successfully
      }
    } else {
      logger.warn('⚠️ Skipping document save', {
        finalDocumentId,
        hasOutputFormattingResult: !!outputFormattingResult,
        reason: finalDocumentId ? 'Document ID already set' : 'No output formatting result'
      })
    }

    // Update status to completed
    await pool.query(
      `
      UPDATE pipeline_executions
      SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        progress = 100,
        overall_quality_score = $2,
        final_document_id = $3,
        stages_completed = $4,
        stages_remaining = '{}'
      WHERE job_id = $1
      `,
      [
        jobId,
        overallQualityScore,
        finalDocumentId,
        stageResults.map(r => r.stage_id)
      ]
    )

    logger.info('Pipeline job completed successfully', {
      jobId,
      requestId,
      stagesCompleted: stageResults.length,
      overallQualityScore,
      finalDocumentId
    })

    return {
      success: true,
      jobId,
      requestId,
      stageResults,
      overallQualityScore,
      finalDocumentId
    }

  } catch (error) {
    logger.error('Pipeline job failed', {
      jobId,
      requestId,
      error: error.message,
      stack: error.stack
    })

    // Update status to failed
    await pool.query(
      `
      UPDATE pipeline_executions
      SET 
        status = 'failed',
        updated_at = NOW(),
        error = $2,
        error_details = $3
      WHERE job_id = $1
      `,
      [
        jobId,
        error.message,
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          timestamp: new Date()
        })
      ]
    )

    throw error
  }
}

/**
 * Register pipeline worker with queue service
 */
export function registerPipelineWorker(queueService: any) {
  logger.info('Registering pipeline worker')
  
  queueService.process('pipeline-processing', async (job: any) => {
    return await processPipelineJob(job)
  })

  logger.info('Pipeline worker registered successfully')
}

