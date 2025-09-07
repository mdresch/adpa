/**
 * Document Generator Routes
 * Express routes for document generation endpoints
 */

import { Router } from 'express'
import { documentGeneratorController } from './controller'
import { authMiddleware } from '../../middleware/auth'
import { validateDocumentGeneration, validateGenerationId, validateTemplateDataValidation } from './validation'

const router = Router()

// Apply authentication middleware to all routes
router.use(authMiddleware)

/**
 * @route POST /api/document-generator/generate
 * @desc Generate document from template
 * @access Private
 */
router.post('/generate', validateDocumentGeneration, documentGeneratorController.generateDocument)

/**
 * @route GET /api/document-generator/generation/:id/status
 * @desc Get generation status
 * @access Private
 */
router.get('/generation/:id/status', validateGenerationId, documentGeneratorController.getGenerationStatus)

/**
 * @route GET /api/document-generator/generation/stats
 * @desc Get generation statistics
 * @access Private
 */
router.get('/generation/stats', documentGeneratorController.getGenerationStats)

/**
 * @route GET /api/document-generator/download/:filename
 * @desc Download generated document
 * @access Private
 */
router.get('/download/:filename', documentGeneratorController.downloadDocument)

/**
 * @route GET /api/document-generator/formats
 * @desc Get supported output formats
 * @access Private
 */
router.get('/formats', documentGeneratorController.getSupportedFormats)

/**
 * @route POST /api/document-generator/validate
 * @desc Validate template data
 * @access Private
 */
router.post('/validate', validateTemplateDataValidation, documentGeneratorController.validateTemplateData)

export default router