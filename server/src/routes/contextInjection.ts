/**
 * Context Injection Engine API Routes
 * REST API endpoints for advanced context injection operations with strategic injection capabilities
 */

import { Router } from 'express'
import { logger } from '../utils/logger'
import { contextInjectionService } from '../modules/contextInjection/service'
import type { ContextInjectionRequest } from '../modules/contextInjection/types'

const router = Router()

/**
 * POST /api/context-injection/inject
 * Inject context into a template
 */
router.post('/inject', async (req, res) => {
  try {
    const request: ContextInjectionRequest = {
      template_id: req.body.template_id,
      project_id: req.body.project_id,
      user_id: req.user?.id || req.body.user_id,
      variables: req.body.variables,
      config_override: req.body.config_override
    }

    // Validate required fields
    if (!request.template_id) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      })
    }

    if (!request.user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }

    logger.info('Context injection request received', {
      template_id: request.template_id,
      project_id: request.project_id,
      user_id: request.user_id
    })

    const response = await contextInjectionService.injectContext(request)

    if (response.success) {
      res.json({
        success: true,
        data: {
          bundle_id: response.bundle.bundle_id,
          template_id: response.bundle.template_id,
          project_id: response.bundle.project_id,
          user_id: response.bundle.user_id,
          results_count: response.bundle.results.length,
          successful_sources: response.bundle.metadata.successful_sources,
          failed_sources: response.bundle.metadata.failed_sources,
          total_size_bytes: response.bundle.metadata.total_size_bytes,
          processing_time_ms: response.bundle.metadata.processing_time_ms,
          injection_strategy: response.bundle.injection_strategy,
          max_context_length: response.bundle.max_context_length
        },
        warnings: response.warnings
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Context injection failed',
        details: response.errors
      })
    }

  } catch (error) {
    logger.error('Context injection API error', {
      error: error.message,
      stack: error.stack
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/context-injection/bundle/:bundleId
 * Get context bundle by ID
 */
router.get('/bundle/:bundleId', async (req, res) => {
  try {
    const { bundleId } = req.params

    if (!bundleId) {
      return res.status(400).json({
        success: false,
        error: 'Bundle ID is required'
      })
    }

    const bundle = await contextInjectionService.getContextBundle(bundleId)

    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: 'Context bundle not found'
      })
    }

    res.json({
      success: true,
      data: bundle
    })

  } catch (error) {
    logger.error('Get context bundle API error', {
      bundle_id: req.params.bundleId,
      error: error.message
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/context-injection/metrics
 * Get context injection metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const { source_id } = req.query

    const metrics = await contextInjectionService.getContextMetrics(
      source_id as string
    )

    res.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    logger.error('Get context metrics API error', {
      error: error.message
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * POST /api/context-injection/test-source
 * Test a context source configuration
 */
router.post('/test-source', async (req, res) => {
  try {
    const { source, template_id, project_id, user_id } = req.body

    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source configuration is required'
      })
    }

    // Create a test request
    const testRequest: ContextInjectionRequest = {
      template_id: template_id || 'test-template',
      project_id,
      user_id: user_id || req.user?.id || 'test-user',
      config_override: {
        enabled: true,
        sources: [source],
        injection_strategy: 'prepend',
        max_context_length: 1000
      }
    }

    logger.info('Testing context source', {
      source_id: source.source_id,
      source_type: source.type
    })

    const response = await contextInjectionService.injectContext(testRequest)

    if (response.success && response.bundle.results.length > 0) {
      const result = response.bundle.results[0]

      res.json({
        success: true,
        data: {
          source_id: result.source_id,
          source_name: result.source_name,
          has_data: result.data !== null,
          data_size_bytes: result.metadata.size_bytes,
          relevance_score: result.metadata.relevance_score,
          freshness_score: result.metadata.freshness_score,
          confidence_score: result.metadata.confidence_score,
          errors: result.errors,
          warnings: result.warnings
        }
      })
    } else {
      res.status(400).json({
        success: false,
        error: 'Context source test failed',
        details: response.errors
      })
    }

  } catch (error) {
    logger.error('Test context source API error', {
      error: error.message
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

/**
 * GET /api/context-injection/sources
 * Get available context source types and configurations
 */
router.get('/sources', async (req, res) => {
  try {
    const sourceTypes = [
      {
        type: 'project_data',
        name: 'Project Data',
        description: 'Retrieve data from project information and metadata',
        required_parameters: ['project_id'],
        optional_parameters: ['query'],
        example: {
          type: 'project_data',
          source_id: 'current_project',
          source_name: 'Current Project Context',
          parameters: { project_id: '{{project_id}}' },
          enabled: true,
          weight: 1.0
        }
      },
      {
        type: 'user_preferences',
        name: 'User Preferences',
        description: 'Retrieve user profile and preference data',
        required_parameters: ['user_id'],
        optional_parameters: ['query'],
        example: {
          type: 'user_preferences',
          source_id: 'user_profile',
          source_name: 'User Profile',
          parameters: { user_id: '{{user_id}}' },
          enabled: true,
          weight: 0.8
        }
      },
      {
        type: 'document_history',
        name: 'Document History',
        description: 'Retrieve data from historical documents and patterns',
        required_parameters: [],
        optional_parameters: ['template_id', 'project_id', 'user_id', 'query'],
        example: {
          type: 'document_history',
          source_id: 'similar_documents',
          source_name: 'Similar Documents',
          parameters: { template_id: '{{template_id}}' },
          enabled: true,
          weight: 0.6
        }
      },
      {
        type: 'external_api',
        name: 'External API',
        description: 'Retrieve data from external APIs and services',
        required_parameters: ['query'],
        optional_parameters: ['api_key', 'api_token', 'method', 'body'],
        example: {
          type: 'external_api',
          source_id: 'best_practices_api',
          source_name: 'Best Practices API',
          query: 'https://api.example.com/best-practices',
          parameters: { api_key: '{{api_key}}' },
          enabled: true,
          weight: 0.8
        }
      },
      {
        type: 'database_query',
        name: 'Database Query',
        description: 'Execute custom database queries for context data',
        required_parameters: ['query'],
        optional_parameters: ['parameters'],
        example: {
          type: 'database_query',
          source_id: 'custom_data',
          source_name: 'Custom Data Query',
          query: 'SELECT * FROM custom_table WHERE project_id = {{project_id}}',
          parameters: { project_id: '{{project_id}}' },
          enabled: true,
          weight: 0.7
        }
      },
      {
        type: 'file_content',
        name: 'File Content',
        description: 'Read content from files for context data',
        required_parameters: ['file_path'],
        optional_parameters: [],
        example: {
          type: 'file_content',
          source_id: 'config_file',
          source_name: 'Configuration File',
          parameters: { file_path: '/path/to/config.json' },
          enabled: true,
          weight: 0.5
        }
      }
    ]

    res.json({
      success: true,
      data: {
        source_types: sourceTypes,
        injection_strategies: [
          {
            value: 'prepend',
            name: 'Prepend',
            description: 'Add context at the beginning of the template'
          },
          {
            value: 'append',
            name: 'Append',
            description: 'Add context at the end of the template'
          },
          {
            value: 'interleave',
            name: 'Interleave',
            description: 'Mix context throughout the template content'
          },
          {
            value: 'structured',
            name: 'Structured',
            description: 'Inject context in a structured format'
          }
        ],
        context_priorities: [
          { value: 'high', name: 'High', description: 'High priority context' },
          { value: 'medium', name: 'Medium', description: 'Medium priority context' },
          { value: 'low', name: 'Low', description: 'Low priority context' }
        ]
      }
    })

  } catch (error) {
    logger.error('Get context sources API error', {
      error: error.message
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
})

export default router
