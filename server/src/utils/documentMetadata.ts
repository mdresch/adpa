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
  
  // Research Complexity (optional)
  researchComplexity?: {
    sourceDocuments: number
    estimatedReadingTimeHours: number
    researchScore: number
    outputScore: number
  }
}

export interface QualityMetrics {
  // Core 4 metrics (existing)
  completeness: number // 0-100% - Has all required sections
  structureScore: number // 0-100% - Proper hierarchy and organization
  formattingScore: number // 0-100% - Markdown formatting quality
  contentDepth: number // 0-100% - Level of detail and comprehensiveness
  
  // Advanced 6 metrics (new)
  accuracy: number // 0-100% - Information accuracy and precision
  consistency: number // 0-100% - Internal consistency and coherence
  contextRelevance: number // 0-100% - Relevance to project context
  professionalQuality: number // 0-100% - Professional writing standards
  standardsCompliance: number // 0-100% - Framework compliance (PMBOK/BABOK/DMBOK)
  complexityScore: number // 0-100% - Document complexity (higher = more complex to create manually)
  
  // Aggregate
  overallQuality: number // 0-100% - Weighted average of all 10 dimensions
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
    sourceDocuments?: any[]
    contextStats?: any
  }
): DocumentGenerationMetadata {
  const processingTimeMs = generationEnd.getTime() - generationStart.getTime()
  
  // Extract token counts from AI response
  let inputTokens = aiResponse.usage?.prompt_tokens || aiResponse.usage?.promptTokens || 0
  let outputTokens = aiResponse.usage?.completion_tokens || aiResponse.usage?.completionTokens || 0
  const totalTokens = aiResponse.usage?.total_tokens || aiResponse.usage?.totalTokens || inputTokens + outputTokens
  
  // If we have total but not input/output, estimate them
  if (totalTokens > 0 && inputTokens === 0 && outputTokens === 0) {
    // Estimate input tokens from prompt length (rough: 1 token ≈ 4 characters)
    const estimatedInputTokens = Math.round(options.promptLength / 4)
    inputTokens = estimatedInputTokens
    outputTokens = totalTokens - estimatedInputTokens
  }
  
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
export function analyzeDocumentQuality(
  content: string, 
  metadata: DocumentGenerationMetadata,
  sourceDocCount: number = 0
): QualityMetrics {
  const metrics: QualityMetrics = {
    completeness: 0,
    structureScore: 0,
    formattingScore: 0,
    contentDepth: 0,
    accuracy: 0,
    consistency: 0,
    contextRelevance: 0,
    professionalQuality: 0,
    standardsCompliance: 0,
    complexityScore: 0,
    overallQuality: 0,
    recommendations: []
  }
  
  // === DIMENSION 1: COMPLETENESS ===
  // Has all required sections (headers, content, tables, lists)
  const hasMainTitle = content.startsWith('#')
  const hasHeaders = (content.match(/^##/gm) || []).length >= 3
  const hasTables = (content.match(/\|/g) || []).length >= 10
  const hasLists = (content.match(/^[-*]/gm) || []).length >= 5
  
  metrics.completeness = 
    (hasMainTitle ? 25 : 0) +
    (hasHeaders ? 25 : 0) +
    (hasTables ? 25 : 0) +
    (hasLists ? 25 : 0)
  
  // === DIMENSION 2: STRUCTURE ===
  // Logical organization and proper hierarchy
  const h1Count = (content.match(/^# /gm) || []).length
  const h2Count = (content.match(/^## /gm) || []).length
  const h3Count = (content.match(/^### /gm) || []).length
  
  const hasProperHierarchy = h1Count === 1 && h2Count >= 3
  const hasSubsections = h3Count >= 2
  
  metrics.structureScore =
    (hasProperHierarchy ? 50 : 25) +
    (hasSubsections ? 30 : 0) +
    (metadata.paragraphCount >= 5 ? 20 : 10)
  
  // === DIMENSION 3: FORMATTING ===
  // Markdown syntax quality (tables, emphasis, code)
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
  
  // === DIMENSION 4: CONTENT DEPTH ===
  // Level of detail and comprehensiveness
  const wordsPerSection = metadata.wordCount / (h2Count || 1)
  const hasDetailedContent = wordsPerSection >= 150
  const hasComprehensiveContent = metadata.wordCount >= 800
  
  metrics.contentDepth =
    (hasDetailedContent ? 40 : 20) +
    (hasComprehensiveContent ? 40 : 20) +
    (metadata.sentenceCount >= 20 ? 20 : 10)
  
  // === DIMENSION 5: ACCURACY ===
  // Information precision and factual correctness
  const hasSpecificData = /\d+%|\$\d+|\d+\s+(hours|days|months|years)/gi.test(content)
  const hasProperCitations = content.includes('*') || content.includes('>')
  const hasDefinitions = content.toLowerCase().includes('definition') || content.toLowerCase().includes('refers to')
  const hasExamples = content.toLowerCase().includes('example') || content.toLowerCase().includes('for instance')
  
  metrics.accuracy =
    (hasSpecificData ? 30 : 15) +
    (hasProperCitations ? 20 : 0) +
    (hasDefinitions ? 25 : 10) +
    (hasExamples ? 25 : 10)
  
  // === DIMENSION 6: CONSISTENCY ===
  // Internal coherence and uniform terminology
  const hasTOC = content.toLowerCase().includes('table of contents') || content.toLowerCase().includes('## contents')
  const hasConsistentHeaders = h2Count > 0 && h2Count <= 15 // Not too few, not too many
  const properSentenceLength = metadata.wordCount / metadata.sentenceCount
  const hasGoodFlowRange = properSentenceLength >= 10 && properSentenceLength <= 25
  const hasUniformSections = Math.abs(wordsPerSection - 200) < 100 // Sections are similar in length
  
  metrics.consistency =
    (hasTOC ? 20 : 0) +
    (hasConsistentHeaders ? 25 : 10) +
    (hasGoodFlowRange ? 30 : 15) +
    (hasUniformSections ? 25 : 10)
  
  // === DIMENSION 7: CONTEXT RELEVANCE ===
  // Alignment with project context and framework
  const frameworkKeywords = ['project', 'stakeholder', 'risk', 'scope', 'budget', 'schedule', 'quality', 'resource']
  const frameworkMentions = frameworkKeywords.filter(kw => content.toLowerCase().includes(kw)).length
  const hasProjectContext = content.toLowerCase().includes('project') && frameworkMentions >= 3
  const hasFrameworkAlignment = content.includes('PMBOK') || content.includes('BABOK') || content.includes('DMBOK')
  const hasActionableContent = /\b(should|must|will|shall)\b/gi.test(content)
  
  metrics.contextRelevance =
    (hasProjectContext ? 35 : 15) +
    (hasFrameworkAlignment ? 25 : 0) +
    (hasActionableContent ? 25 : 10) +
    (frameworkMentions >= 5 ? 15 : 0)
  
  // === DIMENSION 8: PROFESSIONAL QUALITY ===
  // Writing standards and presentation
  const hasExecutiveSummary = content.toLowerCase().includes('executive summary') || content.toLowerCase().includes('## summary')
  const hasIntroduction = content.toLowerCase().includes('introduction') || content.toLowerCase().includes('## 1.')
  const hasConclusion = content.toLowerCase().includes('conclusion') || content.toLowerCase().includes('next steps')
  const hasProperGrammar = metadata.sentenceCount > 0 && (metadata.wordCount / metadata.sentenceCount) > 8 // Sentence complexity
  const noExcessiveCaps = (content.match(/[A-Z]{4,}/g) || []).length < 5 // Avoid ALL CAPS spam
  
  metrics.professionalQuality =
    (hasExecutiveSummary ? 25 : 0) +
    (hasIntroduction ? 20 : 10) +
    (hasConclusion ? 20 : 0) +
    (hasProperGrammar ? 20 : 10) +
    (noExcessiveCaps ? 15 : 0)
  
  // === DIMENSION 9: STANDARDS COMPLIANCE ===
  // Adherence to framework requirements
  const hasRequiredSections = h2Count >= 5 // Most frameworks require 5+ major sections
  const hasRolesResponsibilities = content.toLowerCase().includes('role') || content.toLowerCase().includes('responsible')
  const hasMetrics = content.toLowerCase().includes('metric') || content.toLowerCase().includes('kpi') || content.toLowerCase().includes('measure')
  const hasTimelines = content.toLowerCase().includes('timeline') || content.toLowerCase().includes('schedule') || content.toLowerCase().includes('deadline')
  const hasApprovals = content.toLowerCase().includes('approval') || content.toLowerCase().includes('authority') || content.toLowerCase().includes('sign-off')
  
  metrics.standardsCompliance =
    (hasRequiredSections ? 25 : 10) +
    (hasRolesResponsibilities ? 20 : 0) +
    (hasMetrics ? 20 : 0) +
    (hasTimelines ? 20 : 0) +
    (hasApprovals ? 15 : 0)
  
  // === DIMENSION 10: COMPLEXITY SCORE ===
  // Estimates manual creation effort (higher = more complex/time-consuming)
  
  // DOCUMENT OUTPUT COMPLEXITY (60 points max)
  const hasMultipleTables = (content.match(/\|/g) || []).length >= 50 // 5+ tables
  const hasDeepHierarchy = h3Count >= 5 // Many subsections
  const hasLongSections = wordsPerSection >= 300 // Detailed sections
  const hasTechnicalContent = content.match(/\b(API|database|security|architecture|integration|compliance|governance)\b/gi)?.length || 0
  const isLongDocument = metadata.wordCount >= 2000
  
  const outputComplexity =
    (hasMultipleTables ? 12 : 6) +
    (hasDeepHierarchy ? 12 : 6) +
    (hasLongSections ? 12 : 6) +
    (hasTechnicalContent >= 10 ? 15 : hasTechnicalContent >= 5 ? 9 : 3) +
    (isLongDocument ? 9 : 3)
  
  // CONTEXT RESEARCH COMPLEXITY (40 points max) - NEW!
  // Accounts for reading/understanding all source documents
  const sourceDocWordEstimate = sourceDocCount * 1500 // Avg 1500 words per doc
  const readingTimeHours = sourceDocWordEstimate / 250 / 60 // 250 words/min reading speed
  
  const researchComplexity =
    (sourceDocCount === 0 ? 0 :       // No research needed
     sourceDocCount === 1 ? 5 :        // Minimal research (1 doc)
     sourceDocCount <= 3 ? 10 :        // Light research (2-3 docs)
     sourceDocCount <= 5 ? 20 :        // Moderate research (4-5 docs)
     sourceDocCount <= 7 ? 30 :        // Heavy research (6-7 docs)
     40)                               // Extensive research (8-10 docs)
  
  metrics.complexityScore = Math.min(100, outputComplexity + researchComplexity)
  
  // Store research metrics for display
  metadata.researchComplexity = {
    sourceDocuments: sourceDocCount,
    estimatedReadingTimeHours: Math.round(readingTimeHours * 10) / 10,
    researchScore: researchComplexity,
    outputScore: outputComplexity
  }
  
  // === CALCULATE OVERALL QUALITY ===
  // Weighted average of all 10 dimensions
  metrics.overallQuality = Math.round(
    (metrics.completeness * 0.14 +          // 14% - Has all sections
     metrics.structureScore * 0.14 +        // 14% - Proper organization
     metrics.formattingScore * 0.09 +       // 9%  - Markdown quality
     metrics.contentDepth * 0.11 +          // 11% - Level of detail
     metrics.accuracy * 0.11 +              // 11% - Factual precision
     metrics.consistency * 0.10 +           // 10% - Internal coherence
     metrics.contextRelevance * 0.10 +      // 10% - Project alignment
     metrics.professionalQuality * 0.08 +   // 8%  - Writing standards
     metrics.standardsCompliance * 0.08 +   // 8%  - Framework compliance
     metrics.complexityScore * 0.05)        // 5%  - Manual effort estimate
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
