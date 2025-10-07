import { Router } from 'express'
import { contextInjectionService } from '../services/contextInjectionService'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

/**
 * POST /api/context-injection/inject
 * Inject context into template content
 */
router.post('/inject', validate({
  body: {
    templateContent: { type: 'string', required: true },
    projectId: { type: 'string', required: true },
    config: { type: 'object', required: true }
  }
}), async (req, res) => {
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
router.post('/parse-variables', validate({
  body: {
    content: { type: 'string', required: true }
  }
}), async (req, res) => {
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
router.post('/resolve-variables', validate({
  body: {
    variables: { type: 'array', required: true },
    projectId: { type: 'string', required: true }
  }
}), async (req, res) => {
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
router.post('/generate-toc', validate({
  body: {
    content: { type: 'string', required: true }
  }
}), async (req, res) => {
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
router.post('/add-cross-references', validate({
  body: {
    content: { type: 'string', required: true },
    projectId: { type: 'string', required: true }
  }
}), async (req, res) => {
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
router.post('/add-citations', validate({
  body: {
    content: { type: 'string', required: true },
    projectId: { type: 'string', required: true }
  }
}), async (req, res) => {
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
router.post('/structure-content', validate({
  body: {
    content: { type: 'string', required: true },
    projectId: { type: 'string', required: true }
  }
}), async (req, res) => {
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
 * Helper function to fetch project context
 */
async function getProjectContext(projectId: string) {
  try {
    // Fetch project details
    const projectQuery = `
      SELECT id, name, description, framework, metadata
      FROM projects 
      WHERE id = $1
    `
    const projectResult = await pool.query(projectQuery, [projectId])
    
    if (projectResult.rows.length === 0) {
      return null
    }

    const project = projectResult.rows[0]

    // Fetch project stakeholders
    const stakeholdersQuery = `
      SELECT id, name, role, email, department, stakeholder_type, stakeholder_category
      FROM project_stakeholders 
      WHERE project_id = $1
    `
    const stakeholdersResult = await pool.query(stakeholdersQuery, [projectId])

    // Fetch project documents
    const documentsQuery = `
      SELECT id, name, type, content, metadata
      FROM documents 
      WHERE project_id = $1
    `
    const documentsResult = await pool.query(documentsQuery, [projectId])

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      framework: project.framework,
      metadata: project.metadata || {},
      stakeholders: stakeholdersResult.rows,
      documents: documentsResult.rows
    }
  } catch (error) {
    logger.error('Failed to fetch project context:', error)
    return null
  }
}

export default router

