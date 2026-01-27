/**
 * Lessons Learned API Routes
 *
 * Provides RESTful endpoints for managing lessons learned entities.
 * Integrates with LessonsLearnedService for CRUD operations and business logic.
 *
 * Endpoints:
 * - GET /api/projects/:projectId/lessons - Get lessons for a project
 * - POST /api/projects/:projectId/lessons - Create a lesson
 * - GET /api/lessons/:lessonId - Get a specific lesson
 * - PUT /api/lessons/:lessonId - Update a lesson
 * - DELETE /api/lessons/:lessonId - Delete a lesson
 * - GET /api/projects/:projectId/lessons/recommendations - Get recommendations
 * - POST /api/projects/:projectId/lessons/generate-from-drift - Generate from drift
 * - POST /api/lessons/:lessonId/knowledge-base - Promote to knowledge base
 * - GET /api/lessons/:lessonId/similar - Get similar lessons
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { lessonsLearnedService } from '../services/lessonsLearnedService'
import { logger } from '../utils/logger'
// Import the verifyProjectAccess function directly from the implementation file
import { verifyProjectAccess } from '../lib/projectAccess'

const router = Router()

/**
 * Get lessons learned for a project
 */
router.get('/projects/:projectId/lessons', authMiddleware, async (req, res) => {
    const log = logger.child({ requestId: (req as any).requestId })
    
    try {
        const { projectId } = req.params
        const { category, impact, positive, limit, offset } = req.query

        // Validate projectId format (should be UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(projectId)) {
            log.warn('[LESSONS-API] Invalid project ID format', { projectId })
            return res.status(400).json({
                success: false,
                error: 'Invalid project ID format',
                message: 'Project ID must be a valid UUID'
            })
        }

        // Verify project access
        log.info('[LESSONS-API] Verifying project access', { projectId, userId: req.user?.id })
        const hasAccess = await verifyProjectAccess(req.user, projectId)
        if (!hasAccess) {
            log.warn('[LESSONS-API] Access denied', { projectId, userId: req.user?.id })
            return res.status(403).json({
                success: false,
                error: 'Access denied: You do not have access to this project',
                message: 'You do not have access to this project'
            })
        }

        // Validate and parse filters
        const filters = {
            category: typeof category === 'string' ? category : undefined,
            impact: typeof impact === 'string' ? impact : undefined,
            positive: typeof positive === 'string' ? positive === 'true' : undefined,
            limit: typeof limit === 'string' ? (isNaN(parseInt(limit)) ? undefined : parseInt(limit)) : undefined,
            offset: typeof offset === 'string' ? (isNaN(parseInt(offset)) ? undefined : parseInt(offset)) : undefined
        }

        // Validate limit and offset if provided
        if (filters.limit !== undefined && filters.limit < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid limit parameter',
                message: 'Limit must be a positive number'
            })
        }
        if (filters.offset !== undefined && filters.offset < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid offset parameter',
                message: 'Offset must be a positive number'
            })
        }

        log.info('[LESSONS-API] Fetching lessons', { projectId, filters })
        
        // Check if service is properly initialized
        if (!lessonsLearnedService) {
            log.error('[LESSONS-API] Lessons learned service not initialized')
            return res.status(500).json({
                success: false,
                error: 'Service initialization error',
                message: 'Lessons learned service is not available'
            })
        }

        const lessons = await lessonsLearnedService.getByProject(projectId, filters)

        log.info('[LESSONS-API] Successfully fetched lessons', {
            projectId,
            count: lessons.length
        })

        res.json({
            success: true,
            data: lessons,
            count: lessons.length
        })
    } catch (error) {
        log.error('[LESSONS-API] Failed to get lessons by project', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            projectId: req.params.projectId,
            userId: req.user?.id
        })

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve lessons learned',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Get a specific lesson learned
 */
router.get('/lessons/:lessonId', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params

        const lesson = await lessonsLearnedService.getById(lessonId)

        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Lesson learned not found'
                }
            })
        }

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, lesson.project_id)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this lesson'
                }
            })
        }

        res.json({
            success: true,
            data: lesson
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to get lesson by ID', {
            error: error instanceof Error ? error.message : String(error),
            lessonId: req.params.lessonId
        })

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve lesson learned',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Create a new lesson learned
 */
router.post('/projects/:projectId/lessons', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params
        const input = req.body

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, projectId)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this project'
                }
            })
        }

        const lesson = await lessonsLearnedService.create(input, req.user.id)

        res.status(201).json({
            success: true,
            data: lesson
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to create lesson', {
            error: error instanceof Error ? error.message : String(error),
            projectId: req.params.projectId,
            input: req.body
        })

        res.status(500).json({
            success: false,
            error: 'Failed to create lesson learned',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Update an existing lesson learned
 */
router.put('/lessons/:lessonId', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params
        const input = req.body

        // Get lesson to verify project access
        const lesson = await lessonsLearnedService.getById(lessonId)
        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Lesson learned not found'
                }
            })
        }

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, lesson.project_id)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this lesson'
                }
            })
        }

        const updatedLesson = await lessonsLearnedService.update(lessonId, input, req.user.id)

        res.json({
            success: true,
            data: updatedLesson
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to update lesson', {
            error: error instanceof Error ? error.message : String(error),
            lessonId: req.params.lessonId,
            input: req.body
        })

        res.status(500).json({
            success: false,
            error: 'Failed to update lesson learned',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Delete a lesson learned
 */
router.delete('/lessons/:lessonId', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params

        // Get lesson to verify project access
        const lesson = await lessonsLearnedService.getById(lessonId)
        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Lesson learned not found'
                }
            })
        }

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, lesson.project_id)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this lesson'
                }
            })
        }

        await lessonsLearnedService.delete(lessonId)

        res.json({
            success: true,
            message: 'Lesson learned deleted successfully'
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to delete lesson', {
            error: error instanceof Error ? error.message : String(error),
            lessonId: req.params.lessonId
        })

        res.status(500).json({
            success: false,
            error: 'Failed to delete lesson learned',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Get recommendations for applying lessons to current project
 */
router.get('/projects/:projectId/lessons/recommendations', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, projectId)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this project'
                }
            })
        }

        const recommendations = await lessonsLearnedService.getRecommendations(projectId)

        res.json({
            success: true,
            data: recommendations,
            count: recommendations.length
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to get lesson recommendations', {
            error: error instanceof Error ? error.message : String(error),
            projectId: req.params.projectId
        })

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve lesson recommendations',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Generate lessons learned from drift detection results
 */
router.post('/projects/:projectId/lessons/generate-from-drift', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, projectId)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this project'
                }
            })
        }

        const lessons = await lessonsLearnedService.generateFromDrift(projectId, req.user.id)

        res.json({
            success: true,
            data: lessons,
            count: lessons.length,
            message: `Generated ${lessons.length} lessons from positive drift`
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to generate lessons from drift', {
            error: error instanceof Error ? error.message : String(error),
            projectId: req.params.projectId
        })

        res.status(500).json({
            success: false,
            error: 'Failed to generate lessons from drift',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Create a knowledge base entry from a lesson learned
 */
router.post('/lessons/:lessonId/knowledge-base', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params

        // Get lesson to verify project access
        const lesson = await lessonsLearnedService.getById(lessonId)
        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Lesson learned not found'
                }
            })
        }

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, lesson.project_id)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this lesson'
                }
            })
        }

        const entryId = await lessonsLearnedService.createKnowledgeBaseEntry(lessonId, req.user.id)

        res.json({
            success: true,
            data: {
                knowledge_base_entry_id: entryId
            },
            message: 'Lesson promoted to knowledge base successfully'
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to create knowledge base entry from lesson', {
            error: error instanceof Error ? error.message : String(error),
            lessonId: req.params.lessonId
        })

        res.status(500).json({
            success: false,
            error: 'Failed to create knowledge base entry',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

/**
 * Get similar lessons from other projects
 */
router.get('/lessons/:lessonId/similar', authMiddleware, async (req, res) => {
    try {
        const { lessonId } = req.params
        const { limit } = req.query

        // Get lesson to verify project access
        const lesson = await lessonsLearnedService.getById(lessonId)
        if (!lesson) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Lesson learned not found'
                }
            })
        }

        // Verify project access
        const hasAccess = await verifyProjectAccess(req.user, lesson.project_id)
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this lesson'
                }
            })
        }

        const similarLessons = await lessonsLearnedService.getSimilarLessons(
            lesson.project_id,
            lessonId,
            typeof limit === 'string' ? parseInt(limit) : 5
        )

        res.json({
            success: true,
            data: similarLessons,
            count: similarLessons.length
        })
    } catch (error) {
        logger.error('[LESSONS-API] Failed to get similar lessons', {
            error: error instanceof Error ? error.message : String(error),
            lessonId: req.params.lessonId
        })

        res.status(500).json({
            success: false,
            error: 'Failed to retrieve similar lessons',
            message: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

export default router