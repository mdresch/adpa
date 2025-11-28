/**
 * Knowledge Base Controller
 * Handles HTTP requests for knowledge base operations
 */

import { Request, Response } from 'express'
import { knowledgeBaseService } from './service'
// The global service contains AI-driven recommendations helper used by some endpoints
import { knowledgeBaseService as coreKnowledgeBaseService } from '../../services/knowledgeBaseService'
import { logger } from '../../utils/logger'
import type {
  CreateKnowledgeBaseEntryRequest,
  UpdateKnowledgeBaseEntryRequest,
  CreateKnowledgeBaseApplicationRequest,
  UpdateKnowledgeBaseApplicationRequest,
  CreateKnowledgeBaseReviewRequest,
  KnowledgeBaseSearchFilters
} from './types'

export class KnowledgeBaseController {
  /**
   * Create a new knowledge base entry
   * POST /api/knowledge-base/entries
   */
  async createEntry(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      
      const data: CreateKnowledgeBaseEntryRequest = req.body
      
      const entry = await knowledgeBaseService.createEntry(data, userId)
      
      res.status(201).json(entry)
    } catch (error) {
      logger.error('Error in createEntry controller:', error)
      res.status(500).json({ error: 'Failed to create knowledge base entry' })
    }
  }

  /**
   * Get a knowledge base entry by ID
   * GET /api/knowledge-base/entries/:id
   */
  async getEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      const entry = await knowledgeBaseService.getEntryById(id)
      
      if (!entry) {
        res.status(404).json({ error: 'Entry not found' })
        return
      }
      
      res.json(entry)
    } catch (error) {
      logger.error('Error in getEntry controller:', error)
      res.status(500).json({ error: 'Failed to fetch knowledge base entry' })
    }
  }

  /**
   * Search knowledge base entries
   * GET /api/knowledge-base/entries
   */
  async searchEntries(req: Request, res: Response): Promise<void> {
    try {
      const filters: KnowledgeBaseSearchFilters = {
        entry_type: req.query.entry_type as any,
        category: req.query.category as any,
        status: req.query.status as any,
        project_id: req.query.project_id as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search_query: req.query.search as string,
        min_novelty_score: req.query.min_novelty_score ? parseFloat(req.query.min_novelty_score as string) : undefined,
        min_replication_potential: req.query.min_replication_potential ? parseFloat(req.query.min_replication_potential as string) : undefined
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0
      
      const result = await knowledgeBaseService.searchEntries(filters, limit, offset)
      
      res.json(result)
    } catch (error) {
      logger.error('Error in searchEntries controller:', error)
      res.status(500).json({ error: 'Failed to search knowledge base entries' })
    }
  }

  /**
   * Update a knowledge base entry
   * PUT /api/knowledge-base/entries/:id
   */
  async updateEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateKnowledgeBaseEntryRequest = req.body
      
      const entry = await knowledgeBaseService.updateEntry(id, data)
      
      res.json(entry)
    } catch (error) {
      logger.error('Error in updateEntry controller:', error)
      res.status(500).json({ error: 'Failed to update knowledge base entry' })
    }
  }

  /**
   * Delete a knowledge base entry (archive)
   * DELETE /api/knowledge-base/entries/:id
   */
  async deleteEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      await knowledgeBaseService.deleteEntry(id)
      
      res.status(204).send()
    } catch (error) {
      logger.error('Error in deleteEntry controller:', error)
      res.status(500).json({ error: 'Failed to delete knowledge base entry' })
    }
  }

  /**
   * Create a knowledge base application
   * POST /api/knowledge-base/applications
   */
  async createApplication(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      
      const data: CreateKnowledgeBaseApplicationRequest = req.body
      
      const application = await knowledgeBaseService.createApplication(data, userId)
      
      res.status(201).json(application)
    } catch (error) {
      logger.error('Error in createApplication controller:', error)
      res.status(500).json({ error: 'Failed to create knowledge base application' })
    }
  }

  /**
   * Update a knowledge base application
   * PUT /api/knowledge-base/applications/:id
   */
  async updateApplication(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateKnowledgeBaseApplicationRequest = req.body
      
      const application = await knowledgeBaseService.updateApplication(id, data)
      
      res.json(application)
    } catch (error) {
      logger.error('Error in updateApplication controller:', error)
      res.status(500).json({ error: 'Failed to update knowledge base application' })
    }
  }

  /**
   * Get applications for an entry
   * GET /api/knowledge-base/entries/:id/applications
   */
  async getApplicationsByEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      const applications = await knowledgeBaseService.getApplicationsByEntry(id)
      
      res.json(applications)
    } catch (error) {
      logger.error('Error in getApplicationsByEntry controller:', error)
      res.status(500).json({ error: 'Failed to fetch applications' })
    }
  }

  /**
   * Create a review for a knowledge base entry
   * POST /api/knowledge-base/reviews
   */
  async createReview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      
      const data: CreateKnowledgeBaseReviewRequest = req.body
      
      const review = await knowledgeBaseService.createReview(data, userId)
      
      res.status(201).json(review)
    } catch (error) {
      logger.error('Error in createReview controller:', error)
      res.status(500).json({ error: 'Failed to create review' })
    }
  }

  /**
   * Get reviews for an entry
   * GET /api/knowledge-base/entries/:id/reviews
   */
  async getReviewsByEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      const reviews = await knowledgeBaseService.getReviewsByEntry(id)
      
      res.json(reviews)
    } catch (error) {
      logger.error('Error in getReviewsByEntry controller:', error)
      res.status(500).json({ error: 'Failed to fetch reviews' })
    }
  }

  /**
   * Get knowledge base statistics
   * GET /api/knowledge-base/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await knowledgeBaseService.getStats()
      
      res.json(stats)
    } catch (error) {
      logger.error('Error in getStats controller:', error)
      res.status(500).json({ error: 'Failed to fetch statistics' })
    }
  }

  /**
   * Get generated recommendations for a project
   * GET /api/knowledge-base/recommendations/:projectId
   */
  async getRecommendationsForProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10

      const recommendations = await coreKnowledgeBaseService.getRecommendationsForProject(projectId, limit)

      res.json({ success: true, data: recommendations })
    } catch (error: any) {
      logger.error('Error in getRecommendationsForProject controller:', error, { projectId: req.params?.projectId })

      // When running in local development it's handy to return a friendly
      // sample payload instead of 404 so the front-end can render a dev preview
      // without requiring a populated database.
      if ((process.env.NODE_ENV === 'development') && typeof error?.message === 'string' && error.message.includes('Project not found')) {
        const sample = [
          {
            knowledge_entry_id: 'dev-kb-1',
            entry: { id: 'dev-kb-1', title: 'Dev sample: Keep meetings short', description: 'A simple lesson for local testing', entry_type: 'lesson_learned' },
            relevance_score: 0.9,
            reasoning: 'High-level practice that helps avoid long meetings',
            expected_impact: 'Saves time',
            ai_model: 'dev-fallback',
            ai_confidence: 0.8
          }
        ]

        res.json({ success: true, data: sample })
        return
      }

      if (typeof error?.message === 'string' && error.message.includes('Project not found')) {
        res.status(404).json({ error: 'Project not found' })
        return
      }

      res.status(500).json({ error: 'Failed to fetch recommendations' })
    }
  }
}

export const knowledgeBaseController = new KnowledgeBaseController()
