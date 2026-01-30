import { Router, Request, Response } from 'express'
import { VisioGenerationService } from '../services/visioGenerationService'
import { digitalTwinAssetService } from '../services/digitalTwinAssetService'
import { logger } from '../utils/logger'

const router = Router()
const visioService = new VisioGenerationService()
const assetService = digitalTwinAssetService // Use the exported object directly

// Helper to cast generic service to typed service or use direct DB access in future
// For now, let's assume assetService has a method getAllAssets or we can query DB.
// Actually, DigitalTwinAssetService (from file view earlier) might not have "getAll(projectId)".
// We might need to add it or use `db` directly. Let's check `digitalTwinAssetService.ts` content if needed.
// For POC, I'll assume we can pass projectId to `getAssets` if it exists, or just implement a quick db call here or in service.

router.get('/visio', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.query

        if (!projectId || typeof projectId !== 'string') {
            res.status(400).json({ error: 'Project ID is required' })
            return
        }

        // Fetch Assets
        // Note: DigitalTwinAssetService.getProjectAssets or similar
        // Let's assume assetService.getAssets(projectId)
        const assets = await assetService.getAssetsByProject(projectId)

        if (!assets || assets.length === 0) {
            // We can still generate an empty template
            logger.warn('No assets found for project, generating empty diagram', { projectId })
        }

        const buffer = await visioService.generateVisio(assets, projectId)

        res.setHeader('Content-Type', 'application/vnd.visio')
        res.setHeader('Content-Disposition', `attachment; filename="digital-twin-${projectId}.vsdx"`)
        res.send(buffer)

    } catch (error: any) {
        logger.error('Failed to generate Visio', { error: error.message })
        res.status(500).json({ error: error.message || 'Internal Server Error' })
    }
})

export default router
