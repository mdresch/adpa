/**
 * Knowledge Base Routes
 * API endpoints for knowledge base operations
 */

import { Router } from 'express'
import { knowledgeBaseController } from './controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Knowledge Base Entries
router.post('/entries', (req, res) => knowledgeBaseController.createEntry(req, res))
router.get('/entries', (req, res) => knowledgeBaseController.searchEntries(req, res))
router.get('/entries/:id', (req, res) => knowledgeBaseController.getEntry(req, res))
router.put('/entries/:id', (req, res) => knowledgeBaseController.updateEntry(req, res))
router.delete('/entries/:id', (req, res) => knowledgeBaseController.deleteEntry(req, res))

// Applications
router.post('/applications', (req, res) => knowledgeBaseController.createApplication(req, res))
router.put('/applications/:id', (req, res) => knowledgeBaseController.updateApplication(req, res))
router.get('/entries/:id/applications', (req, res) => knowledgeBaseController.getApplicationsByEntry(req, res))

// Reviews
router.post('/reviews', (req, res) => knowledgeBaseController.createReview(req, res))
router.get('/entries/:id/reviews', (req, res) => knowledgeBaseController.getReviewsByEntry(req, res))

// Statistics
router.get('/stats', (req, res) => knowledgeBaseController.getStats(req, res))

export default router
