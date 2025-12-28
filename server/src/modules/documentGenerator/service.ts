/**
 * Document Generator Service
 * Core business logic for document generation from templates
 */

import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs/promises'
import * as path from 'path'
import Handlebars from 'handlebars'
import { marked } from 'marked'
import puppeteer from 'puppeteer'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { pool } from '../../database/connection'
import { cache } from '../../utils/redis'
import { logger } from '../../utils/logger'
import { documentTemplateService } from '../documentTemplates/service'
import { adobePdfService } from '../../services/adobePdfService'
import type {
  DocumentGenerationRequest,
  DocumentGenerationResponse,
  GenerationOptions,
  GenerationMetadata,
  TemplateData,
  ProcessedTemplate,
  GenerationJob,
  OutputFormat,
  GenerationStatus,
  DocumentGeneratorConfig,
  AuthenticatedUser,
  GenerationError,
  GenerationStats
} from './types'

export class DocumentGeneratorService {
  private static readonly DEFAULT_CONFIG: DocumentGeneratorConfig = {
    output_directory: process.env.DOCUMENT_OUTPUT_DIR || './generated-documents',
    temp_directory: process.env.DOCUMENT_TEMP_DIR || './temp',
    max_file_size: 50 * 1024 * 1024, // 50MB
    max_generation_time: 300000, // 5 minutes
    cleanup_after_hours: 24,
    pdf_options: {
      format: 'A4' as any,
      orientation: 'portrait' as any,
      margins: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      print_background: true,
      display_header_footer: false,
      header_template: '',
      footer_template: '',
      scale: 1,
      quality: 100
    },
    docx_options: {
      page_size: 'A4' as any,
      orientation: 'portrait' as any,
      margins: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      default_font: 'Calibri',
      default_font_size: 11,
      line_spacing: 1.15,
      include_styles: true
    },
    markdown_options: {
      include_frontmatter: true,
      frontmatter_format: 'yaml',
      line_breaks: 'lf',
      encoding: 'utf8',
      include_toc: false,
      toc_depth: 3
    }
  }

  private config: DocumentGeneratorConfig

  constructor(config?: Partial<DocumentGeneratorConfig>) {
    this.config = { ...DocumentGeneratorService.DEFAULT_CONFIG, ...config }
    this.initializeDirectories()
  }

  /**
   * Generate document from template and data
   */
  async generateDocument(
    request: DocumentGenerationRequest,
    user: AuthenticatedUser
  ): Promise<DocumentGenerationResponse> {
    const startTime = Date.now()
    const generationId = uuidv4()

    try {
      logger.info(`Starting document generation: ${generationId}`, {
        template_id: request.template_id,
        format: request.output_format,
        user: user.email
      })

      // Create generation job record
      const job = await this.createGenerationJob(generationId, request, user)

      // Get template data
      const template = await this.getTemplateData(request.template_id, user)
      if (!template) {
        throw new GenerationError('Template not found', 'TEMPLATE_NOT_FOUND')
      }

      // Process template with data
      const processedTemplate = await this.processTemplate(template, request.data)

      // Generate document based on format
      let filePath: string
      let fileSize: number

      switch (request.output_format) {
        case OutputFormat.MARKDOWN:
          filePath = await this.generateMarkdown(processedTemplate, request.options, generationId)
          break
        case OutputFormat.PDF:
          filePath = await this.generatePDF(processedTemplate, request.options, generationId)
          break
        case OutputFormat.DOCX:
          filePath = await this.generateDOCX(processedTemplate, request.options, generationId)
          break
        case OutputFormat.HTML:
          filePath = await this.generateHTML(processedTemplate, request.options, generationId)
          break
        default:
          throw new GenerationError('Unsupported output format', 'UNSUPPORTED_FORMAT')
      }

      // Get file stats
      const stats = await fs.stat(filePath)
      fileSize = stats.size

      const endTime = Date.now()
      const generationTime = endTime - startTime

      // Create metadata
      const metadata: GenerationMetadata = {
        template_name: template.name,
        generated_by: user.id,
        generation_time_ms: generationTime,
        file_size_bytes: fileSize,
        variables_used: Object.keys(processedTemplate.variables_resolved),
        context_data: request.data
      }

      // Create response
      const response: DocumentGenerationResponse = {
        id: generationId,
        status: GenerationStatus.COMPLETED,
        output_format: request.output_format,
        file_path: filePath,
        file_url: this.getFileUrl(filePath),
        file_size: fileSize,
        metadata,
        created_at: new Date(startTime),
        completed_at: new Date(endTime)
      }

      // Update job record
      await this.updateGenerationJob(generationId, GenerationStatus.COMPLETED, response)

      // Record template usage
      await documentTemplateService.recordTemplateUsage(request.template_id, user)

      // Post-generation hook: Enqueue Confluence publishing if project is mapped
      await this.enqueueConfluencePublishing(response, request, user)

      logger.info(`Document generation completed: ${generationId}`, {
        generation_time_ms: generationTime,
        file_size: fileSize,
        format: request.output_format
      })

      return response

    } catch (error) {
      const endTime = Date.now()
      const generationTime = endTime - startTime

      logger.error(`Document generation failed: ${generationId}`, {
        error: error.message,
        generation_time_ms: generationTime,
        template_id: request.template_id
      })

      // Update job record with error
      await this.updateGenerationJob(generationId, GenerationStatus.FAILED, undefined, error.message)

      throw error
    }
  }

  /**
   * Get template data from database
   */
  private async getTemplateData(templateId: string, user: AuthenticatedUser): Promise<TemplateData | null> {
    const template = await documentTemplateService.getTemplateById(templateId, user)
    if (!template) {
      return null
    }

    return {
      id: template.id,
      name: template.name,
      content: template.content,
      variables: template.variables,
      framework: template.framework,
      category: template.category
    }
  }

  /**
   * Process template with provided data using Handlebars
   */
  private async processTemplate(template: TemplateData, data: Record<string, any>): Promise<ProcessedTemplate> {
    try {
      // Register Handlebars helpers
      this.registerHandlebarsHelpers()

      // Compile template
      const compiledTemplate = Handlebars.compile(JSON.stringify(template.content))

      // Resolve variables
      const variablesResolved: Record<string, any> = {}
      const missingVariables: string[] = []
      const warnings: string[] = []

      // Check required variables
      for (const variable of template.variables) {
        if (variable.required && !(variable.name in data)) {
          if (variable.default !== undefined) {
            variablesResolved[variable.name] = variable.default
            warnings.push(`Using default value for required variable: ${variable.name}`)
          } else {
            missingVariables.push(variable.name)
          }
        } else {
          variablesResolved[variable.name] = data[variable.name] || variable.default
        }
      }

      if (missingVariables.length > 0) {
        throw new GenerationError(
          `Missing required variables: ${missingVariables.join(', ')}`,
          'MISSING_VARIABLES'
        )
      }

      // Process template
      const processedContent = compiledTemplate({ ...data, ...variablesResolved })

      return {
        content: processedContent,
        metadata: template,
        variables_resolved: variablesResolved,
        missing_variables: missingVariables,
        warnings
      }

    } catch (error) {
      throw new GenerationError(
        `Template processing failed: ${error.message}`,
        'TEMPLATE_PROCESSING_ERROR'
      )
    }
  }

  /**
   * Generate Markdown document
   */
  private async generateMarkdown(
    processedTemplate: ProcessedTemplate,
    options?: GenerationOptions,
    generationId?: string
  ): Promise<string> {
    const filename = options?.filename || `document-${generationId}.md`
    const filePath = path.join(this.config.output_directory, filename)

    let content = processedTemplate.content

    // Add frontmatter if enabled
    if (this.config.markdown_options.include_frontmatter) {
      const frontmatter = this.generateFrontmatter(processedTemplate.metadata, processedTemplate.variables_resolved)
      content = `${frontmatter}\n\n${content}`
    }

    // Write file
    await fs.writeFile(filePath, content, { encoding: this.config.markdown_options.encoding })

    return filePath
  }

  /**
   * Generate PDF document using Puppeteer or Adobe PDF Services
   */
  private async generatePDF(
    processedTemplate: ProcessedTemplate,
    options?: GenerationOptions,
    generationId?: string
  ): Promise<string> {
    const filename = options?.filename || `document-${generationId}.pdf`
    const filePath = path.join(this.config.output_directory, filename)

    // Convert content to HTML first
    const htmlContent = await this.convertToHTML(processedTemplate.content, options)

    // Check if Adobe PDF Services should be used
    if (options?.use_adobe_pdf) {
      try {
        logger.info(`Using Adobe PDF Services for premium PDF generation: ${filename}`)
        
        const adobeOptions = {
          quality: options.adobe_quality || 'high',
          compress: options.adobe_compress || false,
          linearize: options.adobe_linearize || false,
          protect: options.adobe_protect || false,
          password: options.adobe_password,
          permissions: options.adobe_permissions,
          documentLanguage: options.document_language || 'en-US',
          includeTaggedPDF: options.include_tagged_pdf || false
        }

        const result = await adobePdfService.generatePremiumPDF(
          htmlContent,
          filename,
          adobeOptions
        )

        if (result.success && result.filePath) {
          logger.info(`Adobe PDF generation completed: ${filename}`, {
            fileSize: result.fileSize,
            processingTime: result.metadata?.processingTime,
            compressionRatio: result.metadata?.compressionRatio
          })
          return result.filePath
        } else {
          logger.warn(`Adobe PDF generation failed, falling back to Puppeteer: ${result.error}`)
          // Fall through to Puppeteer generation
        }
      } catch (error) {
        logger.error(`Adobe PDF generation error, falling back to Puppeteer:`, error)
        // Fall through to Puppeteer generation
      }
    }

    // Use Puppeteer for standard PDF generation
    logger.info(`Using Puppeteer for standard PDF generation: ${filename}`)
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      // Generate PDF
      const pdfOptions = {
        path: filePath,
        format: options?.page_size || this.config.pdf_options.format,
        landscape: options?.orientation === 'landscape',
        margin: options?.margins || this.config.pdf_options.margins,
        printBackground: this.config.pdf_options.print_background,
        displayHeaderFooter: options?.include_header || options?.include_footer || false,
        headerTemplate: options?.header_template || this.config.pdf_options.header_template,
        footerTemplate: options?.footer_template || this.config.pdf_options.footer_template
      }

      await page.pdf(pdfOptions as any)

    } finally {
      await browser.close()
    }

    return filePath
  }

  /**
   * Generate DOCX document
   */
  private async generateDOCX(
    processedTemplate: ProcessedTemplate,
    options?: GenerationOptions,
    generationId?: string
  ): Promise<string> {
    const filename = options?.filename || `document-${generationId}.docx`
    const filePath = path.join(this.config.output_directory, filename)

    // Parse content and create DOCX structure
    const paragraphs = this.parseContentToParagraphs(processedTemplate.content)

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    })

    // Generate buffer and write file
    const buffer = await Packer.toBuffer(doc)
    await fs.writeFile(filePath, buffer)

    return filePath
  }

  /**
   * Generate HTML document
   */
  private async generateHTML(
    processedTemplate: ProcessedTemplate,
    options?: GenerationOptions,
    generationId?: string
  ): Promise<string> {
    const filename = options?.filename || `document-${generationId}.html`
    const filePath = path.join(this.config.output_directory, filename)

    const htmlContent = await this.convertToHTML(processedTemplate.content, options)

    await fs.writeFile(filePath, htmlContent, { encoding: 'utf8' })

    return filePath
  }

  /**
   * Convert content to HTML
   */
  private async convertToHTML(content: string, options?: GenerationOptions): Promise<string> {
    // If content is already HTML, return as-is
    if (content.trim().startsWith('<')) {
      return this.wrapInHTMLDocument(content, options)
    }

    // Convert Markdown to HTML
    const htmlBody = await marked(content)
    return this.wrapInHTMLDocument(htmlBody, options)
  }

  /**
   * Wrap content in full HTML document
   */
  private wrapInHTMLDocument(bodyContent: string, options?: GenerationOptions): string {
    const styles = options?.css_styles || this.getDefaultStyles()

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Document</title>
    <style>
        ${styles}
    </style>
</head>
<body>
    ${bodyContent}
</body>
</html>`
  }

  /**
   * Parse content to DOCX paragraphs
   */
  private parseContentToParagraphs(content: string): Paragraph[] {
    const lines = content.split('\n')
    const paragraphs: Paragraph[] = []

    for (const line of lines) {
      if (line.trim() === '') {
        continue
      }

      // Check for headers
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1
        const text = line.replace(/^#+\s*/, '')
        
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text, bold: true, size: Math.max(24 - level * 2, 12) * 2 })],
          heading: this.getHeadingLevel(level)
        }))
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun(line)]
        }))
      }
    }

    return paragraphs
  }

  /**
   * Get DOCX heading level
   */
  private getHeadingLevel(level: number): HeadingLevel {
    switch (level) {
      case 1: return HeadingLevel.HEADING_1
      case 2: return HeadingLevel.HEADING_2
      case 3: return HeadingLevel.HEADING_3
      case 4: return HeadingLevel.HEADING_4
      case 5: return HeadingLevel.HEADING_5
      case 6: return HeadingLevel.HEADING_6
      default: return HeadingLevel.HEADING_1
    }
  }

  /**
   * Generate frontmatter for Markdown
   */
  private generateFrontmatter(metadata: any, variables: Record<string, any>): string {
    const frontmatterData = {
      title: metadata.name,
      generated_at: new Date().toISOString(),
      template_id: metadata.id,
      framework: metadata.framework,
      category: metadata.category,
      variables
    }

    switch (this.config.markdown_options.frontmatter_format) {
      case 'yaml':
        return `---\n${Object.entries(frontmatterData).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---`
      case 'json':
        return `---\n${JSON.stringify(frontmatterData, null, 2)}\n---`
      case 'toml':
        // Simple TOML implementation
        return `+++\n${Object.entries(frontmatterData).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n')}\n+++`
      default:
        return `---\n${Object.entries(frontmatterData).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---`
    }
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString()
    })

    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : ''
    })

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : ''
    })

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b)
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b)
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b)
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b)
  }

  /**
   * Get default CSS styles
   */
  private getDefaultStyles(): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      h1, h2, h3, h4, h5, h6 {
        color: #2c3e50;
        margin-top: 2em;
        margin-bottom: 1em;
      }
      h1 { font-size: 2.5em; }
      h2 { font-size: 2em; }
      h3 { font-size: 1.5em; }
      p { margin-bottom: 1em; }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      code {
        background-color: #f4f4f4;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
      }
      pre {
        background-color: #f4f4f4;
        padding: 1em;
        border-radius: 5px;
        overflow-x: auto;
      }
    `
  }

  /**
   * Get file URL for download
   */
  private getFileUrl(filePath: string): string {
    const relativePath = path.relative(this.config.output_directory, filePath)
    return `/api/document-generator/download/${encodeURIComponent(relativePath)}`
  }

  /**
   * Create generation job record
   */
  private async createGenerationJob(
    id: string,
    request: DocumentGenerationRequest,
    user: AuthenticatedUser
  ): Promise<GenerationJob> {
    const job: GenerationJob = {
      id,
      request,
      status: GenerationStatus.PROCESSING,
      progress: 0,
      created_at: new Date()
    }

    // Store in cache for tracking
    await cache.set(`generation:${id}`, job, 3600) // 1 hour

    return job
  }

  /**
   * Update generation job record
   */
  private async updateGenerationJob(
    id: string,
    status: GenerationStatus,
    result?: DocumentGenerationResponse,
    error?: string
  ): Promise<void> {
    const job = await cache.get(`generation:${id}`) as GenerationJob
    if (job) {
      job.status = status
      job.completed_at = new Date()
      if (result) job.result = result
      if (error) job.error = error

      await cache.set(`generation:${id}`, job, 3600)
    }
  }

  /**
   * Initialize required directories
   */
  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.config.output_directory, { recursive: true })
      await fs.mkdir(this.config.temp_directory, { recursive: true })
    } catch (error) {
      logger.error('Failed to initialize directories', error)
    }
  }

  /**
   * Get generation job status
   */
  async getGenerationStatus(id: string): Promise<GenerationJob | null> {
    return await cache.get(`generation:${id}`) as GenerationJob | null
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats(user: AuthenticatedUser): Promise<GenerationStats> {
    // This would typically query a database table for generation history
    // For now, return mock data
    return {
      total_generations: 0,
      successful_generations: 0,
      failed_generations: 0,
      average_generation_time: 0,
      most_used_formats: {
        [OutputFormat.PDF]: 0,
        [OutputFormat.DOCX]: 0,
        [OutputFormat.MARKDOWN]: 0,
        [OutputFormat.HTML]: 0
      },
      most_used_templates: []
    }
  }

  /**
   * Clean up old generated files
   */
  async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.output_directory)
      const cutoffTime = Date.now() - (this.config.cleanup_after_hours * 60 * 60 * 1000)

      for (const file of files) {
        const filePath = path.join(this.config.output_directory, file)
        const stats = await fs.stat(filePath)
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath)
          logger.info(`Cleaned up old file: ${file}`)
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old files', error)
    }
  }

  /**
   * Post-generation hook to enqueue Confluence publishing
   * Only publishes if project has Confluence mapping
   */
  private async enqueueConfluencePublishing(
    response: DocumentGenerationResponse,
    request: DocumentGenerationRequest,
    user: AuthenticatedUser
  ): Promise<void> {
    try {
      // Check if project ID is available in request data
      const projectId = request.data?.projectId || request.data?.project_id
      if (!projectId) {
        logger.debug('No project ID found in request data, skipping Confluence publishing')
        return
      }

      // Check if project has Confluence mapping
      const { getByProjectId } = await import('../../database/projectIntegrations')
      const mapping = await getByProjectId(projectId)
      
      if (!mapping || !mapping.confluence_space_key) {
        logger.debug(`No Confluence mapping for project ${projectId}, skipping publishing`)
        return
      }

      // Only publish markdown format to Confluence
      if (request.output_format !== OutputFormat.MARKDOWN) {
        logger.debug(`Document format ${request.output_format} not suitable for Confluence, skipping publishing`)
        return
      }

      // Read the generated markdown content
      const markdownContent = await fs.readFile(response.file_path, 'utf-8')
      
      // Generate document title from template name and timestamp
      const templateName = response.metadata.template_name || 'Generated Document'
      const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      const title = `${templateName} - ${timestamp}`

      // Enqueue Confluence publishing job
      const { addJob } = await import('../../services/queueService')
      const jobId = await addJob(
        'confluence-publishing',
        'publish-to-confluence',
        {
          jobId: response.id,
          userId: user.id,
          documentId: response.id,
          projectId,
          title,
          markdown: markdownContent
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          timeout: 120000 // 2 minutes
        }
      )

      logger.info(`Enqueued Confluence publishing job ${jobId} for document ${response.id}`, {
        projectId,
        title,
        confluenceSpace: mapping.confluence_space_key
      })

    } catch (error) {
      // Don't fail document generation if Confluence publishing fails to enqueue
      logger.error('Failed to enqueue Confluence publishing job', {
        error: error.message,
        documentId: response.id,
        userId: user.id
      })
    }
  }
}

/**
 * Custom error class for generation errors
 */
class GenerationError extends Error {
  public code: string
  public details?: any
  public template_id?: string
  public generation_id?: string

  constructor(
    message: string,
    code: string,
    details?: any,
    template_id?: string,
    generation_id?: string
  ) {
    super(message)
    this.name = 'GenerationError'
    this.code = code
    this.details = details
    this.template_id = template_id
    this.generation_id = generation_id
  }
}

export const documentGeneratorService = new DocumentGeneratorService()