/**
 * Document Format Conversion Routes
 * Handles API endpoints for document format conversion
 */

import { Router, Request, Response } from 'express'
import { DocumentFormatService } from '../services/documentFormatService'
import { logger } from '../utils/logger'
import { Pool } from 'pg'

export function createDocumentFormatRoutes(db: Pool): Router {
  const router = Router()
  const formatService = new DocumentFormatService(db)

  /**
   * Convert document to specified format
   * POST /api/documents/:id/convert
   */
  router.post('/:id/convert', async (req: Request, res: Response) => {
    try {
      const { id: documentId } = req.params
      const { format, options = {} } = req.body

      if (!format) {
        return res.status(400).json({
          error: 'Format is required',
          message: 'Please specify the target format for conversion'
        })
      }

      // Validate format and options
      formatService.validateConversionOptions(format, options)

      // Convert document
      const result = await formatService.convertDocument({
        documentId,
        targetFormat: format,
        options
      })

      // Handle binary content for download
      if (Buffer.isBuffer(result.content)) {
        const filename = `document-${documentId}.${format}`
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        res.setHeader('Content-Type', getContentType(format))
        res.setHeader('Content-Length', result.content.length)
        return res.send(result.content)
      }

      // Return text content as JSON
      res.json({
        success: true,
        data: {
          documentId: result.documentId,
          format: result.format,
          content: result.content,
          metadata: result.metadata
        }
      })

    } catch (error) {
      logger.error('Document conversion failed', {
        documentId: req.params.id,
        error: error.message
      })

      res.status(500).json({
        error: 'Conversion failed',
        message: error.message
      })
    }
  })

  /**
   * Get available formats for a document
   * GET /api/documents/:id/formats
   */
  router.get('/:id/formats', async (req: Request, res: Response) => {
    try {
      const { id: documentId } = req.params

      const formats = await formatService.getAvailableFormats(documentId)

      res.json({
        success: true,
        data: {
          documentId,
          availableFormats: formats,
          supportedFormats: [
            {
              format: 'pdf',
              description: 'Portable Document Format',
              binary: true,
              options: ['pageSettings', 'styling']
            },
            {
              format: 'docx',
              description: 'Microsoft Word Document',
              binary: true,
              options: ['styling']
            },
            {
              format: 'html',
              description: 'HyperText Markup Language',
              binary: false,
              options: ['styling', 'includeMetadata']
            },
            {
              format: 'markdown',
              description: 'Markdown Text',
              binary: false,
              options: ['includeMetadata']
            },
            {
              format: 'json',
              description: 'JavaScript Object Notation',
              binary: false,
              options: ['includeMetadata']
            },
            {
              format: 'xml',
              description: 'eXtensible Markup Language',
              binary: false,
              options: ['includeMetadata']
            },
            {
              format: 'txt',
              description: 'Plain Text',
              binary: false,
              options: ['includeMetadata']
            }
          ]
        }
      })

    } catch (error) {
      logger.error('Failed to get available formats', {
        documentId: req.params.id,
        error: error.message
      })

      res.status(500).json({
        error: 'Failed to get formats',
        message: error.message
      })
    }
  })

  /**
   * Batch convert multiple documents
   * POST /api/documents/batch-convert
   */
  router.post('/batch-convert', async (req: Request, res: Response) => {
    try {
      const { requests } = req.body

      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
          error: 'Invalid requests',
          message: 'Please provide an array of conversion requests'
        })
      }

      // Validate each request
      for (const request of requests) {
        if (!request.documentId || !request.targetFormat) {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Each request must have documentId and targetFormat'
          })
        }
        formatService.validateConversionOptions(request.targetFormat, request.options || {})
      }

      const results = await formatService.batchConvertDocuments(requests)

      res.json({
        success: true,
        data: {
          results,
          totalRequests: requests.length,
          successfulConversions: results.length
        }
      })

    } catch (error) {
      logger.error('Batch conversion failed', {
        error: error.message
      })

      res.status(500).json({
        error: 'Batch conversion failed',
        message: error.message
      })
    }
  })

  /**
   * Get document format history
   * GET /api/documents/:id/format-history
   */
  router.get('/:id/format-history', async (req: Request, res: Response) => {
    try {
      const { id: documentId } = req.params

      const history = await formatService.getFormatHistory(documentId)

      res.json({
        success: true,
        data: {
          documentId,
          history
        }
      })

    } catch (error) {
      logger.error('Failed to get format history', {
        documentId: req.params.id,
        error: error.message
      })

      res.status(500).json({
        error: 'Failed to get format history',
        message: error.message
      })
    }
  })

  /**
   * Update document with markdown content
   * PUT /api/documents/:id/markdown
   */
  router.put('/:id/markdown', async (req: Request, res: Response) => {
    try {
      const { id: documentId } = req.params
      const { content, metadata = {} } = req.body

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          error: 'Invalid content',
          message: 'Please provide valid markdown content'
        })
      }

      await formatService.storeDocumentWithMarkdown(documentId, content, metadata)

      res.json({
        success: true,
        message: 'Document updated with markdown content',
        data: {
          documentId,
          contentLength: content.length,
          updatedAt: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Failed to update document with markdown', {
        documentId: req.params.id,
        error: error.message
      })

      res.status(500).json({
        error: 'Failed to update document',
        message: error.message
      })
    }
  })

  /**
   * Get format conversion options schema
   * GET /api/documents/format-options
   */
  router.get('/format-options', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        formatOptions: {
          includeMetadata: {
            type: 'boolean',
            description: 'Include document metadata in output',
            default: false
          },
          styling: {
            type: 'object',
            description: 'Styling options for the output format',
            properties: {
              fontFamily: {
                type: 'string',
                description: 'Font family for text',
                default: 'Arial, sans-serif'
              },
              fontSize: {
                type: 'number',
                description: 'Font size in pixels',
                default: 14
              },
              lineHeight: {
                type: 'number',
                description: 'Line height multiplier',
                default: 1.6
              },
              margins: {
                type: 'object',
                description: 'Page margins in millimeters',
                properties: {
                  top: { type: 'number', default: 20 },
                  bottom: { type: 'number', default: 20 },
                  left: { type: 'number', default: 20 },
                  right: { type: 'number', default: 20 }
                }
              }
            }
          },
          pageSettings: {
            type: 'object',
            description: 'Page settings for PDF and DOCX formats',
            properties: {
              orientation: {
                type: 'string',
                enum: ['portrait', 'landscape'],
                default: 'portrait'
              },
              format: {
                type: 'string',
                enum: ['A4', 'Letter', 'Legal'],
                default: 'A4'
              }
            }
          }
        }
      }
    })
  })

  return router
}

/**
 * Get content type for format
 */
function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    html: 'text/html',
    markdown: 'text/markdown',
    md: 'text/markdown',
    json: 'application/json',
    xml: 'application/xml',
    txt: 'text/plain',
    text: 'text/plain'
  }

  return contentTypes[format.toLowerCase()] || 'application/octet-stream'
}