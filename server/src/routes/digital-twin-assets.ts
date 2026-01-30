import { Router } from 'express'
import { digitalTwinAssetService } from '../services/digitalTwinAssetService'
import { digitalTwinEventService } from '../services/digitalTwinEventService'
import { logger } from '../utils/logger'
// import { authenticateToken } from '../middleware/auth' // Assuming auth middleware exists

const router = Router()

// router.use(authenticateToken) // Protect all routes

// List assets
router.get('/', async (req, res) => {
  try {
    const projectId = req.query.projectId as string
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' })
    }
    const assets = await digitalTwinAssetService.getAssetsByProject(projectId)
    res.json(assets)
  } catch (error) {
    logger.error('GET /api/digital-twin/assets error', { error })
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
})

// Get asset details
router.get('/:id', async (req, res) => {
  try {
    const asset = await digitalTwinAssetService.getAssetById(req.params.id)
    if (!asset) return res.status(404).json({ error: 'Asset not found' })
    res.json(asset)
  } catch (error) {
    logger.error('GET /api/digital-twin/assets/:id error', { error })
    res.status(500).json({ error: 'Failed to fetch asset' })
  }
})

// Get asset state history
router.get('/:id/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20
    const history = await digitalTwinAssetService.getStateHistory(req.params.id, limit)
    res.json(history)
  } catch (error) {
    logger.error('GET /api/digital-twin/assets/:id/history error', { error })
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// Get asset events
router.get('/:id/events', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
    const events = await digitalTwinEventService.getEventsByAsset(req.params.id, limit)
    res.json(events)
  } catch (error) {
    logger.error('GET /api/digital-twin/assets/:id/events error', { error })
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

export default router
