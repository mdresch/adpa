/**
 * Document Metadata Utilities
 * Captures and formats comprehensive metadata for AI-generated documents
 */

import { logger } from "./logger"

export interface DocumentGenerationMetadata {
  // AI Processing Metrics
  aiProvider: string
  aiModel: string
  temperature: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  
  // Performance Metrics
  processingTimeMs: number
  generationStartTime: string
  generationEndTime: string
  
  // Quality Metrics
  wordCount: number
  characterCount: number
  sentenceCount: number
  paragraphCount: number
  readabilityScore?: number
  
  // Technical Metadata
  templateId?: string
  templateName?: string
  framework?: string
  promptLength: number
  responseLength: number
  
  // Context Information
  projectId: string
  projectName: string
  userId: string
  userName: string
  
  // Version Control
  version: string
  generationId: string
  
  // Additional Metadata
  status: 'success' | 'partial' | 'failed'
  warnings?: string[]
  errors?: string[]
}

export interface QualityMetrics {
  completeness: number // 0-100%
  structureScore: number // 0-100%
  formattingScore: number // 0-100%
  contentDepth: number // 0-100%
  overallQuality: number // 0-100%
  recommendations: string[]
}

/**
 * Calculates comprehensive metadata for a generated document
 */
export function calculateDocumentMetadata(
  content: string,
  aiResponse: any,
  generationStart: Date,
  generationEnd: Date,
  options: {
    provider: string
    model: string
    temperature: number
    templateId?: string
    templateName?: string
    framework?: string
    projectId: string
    projectName: string
    userId: string
    userName: string
    promptLength: number
  }
): DocumentGenerationMetadata {
  const processingTimeMs = generationEnd.getTime() - generationStart.getTime()
  
  // Extract token counts from AI response
  const inputTokens = aiResponse.usage?.prompt_tokens || aiResponse.usage?.promptTokens || 0
  const outputTokens = aiResponse.usage?.completion_tokens || aiResponse.usage?.completionTokens || 0
  const totalTokens = aiResponse.usage?.total_tokens || aiResponse.usage?.totalTokens || inputTokens + outputTokens
  
  // Calculate content metrics
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
  const characterCount = content.length
  const sentenceCount = (content.match(/[.!?]+/g) || []).length
  const paragraphCount = (content.match(/\n\n+/g) || []).length + 1
  
  const metadata: DocumentGenerationMetadata = {
    // AI Processing
    aiProvider: options.provider,
    aiModel: options.model,
    temperature: options.temperature,
    inputTokens,
    outputTokens,
    totalTokens,
    
    // Performance
    processingTimeMs,
    generationStartTime: generationStart.toISOString(),
    generationEndTime: generationEnd.toISOString(),
    
    // Quality
    wordCount,
    characterCount,
    sentenceCount,
    paragraphCount,
    
    // Technical
    templateId: options.templateId,
    templateName: options.templateName,
    framework: options.framework,
    promptLength: options.promptLength,
    responseLength: content.length,
    
    // Context
    projectId: options.projectId,
    projectName: options.projectName,
    userId: options.userId,
    userName: options.userName,
    
    // Version
    version: '1.0',
    generationId: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    // Status
    status: 'success',
    warnings: [],
    errors: []
  }
  
  logger.info('Document metadata calculated:', {
    generationId: metadata.generationId,
    wordCount: metadata.wordCount,
    processingTimeMs: metadata.processingTimeMs,
    totalTokens: metadata.totalTokens
  })
  
  return metadata
}

/**
 * Analyzes document quality and provides metrics
 */
export function analyzeDocumentQuality(content: string, metadata: DocumentGenerationMetadata): QualityMetrics {
  const metrics: QualityMetrics = {
    completeness: 0,
    structureScore: 0,
    formattingScore: 0,
    contentDepth: 0,
    overallQuality: 0,
    recommendations: []
  }
  
  // Check completeness (has headers, content, sections)
  const hasMainTitle = content.startsWith('#')
  const hasHeaders = (content.match(/^##/gm) || []).length >= 3
  const hasTables = (content.match(/\|/g) || []).length >= 10
  const hasLists = (content.match(/^[-*]/gm) || []).length >= 5
  
  metrics.completeness = 
    (hasMainTitle ? 25 : 0) +
    (hasHeaders ? 25 : 0) +
    (hasTables ? 25 : 0) +
    (hasLists ? 25 : 0)
  
  // Check structure (logical sections, proper hierarchy)
  const h1Count = (content.match(/^# /gm) || []).length
  const h2Count = (content.match(/^## /gm) || []).length
  const h3Count = (content.match(/^### /gm) || []).length
  
  const hasProperHierarchy = h1Count === 1 && h2Count >= 3
  const hasSubsections = h3Count >= 2
  
  metrics.structureScore =
    (hasProperHierarchy ? 50 : 25) +
    (hasSubsections ? 30 : 0) +
    (metadata.paragraphCount >= 5 ? 20 : 10)
  
  // Check formatting (Markdown syntax, tables, emphasis)
  const hasBold = content.includes('**')
  const hasCode = content.includes('`')
  const hasHR = content.includes('---')
  const hasNumberedLists = /^\d+\./gm.test(content)
  
  metrics.formattingScore =
    (hasBold ? 20 : 0) +
    (hasCode ? 15 : 0) +
    (hasHR ? 15 : 0) +
    (hasNumberedLists ? 20 : 0) +
    (hasTables ? 30 : 0)
  
  // Check content depth (word count, detail level)
  const wordsPerSection = metadata.wordCount / (h2Count || 1)
  const hasDetailedContent = wordsPerSection >= 150
  const hasComprehensiveContent = metadata.wordCount >= 800
  
  metrics.contentDepth =
    (hasDetailedContent ? 40 : 20) +
    (hasComprehensiveContent ? 40 : 20) +
    (metadata.sentenceCount >= 20 ? 20 : 10)
  
  // Calculate overall quality
  metrics.overallQuality = Math.round(
    (metrics.completeness * 0.25 +
     metrics.structureScore * 0.25 +
     metrics.formattingScore * 0.25 +
     metrics.contentDepth * 0.25)
  )
  
  // Generate recommendations
  if (metrics.completeness < 75) {
    metrics.recommendations.push('Add more sections with headers, tables, and lists')
  }
  if (metrics.structureScore < 75) {
    metrics.recommendations.push('Improve document hierarchy with proper H1/H2/H3 structure')
  }
  if (metrics.formattingScore < 75) {
    metrics.recommendations.push('Enhance formatting with bold text, tables, and code blocks')
  }
  if (metrics.contentDepth < 75) {
    metrics.recommendations.push('Increase content depth with more detailed sections (aim for 150+ words per section)')
  }
  if (metadata.wordCount < 500) {
    metrics.recommendations.push('Document is too brief - aim for at least 800 words for comprehensive coverage')
  }
  
  return metrics
}

/**
 * Formats metadata for display
 */
export function formatMetadataForDisplay(metadata: DocumentGenerationMetadata, quality: QualityMetrics) {
  return {
    generation: {
      id: metadata.generationId,
      startTime: new Date(metadata.generationStartTime).toLocaleString(),
      endTime: new Date(metadata.generationEndTime).toLocaleString(),
      duration: `${(metadata.processingTimeMs / 1000).toFixed(2)}s`,
      status: metadata.status
    },
    aiProcessing: {
      provider: metadata.aiProvider,
      model: metadata.aiModel,
      temperature: metadata.temperature,
      tokens: {
        input: metadata.inputTokens.toLocaleString(),
        output: metadata.outputTokens.toLocaleString(),
        total: metadata.totalTokens.toLocaleString(),
        cost: calculateCost(metadata.aiProvider, metadata.inputTokens, metadata.outputTokens)
      }
    },
    contentMetrics: {
      words: metadata.wordCount.toLocaleString(),
      characters: metadata.characterCount.toLocaleString(),
      sentences: metadata.sentenceCount,
      paragraphs: metadata.paragraphCount,
      averageWordsPerSentence: Math.round(metadata.wordCount / (metadata.sentenceCount || 1))
    },
    qualityMetrics: {
      overall: `${quality.overallQuality}%`,
      completeness: `${quality.completeness}%`,
      structure: `${quality.structureScore}%`,
      formatting: `${quality.formattingScore}%`,
      depth: `${quality.contentDepth}%`,
      grade: getQualityGrade(quality.overallQuality),
      recommendations: quality.recommendations
    },
    technical: {
      template: metadata.templateName || 'Custom',
      framework: metadata.framework || 'General',
      promptLength: `${metadata.promptLength} chars`,
      responseLength: `${metadata.responseLength} chars`,
      version: metadata.version
    },
    context: {
      project: metadata.projectName,
      createdBy: metadata.userName,
      projectId: metadata.projectId
    }
  }
}

/**
 * Estimates cost based on provider and token usage
 */
function calculateCost(provider: string, inputTokens: number, outputTokens: number): string {
  // Approximate costs per 1M tokens (as of 2024)
  const costs: Record<string, { input: number, output: number }> = {
    'Groq AI': { input: 0.05, output: 0.08 }, // Super cheap
    'OpenAI': { input: 10, output: 30 }, // GPT-4 Turbo
    'Google Gemini': { input: 0.35, output: 1.05 }, // Gemini Pro
    'Mistral AI': { input: 2, output: 6 }, // Mistral Large
    'Anthropic': { input: 15, output: 75 } // Claude Sonnet
  }
  
  const providerCost = costs[provider] || { input: 0, output: 0 }
  const totalCost = 
    (inputTokens / 1000000) * providerCost.input +
    (outputTokens / 1000000) * providerCost.output
  
  return totalCost < 0.01 ? '<$0.01' : `$${totalCost.toFixed(4)}`
}

/**
 * Converts quality score to letter grade
 */
function getQualityGrade(score: number): string {
  if (score >= 90) return 'A (Excellent)'
  if (score >= 80) return 'B (Good)'
  if (score >= 70) return 'C (Fair)'
  if (score >= 60) return 'D (Poor)'
  return 'F (Needs Improvement)'
}

/**
 * Logs generation metadata to console/file for analysis
 */
export function logGenerationMetadata(metadata: DocumentGenerationMetadata, quality: QualityMetrics) {
  const formattedData = formatMetadataForDisplay(metadata, quality)
  
  logger.info('📊 Document Generation Complete', {
    generationId: metadata.generationId,
    ...formattedData
  })
  
  // Log to separate metadata log file for analytics
  logger.info('[METADATA_LOG]', {
    timestamp: new Date().toISOString(),
    type: 'document_generation',
    metadata: metadata,
    quality: quality,
    formatted: formattedData
  })
}

