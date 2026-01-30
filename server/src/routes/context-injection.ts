import { Router } from 'express';
import Joi from "joi";
import { contextInjectionService } from '../services/contextInjectionService';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logger } from '../utils/logger';
import { pool } from '../database/connection';

/**
 * Context Injection API Routes
 * REST API endpoints for context injection operations
 */

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

/**
 * POST /api/context-injection/inject
 * Inject context into template content
 */
router.post('/inject', validate(Joi.object({
  templateContent: Joi.string().required(),
  projectId: Joi.string().required(),
  config: Joi.object().required()
})), async (req, res) => {
  try {
    const { templateContent, projectId, config } = req.body
    const userId = req.user?.id

    // Fetch project context
    const projectContext = await getProjectContext(projectId)
    if (!projectContext) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    // Inject context
    const result = await contextInjectionService.injectContext(
      templateContent,
      projectContext,
      config
    )

    logger.info(`Context injection completed for project ${projectId}`, {
      userId,
      variablesResolved: result.variablesResolved,
      crossReferencesAdded: result.crossReferencesAdded,
      citationsAdded: result.citationsAdded,
      qualityScore: result.qualityScore
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Context injection failed:', error)
    res.status(500).json({
      success: false,
      error: 'Context injection failed'
    })
  }
})

/**
 * POST /api/context-injection/parse-variables
 * Parse template variables from content
 */
router.post('/parse-variables', validate(Joi.object({
  content: Joi.string().required()
})), async (req, res) => {
  try {
    const { content } = req.body

    const variables = await contextInjectionService.parseTemplateVariables(content)

    res.json({
      success: true,
      data: variables
    })
  } catch (error) {
    logger.error('Failed to parse template variables:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to parse template variables'
    })
  }
})

/**
 * POST /api/context-injection/resolve-variables
 * Resolve template variables with project context
 */
router.post('/resolve-variables', validate(Joi.object({
  variables: Joi.array().required(),
  projectId: Joi.string().required()
})), async (req, res) => {
  try {
    const { variables, projectId } = req.body

    // Fetch project context
    const projectContext = await getProjectContext(projectId)
    if (!projectContext) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    const resolvedVariables = await contextInjectionService.resolveVariables(
      variables,
      projectContext
    )

    res.json({
      success: true,
      data: resolvedVariables
    })
  } catch (error) {
    logger.error('Failed to resolve variables:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to resolve variables'
    })
  }
})

/**
 * POST /api/context-injection/generate-toc
 * Generate table of contents from content
 */
router.post('/generate-toc', validate(Joi.object({
  content: Joi.string().required()
})), async (req, res) => {
  try {
    const { content } = req.body

    const tableOfContents = await contextInjectionService.generateTableOfContents(content)

    res.json({
      success: true,
      data: {
        tableOfContents,
        hasContent: tableOfContents.length > 0
      }
    })
  } catch (error) {
    logger.error('Failed to generate table of contents:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate table of contents'
    })
  }
})

/**
 * POST /api/context-injection/add-cross-references
 * Add cross-references to content
 */
router.post('/add-cross-references', validate(Joi.object({
  content: Joi.string().required(),
  projectId: Joi.string().required()
})), async (req, res) => {
  try {
    const { content, projectId } = req.body

    // Fetch project context
    const projectContext = await getProjectContext(projectId)
    if (!projectContext) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    const enhancedContent = await contextInjectionService.generateCrossReferences(
      content,
      projectContext
    )

    res.json({
      success: true,
      data: {
        originalContent: content,
        enhancedContent,
        crossReferencesAdded: await contextInjectionService['countCrossReferences'](enhancedContent)
      }
    })
  } catch (error) {
    logger.error('Failed to add cross-references:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add cross-references'
    })
  }
})

/**
 * POST /api/context-injection/add-citations
 * Add citations to content
 */
router.post('/add-citations', validate(Joi.object({
  content: Joi.string().required(),
  projectId: Joi.string().required()
})), async (req, res) => {
  try {
    const { content, projectId } = req.body

    // Fetch project context
    const projectContext = await getProjectContext(projectId)
    if (!projectContext) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    const enhancedContent = await contextInjectionService.addCitations(
      content,
      projectContext.documents
    )

    res.json({
      success: true,
      data: {
        originalContent: content,
        enhancedContent,
        citationsAdded: await contextInjectionService['countCitations'](enhancedContent)
      }
    })
  } catch (error) {
    logger.error('Failed to add citations:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add citations'
    })
  }
})

/**
 * POST /api/context-injection/structure-content
 * Structure content based on project context
 */
router.post('/structure-content', validate(Joi.object({
  content: Joi.string().required(),
  projectId: Joi.string().required()
})), async (req, res) => {
  try {
    const { content, projectId } = req.body

    // Fetch project context
    const projectContext = await getProjectContext(projectId)
    if (!projectContext) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    const structuredContent = await contextInjectionService.structureContent(
      content,
      projectContext
    )

    res.json({
      success: true,
      data: {
        originalContent: content,
        structuredContent
      }
    })
  } catch (error) {
    logger.error('Failed to structure content:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to structure content'
    })
  }
})

/**
 * Helper function to fetch project context (exported for use in projects route for synthetic project_context documents).
 * Stakeholders and documents queries are resilient to missing tables/columns (e.g. project_stakeholders, documents.type).
 */
export async function getProjectContext(projectId: string) {
  try {
    // Fetch project details
    const projectQuery = `
      SELECT id, name, description, framework, metadata
      FROM projects 
      WHERE id = $1
    `
    const projectResult = await pool.query(projectQuery, [projectId])

    if (!projectResult?.rows?.length) {
      return null
    }

    const project = projectResult.rows[0]

    // Fetch project stakeholders (table may not exist in all environments; check first to avoid DB-GUARD log)
    let stakeholders: Array<{ id?: string; name?: string; role?: string; email?: string; department?: string; stakeholder_type?: string; stakeholder_category?: string }> = []
    try {
      const tableCheck = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_stakeholders'`
      )
      if (tableCheck?.rows?.length) {
        const stakeholdersResult = await pool.query(
          `SELECT id, name, role, email, department, stakeholder_type, stakeholder_category
           FROM project_stakeholders WHERE project_id = $1`,
          [projectId]
        )
        stakeholders = stakeholdersResult?.rows ?? []
      }
    } catch (err) {
      logger.warn('Project context: stakeholders query skipped (table or schema may differ)', { projectId, error: (err as Error)?.message })
    }

    // Fetch project documents (use columns that exist: id, title/name, content, metadata; no "type")
    let documents: Array<{ id: string; name?: string; type?: string; content?: unknown; metadata?: unknown }> = []
    try {
      const documentsQuery = `
        SELECT id, COALESCE(title, name) as name, content, metadata
        FROM documents 
        WHERE project_id = $1
      `
      const documentsResult = await pool.query(documentsQuery, [projectId])
      documents = (documentsResult?.rows ?? []).map((row: { id: string; name?: string; content?: unknown; metadata?: unknown }) => ({
        id: row.id,
        name: row.name,
        content: row.content,
        metadata: row.metadata
      }))
    } catch (err) {
      logger.warn('Project context: documents query skipped (schema may differ)', { projectId, error: (err as Error)?.message })
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      framework: project.framework,
      metadata: project.metadata || {},
      stakeholders,
      documents
    }
  } catch (error) {
    logger.error('Failed to fetch project context:', error)
    return null
  }
}

export default router

