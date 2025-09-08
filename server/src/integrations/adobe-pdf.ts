/**
 * Adobe PDF Services Integration
 * Provides premium PDF generation capabilities using Adobe PDF Services API
 */

import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  CreatePDFJob,
  CreatePDFResult,
  SDKError,
  ServiceUsageError,
  ServiceApiError,
  ExportPDFJob,
  ExportPDFResult,
  ExportPDFToFormat,
  CompressPDFJob,
  CompressPDFResult,
  LinearizePDFJob,
  LinearizePDFResult,
  ProtectPDFJob,
  ProtectPDFResult,
  Permissions,
  EncryptionAlgorithm,
  ContentEncryption,
  OCRJob,
  OCRResult
} from '@adobe/pdfservices-node-sdk'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger'

export interface AdobePDFConfig {
  clientId: string
  clientSecret: string
  organizationId?: string
  accountId?: string
  privateKey?: string
  enabled: boolean
}

export interface PDFGenerationOptions {
  documentLanguage?: string
  includeTaggedPDF?: boolean
  quality?: 'low' | 'medium' | 'high'
  compress?: boolean
  linearize?: boolean
  protect?: boolean
  password?: string
  permissions?: {
    print?: boolean
    editContent?: boolean
    editDocumentAssembly?: boolean
    editAnnotations?: boolean
    fillAndSign?: boolean
    extractForAccessibility?: boolean
    extract?: boolean
  }
}

export interface PDFConversionResult {
  success: boolean
  filePath?: string
  fileSize?: number
  error?: string
  metadata?: {
    pageCount?: number
    processingTime: number
    compressionRatio?: number
  }
}

export interface PDFOperationResult {
  success: boolean
  filePath?: string
  error?: string
  metadata?: Record<string, any>
}

export class AdobePDFService {
  private pdfServices: PDFServices | null = null
  private config: AdobePDFConfig
  private initialized = false

  constructor(config: AdobePDFConfig) {
    this.config = config
  }

  /**
   * Initialize Adobe PDF Services with credentials
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      if (!this.config.enabled) {
        logger.warn('Adobe PDF Services is disabled')
        return
      }

      if (!this.config.clientId || !this.config.clientSecret) {
        throw new Error('Adobe PDF Services credentials not configured')
      }

      // Create credentials
      const credentials = new ServicePrincipalCredentials({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        organizationId: this.config.organizationId,
        accountId: this.config.accountId,
        privateKey: this.config.privateKey
      })

      // Initialize PDF Services
      this.pdfServices = new PDFServices({ credentials })
      this.initialized = true

      logger.info('Adobe PDF Services initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Adobe PDF Services:', error)
      throw error
    }
  }

  /**
   * Test connection to Adobe PDF Services
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize()
      return this.initialized && this.config.enabled
    } catch (error) {
      logger.error('Adobe PDF Services connection test failed:', error)
      return false
    }
  }

  /**
   * Create PDF from HTML content
   */
  async createPDFFromHTML(
    htmlContent: string,
    outputPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFConversionResult> {
    const startTime = Date.now()

    try {
      await this.initialize()
      
      if (!this.pdfServices) {
        throw new Error('Adobe PDF Services not initialized')
      }

      // Create temporary HTML file
      const tempHtmlPath = path.join(path.dirname(outputPath), `temp-${Date.now()}.html`)
      await fs.writeFile(tempHtmlPath, htmlContent, 'utf8')

      try {
        // Create PDF job
        const job = new CreatePDFJob({
          inputAsset: await this.pdfServices.upload({
            readStream: await fs.readFile(tempHtmlPath),
            mimeType: MimeType.HTML
          }),
          params: {
            documentLanguage: options?.documentLanguage || 'en-US',
            includeTaggedPDF: options?.includeTaggedPDF || false
          }
        })

        // Execute job
        const pollingURL = await this.pdfServices.submit({ job })
        const pdfServicesResponse = await this.pdfServices.getJobResult({
          pollingURL,
          resultType: CreatePDFResult
        })

        // Download result
        const resultAsset = pdfServicesResponse.result.asset
        const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
        
        // Save to output path
        await fs.writeFile(outputPath, streamAsset.readStream)

        // Get file stats
        const stats = await fs.stat(outputPath)
        const processingTime = Date.now() - startTime

        let finalPath = outputPath

        // Apply additional operations if requested
        if (options?.compress) {
          finalPath = await this.compressPDF(finalPath, options)
        }

        if (options?.linearize) {
          finalPath = await this.linearizePDF(finalPath)
        }

        if (options?.protect && options?.password) {
          finalPath = await this.protectPDF(finalPath, options.password, options.permissions)
        }

        // Get final file stats
        const finalStats = await fs.stat(finalPath)

        return {
          success: true,
          filePath: finalPath,
          fileSize: finalStats.size,
          metadata: {
            processingTime,
            compressionRatio: options?.compress ? stats.size / finalStats.size : 1
          }
        }

      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempHtmlPath)
        } catch (error) {
          logger.warn('Failed to clean up temporary HTML file:', error)
        }
      }

    } catch (error) {
      logger.error('Adobe PDF creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create PDF from DOCX file
   */
  async createPDFFromDOCX(
    docxPath: string,
    outputPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFConversionResult> {
    const startTime = Date.now()

    try {
      await this.initialize()
      
      if (!this.pdfServices) {
        throw new Error('Adobe PDF Services not initialized')
      }

      // Create PDF job
      const job = new CreatePDFJob({
        inputAsset: await this.pdfServices.upload({
          readStream: await fs.readFile(docxPath),
          mimeType: MimeType.DOCX
        }),
        params: {
          documentLanguage: options?.documentLanguage || 'en-US',
          includeTaggedPDF: options?.includeTaggedPDF || false
        }
      })

      // Execute job
      const pollingURL = await this.pdfServices.submit({ job })
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: CreatePDFResult
      })

      // Download result
      const resultAsset = pdfServicesResponse.result.asset
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
      
      // Save to output path
      await fs.writeFile(outputPath, streamAsset.readStream)

      // Get file stats
      const stats = await fs.stat(outputPath)
      const processingTime = Date.now() - startTime

      return {
        success: true,
        filePath: outputPath,
        fileSize: stats.size,
        metadata: {
          processingTime
        }
      }

    } catch (error) {
      logger.error('Adobe PDF creation from DOCX failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Compress PDF file
   */
  private async compressPDF(inputPath: string, options?: PDFGenerationOptions): Promise<string> {
    if (!this.pdfServices) {
      throw new Error('Adobe PDF Services not initialized')
    }

    const outputPath = inputPath.replace('.pdf', '-compressed.pdf')

    const job = new CompressPDFJob({
      inputAsset: await this.pdfServices.upload({
        readStream: await fs.readFile(inputPath),
        mimeType: MimeType.PDF
      }),
      params: {
        compressionLevel: this.getCompressionLevel(options?.quality)
      }
    })

    const pollingURL = await this.pdfServices.submit({ job })
    const pdfServicesResponse = await this.pdfServices.getJobResult({
      pollingURL,
      resultType: CompressPDFResult
    })

    const resultAsset = pdfServicesResponse.result.asset
    const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
    
    await fs.writeFile(outputPath, streamAsset.readStream)

    // Remove original file and rename compressed file
    await fs.unlink(inputPath)
    await fs.rename(outputPath, inputPath)

    return inputPath
  }

  /**
   * Linearize PDF for fast web view
   */
  private async linearizePDF(inputPath: string): Promise<string> {
    if (!this.pdfServices) {
      throw new Error('Adobe PDF Services not initialized')
    }

    const outputPath = inputPath.replace('.pdf', '-linearized.pdf')

    const job = new LinearizePDFJob({
      inputAsset: await this.pdfServices.upload({
        readStream: await fs.readFile(inputPath),
        mimeType: MimeType.PDF
      })
    })

    const pollingURL = await this.pdfServices.submit({ job })
    const pdfServicesResponse = await this.pdfServices.getJobResult({
      pollingURL,
      resultType: LinearizePDFResult
    })

    const resultAsset = pdfServicesResponse.result.asset
    const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
    
    await fs.writeFile(outputPath, streamAsset.readStream)

    // Remove original file and rename linearized file
    await fs.unlink(inputPath)
    await fs.rename(outputPath, inputPath)

    return inputPath
  }

  /**
   * Protect PDF with password and permissions
   */
  private async protectPDF(
    inputPath: string,
    password: string,
    permissions?: PDFGenerationOptions['permissions']
  ): Promise<string> {
    if (!this.pdfServices) {
      throw new Error('Adobe PDF Services not initialized')
    }

    const outputPath = inputPath.replace('.pdf', '-protected.pdf')

    // Configure permissions
    const pdfPermissions = new Permissions()
    if (permissions?.print !== false) pdfPermissions.addPermission(Permissions.Permission.PRINT_LOW_QUALITY)
    if (permissions?.editContent !== false) pdfPermissions.addPermission(Permissions.Permission.EDIT_DOCUMENT_ASSEMBLY)
    if (permissions?.editAnnotations !== false) pdfPermissions.addPermission(Permissions.Permission.EDIT_ANNOTATIONS)
    if (permissions?.fillAndSign !== false) pdfPermissions.addPermission(Permissions.Permission.FILL_AND_SIGN_FORM_FIELDS)
    if (permissions?.extract !== false) pdfPermissions.addPermission(Permissions.Permission.COPY_CONTENT)

    const job = new ProtectPDFJob({
      inputAsset: await this.pdfServices.upload({
        readStream: await fs.readFile(inputPath),
        mimeType: MimeType.PDF
      }),
      params: {
        userPassword: password,
        ownerPassword: password + '_owner',
        permissions: pdfPermissions,
        encryptionAlgorithm: EncryptionAlgorithm.AES_256,
        contentEncryption: ContentEncryption.ALL_CONTENT_EXCEPT_METADATA
      }
    })

    const pollingURL = await this.pdfServices.submit({ job })
    const pdfServicesResponse = await this.pdfServices.getJobResult({
      pollingURL,
      resultType: ProtectPDFResult
    })

    const resultAsset = pdfServicesResponse.result.asset
    const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
    
    await fs.writeFile(outputPath, streamAsset.readStream)

    // Remove original file and rename protected file
    await fs.unlink(inputPath)
    await fs.rename(outputPath, inputPath)

    return inputPath
  }

  /**
   * Export PDF to other formats
   */
  async exportPDF(
    inputPath: string,
    outputPath: string,
    format: 'docx' | 'pptx' | 'xlsx' | 'rtf' | 'jpeg' | 'png'
  ): Promise<PDFOperationResult> {
    try {
      await this.initialize()
      
      if (!this.pdfServices) {
        throw new Error('Adobe PDF Services not initialized')
      }

      const exportFormat = this.getExportFormat(format)
      
      const job = new ExportPDFJob({
        inputAsset: await this.pdfServices.upload({
          readStream: await fs.readFile(inputPath),
          mimeType: MimeType.PDF
        }),
        params: {
          targetFormat: exportFormat
        }
      })

      const pollingURL = await this.pdfServices.submit({ job })
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: ExportPDFResult
      })

      const resultAsset = pdfServicesResponse.result.asset
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
      
      await fs.writeFile(outputPath, streamAsset.readStream)

      return {
        success: true,
        filePath: outputPath
      }

    } catch (error) {
      logger.error('Adobe PDF export failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Perform OCR on PDF
   */
  async performOCR(inputPath: string, outputPath: string): Promise<PDFOperationResult> {
    try {
      await this.initialize()
      
      if (!this.pdfServices) {
        throw new Error('Adobe PDF Services not initialized')
      }

      const job = new OCRJob({
        inputAsset: await this.pdfServices.upload({
          readStream: await fs.readFile(inputPath),
          mimeType: MimeType.PDF
        })
      })

      const pollingURL = await this.pdfServices.submit({ job })
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: OCRResult
      })

      const resultAsset = pdfServicesResponse.result.asset
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset })
      
      await fs.writeFile(outputPath, streamAsset.readStream)

      return {
        success: true,
        filePath: outputPath
      }

    } catch (error) {
      logger.error('Adobe PDF OCR failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get compression level based on quality setting
   */
  private getCompressionLevel(quality?: string) {
    switch (quality) {
      case 'low':
        return 'LOW'
      case 'medium':
        return 'MEDIUM'
      case 'high':
        return 'HIGH'
      default:
        return 'MEDIUM'
    }
  }

  /**
   * Get export format enum value
   */
  private getExportFormat(format: string) {
    switch (format.toLowerCase()) {
      case 'docx':
        return ExportPDFToFormat.DOCX
      case 'pptx':
        return ExportPDFToFormat.PPTX
      case 'xlsx':
        return ExportPDFToFormat.XLSX
      case 'rtf':
        return ExportPDFToFormat.RTF
      case 'jpeg':
        return ExportPDFToFormat.JPEG
      case 'png':
        return ExportPDFToFormat.PNG
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Get service status and usage information
   */
  async getServiceStatus(): Promise<{
    enabled: boolean
    initialized: boolean
    credentialsConfigured: boolean
  }> {
    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      credentialsConfigured: !!(this.config.clientId && this.config.clientSecret)
    }
  }
}

// Create default instance
export const createAdobePDFService = (config: AdobePDFConfig): AdobePDFService => {
  return new AdobePDFService(config)
}