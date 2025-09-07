/**
 * Document Templates Routes
 * REST API endpoints for document template management
 */

import express from 'express'
import { documentTemplateController } from './controller'
import { authenticateToken, requirePermission } from '../../middleware/auth'
import { validate, validateParams, validateQuery } from '../../middleware/validation'
import {
  createTemplate,
  updateTemplate,
  cloneTemplate,
  templateListQuery,
  uuidParam,
  trashQuery,
} from './validation'

const router = express.Router()

/**
 * @openapi
 * /api/document-templates:
 *   get:
 *     summary: Get paginated list of document templates
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of templates per page
 *       - in: query
 *         name: framework
 *         schema:
 *           type: string
 *           enum: [TOGAF, SABSA, COBIT, ITIL, Custom]
 *         description: Filter by framework
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: is_public
 *         schema:
 *           type: boolean
 *         description: Filter by public/private status
 *     responses:
 *       200:
 *         description: List of templates with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  authenticateToken,
  validateQuery(templateListQuery),
  documentTemplateController.getTemplates.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/trash:
 *   get:
 *     summary: Get deleted templates (trash)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of templates per page
 *     responses:
 *       200:
 *         description: List of deleted templates with pagination
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/trash',
  authenticateToken,
  requirePermission('templates.view'),
  validateQuery(trashQuery),
  documentTemplateController.getDeletedTemplates.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id',
  authenticateToken,
  validateParams(uuidParam),
  documentTemplateController.getTemplateById.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates:
 *   post:
 *     summary: Create new document template
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTemplateRequest'
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateOperationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/',
  authenticateToken,
  requirePermission('templates.create'),
  validate(createTemplate),
  documentTemplateController.createTemplate.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}:
 *   put:
 *     summary: Update document template
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTemplateRequest'
 *     responses:
 *       200:
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateOperationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  '/:id',
  authenticateToken,
  requirePermission('templates.update'),
  validateParams(uuidParam),
  validate(updateTemplate),
  documentTemplateController.updateTemplate.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}:
 *   delete:
 *     summary: Delete document template (soft delete)
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Template is being used and cannot be deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('templates.delete'),
  validateParams(uuidParam),
  documentTemplateController.deleteTemplate.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}/clone:
 *   post:
 *     summary: Clone document template
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CloneTemplateRequest'
 *     responses:
 *       201:
 *         description: Template cloned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateOperationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/clone',
  authenticateToken,
  requirePermission('templates.create'),
  validateParams(uuidParam),
  validate(cloneTemplate),
  documentTemplateController.cloneTemplate.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}/use:
 *   post:
 *     summary: Record template usage
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template usage recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateUsageResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/use',
  authenticateToken,
  validateParams(uuidParam),
  documentTemplateController.recordTemplateUsage.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}/restore:
 *   post:
 *     summary: Restore deleted template
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TemplateOperationResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/restore',
  authenticateToken,
  requirePermission('templates.update'),
  validateParams(uuidParam),
  documentTemplateController.restoreTemplate.bind(documentTemplateController)
)

/**
 * @openapi
 * /api/document-templates/{id}/permanent:
 *   delete:
 *     summary: Permanently delete template
 *     tags: [Document Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id/permanent',
  authenticateToken,
  requirePermission('templates.delete'),
  validateParams(uuidParam),
  documentTemplateController.permanentlyDeleteTemplate.bind(documentTemplateController)
)

export default router