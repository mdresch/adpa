/**
 * UX Documentation Routes
 * API endpoints for generating user manuals and guides
 */

import express, { Request, Response, NextFunction } from 'express'
import { uxDocumentationService, type UXDocumentationRequest } from '../services/uxDocumentationService'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'

const router = express.Router()

/**
 * POST /api/ux-documentation/generate
 * Generate UX documentation/manual
 */
router.post(
  '/generate',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user
      const request: UXDocumentationRequest = {
        target_audience: req.body.target_audience || 'all',
        document_type: req.body.document_type || 'daily_activities',
        focus_areas: req.body.focus_areas || [],
        include_screenshots: req.body.include_screenshots || false,
        include_examples: req.body.include_examples || true,
        tone: req.body.tone || 'professional',
        output_format: req.body.output_format || 'markdown',
        project_id: req.body.project_id
      }

      // Validate request
      if (!request.document_type) {
        return res.status(400).json({
          success: false,
          error: 'document_type is required'
        })
      }

      // Generate documentation
      const documentation = await uxDocumentationService.generateUXDocumentation(
        request,
        user.id
      )

      // Optionally save to database as a document
      if (req.body.save_as_document && request.project_id) {
        try {
          await pool.query(
            `INSERT INTO documents (
              id, name, project_id, content, format, status, 
              created_by, updated_by, framework, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              documentation.id,
              documentation.title,
              request.project_id,
              documentation.content,
              'markdown',
              'draft',
              user.id,
              user.id,
              'custom',
              JSON.stringify({
                type: 'ux_documentation',
                document_type: request.document_type,
                target_audience: request.target_audience,
                metadata: documentation.metadata
              })
            ]
          )
        } catch (dbError) {
          logger.warn('Failed to save UX documentation to database', dbError)
          // Don't fail the request if saving fails
        }
      }

      res.json({
        success: true,
        data: documentation
      })
    } catch (error: any) {
      logger.error('Failed to generate UX documentation', {
        error: error.message,
        stack: error.stack,
        user_id: (req as any).user?.id
      })
      next(error)
    }
  }
)

/**
 * GET /api/ux-documentation/daily-activities
 * Get list of daily activities that ADPA helps with
 */
router.get(
  '/daily-activities',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetAudience = (req.query.target_audience as string) || 'all'
      const projectId = req.query.project_id as string | undefined

      const request: UXDocumentationRequest = {
        target_audience: targetAudience as any,
        document_type: 'daily_activities',
        output_format: 'markdown',
        project_id: projectId
      }

      const activities = await uxDocumentationService.gatherDailyActivities(request)

      res.json({
        success: true,
        data: {
          activities,
          count: activities.length
        }
      })
    } catch (error: any) {
      logger.error('Failed to get daily activities', {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  }
)

/**
 * GET /api/ux-documentation/templates
 * Get available document templates/types
 */
router.get(
  '/templates',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = [
        {
          id: 'quick_start',
          name: 'Quick Start Guide',
          description: 'Fast introduction to ADPA and key features',
          estimated_time: '15 minutes',
          best_for: 'New users getting started'
        },
        {
          id: 'daily_activities',
          name: 'Daily Activities Guide',
          description: 'Comprehensive guide showing how ADPA helps with daily tasks',
          estimated_time: '30 minutes',
          best_for: 'Users wanting to understand daily productivity gains'
        },
        {
          id: 'feature_highlight',
          name: 'Feature Highlights',
          description: 'Showcase of key features and their benefits',
          estimated_time: '20 minutes',
          best_for: 'Stakeholders and decision makers'
        },
        {
          id: 'complete_manual',
          name: 'Complete User Manual',
          description: 'Full comprehensive manual covering all aspects',
          estimated_time: '2 hours',
          best_for: 'Complete reference documentation'
        }
      ]

      const audiences = [
        { id: 'all', name: 'All Users' },
        { id: 'end_users', name: 'End Users' },
        { id: 'project_managers', name: 'Project Managers' },
        { id: 'portfolio_managers', name: 'Portfolio Managers' },
        { id: 'administrators', name: 'Administrators' }
      ]

      res.json({
        success: true,
        data: {
          templates,
          audiences,
          output_formats: ['markdown', 'pdf', 'docx']
        }
      })
    } catch (error: any) {
      logger.error('Failed to get UX documentation templates', {
        error: error.message,
        stack: error.stack
      })
      next(error)
    }
  }
)

export default router

