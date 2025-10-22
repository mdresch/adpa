/**
 * Process Flow Workflow API Routes
 * API endpoints for template processing with project information injection
 */

import { Router } from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import Joi from 'joi'
import { childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import ProcessFlowService from '../services/processFlowService'
import { documentCompressionService } from '../services/documentCompressionService'

const router = Router()

// Initialize service lazily to ensure pool is connected
function getProcessFlowService() {
  if (!pool) {
    throw new Error('Database connection not initialized')
  }
  return new ProcessFlowService(pool)
}

/**
 * GET /api/process-flow/templates
 * Get available templates for processing
 */
router.get('/templates',
  authenticateToken,
  requirePermission('templates.read'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      log.info('Getting available templates for process flow')
      
      const templates = await getProcessFlowService().getAvailableTemplates()
      
      res.json({
        success: true,
        data: templates
      })
      
    } catch (error) {
      log.error('Error getting available templates:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get available templates',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/process-flow/projects
 * Get available projects for processing
 */
router.get('/projects',
  authenticateToken,
  requirePermission('projects.read'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      log.info('Getting available projects for process flow')
      
      const projects = await getProcessFlowService().getAvailableProjects()
      
      res.json({
        success: true,
        data: projects
      })
      
    } catch (error) {
      log.error('Error getting available projects:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get available projects',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/process-flow/projects/:projectId/documents
 * Get project documents for prioritization
 */
router.get('/projects/:projectId/documents',
  authenticateToken,
  requirePermission('documents.read'),
  validateParams(Joi.object({ projectId: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { projectId } = req.params
      log.info(`Getting documents for project ${projectId}`)
      
      const documents = await getProcessFlowService().getProjectDocuments(projectId)
      
      res.json({
        success: true,
        data: documents
      })
      
    } catch (error) {
      log.error('Error getting project documents:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get project documents',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/process-flow/providers/:providerId/models
 * Get available models for a specific AI provider
 */
router.get('/providers/:providerId/models',
  authenticateToken,
  requirePermission('ai.read'),
  validateParams(Joi.object({ providerId: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { providerId } = req.params
      log.info(`Getting models for AI provider ${providerId}`)
      
      const models = await getProcessFlowService().getProviderModels(providerId)
      
      res.json({
        success: true,
        data: models
      })
      
    } catch (error) {
      log.error('Error getting provider models:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get provider models',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/process-flow/prioritize-documents
 * Calculate document priorities based on strategy
 */
router.post('/prioritize-documents',
  authenticateToken,
  requirePermission('documents.read'),
  validate(Joi.object({
    documents: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      content: Joi.any().allow(null),
      content_length: Joi.number().allow(null),
      status: Joi.string().allow(null),
      version: Joi.number().allow(null),
      framework: Joi.string().allow(null),
      metadata: Joi.any().allow(null),
      created_at: Joi.alternatives().try(Joi.date(), Joi.string()).allow(null),
      updated_at: Joi.alternatives().try(Joi.date(), Joi.string()).allow(null),
      template_category: Joi.string().allow(null),
      template_name: Joi.string().allow(null)
    }).unknown(true)).required(),
    strategy: Joi.string().valid('relevance', 'recency', 'importance', 'hybrid').required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { documents, strategy } = req.body
      log.info(`Calculating document priorities using ${strategy} strategy`)
      log.info(`Received ${documents?.length || 0} documents for prioritization`)
      
      // Log document structure for debugging
      if (documents && documents.length > 0) {
        const sampleDoc = documents[0]
        log.info('Sample document structure:', {
          id: sampleDoc.id,
          name: sampleDoc.name,
          hasContent: !!sampleDoc.content,
          contentType: typeof sampleDoc.content,
          contentLength: sampleDoc.content_length,
          status: sampleDoc.status,
          version: sampleDoc.version,
          framework: sampleDoc.framework,
          hasMetadata: !!sampleDoc.metadata,
          created_at: sampleDoc.created_at,
          updated_at: sampleDoc.updated_at,
          template_category: sampleDoc.template_category,
          template_name: sampleDoc.template_name
        })
      }
      
      const prioritizedDocuments = await getProcessFlowService().calculateDocumentPriorities(documents, strategy)
      
      res.json({
        success: true,
        data: prioritizedDocuments
      })
      
    } catch (error) {
      log.error('Error calculating document priorities:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate document priorities',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/process-flow/analyze-context-window
 * Analyze context window utilization
 */
router.post('/analyze-context-window',
  authenticateToken,
  requirePermission('documents.read'),
  validate(Joi.object({
    templateId: Joi.string().uuid().required(),
    projectId: Joi.string().uuid().required(),
    prioritizedDocuments: Joi.array().items(Joi.object({
      documentId: Joi.string().required(),
      documentName: Joi.string().required(),
      priorityScore: Joi.number().required(),
      estimatedTokens: Joi.number().required()
    })).required(),
    maxTokens: Joi.number().min(1000).max(10000000).required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { templateId, projectId, prioritizedDocuments, maxTokens } = req.body
      log.info(`Analyzing context window for template ${templateId} and project ${projectId}`)
      
      const analysis = await getProcessFlowService().analyzeContextWindow(
        templateId,
        projectId,
        prioritizedDocuments,
        maxTokens
      )
      
      res.json({
        success: true,
        data: analysis
      })
      
    } catch (error) {
      log.error('Error analyzing context window:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to analyze context window',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/process-flow/start-workflow
 * Start workflow processing (as background job)
 */
router.post('/start-workflow',
  authenticateToken,
  requirePermission('documents.create'),
  validate(Joi.object({
    templateId: Joi.string().uuid().required(),
    projectId: Joi.string().uuid().required(),
    maxTokens: Joi.number().min(1000).max(10000000).default(2000000),
    priorityStrategy: Joi.string().valid('relevance', 'recency', 'importance', 'hybrid').default('hybrid'),
    compressionLevel: Joi.number().min(0.1).max(1).default(0.8),
    compressionMethod: Joi.string().valid('truncate', 'summarize', 'smart', 'keyword').default('summarize'),
    includeMetadata: Joi.boolean().default(true),
    includeRelationships: Joi.boolean().default(true),
    includeStakeholders: Joi.boolean().default(false)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const config = req.body
      const userId = req.user?.id
      log.info(`Queueing workflow processing for template ${config.templateId} and project ${config.projectId}`)
      
      // Import addJob from queueService
      const { addJob } = await import('../services/queueService')
      
      // Generate job ID
      const jobId = require('crypto').randomUUID()
      
      // Queue the job for async processing
      await addJob('process-flow', {
        jobId,
        userId,
        config
      }, {
        priority: 5,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      })
      
      log.info(`Process-flow job queued: ${jobId}`)
      
      // Return job information immediately (async processing)
      res.status(202).json({
        success: true,
        message: 'Process flow workflow queued for processing',
        data: {
          jobId,
          templateId: config.templateId,
          projectId: config.projectId,
          status: 'queued',
          message: 'Your document is being generated in the background. Check the Jobs page for progress.'
        }
      })
      
    } catch (error) {
      log.error('Error queueing workflow processing:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to queue workflow processing',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/process-flow/workflow/:workflowId/status
 * Get workflow processing status
 */
router.get('/workflow/:workflowId/status',
  authenticateToken,
  requirePermission('documents.read'),
  validateParams(Joi.object({ workflowId: Joi.string().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { workflowId } = req.params
      log.info(`Getting workflow status for ${workflowId}`)
      
      // In a real implementation, this would check the actual workflow status
      // For now, return a mock status
      res.json({
        success: true,
        data: {
          workflowId,
          status: 'completed',
          progress: 100,
          currentStep: 6,
          totalSteps: 6,
          startTime: new Date(Date.now() - 30000),
          endTime: new Date(),
          totalTokens: 1850000,
          estimatedTimeRemaining: 0
        }
      })
      
    } catch (error) {
      log.error('Error getting workflow status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow status',
        message: error.message
      })
    }
  }
)

/**
 * Test AI summarization on a single document
 */
router.post('/test-summarization',
  authenticateToken,
  requirePermission('documents.read'),
  validate(Joi.object({
    documentId: Joi.string().uuid().required(),
    compressionLevel: Joi.number().min(0.1).max(1).default(0.8),
    compressionMethod: Joi.string().valid('truncate', 'summarize', 'smart').default('summarize'),
    preserveStructure: Joi.boolean().default(true),
    preserveKeywords: Joi.boolean().default(true)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { documentId, compressionLevel, compressionMethod, preserveStructure, preserveKeywords } = req.body

      // Get document from database
      const docResult = await pool.query(
        'SELECT id, name, content, LENGTH(content::text) as content_length FROM documents WHERE id = $1',
        [documentId]
      )

      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' })
      }

      const document = docResult.rows[0]
      if (!document.content) {
        return res.status(400).json({ error: 'Document has no content' })
      }

      // Compress the document
      const compressionOptions = {
        compressionLevel,
        preserveStructure,
        preserveKeywords,
        method: compressionMethod
      }

      const compressed = await documentCompressionService.compressDocument(document.content, compressionOptions)

      log.info(`Document summarization completed: ${document.name}`, {
        originalTokens: compressed.originalTokens,
        compressedTokens: compressed.compressedTokens,
        compressionRatio: compressed.compressionRatio,
        method: compressed.method
      })

      res.json({
        success: true,
        document: {
          id: document.id,
          name: document.name
        },
        compression: {
          originalTokens: compressed.originalTokens,
          compressedTokens: compressed.compressedTokens,
          compressionRatio: compressed.compressionRatio,
          method: compressed.method,
          compressionLevel: (compressionLevel * 100).toFixed(0) + '%'
        },
        originalContent: document.content,
        compressedContent: compressed.compressedContent,
        statistics: {
          originalLength: document.content.length,
          compressedLength: compressed.compressedContent.length,
          charactersSaved: document.content.length - compressed.compressedContent.length,
          tokensSaved: compressed.originalTokens - compressed.compressedTokens
        }
      })

    } catch (error) {
      log.error('Document summarization failed:', error)
      res.status(500).json({ 
        error: 'Document summarization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
)

/**
 * GET /api/process-flow/workflow/:workflowId/document
 * Get the final document generated by a workflow
 */
router.get('/workflow/:workflowId/document',
  authenticateToken,
  requirePermission('documents.read'),
  validateParams(Joi.object({ workflowId: Joi.string().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { workflowId } = req.params
      log.info(`Getting final document for workflow ${workflowId}`)
      
      // In a real implementation, this would retrieve the document from storage
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          workflowId,
          document: {
            content: 'This would be the final document content generated by the workflow',
            format: 'markdown',
            generatedAt: new Date().toISOString(),
            metadata: {
              templateId: 'template-uuid',
              projectId: 'project-uuid',
              compressionMethod: 'summarize',
              compressionLevel: 0.8,
              totalTokens: 15000,
              qualityScore: 0.87
            }
          }
        }
      })
      
    } catch (error) {
      log.error('Error getting workflow document:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow document',
        message: error.message
      })
    }
  }
)

export default router
