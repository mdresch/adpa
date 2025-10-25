/**
 * Output Formatting Stage
 * Stage 6: Formats document for final output
 */

import { logger } from '../../../utils/logger'
import { MultiFormatOutputEngine, FormatConversionOptions } from '../engines/multiFormatOutputEngine'
import type { StageInput, StageOutput } from '../types'

export class OutputFormattingStage {
  private formatEngine: MultiFormatOutputEngine

  constructor() {
    this.formatEngine = MultiFormatOutputEngine.getInstance()
  }

  async execute(input: StageInput): Promise<StageOutput> {
    try {
      logger.info('Executing output formatting stage', {
        stageId: input.stage_id,
        requestId: input.metadata?.request_id
      })

      const startTime = Date.now()

      // Extract input data
      const { quality_assessed_document } = input.input_data
      let output_config = (input.context as any)?.output_config || {
        primary_format: 'markdown',
        secondary_formats: [],
        include_metadata: false
      }
      
      // Ensure primary_format has a default value
      if (!output_config.primary_format) {
        output_config.primary_format = 'markdown'
      }
      
      // Ensure secondary_formats is always an array
      if (!output_config.secondary_formats || !Array.isArray(output_config.secondary_formats)) {
        output_config.secondary_formats = []
      }
      
      logger.info('📝 Output config validated', {
        primaryFormat: output_config.primary_format,
        secondaryFormats: output_config.secondary_formats,
        includeMetadata: output_config.include_metadata
      })

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
    // Extract markdown content from the document
    const markdownContent = this.extractMarkdownContent(qualityAssessedDocument)
    
    // Prepare conversion options
    const conversionOptions: FormatConversionOptions = {
      includeMetadata: outputConfig.include_metadata || false,
      styling: outputConfig.styling || {},
      pageSettings: outputConfig.page_settings || {}
    }

    // Generate primary format using the engine
    const primaryFormat = outputConfig.primary_format || 'markdown'
    const result = await this.formatEngine.convertFromMarkdown(
      markdownContent,
      primaryFormat,
      conversionOptions
    )

    return {
      format: primaryFormat,
      content: result.content,
      metadata: result.metadata,
      size: result.metadata.size,
      generated_at: result.metadata.generatedAt
    }
  }

  private async generateSecondaryFormats(qualityAssessedDocument: any, outputConfig: any, primaryFormat: any): Promise<Record<string, any>> {
    // Generate secondary formats
    const secondaryFormats: Record<string, any> = {}
    
    // Ensure secondary_formats is an array
    const formats = outputConfig.secondary_formats || []

    for (const format of formats) {
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
    // Extract markdown content from the document
    const markdownContent = this.extractMarkdownContent(qualityAssessedDocument)
    
    // Use same conversion options as primary format
    const conversionOptions: FormatConversionOptions = {
      includeMetadata: false, // Secondary formats typically don't include metadata
      styling: primaryFormat.metadata?.styling || {},
      pageSettings: primaryFormat.metadata?.pageSettings || {}
    }

    // Generate secondary format using the engine
    const result = await this.formatEngine.convertFromMarkdown(
      markdownContent,
      format,
      conversionOptions
    )

    return {
      format: format,
      content: result.content,
      metadata: result.metadata,
      size: result.metadata.size,
      generated_at: result.metadata.generatedAt
    }
  }


  private calculatePageCount(qualityAssessedDocument: any): number {
    // Extract markdown content and estimate page count
    const markdownContent = this.extractMarkdownContent(qualityAssessedDocument)
    const wordsPerPage = 250
    const wordCount = markdownContent.trim().split(/\s+/).filter(word => word.length > 0).length
    return Math.max(1, Math.ceil(wordCount / wordsPerPage))
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

  /**
   * Extract markdown content from the quality assessed document
   */
  private extractMarkdownContent(qualityAssessedDocument: any): string {
    let markdownContent = ''

    // Log the FULL structure for debugging
    logger.info('🔍 FULL quality_assessed_document structure', {
      fullStructure: JSON.stringify(qualityAssessedDocument, null, 2).substring(0, 2000)
    })
    
    logger.info('🔍 Extracting markdown content from quality_assessed_document', {
      hasMarkdownContent: !!qualityAssessedDocument.markdown_content,
      hasPersonalizedSections: !!qualityAssessedDocument.personalized_sections,
      hasContentSections: !!qualityAssessedDocument.content_sections,
      hasContent: !!qualityAssessedDocument.content,
      hasDocument: !!qualityAssessedDocument.document,
      hasGeneratedDocument: !!qualityAssessedDocument.generated_document,
      topLevelKeys: Object.keys(qualityAssessedDocument || {}),
      generatedDocKeys: qualityAssessedDocument.generated_document ? Object.keys(qualityAssessedDocument.generated_document) : [],
      contentKeys: qualityAssessedDocument.content ? Object.keys(qualityAssessedDocument.content) : []
    })

    // Check if document already has markdown content
    if (qualityAssessedDocument.markdown_content) {
      return qualityAssessedDocument.markdown_content
    }

    // PRIORITY 0: Extract from original_document.content.raw_content (Quality Assurance passes this through)
    if (qualityAssessedDocument.original_document?.content?.raw_content) {
      logger.info('✅ Content extracted from original_document.content.raw_content', {
        contentLength: qualityAssessedDocument.original_document.content.raw_content.length
      })
      return qualityAssessedDocument.original_document.content.raw_content
    }

    // Extract from original_document.content.sections (if structured)
    if (qualityAssessedDocument.original_document?.content?.sections) {
      for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.original_document.content.sections)) {
        if (sectionData && typeof sectionData === 'object') {
          const section = sectionData as any
          markdownContent += `## ${sectionKey}\n\n${section.content || section.raw_content || ''}\n\n`
        }
      }
      if (markdownContent.trim()) {
        logger.info('✅ Content extracted from original_document.content.sections', {
          sectionCount: Object.keys(qualityAssessedDocument.original_document.content.sections).length,
          contentLength: markdownContent.length
        })
        return markdownContent.trim()
      }
    }

    // Extract from personalized sections
    if (qualityAssessedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.personalized_sections)) {
        markdownContent += `## ${sectionKey}\n\n`
        
        if ((sectionData as any).personalized_content) {
          const personalizedContent = (sectionData as any).personalized_content
          if (typeof personalizedContent === 'string') {
            markdownContent += `${personalizedContent}\n\n`
          } else if (personalizedContent.contextualized_content) {
            markdownContent += `${personalizedContent.contextualized_content}\n\n`
          }
        }
      }
    }

    // Extract from content sections if available
    if (qualityAssessedDocument.content_sections) {
      for (const section of qualityAssessedDocument.content_sections) {
        if (section.title) {
          markdownContent += `## ${section.title}\n\n`
        }
        if (section.content) {
          markdownContent += `${section.content}\n\n`
        }
      }
    }

    // PRIORITY 1: Extract from generated_document (AI generation stage output)
    if (qualityAssessedDocument.generated_document) {
      const genDoc = qualityAssessedDocument.generated_document
      
      // Try to get raw_content
      if (genDoc.content?.raw_content) {
        markdownContent += genDoc.content.raw_content
        logger.info('✅ Content extracted from generated_document.content.raw_content', {
          contentLength: genDoc.content.raw_content.length
        })
      }
      // Or extract from sections (Record)
      else if (genDoc.content?.sections) {
        for (const [sectionKey, sectionData] of Object.entries(genDoc.content.sections)) {
          if (sectionData && typeof sectionData === 'object') {
            const section = sectionData as any
            markdownContent += `## ${sectionKey}\n\n${section.content || section.raw_content || ''}\n\n`
          }
        }
        logger.info('✅ Content extracted from generated_document.content.sections', {
          sectionCount: Object.keys(genDoc.content.sections).length
        })
      }
      // Or from sections array
      else if (genDoc.sections && Array.isArray(genDoc.sections)) {
        for (const section of genDoc.sections) {
          if (section.title) {
            markdownContent += `## ${section.title}\n\n`
          }
          if (section.content) {
            markdownContent += `${section.content}\n\n`
          }
        }
        logger.info('✅ Content extracted from generated_document.sections array', {
          sectionCount: genDoc.sections.length
        })
      }
    }
    
    // PRIORITY 2: Check if quality_assessed_document itself IS the generated_document
    // (Quality stage might pass it through directly)
    if (!markdownContent.trim() && qualityAssessedDocument.content) {
      if (qualityAssessedDocument.content.raw_content) {
        markdownContent += qualityAssessedDocument.content.raw_content
        logger.info('✅ Content extracted from quality_assessed_document.content.raw_content', {
          contentLength: qualityAssessedDocument.content.raw_content.length
        })
      } else if (qualityAssessedDocument.content.sections) {
        for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.content.sections)) {
          if (sectionData && typeof sectionData === 'object') {
            const section = sectionData as any
            markdownContent += `## ${sectionKey}\n\n${section.content || section.raw_content || ''}\n\n`
          }
        }
        logger.info('✅ Content extracted from quality_assessed_document.content.sections', {
          sectionCount: Object.keys(qualityAssessedDocument.content.sections).length
        })
      }
    }
    
    // PRIORITY 3: Check for sections array directly on quality_assessed_document
    if (!markdownContent.trim() && qualityAssessedDocument.sections && Array.isArray(qualityAssessedDocument.sections)) {
      for (const section of qualityAssessedDocument.sections) {
        if (section.title) {
          markdownContent += `## ${section.title}\n\n`
        }
        if (section.content) {
          markdownContent += `${section.content}\n\n`
        }
      }
      logger.info('✅ Content extracted from quality_assessed_document.sections array', {
        sectionCount: qualityAssessedDocument.sections.length
      })
    }

    // Extract from raw content if available
    if (!markdownContent.trim() && qualityAssessedDocument.content) {
      if (typeof qualityAssessedDocument.content === 'string') {
        markdownContent += qualityAssessedDocument.content
      } else if (qualityAssessedDocument.content.raw_content) {
        markdownContent += qualityAssessedDocument.content.raw_content
      } else if (qualityAssessedDocument.content.sections) {
        for (const [sectionKey, sectionData] of Object.entries(qualityAssessedDocument.content.sections)) {
          if (sectionData && typeof sectionData === 'object' && (sectionData as any).content) {
            markdownContent += `## ${sectionKey}\n\n${(sectionData as any).content}\n\n`
          }
        }
      }
    }

    // If no content found, create a basic document with debug info
    if (!markdownContent.trim()) {
      logger.warn('⚠️ No content found in quality_assessed_document, generating placeholder', {
        availableKeys: Object.keys(qualityAssessedDocument || {}),
        documentId: qualityAssessedDocument.document_id,
        hasGeneratedDocument: !!qualityAssessedDocument.generated_document,
        hasContent: !!qualityAssessedDocument.content
      })
      
      markdownContent = `# ${qualityAssessedDocument.document_id || 'Document'}\n\n`
      markdownContent += `*This document was generated but contains no content.*\n\n`
      markdownContent += `**Document ID:** ${qualityAssessedDocument.document_id || 'Unknown'}\n`
      markdownContent += `**Template ID:** ${qualityAssessedDocument.template_id || 'Unknown'}\n`
      markdownContent += `**Generated:** ${new Date().toISOString()}\n`
    }

    return markdownContent.trim()
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

  /**
   * Cleanup resources used by the stage
   */
  async cleanup(): Promise<void> {
    try {
      await this.formatEngine.cleanup()
      logger.info('OutputFormattingStage cleanup completed')
    } catch (error) {
      logger.error('OutputFormattingStage cleanup failed', { error: error.message })
    }
  }
}

