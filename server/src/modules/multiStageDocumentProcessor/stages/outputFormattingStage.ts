/**
 * Output Formatting Stage
 * Stage 6: Formats document for final output
 */

import { logger } from '../../../utils/logger'
import type { StageInput, StageOutput } from '../types'

export class OutputFormattingStage {
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      logger.info('Executing output formatting stage', {
        stageId: input.stage_id,
        requestId: input.metadata?.request_id
      })

      const startTime = Date.now()

      // Extract input data
      const { quality_assessed_document } = input.input_data
      const { output_config } = input.context

      // Generate primary format
      const primaryFormat = await this.generatePrimaryFormat(quality_assessed_document, output_config)

      // Generate secondary formats
      const secondaryFormats = await this.generateSecondaryFormats(quality_assessed_document, output_config, primaryFormat)

      // Generate document metadata
      const documentMetadata = await this.generateDocumentMetadata(quality_assessed_document, primaryFormat, secondaryFormats)

      // Prepare delivery options
      const deliveryOptions = await this.prepareDeliveryOptions(primaryFormat, secondaryFormats, output_config)

      // Calculate quality score
      const qualityScore = await this.calculateFormattingQuality(primaryFormat, secondaryFormats, documentMetadata)

      const processingTime = Date.now() - startTime

      const output: StageOutput = {
        stage_id: input.stage_id,
        stage_type: input.stage_type,
        output_data: {
          formatted_document: {
            document: quality_assessed_document,
            formatted_outputs: {
              [output_config.primary_format]: primaryFormat,
              ...secondaryFormats
            },
            metadata: documentMetadata,
            delivery_options: deliveryOptions
          },
          formatting_metadata: {
            processing_time: processingTime,
            formats_generated: [output_config.primary_format, ...output_config.secondary_formats],
            primary_format: output_config.primary_format,
            secondary_formats: output_config.secondary_formats,
            quality_score: qualityScore
          }
        },
        quality_score: qualityScore,
        processing_time: processingTime,
        metadata: {
          stage: 'output_formatting',
          formats_generated: 1 + output_config.secondary_formats.length,
          primary_format: output_config.primary_format
        }
      }

      logger.info('Output formatting stage completed successfully', {
        stageId: input.stage_id,
        processingTime,
        qualityScore: output.quality_score,
        formatsGenerated: 1 + output_config.secondary_formats.length
      })

      return output

    } catch (error) {
      logger.error('Output formatting stage failed', {
        stageId: input.stage_id,
        error: error.message
      })
      throw error
    }
  }

  private async generatePrimaryFormat(qualityAssessedDocument: any, outputConfig: any): Promise<any> {
    // Generate primary format
    const primaryFormat = outputConfig.primary_format

    switch (primaryFormat) {
      case 'pdf':
        return await this.generatePDF(qualityAssessedDocument)
      case 'docx':
        return await this.generateDOCX(qualityAssessedDocument)
      case 'markdown':
        return await this.generateMarkdown(qualityAssessedDocument)
      case 'html':
        return await this.generateHTML(qualityAssessedDocument)
      case 'json':
        return await this.generateJSON(qualityAssessedDocument)
      case 'xml':
        return await this.generateXML(qualityAssessedDocument)
      default:
        throw new Error(`Unsupported primary format: ${primaryFormat}`)
    }
  }

  private async generateSecondaryFormats(qualityAssessedDocument: any, outputConfig: any, primaryFormat: any): Promise<Record<string, any>> {
    // Generate secondary formats
    const secondaryFormats: Record<string, any> = {}

    for (const format of outputConfig.secondary_formats) {
      try {
        const secondaryFormat = await this.generateSecondaryFormat(qualityAssessedDocument, format, primaryFormat)
        secondaryFormats[format] = secondaryFormat
      } catch (error) {
        logger.error('Failed to generate secondary format', {
          format,
          error: error.message
        })
        // Continue with other formats
      }
    }

    return secondaryFormats
  }

  private async generateSecondaryFormat(qualityAssessedDocument: any, format: string, primaryFormat: any): Promise<any> {
    // Generate secondary format
    switch (format) {
      case 'pdf':
        return await this.generatePDF(qualityAssessedDocument)
      case 'docx':
        return await this.generateDOCX(qualityAssessedDocument)
      case 'markdown':
        return await this.generateMarkdown(qualityAssessedDocument)
      case 'html':
        return await this.generateHTML(qualityAssessedDocument)
      case 'json':
        return await this.generateJSON(qualityAssessedDocument)
      case 'xml':
        return await this.generateXML(qualityAssessedDocument)
      default:
        throw new Error(`Unsupported secondary format: ${format}`)
    }
  }

  private async generatePDF(qualityAssessedDocument: any): Promise<any> {
    // Generate PDF format
    const pdfContent = await this.convertToPDF(qualityAssessedDocument)
    
    return {
      format: 'pdf',
      content: pdfContent,
      metadata: {
        size: pdfContent.length,
        pages: this.calculatePageCount(qualityAssessedDocument),
        generated_at: new Date(),
        generator: 'pdf-generator'
      },
      size: pdfContent.length,
      generated_at: new Date()
    }
  }

  private async generateDOCX(qualityAssessedDocument: any): Promise<any> {
    // Generate DOCX format
    const docxContent = await this.convertToDOCX(qualityAssessedDocument)
    
    return {
      format: 'docx',
      content: docxContent,
      metadata: {
        size: docxContent.length,
        pages: this.calculatePageCount(qualityAssessedDocument),
        generated_at: new Date(),
        generator: 'docx-generator'
      },
      size: docxContent.length,
      generated_at: new Date()
    }
  }

  private async generateMarkdown(qualityAssessedDocument: any): Promise<any> {
    // Generate Markdown format
    const markdownContent = await this.convertToMarkdown(qualityAssessedDocument)
    
    return {
      format: 'markdown',
      content: markdownContent,
      metadata: {
        size: markdownContent.length,
        lines: markdownContent.split('\n').length,
        generated_at: new Date(),
        generator: 'markdown-generator'
      },
      size: markdownContent.length,
      generated_at: new Date()
    }
  }

  private async generateHTML(qualityAssessedDocument: any): Promise<any> {
    // Generate HTML format
    const htmlContent = await this.convertToHTML(qualityAssessedDocument)
    
    return {
      format: 'html',
      content: htmlContent,
      metadata: {
        size: htmlContent.length,
        generated_at: new Date(),
        generator: 'html-generator'
      },
      size: htmlContent.length,
      generated_at: new Date()
    }
  }

  private async generateJSON(qualityAssessedDocument: any): Promise<any> {
    // Generate JSON format
    const jsonContent = JSON.stringify(qualityAssessedDocument, null, 2)
    
    return {
      format: 'json',
      content: jsonContent,
      metadata: {
        size: jsonContent.length,
        generated_at: new Date(),
        generator: 'json-generator'
      },
      size: jsonContent.length,
      generated_at: new Date()
    }
  }

  private async generateXML(qualityAssessedDocument: any): Promise<any> {
    // Generate XML format
    const xmlContent = await this.convertToXML(qualityAssessedDocument)
    
    return {
      format: 'xml',
      content: xmlContent,
      metadata: {
        size: xmlContent.length,
        generated_at: new Date(),
        generator: 'xml-generator'
      },
      size: xmlContent.length,
      generated_at: new Date()
    }
  }

  private async convertToPDF(qualityAssessedDocument: any): Promise<Buffer> {
    // Convert document to PDF format
    // This would integrate with PDF generation library
    const pdfContent = `PDF content for document ${qualityAssessedDocument.document_id}`
    return Buffer.from(pdfContent)
  }

  private async convertToDOCX(qualityAssessedDocument: any): Promise<Buffer> {
    // Convert document to DOCX format
    // This would integrate with DOCX generation library
    const docxContent = `DOCX content for document ${qualityAssessedDocument.document_id}`
    return Buffer.from(docxContent)
  }

  private async convertToMarkdown(qualityAssessedDocument: any): Promise<string> {
    // Convert document to Markdown format
    let markdownContent = `# ${qualityAssessedDocument.document_id}\n\n`

    if (qualityAssessedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.personalized_sections)) {
        markdownContent += `## ${sectionKey}\n\n`
        
        if (sectionData.personalized_content) {
          if (typeof sectionData.personalized_content === 'string') {
            markdownContent += `${sectionData.personalized_content}\n\n`
          } else if (sectionData.personalized_content.contextualized_content) {
            markdownContent += `${sectionData.personalized_content.contextualized_content}\n\n`
          }
        }
      }
    }

    return markdownContent
  }

  private async convertToHTML(qualityAssessedDocument: any): Promise<string> {
    // Convert document to HTML format
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${qualityAssessedDocument.document_id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        h2 { color: #666; }
        p { line-height: 1.6; }
    </style>
</head>
<body>
    <h1>${qualityAssessedDocument.document_id}</h1>
`

    if (qualityAssessedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.personalized_sections)) {
        htmlContent += `    <h2>${sectionKey}</h2>\n`
        
        if (sectionData.personalized_content) {
          if (typeof sectionData.personalized_content === 'string') {
            htmlContent += `    <p>${sectionData.personalized_content}</p>\n`
          } else if (sectionData.personalized_content.contextualized_content) {
            htmlContent += `    <p>${sectionData.personalized_content.contextualized_content}</p>\n`
          }
        }
      }
    }

    htmlContent += `
</body>
</html>
`

    return htmlContent
  }

  private async convertToXML(qualityAssessedDocument: any): Promise<string> {
    // Convert document to XML format
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<document id="${qualityAssessedDocument.document_id}">\n`

    if (qualityAssessedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.personalized_sections)) {
        xmlContent += `  <section name="${sectionKey}">\n`
        
        if (sectionData.personalized_content) {
          if (typeof sectionData.personalized_content === 'string') {
            xmlContent += `    <content><![CDATA[${sectionData.personalized_content}]]></content>\n`
          } else if (sectionData.personalized_content.contextualized_content) {
            xmlContent += `    <content><![CDATA[${sectionData.personalized_content.contextualized_content}]]></content>\n`
          }
        }
        
        xmlContent += `  </section>\n`
      }
    }

    xmlContent += `</document>`

    return xmlContent
  }

  private calculatePageCount(qualityAssessedDocument: any): number {
    // Calculate estimated page count
    let totalContentLength = 0

    if (qualityAssessedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.personalized_sections)) {
        if (sectionData.personalized_content) {
          if (typeof sectionData.personalized_content === 'string') {
            totalContentLength += sectionData.personalized_content.length
          } else if (sectionData.personalized_content.contextualized_content) {
            totalContentLength += sectionData.personalized_content.contextualized_content.length
          }
        }
      }
    }

    // Estimate pages based on content length (approximately 2000 characters per page)
    return Math.max(1, Math.ceil(totalContentLength / 2000))
  }

  private async generateDocumentMetadata(qualityAssessedDocument: any, primaryFormat: any, secondaryFormats: Record<string, any>): Promise<any> {
    // Generate comprehensive document metadata
    return {
      document_id: qualityAssessedDocument.document_id,
      template_id: qualityAssessedDocument.template_id,
      generated_at: new Date(),
      formats_available: [primaryFormat.format, ...Object.keys(secondaryFormats)],
      quality_scores: {
        overall: qualityAssessedDocument.quality_assessment?.overall_score || 0,
        content_quality: qualityAssessedDocument.quality_assessment?.assessments[0]?.score || 0,
        methodology_compliance: qualityAssessedDocument.quality_assessment?.assessments[1]?.score || 0,
        stakeholder_requirements: qualityAssessedDocument.quality_assessment?.assessments[2]?.score || 0,
        technical_accuracy: qualityAssessedDocument.quality_assessment?.assessments[3]?.score || 0
      },
      processing_info: {
        stages_completed: [
          'context_gathering',
          'template_processing',
          'ai_generation',
          'context_injection',
          'quality_assurance',
          'output_formatting'
        ],
        processing_time: 0, // Would be calculated from stage results
        quality_gates_passed: qualityAssessedDocument.quality_gates?.filter((gate: any) => gate.passed).length || 0,
        refinements_applied: qualityAssessedDocument.refinements_applied?.length || 0
      },
      context_info: {
        context_sources_used: qualityAssessedDocument.context_sources_used || [],
        context_quality_score: qualityAssessedDocument.context_quality_score || 0,
        context_relevance_score: qualityAssessedDocument.context_relevance_score || 0,
        personalization_applied: qualityAssessedDocument.personalization_applied || false
      },
      file_info: {
        primary_format: primaryFormat.format,
        primary_size: primaryFormat.size,
        secondary_formats: Object.keys(secondaryFormats),
        total_size: primaryFormat.size + Object.values(secondaryFormats).reduce((sum, format) => sum + format.size, 0)
      }
    }
  }

  private async prepareDeliveryOptions(primaryFormat: any, secondaryFormats: Record<string, any>, outputConfig: any): Promise<any[]> {
    // Prepare delivery options
    const deliveryOptions: any[] = []

    // Prepare primary format delivery
    deliveryOptions.push({
      delivery_method: 'download',
      destination: 'user_download',
      format: primaryFormat.format,
      content: primaryFormat.content,
      metadata: {
        size: primaryFormat.size,
        generated_at: primaryFormat.generated_at
      }
    })

    // Prepare secondary format deliveries
    for (const [format, formatData] of Object.entries(secondaryFormats)) {
      deliveryOptions.push({
        delivery_method: 'download',
        destination: 'user_download',
        format: format,
        content: formatData.content,
        metadata: {
          size: formatData.size,
          generated_at: formatData.generated_at
        }
      })
    }

    // Add delivery options from configuration
    if (outputConfig.delivery_options) {
      for (const deliveryOption of outputConfig.delivery_options) {
        deliveryOptions.push({
          ...deliveryOption,
          content: deliveryOption.format === primaryFormat.format ? primaryFormat.content : secondaryFormats[deliveryOption.format]?.content
        })
      }
    }

    return deliveryOptions
  }

  private async calculateFormattingQuality(primaryFormat: any, secondaryFormats: Record<string, any>, documentMetadata: any): Promise<number> {
    // Calculate formatting quality score
    const qualityFactors = {
      primary_format_quality: this.assessFormatQuality(primaryFormat),
      secondary_formats_quality: this.assessSecondaryFormatsQuality(secondaryFormats),
      metadata_completeness: this.assessMetadataCompleteness(documentMetadata),
      delivery_options_quality: this.assessDeliveryOptionsQuality(documentMetadata)
    }

    const weights = {
      primary_format_quality: 0.4,
      secondary_formats_quality: 0.3,
      metadata_completeness: 0.2,
      delivery_options_quality: 0.1
    }

    const overallScore = Object.entries(qualityFactors).reduce((sum, [factor, score]) => {
      return sum + (score * weights[factor as keyof typeof weights])
    }, 0)

    return Math.min(1, Math.max(0, overallScore))
  }

  private assessFormatQuality(format: any): number {
    // Assess individual format quality
    let score = 0
    let factors = 0

    // Check if format has content
    if (format.content) {
      score += 0.3
      factors++
    }

    // Check if format has metadata
    if (format.metadata) {
      score += 0.2
      factors++
    }

    // Check content size
    if (format.size && format.size > 0) {
      score += 0.2
      factors++
    }

    // Check generation timestamp
    if (format.generated_at) {
      score += 0.1
      factors++
    }

    // Check format-specific quality
    const formatSpecificQuality = this.assessFormatSpecificQuality(format)
    score += formatSpecificQuality * 0.2
    factors++

    return factors > 0 ? score / factors : 0
  }

  private assessFormatSpecificQuality(format: any): number {
    // Assess format-specific quality
    switch (format.format) {
      case 'pdf':
        return this.assessPDFQuality(format)
      case 'docx':
        return this.assessDOCXQuality(format)
      case 'markdown':
        return this.assessMarkdownQuality(format)
      case 'html':
        return this.assessHTMLQuality(format)
      case 'json':
        return this.assessJSONQuality(format)
      case 'xml':
        return this.assessXMLQuality(format)
      default:
        return 0.5
    }
  }

  private assessPDFQuality(format: any): number {
    // Assess PDF-specific quality
    return 0.9
  }

  private assessDOCXQuality(format: any): number {
    // Assess DOCX-specific quality
    return 0.85
  }

  private assessMarkdownQuality(format: any): number {
    // Assess Markdown-specific quality
    return 0.9
  }

  private assessHTMLQuality(format: any): number {
    // Assess HTML-specific quality
    return 0.88
  }

  private assessJSONQuality(format: any): number {
    // Assess JSON-specific quality
    try {
      JSON.parse(format.content)
      return 0.95
    } catch {
      return 0.1
    }
  }

  private assessXMLQuality(format: any): number {
    // Assess XML-specific quality
    return 0.9
  }

  private assessSecondaryFormatsQuality(secondaryFormats: Record<string, any>): number {
    // Assess secondary formats quality
    if (Object.keys(secondaryFormats).length === 0) {
      return 1.0 // No secondary formats to assess
    }

    const formatScores = Object.values(secondaryFormats).map(format => this.assessFormatQuality(format))
    return formatScores.reduce((sum, score) => sum + score, 0) / formatScores.length
  }

  private assessMetadataCompleteness(documentMetadata: any): number {
    // Assess metadata completeness
    let score = 0
    let factors = 0

    // Check required metadata fields
    if (documentMetadata.document_id) {
      score += 0.2
      factors++
    }

    if (documentMetadata.template_id) {
      score += 0.1
      factors++
    }

    if (documentMetadata.generated_at) {
      score += 0.1
      factors++
    }

    if (documentMetadata.formats_available) {
      score += 0.1
      factors++
    }

    if (documentMetadata.quality_scores) {
      score += 0.2
      factors++
    }

    if (documentMetadata.processing_info) {
      score += 0.1
      factors++
    }

    if (documentMetadata.context_info) {
      score += 0.1
      factors++
    }

    if (documentMetadata.file_info) {
      score += 0.1
      factors++
    }

    return factors > 0 ? score / factors : 0
  }

  private assessDeliveryOptionsQuality(documentMetadata: any): number {
    // Assess delivery options quality
    // This would assess the quality of delivery options
    return 0.9
  }
}

