/**
 * Reference Document Upload Service
 * 
 * Handles uploads of reference documents for project context.
 * These are stored in project_context_items, NOT in the documents table.
 * 
 * @module referenceDocumentUploadService
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { convertToMarkdown, ConversionOptions } from './documentConversionService'

export interface ReferenceDocumentUploadResult {
  contextItemId: string
  title: string
  content: string
  metadata: {
    originalFilename: string
    fileType: string
    fileSize: number
    wordCount: number
    conversionMetadata: any
  }
}

/**
 * Upload a reference document and store it in project_context_items
 * This is separate from the documents table - these are reference materials
 */
export class ReferenceDocumentUploadService {
  /**
   * Upload and process a reference document
   */
  async uploadReferenceDocument(
    projectId: string,
    file: Express.Multer.File,
    userId: string,
    title?: string
  ): Promise<ReferenceDocumentUploadResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Uploading reference document', {
        projectId,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      })
      
      // Validate file
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('File buffer is empty')
      }
      
      // Determine file type from extension or mimetype
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || ''
      let format: 'pdf' | 'docx' | 'md' | 'txt' | 'html' = 'txt'
      
      if (fileExtension === 'pdf' || file.mimetype === 'application/pdf') {
        format = 'pdf'
      } else if (fileExtension === 'docx' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        format = 'docx'
      } else if (fileExtension === 'md' || fileExtension === 'markdown' || file.mimetype === 'text/markdown') {
        format = 'md'
      } else if (fileExtension === 'html' || fileExtension === 'htm' || file.mimetype === 'text/html') {
        format = 'html'
      } else if (fileExtension === 'txt' || file.mimetype === 'text/plain') {
        format = 'txt'
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}. Supported types: PDF, DOCX, Markdown, HTML, TXT`)
      }
      
      // Convert to Markdown
      const conversionOptions: ConversionOptions = {
        format,
        filename: file.originalname,
        preserveFormatting: true,
      }
      
      const conversionResult = await convertToMarkdown(file.buffer, conversionOptions)
      
      if (!conversionResult.markdown || conversionResult.markdown.trim().length === 0) {
        throw new Error('Document conversion resulted in empty content')
      }
      
      // Generate title from filename if not provided
      const documentTitle = title || file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      
      // Count words
      const wordCount = conversionResult.markdown.trim().split(/\s+/).filter(word => word.length > 0).length
      
      // Create context item in database
      const contextItemId = uuidv4()
      const metadata = {
        originalFilename: file.originalname,
        fileType: format,
        fileSize: file.size,
        wordCount,
        conversionMetadata: conversionResult.metadata,
        uploadedAt: new Date().toISOString(),
      }
      
      await pool.query(
        `INSERT INTO project_context_items (
          id, project_id, type, title, content, original_filename, file_type, metadata, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          contextItemId,
          projectId,
          'reference_document',
          documentTitle,
          conversionResult.markdown, // Store as Markdown string
          file.originalname,
          format,
          JSON.stringify(metadata),
          userId,
        ]
      )
      
      const uploadDuration = Date.now() - startTime
      
      logger.info('Reference document uploaded successfully', {
        contextItemId,
        projectId,
        title: documentTitle,
        wordCount,
        uploadDuration,
      })
      
      return {
        contextItemId,
        title: documentTitle,
        content: conversionResult.markdown,
        metadata: {
          originalFilename: file.originalname,
          fileType: format,
          fileSize: file.size,
          wordCount,
          conversionMetadata: conversionResult.metadata,
        },
      }
    } catch (error: any) {
      logger.error('Reference document upload failed', {
        projectId,
        filename: file.originalname,
        error: error.message,
        stack: error.stack,
      })
      throw new Error(`Failed to upload reference document: ${error.message}`)
    }
  }
  
  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size (max 10MB for reference documents)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (10MB)` }
    }
    
    // Check file type
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['pdf', 'docx', 'md', 'markdown', 'txt', 'html', 'htm']
    
    if (!allowedExtensions.includes(fileExtension)) {
      return { valid: false, error: `File type .${fileExtension} is not supported. Allowed: ${allowedExtensions.join(', ')}` }
    }
    
    return { valid: true }
  }
}

// Export singleton instance
export const referenceDocumentUploadService = new ReferenceDocumentUploadService()
