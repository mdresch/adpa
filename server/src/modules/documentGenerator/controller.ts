/**
 * Document Generator Controller
 * HTTP request handlers for document generation endpoints
 */

import { Request, Response } from 'express'
import { documentGeneratorService } from './service'
import { logger, childLogger } from '../../utils/logger'
import type { DocumentGenerationRequest, AuthenticatedUser } from './types'
import { OutputFormat } from './types'

export class DocumentGeneratorController {
  /**
   * Generate document from template
   */
  async generateDocument(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser
      const request: DocumentGenerationRequest = {
        template_id: req.body.template_id,
        data: req.body.data || {},
        output_format: req.body.output_format as OutputFormat,
        options: req.body.options
      }

      // Validate request
      if (!request.template_id) {
        res.status(400).json({
          error: 'Template ID is required',
          code: 'MISSING_TEMPLATE_ID'
        })
        return
      }

      if (!request.output_format) {
        res.status(400).json({
          error: 'Output format is required',
          code: 'MISSING_OUTPUT_FORMAT'
        })
        return
      }

      if (!Object.values(OutputFormat).includes(request.output_format)) {
        res.status(400).json({
          error: 'Invalid output format',
          code: 'INVALID_OUTPUT_FORMAT',
          valid_formats: Object.values(OutputFormat)
        })
        return
      }

      const result = await documentGeneratorService.generateDocument(request, user)

      res.status(200).json({
        success: true,
        data: result
      })

    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error('Document generation failed', {
        error: error.message,
        stack: error.stack,
        user: req.user?.email,
        body: req.body,
      })

      if (error.code === 'TEMPLATE_NOT_FOUND') {
        res.status(404).json({
          error: 'Template not found',
          code: error.code
        })
        return
      }

      if (error.code === 'MISSING_VARIABLES') {
        res.status(400).json({
          error: error.message,
          code: error.code,
          details: error.details
        })
        return
      }

      res.status(500).json({
        error: 'Document generation failed',
        code: 'GENERATION_ERROR',
        message: error.message
      })
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          error: 'Generation ID is required',
          code: 'MISSING_GENERATION_ID'
        })
        return
      }

      const status = await documentGeneratorService.getGenerationStatus(id)

      if (!status) {
        res.status(404).json({
          error: 'Generation not found',
          code: 'GENERATION_NOT_FOUND'
        })
        return
      }

      res.status(200).json({
        success: true,
        data: status
      })

    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error('Failed to get generation status', {
        error: error.message,
        generation_id: req.params.id,
      })

      res.status(500).json({
        error: 'Failed to get generation status',
        code: 'STATUS_ERROR'
      })
    }
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser
      const stats = await documentGeneratorService.getGenerationStats(user)

      res.status(200).json({
        success: true,
        data: stats
      })

    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error('Failed to get generation stats', {
        error: error.message,
        user: req.user?.email,
      })

      res.status(500).json({
        error: 'Failed to get generation statistics',
        code: 'STATS_ERROR'
      })
    }
  }

  /**
   * Download generated document
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params

      if (!filename) {
        res.status(400).json({
          error: 'Filename is required',
          code: 'MISSING_FILENAME'
        })
        return
      }

      // Security: prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          error: 'Invalid filename',
          code: 'INVALID_FILENAME'
        })
        return
      }

      const outputDir = process.env.DOCUMENT_OUTPUT_DIR || './generated-documents'
      const filePath = `${outputDir}/${decodeURIComponent(filename)}`

      // Check if file exists
      try {
        await require('fs').promises.access(filePath)
      } catch {
        res.status(404).json({
          error: 'File not found',
          code: 'FILE_NOT_FOUND'
        })
        return
      }

      // Set appropriate headers
      const extension = filename.split('.').pop()?.toLowerCase()
      let contentType = 'application/octet-stream'
      let disposition = 'attachment'

      switch (extension) {
        case 'pdf':
          contentType = 'application/pdf'
          break
        case 'docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case 'md':
          contentType = 'text/markdown'
          break
        case 'html':
          contentType = 'text/html'
          disposition = 'inline'
          break
      }

      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`)

      // Stream file
      const fs = require('fs')
      const stream = fs.createReadStream(filePath)
      stream.pipe(res)

    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error('Failed to download document', {
        error: error.message,
        filename: req.params.filename,
      })

      res.status(500).json({
        error: 'Failed to download document',
        code: 'DOWNLOAD_ERROR'
      })
    }
  }

  /**
   * Get supported output formats
   */
  async getSupportedFormats(req: Request, res: Response): Promise<void> {
    try {
      const formats = Object.values(OutputFormat).map(format => ({
        value: format,
        label: format.toUpperCase(),
        description: this.getFormatDescription(format)
      }))

      res.status(200).json({
        success: true,
        data: {
          formats,
          default_format: OutputFormat.PDF
        }
      })

    } catch (error) {
  const log = childLogger({ requestId: (req as any).requestId })
  log.error('Failed to get supported formats', error)

      res.status(500).json({
        error: 'Failed to get supported formats',
        code: 'FORMATS_ERROR'
      })
    }
  }

  /**
   * Validate template data
   */
  async validateTemplateData(req: Request, res: Response): Promise<void> {
    try {
      const { template_id, data } = req.body
      const user = req.user as AuthenticatedUser

      if (!template_id) {
        res.status(400).json({
          error: 'Template ID is required',
          code: 'MISSING_TEMPLATE_ID'
        })
        return
      }

      // This would validate the data against template variables
      // For now, return a simple validation result
      const validation = {
        valid: true,
        missing_required: [],
        invalid_types: [],
        warnings: []
      }

      res.status(200).json({
        success: true,
        data: validation
      })

    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error('Template data validation failed', {
        error: error.message,
        template_id: req.body.template_id,
      })

      res.status(500).json({
        error: 'Template data validation failed',
        code: 'VALIDATION_ERROR'
      })
    }
  }

  /**
   * Get format description
   */
  private getFormatDescription(format: OutputFormat): string {
    switch (format) {
      case OutputFormat.PDF:
        return 'Portable Document Format - ideal for printing and sharing'
      case OutputFormat.DOCX:
        return 'Microsoft Word document - editable and collaborative'
      case OutputFormat.MARKDOWN:
        return 'Markdown text - lightweight and version-control friendly'
      case OutputFormat.HTML:
        return 'HTML document - web-ready and interactive'
      default:
        return 'Document format'
    }
  }
}

export const documentGeneratorController = new DocumentGeneratorController()