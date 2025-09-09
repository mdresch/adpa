/**
 * Document Templates Controller
 * HTTP request handlers for document template operations
 */

import type { Request, Response } from 'express'
import { documentTemplateService } from './service'
import { logger, childLogger } from '../../utils/logger'
import type { AuthenticatedUser } from './types'

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

export class DocumentTemplateController {
  /**
   * GET /api/document-templates
   * Get paginated list of templates
   */
  async getTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const query = req.query
      const user = req.user!

      const result = await documentTemplateService.getTemplates(query, user)

      res.json(result)
    } catch (error) {
      log.error('Get templates error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/document-templates/:id
   * Get template by ID
   */
  async getTemplateById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const user = req.user!

      const template = await documentTemplateService.getTemplateById(id, user)

      if (!template) {
        res.status(404).json({ error: 'Template not found' })
        return
      }

      res.json({ template })
    } catch (error) {
      log.error('Get template error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/document-templates
   * Create new template
   */
  async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    const log = childLogger({ requestId: req.requestId })
    try {
      const data = req.body
      const user = req.user!

      const template = await documentTemplateService.createTemplate(data, user)

      res.status(201).json({
        message: 'Template created successfully',
        template,
      })
    } catch (error) {
  log.error('Create template error:', error)
  res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * PUT /api/document-templates/:id
   * Update template
   */
  async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const data = req.body
      const user = req.user!

      const template = await documentTemplateService.updateTemplate(id, data, user)

      if (!template) {
        res.status(404).json({ error: 'Template not found' })
        return
      }

      res.json({
        message: 'Template updated successfully',
        template,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        res.status(403).json({ error: 'Access denied' })
        return
      }

  log.error('Update template error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * DELETE /api/document-templates/:id
   * Delete template (soft delete)
   */
  async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const user = req.user!

      const deleted = await documentTemplateService.deleteTemplate(id, user)

      if (!deleted) {
        res.status(404).json({ error: 'Template not found' })
        return
      }

      res.json({ message: 'Template deleted successfully' })
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        res.status(403).json({ error: 'Access denied' })
        return
      }

      if (error instanceof Error && error.message.includes('being used by')) {
        res.status(400).json({ error: error.message })
        return
      }

  log.error('Delete template error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/document-templates/:id/clone
   * Clone template
   */
  async cloneTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const data = req.body
      const user = req.user!

      const template = await documentTemplateService.cloneTemplate(id, data, user)

      if (!template) {
        res.status(404).json({ error: 'Template not found' })
        return
      }

      res.status(201).json({
        message: 'Template cloned successfully',
        template,
      })
    } catch (error) {
  log.error('Clone template error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/document-templates/:id/use
   * Record template usage
   */
  async recordTemplateUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const user = req.user!

      const usageCount = await documentTemplateService.recordTemplateUsage(id, user)

      if (usageCount === null) {
        res.status(404).json({ error: 'Template not found' })
        return
      }

      res.json({
        message: 'Template usage recorded',
        usage_count: usageCount,
      })
    } catch (error) {
  log.error('Record template usage error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/document-templates/trash
   * Get deleted templates
   */
  async getDeletedTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const page = Number(req.query.page || 1)
      const limit = Math.min(Number(req.query.limit || 10), 100)
      const user = req.user!

      const result = await documentTemplateService.getDeletedTemplates(page, limit, user)

      res.json(result)
    } catch (error) {
  log.error('Get deleted templates error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/document-templates/:id/restore
   * Restore deleted template
   */
  async restoreTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const user = req.user!

      const template = await documentTemplateService.restoreTemplate(id, user)

      if (!template) {
        res.status(404).json({ error: 'Template not found or not deleted' })
        return
      }

      res.json({
        message: 'Template restored successfully',
        template,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        res.status(403).json({ error: 'Access denied' })
        return
      }

  log.error('Restore template error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * DELETE /api/document-templates/:id/permanent
   * Permanently delete template
   */
  async permanentlyDeleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const log = childLogger({ requestId: req.requestId })
    try {
      const { id } = req.params
      const user = req.user!

      const deleted = await documentTemplateService.permanentlyDeleteTemplate(id, user)

      if (!deleted) {
        res.status(404).json({ error: 'Template not found or not deleted' })
        return
      }

      res.json({ message: 'Template permanently deleted' })
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        res.status(403).json({ error: 'Access denied' })
        return
      }

  log.error('Permanently delete template error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export const documentTemplateController = new DocumentTemplateController()