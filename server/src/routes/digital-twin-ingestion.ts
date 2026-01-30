import { Router } from 'express'
import multer from 'multer'
import { visioIngestionService } from '../services/visioIngestionService'
import { logger } from '../utils/logger'
// import { authenticateToken } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// router.use(authenticateToken)

// Upload Visio (.vsdx) file
router.post('/visio', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const projectId = req.body.projectId
    const sourceDocumentId = req.body.sourceDocumentId // Optional link to a document

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' })
    }

    logger.info(`Starting Visio import for project ${projectId}`)

    // 1. Parse Visio
    const parseResult = await visioIngestionService.parseVisioFile(req.file.buffer)

    // 2. Import Assets logic
    const importResult = await visioIngestionService.importVisioAssets(projectId, parseResult, sourceDocumentId)

    logger.info(`Visio import completed for project ${projectId}`, { importResult })

    res.json({
      success: true,
      parseStats: parseResult.stats,
      importResult
    })

  } catch (error) {
    logger.error('POST /api/digital-twin/ingestion/visio error', { error })
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
