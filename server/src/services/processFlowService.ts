;(async function(){ try{ await (require('../lib/db')).initDb() } catch(e){} })();
/**
 * Process Flow Workflow Service
 * Handles template processing with project information injection and document prioritization
 */

const db = require('../lib/db')
import crypto from 'crypto'
import { logger } from '../utils/logger'
import { documentCompressionService, DocumentCompressionOptions } from './documentCompressionService'
import { qualityAuditService } from './qualityAuditService'
import type { Pool } from 'pg'

export interface ProcessFlowStep {
  id: number
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  tokens: number
  startTime?: Date
  endTime?: Date
  metadata?: any
  contextAdded?: string
}

export interface DocumentPriority {
  documentId: string
  documentName: string
  priorityScore: number
  estimatedTokens: number
  relevanceScore: number
  recencyScore: number
  importanceScore: number
  category: string
  lastModified: Date
}

export interface ContextWindowAnalysis {
  templateBaseTokens: number
  projectMetadataTokens: number
  documentContentTokens: number
  totalTokens: number
  availableTokens: number
  utilizationPercentage: number
  recommendations: string[]
}

export interface WorkflowConfiguration {
  templateId: string
  projectId: string
  maxTokens: number
  priorityStrategy: 'relevance' | 'recency' | 'importance' | 'hybrid'
  compressionLevel: number
  compressionMethod: 'truncate' | 'summarize' | 'smart' | 'keyword'
  includeMetadata: boolean
  includeRelationships: boolean
  includeStakeholders: boolean
  // Optional fields for quality audit
  templateType?: string
  userId?: string
  // Optional progress callback for real-time updates
  onProgress?: (stepName: string, current: number, total: number, details?: any) => Promise<void> | void
}

class ProcessFlowService {
  private pool: Pool
  private db: Pool

  private secureRandomInRange(min: number, max: number): number {
    const precision = 10000
    const randomUnit = crypto.randomInt(0, precision + 1) / precision
    return min + (max - min) * randomUnit
  }

  constructor(pool: Pool) {
    this.pool = pool
    this.db = pool
  }

  /**
   * Get available templates for processing
   */
  async getAvailableTemplates(): Promise<any[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          id,
          name,
          description,
          category,
          framework,
          content,
          LENGTH(content::text) as content_length,
          created_at,
          development_status,
          validation_count,
          success_count,
          CASE 
            WHEN validation_count = 0 THEN 0
            ELSE ROUND((success_count::NUMERIC / validation_count::NUMERIC * 100), 2)
          END as success_rate,
          last_validated_at
        FROM templates
        WHERE deleted_at IS NULL
        ORDER BY 
          CASE development_status
            WHEN 'production' THEN 1
            WHEN 'validated' THEN 2
            WHEN 'testing' THEN 3
            WHEN 'compliance' THEN 4
            WHEN 'draft' THEN 5
            ELSE 6
          END,
          name
      `)
      
      // Calculate health rating for each template
      const templatesWithHealth = result.rows.map(template => {
        let health_rating = null
        if (template.validation_count > 0 && template.success_rate !== null) {
          if (template.success_rate >= 90) {
            health_rating = 'Excellent'
          } else if (template.success_rate >= 80) {
            health_rating = 'Good'
          } else if (template.success_rate >= 70) {
            health_rating = 'Fair'
          } else {
            health_rating = 'Needs Improvement'
          }
        }
        return {
          ...template,
          health_rating
        }
      })
      
      return templatesWithHealth
    } catch (error) {
      logger.error('Error getting available templates:', error)
      throw error
    }
  }

  /**
   * Get available projects for processing
   */
  async getAvailableProjects(): Promise<any[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          id,
          name,
          description,
          framework,
          status,
          priority,
          created_at
        FROM projects
        ORDER BY name
      `)
      return result.rows
    } catch (error) {
      logger.error('Error getting available projects:', error)
      throw error
    }
  }

  /**
   * Get project documents for prioritization
   */
  async getProjectDocuments(projectId: string): Promise<any[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          d.id,
          d.name,
          d.content,
          LENGTH(d.content::text) as content_length,
          d.status,
          d.version,
          d.framework,
          d.metadata,
          d.created_at,
          d.updated_at,
          t.name as template_name,
          t.category as template_category
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        WHERE d.project_id = $1
          AND d.deleted_at IS NULL
        ORDER BY d.updated_at DESC
      `, [projectId])
      return result.rows
    } catch (error) {
      logger.error('Error getting project documents:', error)
      throw error
    }
  }

  /**
   * Get available models for a specific AI provider
   */
  async getProviderModels(providerId: string): Promise<any[]> {
    try {
      // Get provider information and available models from database-driven configuration
      const result = await this.db.query(`
        SELECT 
          id as provider_id,
          name as provider_name,
          provider_type,
          available_models,
          default_model
        FROM ai_providers
        WHERE id = $1 AND is_active = true
      `, [providerId])

      if (result.rows.length === 0) {
        throw new Error('AI provider not found or is not active')
      }

      const provider = result.rows[0]
      let rawModels = provider.available_models || []
      if (typeof rawModels === 'string') {
        try {
          rawModels = JSON.parse(rawModels)
        } catch {
          rawModels = []
        }
      }
      if (!Array.isArray(rawModels)) {
        rawModels = []
      }

      // Normalize to array of { id: string, name: string } for consistent handling
      const availableModels = rawModels.map((item: any) => {
        if (item == null) return { id: '', name: '' }
        if (typeof item === 'string') return { id: item, name: item }
        const id = (item.id ?? item.model_id ?? item.name ?? '').toString()
        const name = (item.name ?? item.display_name ?? id).toString()
        return { id: id || 'unknown', name: name || id }
      }).filter((m: { id: string }) => m.id && m.id !== 'unknown')

      if (availableModels.length === 0) {
        throw new Error('No models configured for this provider. Please use Model Discovery to sync models.')
      }

      // Get model context windows from a lookup table (hardcoded for now, can be moved to DB)
      const modelContextWindows: Record<string, number> = {
        // Google Gemini models
        'gemini-2.5-flash': 1048576,
        'gemini-2.5-pro': 1048576,
        'gemini-flash-latest': 1048576,
        'gemini-pro-latest': 1048576,
        'gemini-2.0-flash': 1048576,
        'gemini-2.5-flash-lite': 1048576,
        'gemini-flash-lite-latest': 1048576,
        // OpenAI models
        'gpt-4o': 128000,
        'gpt-4o-mini': 128000,
        'gpt-4-turbo': 128000,
        'gpt-4': 8192,
        'gpt-3.5-turbo': 16385,
        // Mistral models
        'mistral-large-latest': 128000,
        'mistral-small-latest': 32000,
        'open-mistral-7b': 32000,
      }

      // Transform to expected format (id and name always strings for frontend Select)
      const models = availableModels.map(({ id, name }: { id: string; name: string }) => {
        const idStr = String(id)
        const nameStr = String(name || idStr)
        const contextWindow = modelContextWindows[idStr] || 128000
        return {
          id: idStr,
          name: nameStr,
          providerId,
          providerType: provider.provider_type,
          contextWindow,
          maxTokens: 8192,
          temperature: 0.7,
          topP: 1.0,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
          type: 'chat',
          description: `${nameStr} with ${contextWindow.toLocaleString()} token context window`,
          configuration: {}
        }
      })
      
      return models
    } catch (error) {
      logger.error('Error getting provider models:', error)
      throw error
    }
  }

  /**
   * Get models for a specific provider type
   * NOTE: This method is no longer used as we now get models directly from the database
   */
  private getModelsForProviderType(providerType: string, config: any): any[] {
    const models: any[] = []

    switch (providerType) {
      case 'openai':
        models.push(
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            providerType: 'openai',
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Most capable GPT-4 model with 128K context window'
          },
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            providerType: 'openai',
            contextWindow: 128000,
            maxTokens: 16384,
            temperature: 0.7,
            type: 'chat',
            description: 'Faster, more affordable GPT-4 with 128K context window'
          },
          {
            id: 'gpt-4-turbo',
            name: 'GPT-4 Turbo',
            providerType: 'openai',
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'GPT-4 with 128K context window and updated knowledge'
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            providerType: 'openai',
            contextWindow: 16385,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Fast and efficient model with 16K context window'
          }
        )
        break

      case 'google':
        models.push(
          {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash Experimental',
            providerType: 'google',
            contextWindow: 1000000, // 1M tokens
            maxTokens: 8192,
            temperature: 0.7,
            type: 'chat',
            description: 'Latest Gemini model with 1M token context window'
          },
          {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            providerType: 'google',
            contextWindow: 2000000, // 2M tokens
            maxTokens: 8192,
            temperature: 0.7,
            type: 'chat',
            description: 'Advanced Gemini model with 2M token context window'
          },
          {
            id: 'gemini-1.5-flash',
            name: 'Gemini 1.5 Flash',
            providerType: 'google',
            contextWindow: 1000000, // 1M tokens
            maxTokens: 8192,
            temperature: 0.7,
            type: 'chat',
            description: 'Fast Gemini model with 1M token context window'
          },
          {
            id: 'gemini-pro',
            name: 'Gemini Pro',
            providerType: 'google',
            contextWindow: 32768,
            maxTokens: 2048,
            temperature: 0.7,
            type: 'chat',
            description: 'Standard Gemini model with 32K context window'
          }
        )
        break

      case 'azure':
        models.push(
          {
            id: 'gpt-4o-azure',
            name: 'GPT-4o (Azure)',
            providerType: 'azure',
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'GPT-4o model deployed on Azure with 128K context window'
          },
          {
            id: 'gpt-4-turbo-azure',
            name: 'GPT-4 Turbo (Azure)',
            providerType: 'azure',
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'GPT-4 Turbo model on Azure with 128K context window'
          },
          {
            id: 'gpt-35-turbo-azure',
            name: 'GPT-3.5 Turbo (Azure)',
            providerType: 'azure',
            contextWindow: 16385,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'GPT-3.5 Turbo model on Azure with 16K context window'
          }
        )
        break

      case 'ollama':
        models.push(
          {
            id: 'llama3.1-405b',
            name: 'Llama 3.1 405B',
            providerType: 'ollama',
            contextWindow: 131072,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Large Llama model with 131K context window'
          },
          {
            id: 'llama3.1-70b',
            name: 'Llama 3.1 70B',
            providerType: 'ollama',
            contextWindow: 131072,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Medium Llama model with 131K context window'
          },
          {
            id: 'llama3.1-8b',
            name: 'Llama 3.1 8B',
            providerType: 'ollama',
            contextWindow: 131072,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Small Llama model with 131K context window'
          },
          {
            id: 'qwen2.5-72b',
            name: 'Qwen 2.5 72B',
            providerType: 'ollama',
            contextWindow: 32768,
            maxTokens: 2048,
            temperature: 0.7,
            type: 'chat',
            description: 'Qwen model with 32K context window'
          }
        )
        break

      case 'mistral':
        models.push(
          {
            id: 'mistral-large-latest',
            name: 'Mistral Large Latest',
            providerType: 'mistral',
            contextWindow: 128000,
            maxTokens: 8192,
            temperature: 0.7,
            type: 'chat',
            description: 'Most capable Mistral model with 128K context window'
          },
          {
            id: 'mistral-medium-latest',
            name: 'Mistral Medium Latest',
            providerType: 'mistral',
            contextWindow: 32000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Balanced Mistral model with 32K context window'
          },
          {
            id: 'mistral-small-latest',
            name: 'Mistral Small Latest',
            providerType: 'mistral',
            contextWindow: 32000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Fast Mistral model with 32K context window'
          },
          {
            id: 'mistral-tiny',
            name: 'Mistral Tiny',
            providerType: 'mistral',
            contextWindow: 8000,
            maxTokens: 2048,
            temperature: 0.7,
            type: 'chat',
            description: 'Lightweight Mistral model with 8K context window'
          },
          {
            id: 'codestral-latest',
            name: 'Codestral Latest',
            providerType: 'mistral',
            contextWindow: 32000,
            maxTokens: 4096,
            temperature: 0.7,
            type: 'chat',
            description: 'Code-focused Mistral model with 32K context window'
          }
        )
        break

      default:
        // Default models for unknown provider types
        models.push(
          {
            id: 'default-model',
            name: 'Default Model',
            providerType: providerType,
            contextWindow: 4096,
            maxTokens: 1024,
            temperature: 0.7,
            type: 'chat',
            description: 'Default model configuration'
          }
        )
    }

    return models
  }

  /**
   * Calculate document priority scores
   */
  async calculateDocumentPriorities(
    documents: any[], 
    strategy: 'relevance' | 'recency' | 'importance' | 'hybrid'
  ): Promise<DocumentPriority[]> {
    try {
      const prioritizedDocuments = documents.map(doc => {
        // Calculate different priority scores
        const relevanceScore = this.calculateRelevanceScore(doc)
        const recencyScore = this.calculateRecencyScore(doc)
        const importanceScore = this.calculateImportanceScore(doc)
        
        // Calculate overall priority based on strategy
        let priorityScore: number
        switch (strategy) {
          case 'relevance':
            priorityScore = relevanceScore
            break
          case 'recency':
            priorityScore = recencyScore
            break
          case 'importance':
            priorityScore = importanceScore
            break
          case 'hybrid':
            priorityScore = (relevanceScore * 0.4) + (recencyScore * 0.3) + (importanceScore * 0.3)
            break
          default:
            priorityScore = (relevanceScore + recencyScore + importanceScore) / 3
        }

        // Estimate token count based on content length (use pre-calculated length if available)
        const estimatedTokens = this.estimateTokenCount(doc.content, doc.content_length)

        return {
          ...doc,
          priorityScore,
          estimatedTokens,
          relevanceScore,
          recencyScore,
          importanceScore,
          category: doc.template_category || 'General',
          lastModified: doc.updated_at
        }
      })

      // Sort by priority score (highest first)
      return prioritizedDocuments.sort((a, b) => b.priorityScore - a.priorityScore)
    } catch (error) {
      logger.error('Error calculating document priorities:', error)
      throw error
    }
  }

  /**
   * Get compressed documents for context window
   */
  async getCompressedDocuments(
    prioritizedDocuments: DocumentPriority[],
    maxTokens: number,
    compressionLevel: number = 0.8,
    templateTokens: number = 0,
    metadataTokens: number = 0,
    compressionMethod: string = 'summarize',
    templateContext?: { name: string, description: string, content: string, system_prompt?: string, template_paragraphs?: any[] },
    stakeholderTokens: number = 0,
    onProgress?: (stepName: string, current: number, total: number, details?: any) => Promise<void> | void
  ): Promise<Array<{document: DocumentPriority, compressedContent: string, compressedTokens: number, compressionDetails: any}>> {
    const availableTokens = maxTokens - templateTokens - metadataTokens - stakeholderTokens
    const compressedDocuments: Array<{document: DocumentPriority, compressedContent: string, compressedTokens: number, compressionDetails: any}> = []
    let usedTokens = 0

    logger.info(`Starting individual document compression: ${prioritizedDocuments.length} documents, ${availableTokens.toLocaleString()} available tokens`)

    // Get all available AI providers to determine batch size
    let availableProviders: Array<{ provider_type: string }> = []
    let BATCH_SIZE = 5 // Default safe batch size
    
    if (compressionMethod !== 'summarize') {
      // Non-AI methods (truncate, keyword, smart) are instant - process all at once!
      BATCH_SIZE = Math.min(prioritizedDocuments.length, 50)
      logger.info(`🚀 Using NON-AI compression (${compressionMethod}) - processing ALL ${BATCH_SIZE} documents in parallel!`)
    } else {
      // AI summarization with automatic fallback - get count of active providers
      try {
        const providerResult = await this.db.query(
          `SELECT provider_type FROM ai_providers 
           WHERE is_active = true 
           ORDER BY priority ASC`
        )
        
        availableProviders = providerResult.rows
        
        if (availableProviders.length > 0) {
          // Batch size = number of providers (each document tries all providers via fallback)
          BATCH_SIZE = availableProviders.length
          
          const providerNames = availableProviders.map(p => p.provider_type).join(' → ')
          logger.info(`🎯 Multi-Provider Fallback Strategy: ${availableProviders.length} providers in fallback chain`)
          logger.info(`📊 Fallback sequence: ${providerNames}`)
          logger.info(`⚡ Processing ${BATCH_SIZE} documents in parallel - each uses full fallback chain!`)
        } else {
          logger.warn('No active AI providers found, using default batch size: 1')
          BATCH_SIZE = 1
        }
      } catch (error) {
        logger.warn(`Could not fetch AI providers, using default batch size: ${BATCH_SIZE}`)
      }
    }
    
    const totalDocs = prioritizedDocuments.length
    logger.info(`🚀 Using parallel processing with batch size of ${BATCH_SIZE} documents (${Math.ceil(totalDocs / BATCH_SIZE)} batches total)`)
    logger.info(`⚡ Expected speedup: ${BATCH_SIZE}x faster than sequential processing!`)
    
    // Track which documents each provider is actively processing
    const providerAssignments = new Map<string, { docIndex: number, docName: string, startTime: number }>()
    
    // Helper function to compress a single document with specific provider assignment
    const compressDocument = async (doc: DocumentPriority, index: number, assignedProvider?: string) => {
      const currentDoc = index + 1
      
      try {
        // Track provider assignment
        if (assignedProvider) {
          providerAssignments.set(assignedProvider, {
            docIndex: currentDoc,
            docName: doc.documentName || doc.documentId,
            startTime: Date.now()
          })
        }
        
        logger.info(`[Provider: ${assignedProvider || 'auto'}] Compressing document ${currentDoc}/${totalDocs}: ${doc.documentName || doc.documentId}`)
        
        // Build active documents array showing which provider is processing which document
        const activeDocsArray = Array.from(providerAssignments.entries()).map(([provider, info]) => ({
          provider,
          name: info.docName,
          duration: Math.floor((Date.now() - info.startTime) / 1000),
          docIndex: info.docIndex
        }))
        
        // Report progress to callback with provider assignments
        if (onProgress) {
          await onProgress(`Compressing documents`, currentDoc, totalDocs, {
            documentName: doc.documentName || doc.documentId,
            documentId: doc.documentId,
            usedTokens,
            availableTokens,
            assignedProvider,
            providerAssignments: activeDocsArray
          })
        }

      // Get document content from database
      const docResult = await this.db.query(
        'SELECT content FROM documents WHERE id = $1',
        [doc.documentId]
      )

      if (docResult.rows.length === 0) {
        logger.warn(`Document not found in database: ${doc.documentId}`)
          return null
      }

      const content = docResult.rows[0].content
      if (!content) {
        logger.warn(`Document has no content: ${doc.documentId}`)
          return null
      }

      // Calculate target tokens for this document
      const originalTokens = this.estimateTokenCount(content)
      const targetTokens = Math.ceil(originalTokens * compressionLevel)
      
      logger.info(`Document ${index + 1}: ${originalTokens.toLocaleString()} tokens → target ${targetTokens.toLocaleString()} tokens (${(compressionLevel * 100).toFixed(0)}%)`)

        // Check cache first for AI summarization
        let compressed: any
        if (compressionMethod === 'summarize') {
          try {
            // Generate hash of template context for lookup
            const templateContextStr = templateContext ? JSON.stringify(templateContext) : ''
            const templateContextHash = crypto.createHash('md5').update(templateContextStr).digest('hex')
            
            // Try to get cached summary using hash
            const cachedResult = await this.db.query(
              `SELECT * FROM document_summaries 
               WHERE document_id = $1 
                 AND compression_method = $2 
                 AND compression_level = $3 
                 AND template_context_hash = $4
                 AND is_valid = true
               ORDER BY created_at DESC 
               LIMIT 1`,
              [doc.documentId, compressionMethod, compressionLevel, templateContextHash]
            )
            
            if (cachedResult.rows.length > 0) {
              const cached = cachedResult.rows[0]
              
              // Update reuse statistics
              await this.db.query(
                `UPDATE document_summaries 
                 SET times_reused = times_reused + 1, 
                     last_reused_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [cached.id]
              )
              
              logger.info(`📦 [CACHE-HIT] Reusing cached summary (reused ${cached.times_reused + 1} times) - instant vs ~60s AI call`)
              
              compressed = {
                originalContent: cached.original_content,
                compressedContent: cached.compressed_content,
                originalTokens: cached.original_tokens,
                compressedTokens: cached.compressed_tokens,
                compressionRatio: parseFloat(cached.compression_ratio),
                method: cached.compression_method
              }
            }
          } catch (cacheError: any) {
            // Cache table doesn't exist yet or other error - gracefully continue without cache
            if (cacheError.code === '42P01') { // Relation does not exist
              logger.info(`💡 [CACHE] document_summaries table not yet created - skipping cache (run migration to enable caching)`)
            } else {
              logger.warn(`⚠️ [CACHE] Cache lookup failed: ${cacheError.message}`)
            }
            // Continue without cache
          }
        }
        
        // If not cached, compress now
        if (!compressed) {
          logger.info(`🔍 [CACHE-MISS] Compressing with AI...`)
          
      const compressionOptions: DocumentCompressionOptions = {
        compressionLevel,
        preserveStructure: true,
        preserveKeywords: true,
        method: compressionMethod as 'truncate' | 'summarize' | 'smart' | 'keyword',
        templateContext: templateContext
      }

          compressed = await documentCompressionService.compressDocument(content, compressionOptions)
          
          // Save to cache for future reuse (AI summarizations only)
          if (compressionMethod === 'summarize') {
            try {
              // Generate hash of template context to avoid index size limit
              const templateContextStr = templateContext ? JSON.stringify(templateContext) : ''
              const templateContextHash = crypto.createHash('md5').update(templateContextStr).digest('hex')
              
              await this.db.query(
                `INSERT INTO document_summaries (
                  document_id, compression_method, compression_level,
                  original_content, original_tokens,
                  compressed_content, compressed_tokens, compression_ratio,
                  target_tokens, ai_provider, ai_model, template_context, template_context_hash
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (document_id, compression_method, compression_level, template_context_hash) 
                DO UPDATE SET
                  compressed_content = EXCLUDED.compressed_content,
                  compressed_tokens = EXCLUDED.compressed_tokens,
                  compression_ratio = EXCLUDED.compression_ratio,
                  template_context = EXCLUDED.template_context,
                  updated_at = CURRENT_TIMESTAMP,
                  is_valid = true`,
                [
                  doc.documentId,
                  compressionMethod,
                  compressionLevel,
                  content,
                  originalTokens,
                  compressed.compressedContent,
                  compressed.compressedTokens,
                  compressed.compressionRatio,
                  targetTokens,
                  assignedProvider || null,
                  null, // model - could extract from AI response
                  templateContext ? JSON.stringify(templateContext) : null,
                  templateContextHash
                ]
              )
              
              logger.info(`💾 [CACHE-SAVE] Saved summary to cache for future reuse (hash: ${templateContextHash.substring(0, 8)}...)`)
            } catch (cacheError: any) {
              // Gracefully handle cache save failures
              if (cacheError.code === '42P01') { // Relation does not exist
                logger.info(`💡 [CACHE] document_summaries table not yet created - skipping cache save (run migration to enable caching)`)
              } else {
                logger.warn(`⚠️ [CACHE] Failed to save to cache: ${cacheError.message}`)
              }
              // Don't fail the operation if caching fails
            }
          }
        }
        
        logger.info(`✅ Document ${currentDoc} compressed: ${compressed.compressedTokens.toLocaleString()} tokens (${(compressed.compressionRatio * 100).toFixed(1)}% of original)`)
        
        return {
            document: doc,
            compressedContent: compressed.compressedContent,
            compressedTokens: compressed.compressedTokens,
            compressionDetails: {
              originalTokens,
              compressedTokens: compressed.compressedTokens,
              compressionRatio: compressed.compressionRatio,
              method: compressed.method,
              targetTokens,
              actualCompression: (compressed.compressedTokens / originalTokens * 100).toFixed(1) + '%'
            }
        }
      } catch (error: any) {
        logger.error(`❌ [Provider: ${assignedProvider || 'auto'}] Failed to compress document ${currentDoc}: ${error.message}`)
        return null
      } finally {
        // Clean up provider assignment when done (runs on both success and error)
        if (assignedProvider) {
          providerAssignments.delete(assignedProvider)
        }
      }
    }

    // Dynamic work queue: Each provider continuously processes documents
    if (compressionMethod === 'summarize' && availableProviders.length > 0) {
      logger.info(`🔄 Starting dynamic work queue with ${availableProviders.length} provider workers`)
      
      // Create a queue of document indices
      const documentQueue: number[] = []
      for (let i = 0; i < prioritizedDocuments.length; i++) {
        documentQueue.push(i)
      }
      
      // Create a worker for each provider
      const providerWorkers = availableProviders.map(async (provider) => {
        const providerType = provider.provider_type
        let documentsProcessed = 0
        
        logger.info(`🏃 Worker [${providerType}] started`)
        
        // Process documents until queue is empty or context full
        while (documentQueue.length > 0 && usedTokens < availableTokens) {
          const docIndex = documentQueue.shift()!
          const doc = prioritizedDocuments[docIndex]
          
          logger.info(`📋 Worker [${providerType}] picked up document ${docIndex + 1}/${totalDocs} (${documentQueue.length} remaining in queue)`)
          
          const result = await compressDocument(doc, docIndex, providerType)
          
          if (result && usedTokens + result.compressedTokens <= availableTokens) {
            compressedDocuments.push(result)
            usedTokens += result.compressedTokens
            documentsProcessed++
            logger.info(`✅ Worker [${providerType}] completed document ${docIndex + 1} (${documentsProcessed} total)`)
          } else if (result && result.compressedTokens > 0) {
            logger.warn(`⚠️ Worker [${providerType}] skipping document (would exceed budget): ${result.document.documentName}`)
            break // Stop this worker if budget exceeded
          }
        }
        
        logger.info(`🏁 Worker [${providerType}] finished: ${documentsProcessed} documents processed`)
        return documentsProcessed
      })
      
      // Wait for all workers to complete
      const workerResults = await Promise.all(providerWorkers)
      const totalProcessed = workerResults.reduce((sum, count) => sum + count, 0)
      logger.info(`✅ All workers completed: ${totalProcessed} documents processed by ${availableProviders.length} providers`)
      
          } else {
      // Fallback: Traditional batch processing for non-AI methods
      for (let batchStart = 0; batchStart < prioritizedDocuments.length; batchStart += BATCH_SIZE) {
        if (usedTokens >= availableTokens) {
          logger.info(`Context window full after ${batchStart} documents. Used ${usedTokens.toLocaleString()}/${availableTokens.toLocaleString()} tokens`)
          break
        }
        
        const batchEnd = Math.min(batchStart + BATCH_SIZE, prioritizedDocuments.length)
        const batch = prioritizedDocuments.slice(batchStart, batchEnd)
        
        logger.info(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: documents ${batchStart + 1}-${batchEnd}`)
        
        const batchResults = await Promise.all(
          batch.map((doc, batchIndex) => compressDocument(doc, batchStart + batchIndex))
        )
        
        for (const result of batchResults) {
          if (result && usedTokens + result.compressedTokens <= availableTokens) {
            compressedDocuments.push(result)
            usedTokens += result.compressedTokens
          } else if (result && result.compressedTokens > 0) {
            logger.warn(`⚠️ Skipping document: ${result.document.documentName} (${result.compressedTokens.toLocaleString()} tokens)`)
          }
        }
      }
    }

    logger.info(`Individual document compression completed: ${compressedDocuments.length}/${prioritizedDocuments.length} documents compressed, ${usedTokens.toLocaleString()}/${availableTokens.toLocaleString()} tokens used`)
    
    return compressedDocuments
  }

  /**
   * Analyze context window utilization
   */
  async analyzeContextWindow(
    templateId: string,
    projectId: string,
    prioritizedDocuments: DocumentPriority[],
    maxTokens: number,
    compressionLevel: number = 0.8
  ): Promise<ContextWindowAnalysis> {
    try {
      // Get template and project information
      const templateResult = await this.db.query(
        'SELECT name, description, content, LENGTH(content::text) as content_length FROM templates WHERE id = $1',
        [templateId]
      )
      const projectResult = await this.db.query(
        'SELECT name, description, framework FROM projects WHERE id = $1',
        [projectId]
      )

      const template = templateResult.rows[0]
      const project = projectResult.rows[0]

      // Calculate token usage
      // For JSONB content, stringify it to get accurate token count
      const templateContent = template?.content 
        ? (typeof template.content === 'string' ? template.content : JSON.stringify(template.content))
        : ''
      const templateBaseTokens = this.estimateTokenCount(templateContent, template?.content_length)
      
      logger.info(`Context window analysis: Template "${template.name}" has ${templateBaseTokens} tokens (content length: ${templateContent.length} chars)`)
      
      const projectMetadataTokens = this.estimateTokenCount(
        JSON.stringify({
          name: project?.name,
          description: project?.description,
          framework: project?.framework
        })
      )

      // Calculate document content tokens (top priority documents that fit in context window)
      // Apply compression level to reduce token usage
      let documentContentTokens = 0
      let includedDocuments = 0
      
      for (const doc of prioritizedDocuments) {
        // Apply compression level by truncating content to the specified percentage
        const compressedTokens = Math.ceil(doc.estimatedTokens * compressionLevel)
        
        if (documentContentTokens + compressedTokens <= maxTokens - templateBaseTokens - projectMetadataTokens) {
          documentContentTokens += compressedTokens
          includedDocuments++
        } else {
          break
        }
      }

      const totalTokens = templateBaseTokens + projectMetadataTokens + documentContentTokens
      const availableTokens = maxTokens - totalTokens
      const utilizationPercentage = (totalTokens / maxTokens) * 100

      // Generate recommendations
      const recommendations = this.generateOptimizationRecommendations(
        utilizationPercentage,
        includedDocuments,
        prioritizedDocuments.length,
        availableTokens
      )

      return {
        templateBaseTokens,
        projectMetadataTokens,
        documentContentTokens,
        totalTokens,
        availableTokens,
        utilizationPercentage,
        recommendations
      }
    } catch (error) {
      logger.error('Error analyzing context window:', error)
      throw error
    }
  }

  /**
   * Start workflow processing
   */
  async startWorkflowProcessing(config: WorkflowConfiguration): Promise<{steps: ProcessFlowStep[], finalDocument: string, workflowId: string, savedDocument: {id: string, name: string}}> {
    try {
      const steps: ProcessFlowStep[] = [
        {
          id: 1,
          name: 'Template Analysis',
          description: 'Analyzing selected template structure and requirements',
          status: 'pending' as const,
          tokens: 0
        },
        {
          id: 2,
          name: 'Project Information Extraction',
          description: 'Extracting project metadata and context',
          status: 'pending' as const,
          tokens: 0
        },
        ...(config.includeStakeholders ? [{
          id: 2.5,
          name: 'Stakeholder Information Extraction',
          description: 'Extracting project stakeholder information',
          status: 'pending' as const,
          tokens: 0
        }] : []),
        {
          id: 3,
          name: 'Document Prioritization',
          description: 'Prioritizing documents by relevance and importance',
          status: 'pending' as const,
          tokens: 0
        },
        {
          id: 4,
          name: 'AI Document Compression',
          description: `Compressing documents using ${config.compressionMethod} method at ${(config.compressionLevel * 100).toFixed(0)}%`,
          status: 'pending' as const,
          tokens: 0
        },
        {
          id: 5,
          name: 'Context Window Optimization',
          description: 'Optimizing content for 2M+ token context window',
          status: 'pending' as const,
          tokens: 0
        },
        {
          id: 6,
          name: 'Content Injection',
          description: 'Injecting prioritized content into template',
          status: 'pending' as const,
          tokens: 0
        },
        {
          id: 7,
          name: 'AI Document Generation',
          description: 'Generating final document using AI provider',
          status: 'pending' as const,
          tokens: 0
        },
        {
          id: 8,
          name: 'Quality Validation',
          description: 'Validating output quality and completeness',
          status: 'pending' as const,
          tokens: 0
        }
      ]

      // Log workflow start
      logger.info(`Starting workflow processing for template ${config.templateId} and project ${config.projectId}`)
      
      // Execute workflow steps and get final document
      const { finalDocument, savedDocument } = await this.executeWorkflowSteps(steps, config)
      
      // Generate workflow ID
      const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      return {
        steps,
        finalDocument,
        workflowId,
        savedDocument
      }
    } catch (error) {
      logger.error('Error starting workflow processing:', error)
      throw error
    }
  }

  /**
   * Execute workflow steps with actual processing
   */
  async executeWorkflowSteps(steps: ProcessFlowStep[], config: WorkflowConfiguration): Promise<{finalDocument: string, savedDocument: {id: string, name: string}}> {
    try {
      // Step 1: Template Analysis
      steps[0].status = 'processing'
      logger.info('Step 1: Analyzing template structure')
      
      const templateResult = await this.db.query(
        'SELECT name, description, content, LENGTH(content::text) as content_length, system_prompt, template_paragraphs FROM templates WHERE id = $1',
        [config.templateId]
      )
      
      if (templateResult.rows.length === 0) {
        throw new Error('Template not found')
      }
      
      const template = templateResult.rows[0]
      const templateTokens = this.estimateTokenCount(template.content, template.content_length)
      
      // Calculate tokens for system prompt and template paragraphs
      const systemPromptTokens = template.system_prompt ? this.estimateTokenCount(template.system_prompt) : 0
      const templateParagraphsTokens = template.template_paragraphs ? this.estimateTokenCount(JSON.stringify(template.template_paragraphs)) : 0
      const totalTemplateTokens = templateTokens + systemPromptTokens + templateParagraphsTokens
      
      // Build context content for this step
      let step1Context = `## Template Content\n${typeof template.content === 'string' ? template.content : JSON.stringify(template.content)}\n`
      if (template.system_prompt) {
        step1Context += `\n## System Prompt\n${template.system_prompt}\n`
      }
      if (template.template_paragraphs && template.template_paragraphs.length > 0) {
        step1Context += `\n## Expected Document Structure\n`
        template.template_paragraphs.forEach((paragraph: any, index: number) => {
          step1Context += `\n### ${paragraph.section_name} (${paragraph.section_type})\n`
          step1Context += `Description: ${paragraph.description}\n`
          if (paragraph.prompt_guidance) {
            step1Context += `AI Guidance: ${paragraph.prompt_guidance}\n`
          }
          step1Context += `Required: ${paragraph.required ? 'Yes' : 'No'}\n`
        })
      }
      
      steps[0].tokens = totalTemplateTokens
      steps[0].status = 'completed'
      steps[0].contextAdded = step1Context
      
      // Enhanced description with AI guidance information
      let description = `Template analyzed: ${template.name} (${totalTemplateTokens.toLocaleString()} tokens)`
      if (template.system_prompt) {
        description += ` | System Prompt: ${systemPromptTokens.toLocaleString()} tokens`
      }
      if (template.template_paragraphs && template.template_paragraphs.length > 0) {
        description += ` | Expected Sections: ${template.template_paragraphs.length}`
      }
      
      steps[0].description = description
      
      logger.info(`Template analysis completed: ${template.name}`)
      logger.info(`Step 1 Context Added: ${step1Context.length} characters`)
      if (template.system_prompt) {
        logger.info(`System prompt available: ${systemPromptTokens.toLocaleString()} tokens`)
      }
      if (template.template_paragraphs && template.template_paragraphs.length > 0) {
        logger.info(`Template paragraphs defined: ${template.template_paragraphs.length} expected sections`)
      }
      
      // Step 2: Project Information Extraction
      steps[1].status = 'processing'
      logger.info('Step 2: Extracting project information')
      
      const projectResult = await this.db.query(
        'SELECT name, description, framework FROM projects WHERE id = $1',
        [config.projectId]
      )
      
      if (projectResult.rows.length === 0) {
        throw new Error('Project not found')
      }
      
      const project = projectResult.rows[0]
      const projectMetadata = JSON.stringify({
        name: project.name,
        description: project.description,
        framework: project.framework
      })
      const metadataTokens = this.estimateTokenCount(projectMetadata)
      
      // Build context content for this step
      const step2Context = `## Project Information\n${projectMetadata}\n`
      
      steps[1].tokens = metadataTokens
      steps[1].status = 'completed'
      steps[1].contextAdded = step2Context
      steps[1].description = `Project metadata extracted: ${project.name} (${metadataTokens.toLocaleString()} tokens)`
      
      logger.info(`Step 2 Context Added: ${step2Context.length} characters`)
      
      // Step 2.5: Stakeholder Information Extraction (if enabled)
      let stakeholderTokens = 0
      let stakeholderData = null
      let stepIndex = 2 // Start at index 2 for Step 3 (Document Prioritization)
      
      if (config.includeStakeholders) {
        logger.info('Step 2.5: Extracting stakeholder information')
        steps[2].status = 'processing' // Stakeholder step is at index 2
        
        const stakeholderResult = await this.db.query(
          'SELECT name, role, email, department, stakeholder_type, stakeholder_category FROM stakeholders WHERE project_id = $1',
          [config.projectId]
        )
        
        if (stakeholderResult.rows.length > 0) {
          stakeholderData = {
            stakeholders: stakeholderResult.rows.map(stakeholder => ({
              name: stakeholder.name || 'Unnamed Stakeholder',
              role: stakeholder.role,
              email: stakeholder.email,
              department: stakeholder.department,
              type: stakeholder.stakeholder_type,
              category: stakeholder.stakeholder_category
            }))
          }
          stakeholderTokens = this.estimateTokenCount(JSON.stringify(stakeholderData))
          
          // Build context content for this step
          let step2_5Context = `## Project Stakeholders\n`
          stakeholderData.stakeholders.forEach((stakeholder: any, index: number) => {
            step2_5Context += `\n### Stakeholder ${index + 1}: ${stakeholder.name}\n`
            step2_5Context += `- Role: ${stakeholder.role}\n`
            step2_5Context += `- Email: ${stakeholder.email}\n`
            if (stakeholder.department) step2_5Context += `- Department: ${stakeholder.department}\n`
            step2_5Context += `- Type: ${stakeholder.type}\n`
            step2_5Context += `- Category: ${stakeholder.category}\n`
          })
          
          steps[2].tokens = stakeholderTokens
          steps[2].status = 'completed'
          steps[2].contextAdded = step2_5Context
          steps[2].description = `Stakeholder information extracted: ${stakeholderResult.rows.length} stakeholders (${stakeholderTokens.toLocaleString()} tokens)`
          logger.info(`Stakeholder information extracted: ${stakeholderResult.rows.length} stakeholders (${stakeholderTokens.toLocaleString()} tokens)`)
          logger.info(`Step 2.5 Context Added: ${step2_5Context.length} characters`)
        } else {
          const step2_5Context = `## Project Stakeholders\nNo stakeholders found for this project.\n`
          steps[2].tokens = 0
          steps[2].status = 'completed'
          steps[2].contextAdded = step2_5Context
          steps[2].description = 'No stakeholders found for this project'
          logger.info('No stakeholders found for this project')
          logger.info(`Step 2.5 Context Added: ${step2_5Context.length} characters`)
        }
        stepIndex = 3 // Move to next step index
      }
      
      // Step 3: Document Prioritization
      steps[stepIndex].status = 'processing'
      logger.info('Step 3: Prioritizing documents')
      
      const projectDocuments = await this.getProjectDocuments(config.projectId)
      const prioritizedDocuments = await this.calculateDocumentPriorities(projectDocuments, config.priorityStrategy)
      
      const totalDocumentTokens = prioritizedDocuments.reduce((sum, doc) => sum + doc.estimatedTokens, 0)
      
      // Build context content for this step
      let step3Context = `## Document Prioritization Results\n`
      step3Context += `Total Documents: ${prioritizedDocuments.length}\n`
      step3Context += `Total Tokens: ${totalDocumentTokens.toLocaleString()}\n`
      step3Context += `Priority Strategy: ${config.priorityStrategy}\n\n`
      step3Context += `### Prioritized Documents:\n`
      prioritizedDocuments.forEach((doc, index) => {
        step3Context += `${index + 1}. ${doc.documentName || `Document ${doc.documentId}`}\n`
        step3Context += `   - Priority Score: ${(doc.priorityScore * 100).toFixed(1)}%\n`
        step3Context += `   - Estimated Tokens: ${doc.estimatedTokens.toLocaleString()}\n`
        step3Context += `   - Category: ${doc.category || 'Unknown'}\n\n`
      })
      
      steps[stepIndex].tokens = totalDocumentTokens
      steps[stepIndex].status = 'completed'
      steps[stepIndex].contextAdded = step3Context
      steps[stepIndex].description = `Documents prioritized: ${prioritizedDocuments.length} documents (${totalDocumentTokens.toLocaleString()} tokens)`
      stepIndex++
      
      logger.info(`Step 3 Context Added: ${step3Context.length} characters`)
      
      // Step 4: AI Document Compression (THE MAIN COMPRESSION STEP)
      steps[stepIndex].status = 'processing'
      logger.info(`Step 4: Compressing documents using ${config.compressionMethod} method at ${(config.compressionLevel * 100).toFixed(0)}%`)
      
      // Prepare template context for focused summarization
      const templateContext = {
        name: template.name,
        description: template.description || 'Document template',
        content: template.content,
        system_prompt: template.system_prompt,
        template_paragraphs: template.template_paragraphs
      }

      const compressedDocuments = await this.getCompressedDocuments(
        prioritizedDocuments,
        config.maxTokens,
        config.compressionLevel,
        templateTokens,
        metadataTokens,
        config.compressionMethod,
        templateContext,
        stakeholderTokens,
        config.onProgress // Pass through progress callback
      )
      
      const compressedTokens = compressedDocuments.reduce((sum, doc) => sum + doc.compressedTokens, 0)
      const originalTokens = compressedDocuments.reduce((sum, doc) => sum + doc.document.estimatedTokens, 0)
      const compressionRatio = originalTokens > 0 ? (compressedTokens / originalTokens) : 0
      
      // Build detailed context content for this step with per-document breakdown
      let step4Context = `## 📊 Document Compression Results\n\n`
      step4Context += `✅ Compression Method: ${config.compressionMethod}\n`
      step4Context += `✅ Compression Level: ${(config.compressionLevel * 100).toFixed(0)}%\n`
      step4Context += `✅ Documents Processed: ${compressedDocuments.length}/${prioritizedDocuments.length}\n`
      step4Context += `✅ Original Size: ${originalTokens.toLocaleString()} tokens\n`
      step4Context += `✅ Compressed Size: ${compressedTokens.toLocaleString()} tokens\n`
      step4Context += `✅ Compression Ratio: ${(compressionRatio * 100).toFixed(1)}%\n`
      step4Context += `✅ Tokens Saved: ${(originalTokens - compressedTokens).toLocaleString()}\n`
      step4Context += `✅ Context Utilization: ${((compressedTokens / config.maxTokens) * 100).toFixed(1)}%\n\n`
      
      if (compressedDocuments.length > 0) {
        step4Context += `### 📄 Individual Document Results:\n\n`
        compressedDocuments.forEach((doc, index) => {
          const compressionPercent = ((1 - doc.compressionDetails.compressionRatio) * 100).toFixed(1)
          step4Context += `**${index + 1}. ${doc.document.documentName || `Document ${doc.document.documentId}`}** ✓\n`
          step4Context += `   - 📥 Original: ${doc.compressionDetails.originalTokens.toLocaleString()} tokens\n`
          step4Context += `   - 📤 Compressed: ${doc.compressionDetails.compressedTokens.toLocaleString()} tokens\n`
          step4Context += `   - 🎯 Saved: ${compressionPercent}%\n`
          step4Context += `   - 🔧 Method: ${doc.compressionDetails.method}\n`
          if (doc.compressionDetails.note) {
            step4Context += `   - ℹ️ ${doc.compressionDetails.note}\n`
          }
          step4Context += `\n`
        })
      } else {
        step4Context += `### ⚠️ No Documents Were Compressed\n`
        step4Context += `Available tokens: ${(config.maxTokens - templateTokens - metadataTokens - stakeholderTokens).toLocaleString()}\n`
        step4Context += `Documents to process: ${prioritizedDocuments.length}\n`
      }
      
      // Add metadata with per-document details for frontend
      steps[stepIndex].metadata = {
        totalDocuments: prioritizedDocuments.length,
        compressedCount: compressedDocuments.length,
        compressionMethod: config.compressionMethod,
        compressionLevel: config.compressionLevel,
        originalTokens,
        compressedTokens,
        tokensSaved: originalTokens - compressedTokens,
        compressionRatio,
        documents: compressedDocuments.map((doc, index) => ({
          index: index + 1,
          name: doc.document.documentName || `Document ${index + 1}`,
          id: doc.document.documentId,
          originalTokens: doc.compressionDetails.originalTokens,
          compressedTokens: doc.compressionDetails.compressedTokens,
          compressionRatio: doc.compressionDetails.compressionRatio,
          compressionPercent: ((1 - doc.compressionDetails.compressionRatio) * 100).toFixed(1),
          method: doc.compressionDetails.method,
          note: doc.compressionDetails.note
        }))
      }
      
      steps[stepIndex].tokens = compressedTokens
      steps[stepIndex].status = 'completed'
      steps[stepIndex].contextAdded = step4Context
      steps[stepIndex].description = `✓ Compressed ${compressedDocuments.length} documents • ${(compressionRatio * 100).toFixed(1)}% ratio • ${(originalTokens - compressedTokens).toLocaleString()} tokens saved`
      stepIndex++
      
      logger.info(`Step 4 Context Added: ${step4Context.length} characters`)
      
      // Step 5: Context Window Optimization
      steps[stepIndex].status = 'processing'
      logger.info('Step 5: Optimizing context window')
      
      const totalTokens = templateTokens + metadataTokens + stakeholderTokens + compressedTokens
      const utilizationPercentage = (totalTokens / config.maxTokens) * 100
      
      steps[stepIndex].tokens = totalTokens
      steps[stepIndex].status = 'completed'
      steps[stepIndex].description = `Context window optimized: ${totalTokens.toLocaleString()} tokens (${utilizationPercentage.toFixed(1)}% utilization)`
      stepIndex++
      
      // Step 6: Content Injection
      steps[stepIndex].status = 'processing'
      logger.info('Step 6: Injecting content into template')
      
      // Simulate content injection (in a real implementation, this would merge the compressed content with the template)
      const templateContent = typeof template.content === 'string' ? template.content : JSON.stringify(template.content)
      const injectedContent = this.simulateContentInjection(templateContent, compressedDocuments, projectMetadata, stakeholderData, template.system_prompt, template.template_paragraphs)
      const injectedTokens = this.estimateTokenCount(injectedContent)
      
      steps[stepIndex].tokens = injectedTokens
      steps[stepIndex].status = 'completed'
      steps[stepIndex].description = `Content injected: Template merged with ${compressedDocuments.length} compressed documents (${injectedTokens.toLocaleString()} tokens)`
      stepIndex++
      
      // Step 7: AI Document Generation
      steps[stepIndex].status = 'processing'
      logger.info('Step 7: Generating final document using AI provider')
      
      // Track AI generation time
      const aiStartTime = Date.now()
      
      // Generate the actual document using AI (with metadata)
      const aiGenerationResult = await this.generateDocumentWithAI(injectedContent, template, config)
      
      const aiEndTime = Date.now()
      const aiProcessingTimeMs = aiEndTime - aiStartTime
      const aiProcessingTimeSec = (aiProcessingTimeMs / 1000).toFixed(1)
      
      const aiGeneratedDocument = typeof aiGenerationResult === 'string' ? aiGenerationResult : aiGenerationResult.content
      const aiMetadata = typeof aiGenerationResult === 'object' ? {
        ...aiGenerationResult,
        processingTime: aiProcessingTimeSec + 's',
        processingTimeMs: aiProcessingTimeMs
      } : null
      const aiGeneratedTokens = this.estimateTokenCount(aiGeneratedDocument)
      
      steps[stepIndex].tokens = aiGeneratedTokens
      steps[stepIndex].status = 'completed'
      steps[stepIndex].description = `AI document generated: ${aiGeneratedTokens.toLocaleString()} tokens`
      stepIndex++
      
      // Step 8: Quality Validation
      steps[stepIndex].status = 'processing'
      logger.info('Step 8: Validating output quality')
      
      const qualityScore = this.validateOutputQuality(injectedContent, compressedDocuments)
      
      steps[stepIndex].tokens = injectedTokens
      steps[stepIndex].status = 'completed'
      steps[stepIndex].description = `Quality validated: Score ${(qualityScore * 100).toFixed(1)}% (${injectedTokens.toLocaleString()} tokens)`
      
      logger.info('Workflow processing completed successfully')
      
      // Save the final document to the project (with AI metadata)
      const savedDocument = await this.saveGeneratedDocument(
        aiGeneratedDocument,
        config,
        template,
        project,
        compressedDocuments,
        aiMetadata
      )
      
      logger.info(`Generated document saved with ID: ${savedDocument.id}`)
      
      // Return both the final document content and saved document info
      return {
        finalDocument: aiGeneratedDocument,
        savedDocument
      }
      
    } catch (error) {
      logger.error('Error executing workflow steps:', error)
      // Mark current step as failed
      const currentStep = steps.find(step => step.status === 'processing')
      if (currentStep) {
        currentStep.status = 'error' as const
        currentStep.description = `Failed: ${error.message}`
      }
      throw error
    }
  }

  /**
   * Generate document using AI provider with the built context
   */
  private async generateDocumentWithAI(contextContent: string, template: any, config: WorkflowConfiguration): Promise<any> {
    try {
      // Import aiService dynamically to avoid circular dependencies
      const { aiService } = await Promise.resolve().then(() => require())
      
      // Get the first available active AI provider with its type
      const activeProviderResult = await this.db.query(
        "SELECT name, provider_type FROM ai_providers WHERE is_active = true ORDER BY priority ASC, name ASC LIMIT 1"
      )
      
      if (activeProviderResult.rows.length === 0) {
        throw new Error('No active AI providers available')
      }
      
      const activeProvider = activeProviderResult.rows[0].name
      const providerType = activeProviderResult.rows[0].provider_type
      
      // Choose the appropriate model based on provider type
      let modelName = 'gpt-4o' // Default for OpenAI
      switch (providerType) {
        case 'google':
          modelName = 'gemini-2.5-flash' // Google Gemini model (stable, fast and efficient)
          break
        case 'openai':
        case 'azure':
          modelName = 'gpt-4o'
          break
        case 'groq':
          modelName = 'llama-3.1-70b-versatile'
          break
        case 'mistral':
          modelName = 'mistral-large-latest'
          break
        case 'anthropic':
          modelName = 'claude-3-5-sonnet'  // Simplified name without date suffix
          break
        default:
          modelName = 'gpt-4o'
      }
      
      // Create the AI generation request
      const aiRequest = {
        prompt: contextContent,
        provider: activeProvider,
        model: modelName,
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 8000, // Increased for comprehensive document generation
        system_prompt: template.system_prompt || 'You are an expert document generator. Create a comprehensive, well-structured document based on the provided context and template requirements.'
      }
      
      logger.info(`Generating document using AI provider: ${activeProvider} (${providerType})`)
      logger.info(`Using model: ${modelName}`)
      logger.info(`Context content length: ${contextContent.length} characters`)
      
      // Generate the document with fallback
      const response = await aiService.generateWithFallback(aiRequest, ['openai', 'google', 'anthropic', 'mistral', 'groq'])
      
      if (!response.content) {
        throw new Error(`AI generation failed: No content returned`)
      }
      
      logger.info(`AI document generation completed successfully`)
      
      // Return full response with metadata (provider, model, usage, etc.)
      return {
        content: response.content,
        provider: response.provider || providerType,
        model: response.model || modelName,
        usage: response.usage,
        metadata: (response as any).metadata
      }
      
    } catch (error) {
      logger.error('Error generating document with AI:', error)
      
      // Don't silently fall back - throw the error so users know AI generation failed
      throw new Error(`AI document generation failed: ${error.message}. Please ensure an AI provider is properly configured with a valid API key.`)
    }
  }

  /**
   * Simulate content injection with system prompt and template paragraphs
   */
  private simulateContentInjection(templateContent: string, compressedDocuments: any[], projectMetadata: string, stakeholderData?: any, systemPrompt?: string, templateParagraphs?: any[]): string {
    let injectedContent = templateContent
    
    logger.info('=== CONTEXT INJECTION PROCESS ===')
    logger.info(`Starting with template content: ${templateContent.length} characters`)
    
    // Add system prompt if available
    if (systemPrompt) {
      injectedContent += `\n\n## AI System Prompt\n${systemPrompt}\n`
      logger.info(`Added system prompt: ${systemPrompt.length} characters`)
    } else {
      logger.info('No system prompt available')
    }
    
    // Add template paragraphs (expected sections) if available
    if (templateParagraphs && templateParagraphs.length > 0) {
      injectedContent += `\n\n## Expected Document Structure\n`
      templateParagraphs.forEach((paragraph: any, index: number) => {
        injectedContent += `\n### ${paragraph.section_name} (${paragraph.section_type})\n`
        injectedContent += `Description: ${paragraph.description}\n`
        if (paragraph.prompt_guidance) {
          injectedContent += `AI Guidance: ${paragraph.prompt_guidance}\n`
        }
        injectedContent += `Required: ${paragraph.required ? 'Yes' : 'No'}\n`
      })
      logger.info(`Added template paragraphs: ${templateParagraphs.length} sections`)
    } else {
      logger.info('No template paragraphs defined')
    }
    
    // Add project metadata
    injectedContent += `\n\n## Project Information\n${projectMetadata}\n`
    logger.info(`Added project metadata: ${projectMetadata.length} characters`)
    
    // Add stakeholder information if available
    if (stakeholderData && stakeholderData.stakeholders && stakeholderData.stakeholders.length > 0) {
      injectedContent += `\n\n## Project Stakeholders\n`
      stakeholderData.stakeholders.forEach((stakeholder: any, index: number) => {
        injectedContent += `\n### Stakeholder ${index + 1}: ${stakeholder.name}\n`
        injectedContent += `- Role: ${stakeholder.role}\n`
        injectedContent += `- Email: ${stakeholder.email}\n`
        if (stakeholder.department) injectedContent += `- Department: ${stakeholder.department}\n`
        injectedContent += `- Type: ${stakeholder.type}\n`
        injectedContent += `- Category: ${stakeholder.category}\n`
      })
      logger.info(`Added stakeholder information: ${stakeholderData.stakeholders.length} stakeholders`)
    } else {
      logger.info('No stakeholder information to add')
    }
    
    // Add compressed documents
    injectedContent += `\n\n## Compressed Documents (Individual Document Compression)\n`
    injectedContent += `Total Documents: ${compressedDocuments.length}\n`
    injectedContent += `Total Compressed Tokens: ${compressedDocuments.reduce((sum, doc) => sum + doc.compressedTokens, 0).toLocaleString()}\n\n`
    
    compressedDocuments.forEach((doc, index) => {
      injectedContent += `\n### Document ${index + 1}: ${doc.document.name || doc.document.title || doc.document.id}\n`
      injectedContent += `Original: ${doc.compressionDetails.originalTokens.toLocaleString()} tokens\n`
      injectedContent += `Compressed: ${doc.compressionDetails.compressedTokens.toLocaleString()} tokens (${doc.compressionDetails.actualCompression})\n`
      injectedContent += `Method: ${doc.compressionDetails.method}\n`
      if (doc.compressionDetails.note) {
        injectedContent += `Note: ${doc.compressionDetails.note}\n`
      }
      injectedContent += `Content:\n${doc.compressedContent}\n`
      logger.info(`Added compressed document ${index + 1}: ${doc.document.name || doc.document.title} (${doc.compressedContent.length} characters, ${doc.compressionDetails.actualCompression} compression)`)
    })
    
    logger.info(`=== CONTEXT INJECTION COMPLETE ===`)
    logger.info(`Final context length: ${injectedContent.length} characters`)
    logger.info(`Total documents included: ${compressedDocuments.length}`)
    logger.info(`Total stakeholders included: ${stakeholderData?.stakeholders?.length || 0}`)
    
    return injectedContent
  }

  /**
   * Validate output quality (placeholder for actual implementation)
   */
  private validateOutputQuality(content: string, compressedDocuments: any[]): number {
    // Simple quality validation based on content length and document count
    const contentLength = content.length
    const documentCount = compressedDocuments.length
    
    // Quality score based on content richness and document inclusion
    let qualityScore = 0.5 // Base score
    
    if (contentLength > 10000) qualityScore += 0.2
    if (contentLength > 50000) qualityScore += 0.1
    if (documentCount >= 3) qualityScore += 0.1
    if (documentCount >= 5) qualityScore += 0.1
    
    return Math.min(1.0, qualityScore)
  }

  /**
   * Save the generated document to the project
   */
  async saveGeneratedDocument(
    finalContent: string,
    config: WorkflowConfiguration,
    template: any,
    project: any,
    compressedDocuments: any[],
    aiMetadata?: any
  ): Promise<{id: string, name: string}> {
    try {
      // Generate document name based on template and timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const documentName = `${template.name} - Generated ${timestamp}`
      
      // Calculate token counts
      const totalTokens = aiMetadata?.usage?.total_tokens || Math.ceil(finalContent.length / 4)
      const inputTokens = aiMetadata?.usage?.prompt_tokens || 0
      const outputTokens = aiMetadata?.usage?.completion_tokens || totalTokens
      
      // Calculate content statistics
      const wordCount = finalContent.split(/\s+/).filter(word => word.length > 0).length
      const characterCount = finalContent.length
      const sentenceCount = finalContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length
      const paragraphCount = finalContent.split(/\n\n+/).filter(p => p.trim().length > 0).length
      
      // Helper function to calculate AI cost
      const calculateCost = (provider: string, inputTokens: number, outputTokens: number): number => {
        const pricing: any = {
          'openai': { input: 0.01 / 1000, output: 0.03 / 1000 },
          'google': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
          'mistral': { input: 0.001 / 1000, output: 0.003 / 1000 },
          'groq': { input: 0.00027 / 1000, output: 0.00027 / 1000 },
          'anthropic': { input: 0.008 / 1000, output: 0.024 / 1000 }
        }
        const rates = pricing[provider?.toLowerCase()] || { input: 0.001 / 1000, output: 0.003 / 1000 }
        return (inputTokens * rates.input) + (outputTokens * rates.output)
      }
      
      // Create document metadata (general workflow info)
      const metadata = {
        generatedBy: 'Process Flow Workflow',
        templateId: config.templateId,
        templateName: template.name,
        compressionMethod: config.compressionMethod,
        compressionLevel: config.compressionLevel,
        priorityStrategy: config.priorityStrategy,
        totalTokens
      }
      
      // Create generation_metadata (AI-specific info for display)
      const generationMetadata = {
        source_documents: compressedDocuments.map((doc, index) => ({
          id: doc.document.documentId,
          title: doc.document.name,
          name: doc.document.name,
          status: 'compressed',
          priority_rank: index + 1,
          originalTokens: doc.document.estimatedTokens,
          compressedTokens: doc.compressedTokens,
          compressionRatio: ((doc.compressedTokens / doc.document.estimatedTokens) * 100).toFixed(1) + '%'
        })),
        aiProcessing: aiMetadata ? {
          provider: aiMetadata.provider,
          model: aiMetadata.model,
          temperature: 0.3,
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
            cost: calculateCost(aiMetadata.provider, inputTokens, outputTokens)
          },
          status: 'success',
          processingTime: aiMetadata.processingTime || 'N/A',
          processingTimeMs: aiMetadata.processingTimeMs || 0
        } : {
          provider: 'N/A',
          model: 'N/A',
          temperature: 0.3,
          tokens: {
            input: 0,
            output: 0,
            total: 0,
            cost: 0
          },
          status: 'unknown',
          processingTime: 'N/A',
          processingTimeMs: 0
        },
        generation: {
          status: aiMetadata ? 'success' : 'unknown',
          duration: aiMetadata?.processingTimeMs || 0,
          durationFormatted: aiMetadata?.processingTime || 'N/A'
        },
        contentMetrics: {
          words: wordCount,
          characters: characterCount,
          sentences: sentenceCount,
          paragraphs: paragraphCount,
          avgWordsPerSentence: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
          readingTime: Math.ceil(wordCount / 200) // 200 words per minute average
        }
      }
      
      // Calculate quality and compliance metrics
      let docQuality: any = null;
      try {
        const metadataUtils = await Promise.resolve().then(() => require())
        const analyzeDocFunc = (metadataUtils as any).analyzeDocumentQuality
        const tempMetadata = {
          wordCount,
          characterCount,
          sentenceCount,
          paragraphCount,
          templateId: config.templateId || undefined,
          framework: project.framework || 'ADPA'
        } as any
        
        docQuality = analyzeDocFunc(finalContent, tempMetadata, compressedDocuments.length)
        
        if (docQuality) {
          // Add quality and compliance metrics to generation_metadata
          (generationMetadata as any).qualityMetrics = {
            overallQuality: docQuality.overallQuality,
            completeness: docQuality.completeness,
            structureScore: docQuality.structureScore,
            formattingScore: docQuality.formattingScore,
            contentDepth: docQuality.contentDepth,
            accuracy: docQuality.accuracy,
            consistency: docQuality.consistency,
            contextRelevance: docQuality.contextRelevance,
            professionalQuality: docQuality.professionalQuality,
            standardsCompliance: docQuality.standardsCompliance,
            complexityScore: docQuality.complexityScore,
            recommendations: docQuality.recommendations
          };
          
          (generationMetadata as any).complianceMetrics = docQuality.complianceMetrics;
        }
      } catch (metricsError) {
        logger.warn('Failed to calculate compliance metrics:', metricsError)
        // Continue without metrics rather than failing the document save
      }
      
      // Insert document into database with both metadata and generation_metadata
      const result = await this.db.query(`
        INSERT INTO documents (
          id, 
          name, 
          content, 
          project_id, 
          template_id, 
          status, 
          framework, 
          metadata,
          generation_metadata,
          created_at, 
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1, 
          $2, 
          $3, 
          $4, 
          'draft', 
          $5, 
          $6,
          $7,
          NOW(), 
          NOW()
        ) RETURNING id, name
      `, [
        documentName,
        finalContent,
        config.projectId,
        config.templateId,
        project.framework || 'ADPA',
        JSON.stringify(metadata),
        JSON.stringify(generationMetadata)
      ])
      
      const savedDocument = result.rows[0]
      
      logger.info(`Document saved successfully: ${savedDocument.name} (ID: ${savedDocument.id})`)
      
      // 📸 Save initial version snapshot to document_versions table
      // This ensures v1.0.0 is always available in version history
      try {
        const { v4: uuidv4 } = await import('uuid')
        
        await this.db.query(
          `INSERT INTO document_versions 
           (id, document_id, version, semantic_version, content, author_id, created_at, change_type, change_description, generation_metadata)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
           ON CONFLICT (document_id, version) DO NOTHING`,
          [
            uuidv4(),
            savedDocument.id,
            '1', // Initial integer version
            '1.0.0', // Initial semantic version
            finalContent,
            config.userId || null,
            'initial_version',
            'Initial version created by AI',
            JSON.stringify(generationMetadata)
          ]
        )
        
        logger.info(`Initial version v1.0.0 saved to version history for document ${savedDocument.id}`)
      } catch (versionError: any) {
        logger.warn('[VERSION-SNAPSHOT] Failed to save initial version snapshot', {
          documentId: savedDocument.id,
          error: versionError.message
        })
        // Don't fail document creation if version snapshot fails
      }
      
      // QUALITY CONTROL GATE: Trigger automatic quality audit
      try {
        logger.info('[PROCESS-FLOW] Triggering automatic quality audit', {
          documentId: savedDocument.id,
          documentName: savedDocument.name
        })
        
        // Enqueue quality audit job (async, non-blocking)
        const { getQueueService } = await Promise.resolve().then(() => require())
        const { v4: uuidv4 } = await import('uuid')
        const auditJobId = uuidv4()
        
        getQueueService().addJob('quality-audit', {
          jobId: auditJobId,
          documentId: savedDocument.id,
          documentContent: finalContent,
          documentType: config.templateType || 'unknown',
          projectContext: project,
          userId: config.userId || null
        }).then(() => {
          logger.info('[PROCESS-FLOW] Quality audit job enqueued', {
            documentId: savedDocument.id,
            auditJobId
          })
        }).catch((auditError: any) => {
          logger.error('[PROCESS-FLOW] Failed to enqueue quality audit', {
            documentId: savedDocument.id,
            error: auditError instanceof Error ? auditError.message : String(auditError)
          })
          // Don't fail document generation if audit fails
        })
      } catch (error) {
        logger.error('[PROCESS-FLOW] Failed to trigger quality audit', {
          documentId: savedDocument.id,
          error: error instanceof Error ? error.message : String(error)
        })
        // Don't fail document generation if audit trigger fails
      }
      
      return savedDocument
      
    } catch (error) {
      logger.error('Error saving generated document:', error)
      throw new Error(`Failed to save generated document: ${error.message}`)
    }
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateRelevanceScore(doc: any): number {
    // Simulate relevance calculation based on various factors
    let score = 0.5 // Base score
    
    // Boost score based on document status
    if (doc.status === 'published') score += 0.2
    if (doc.status === 'draft') score += 0.1
    
    // Boost score based on template category
    if (doc.template_category === 'Management Plans') score += 0.15
    if (doc.template_category === 'Security Architecture') score += 0.1
    
    // Add some randomness to simulate real-world relevance
    score += (Math.random() - 0.5) * 0.2
    
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Calculate recency score for a document
   */
  private calculateRecencyScore(doc: any): number {
    const now = new Date()
    const docDate = new Date(doc.updated_at)
    const daysDiff = (now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24)
    
    // Score decreases over time, with recent documents getting higher scores
    if (daysDiff <= 7) return this.secureRandomInRange(0.9, 1.0)
    if (daysDiff <= 30) return this.secureRandomInRange(0.7, 0.9)
    if (daysDiff <= 90) return this.secureRandomInRange(0.5, 0.7)
    if (daysDiff <= 365) return this.secureRandomInRange(0.3, 0.5)
    return this.secureRandomInRange(0.1, 0.3)
  }

  /**
   * Calculate importance score for a document
   */
  private calculateImportanceScore(doc: any): number {
    let score = 0.5 // Base score
    
    // Boost score based on document name keywords
    const name = doc.name.toLowerCase()
    if (name.includes('charter') || name.includes('plan')) score += 0.2
    if (name.includes('management') || name.includes('strategy')) score += 0.15
    if (name.includes('security') || name.includes('risk')) score += 0.1
    
    // Boost score based on version (higher versions are more important)
    if (doc.version > 1) score += 0.1
    
    // Add some randomness
    score += this.secureRandomInRange(-0.075, 0.075)
    
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Estimate token count for content
   */
  private estimateTokenCount(content: any, contentLength?: number): number {
    if (!content && !contentLength) return 0
    
    // Always use actual content length for accuracy (contentLength field may be outdated)
    if (content) {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
      // Rough estimation: 1 token ≈ 4 characters
      return Math.ceil(contentStr.length / 4)
    }
    
    // Fallback: use pre-calculated content length if content is not available
    if (contentLength) {
      return Math.ceil(contentLength / 4)
    }
    
    return 0
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    utilizationPercentage: number,
    includedDocuments: number,
    totalDocuments: number,
    availableTokens: number
  ): string[] {
    const recommendations: string[] = []
    
    if (utilizationPercentage < 50) {
      recommendations.push('Consider including more high-priority documents to maximize context value')
    }
    
    if (utilizationPercentage > 90) {
      recommendations.push('Context window is nearly full. Consider increasing compression level or removing low-priority documents')
    }
    
    if (includedDocuments < totalDocuments * 0.5) {
      recommendations.push('Less than 50% of documents are included. Consider prioritizing the most relevant documents')
    }
    
    if (availableTokens > 500000) {
      recommendations.push('Significant token capacity available. Consider including additional context or metadata')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Context window utilization is optimal for current configuration')
    }
    
    return recommendations
  }
}

export default ProcessFlowService
