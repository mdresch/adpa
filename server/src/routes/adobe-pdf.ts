/**
 * Adobe PDF Services Routes
 * API endpoints for Adobe PDF Services integration
 */

import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { adobePdfService } from '../services/adobePdfService'
import { authMiddleware } from '../middleware/auth'
import { logger } from '../utils/logger'

const router = Router()

// Configure multer for file uploads
const upload = multer({
  dest: process.env.ADOBE_TEMP_DIR || './temp/adobe-pdf',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/html',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file type'))
    }
  }
})

/**
 * GET /api/adobe-pdf/status
 * Get Adobe PDF Services status
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await adobePdfService.getStatus()
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    logger.error('Adobe PDF status check failed:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check Adobe PDF Services status'
    })
  }
})

/**
 * POST /api/adobe-pdf/generate-from-html
 * Generate premium PDF from HTML content
 */
router.post('/generate-from-html', 
  authMiddleware,
  [
    body('html').notEmpty().withMessage('HTML content is required'),
    body('filename').optional().isString().withMessage('Filename must be a string'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    body('options.quality').optional().isIn(['low', 'medium', 'high']).withMessage('Quality must be low, medium, or high'),
    body('options.compress').optional().isBoolean().withMessage('Compress must be a boolean'),
    body('options.linearize').optional().isBoolean().withMessage('Linearize must be a boolean'),
    body('options.protect').optional().isBoolean().withMessage('Protect must be a boolean'),
    body('options.password').optional().isString().withMessage('Password must be a string'),
    body('options.documentLanguage').optional().isString().withMessage('Document language must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { html, filename, options = {} } = req.body
      const generatedFilename = filename || `adobe-pdf-${Date.now()}.pdf`

      const result = await adobePdfService.generatePremiumPDF(html, generatedFilename, options)

      if (result.success) {
        res.json({
          success: true,
          data: {
            filename: generatedFilename,
            filePath: result.filePath,
            fileSize: result.fileSize,
            metadata: result.metadata,
            downloadUrl: `/api/adobe-pdf/download/${encodeURIComponent(generatedFilename)}`
          }
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'PDF generation failed'
        })
      }
    } catch (error) {
      logger.error('Adobe PDF generation from HTML failed:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
)

/**
 * POST /api/adobe-pdf/convert-docx
 * Convert DOCX file to premium PDF
 */
router.post('/convert-docx',
  authMiddleware,
  upload.single('docx'),
  [
    body('filename').optional().isString().withMessage('Filename must be a string'),
    body('options').optional().isObject().withMessage('Options must be an object')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'DOCX file is required'
        })
      }

      const { filename, options = {} } = req.body
      const generatedFilename = filename || `converted-${Date.now()}.pdf`

      const result = await adobePdfService.convertDOCXToPDF(
        req.file.path,
        generatedFilename,
        options
      )

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path)
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded file:', cleanupError)
      }

      if (result.success) {
        res.json({
          success: true,
          data: {
            filename: generatedFilename,
            filePath: result.filePath,
            fileSize: result.fileSize,
            metadata: result.metadata,
            downloadUrl: `/api/adobe-pdf/download/${encodeURIComponent(generatedFilename)}`
          }
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'DOCX to PDF conversion failed'
        })
      }
    } catch (error) {
      logger.error('Adobe PDF DOCX conversion failed:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
)

/**
 * POST /api/adobe-pdf/export
 * Export PDF to other formats
 */
router.post('/export/:format',
  authMiddleware,
  upload.single('pdf'),
  [
    param('format').isIn(['docx', 'pptx', 'xlsx', 'rtf', 'jpeg', 'png']).withMessage('Invalid export format'),
    body('filename').optional().isString().withMessage('Filename must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required'
        })
      }

      const { format } = req.params
      const { filename } = req.body
      const generatedFilename = filename || `exported-${Date.now()}.${format}`

      const result = await adobePdfService.exportPDFToFormat(
        req.file.path,
        generatedFilename,
        format as any
      )

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path)
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded file:', cleanupError)
      }

      if (result.success) {
        res.json({
          success: true,
          data: {
            filename: generatedFilename,
            filePath: result.filePath,
            format,
            downloadUrl: `/api/adobe-pdf/download/${encodeURIComponent(generatedFilename)}`
          }
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'PDF export failed'
        })
      }
    } catch (error) {
      logger.error('Adobe PDF export failed:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
)

/**
 * POST /api/adobe-pdf/ocr
 * Perform OCR on PDF
 */
router.post('/ocr',
  authMiddleware,
  upload.single('pdf'),
  [
    body('filename').optional().isString().withMessage('Filename must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'PDF file is required'
        })
      }

      const { filename } = req.body
      const generatedFilename = filename || `ocr-${Date.now()}.pdf`

      const result = await adobePdfService.performOCR(
        req.file.path,
        generatedFilename
      )

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path)
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded file:', cleanupError)
      }

      if (result.success) {
        res.json({
          success: true,
          data: {
            filename: generatedFilename,
            filePath: result.filePath,
            downloadUrl: `/api/adobe-pdf/download/${encodeURIComponent(generatedFilename)}`
          }
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'OCR processing failed'
        })
      }
    } catch (error) {
      logger.error('Adobe PDF OCR failed:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
)

/**
 * POST /api/adobe-pdf/sample
 * Generate sample PDF to demonstrate capabilities
 */
router.post('/sample', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await adobePdfService.createSamplePDF()

    if (result.success) {
      res.json({
        success: true,
        data: {
          filename: path.basename(result.filePath || ''),
          filePath: result.filePath,
          fileSize: result.fileSize,
          metadata: result.metadata,
          downloadUrl: `/api/adobe-pdf/download/${encodeURIComponent(path.basename(result.filePath || ''))}`
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Sample PDF generation failed'
      })
    }
  } catch (error) {
    logger.error('Adobe PDF sample generation failed:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

/**
 * GET /api/adobe-pdf/download/:filename
 * Download generated PDF or converted file
 */
router.get('/download/:filename',
  authMiddleware,
  [
    param('filename').notEmpty().withMessage('Filename is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        })
      }

      const { filename } = req.params
      const outputDir = process.env.ADOBE_OUTPUT_DIR || './generated-documents/adobe-pdf'
      const filePath = path.join(outputDir, filename)

      // Security check: ensure file is within output directory
      const resolvedPath = path.resolve(filePath)
      const resolvedOutputDir = path.resolve(outputDir)
      
      if (!resolvedPath.startsWith(resolvedOutputDir)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Check if file exists
      try {
        await fs.access(filePath)
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        })
      }

      // Get file stats
      const stats = await fs.stat(filePath)
      const fileExtension = path.extname(filename).toLowerCase()

      // Set appropriate content type
      let contentType = 'application/octet-stream'
      switch (fileExtension) {
        case '.pdf':
          contentType = 'application/pdf'
          break
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case '.pptx':
          contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          break
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
        case '.rtf':
          contentType = 'application/rtf'
          break
        case '.jpeg':
        case '.jpg':
          contentType = 'image/jpeg'
          break
        case '.png':
          contentType = 'image/png'
          break
      }

      // Set headers
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', stats.size)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

      // Stream file
      const fileStream = await fs.readFile(filePath)
      res.send(fileStream)

    } catch (error) {
      logger.error('Adobe PDF file download failed:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
)

/**
 * GET /api/adobe-pdf/test-connection
 * Test connection to Adobe PDF Services
 */
router.get('/test-connection', authMiddleware, async (req: Request, res: Response) => {
  try {
    const connectionTest = await adobePdfService.testConnection()
    
    res.json({
      success: true,
      data: {
        connected: connectionTest,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Adobe PDF connection test failed:', error)
    res.status(500).json({
      success: false,
      error: 'Connection test failed'
    })
  }
})

export default router