/**
 * Process Flow Workflow Service
 * Handles template processing with project information injection and document prioritization
 */

import { Pool } from 'pg'
import { logger } from '../utils/logger'
import { documentCompressionService, DocumentCompressionOptions } from './documentCompressionService'

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
}

class ProcessFlowService {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  /**
   * Get available templates for processing
   */
  async getAvailableTemplates(): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT 
          id,
          name,
          description,
          category,
          framework,
          content,
          LENGTH(content::text) as content_length,
          created_at
        FROM templates
        WHERE deleted_at IS NULL
        ORDER BY name
      `)
      return result.rows
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
      const result = await this.pool.query(`
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
      const result = await this.pool.query(`
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
      const result = await this.pool.query(`
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
      const availableModels = provider.available_models || []
      
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

      // Transform to expected format
      const models = availableModels.map((modelId: string) => ({
        id: modelId,
        name: modelId,
        providerType: provider.provider_type,
        contextWindow: modelContextWindows[modelId] || 128000,
        maxTokens: 8192,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        type: 'chat',
        description: `${modelId} with ${(modelContextWindows[modelId] || 128000).toLocaleString()} token context window`,
        configuration: {}
      }))
      
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
    stakeholderTokens: number = 0
  ): Promise<Array<{document: DocumentPriority, compressedContent: string, compressedTokens: number, compressionDetails: any}>> {
    const availableTokens = maxTokens - templateTokens - metadataTokens - stakeholderTokens
    const compressedDocuments: Array<{document: DocumentPriority, compressedContent: string, compressedTokens: number, compressionDetails: any}> = []
    let usedTokens = 0

    logger.info(`Starting individual document compression: ${prioritizedDocuments.length} documents, ${availableTokens.toLocaleString()} available tokens`)

    for (const [index, doc] of prioritizedDocuments.entries()) {
      if (usedTokens >= availableTokens) {
        logger.info(`Context window full after ${index} documents. Used ${usedTokens.toLocaleString()}/${availableTokens.toLocaleString()} tokens`)
        break
      }

      logger.info(`Compressing document ${index + 1}/${prioritizedDocuments.length}: ${doc.name || doc.title || doc.id}`)

      // Get document content from database
      const docResult = await this.pool.query(
        'SELECT content FROM documents WHERE id = $1',
        [doc.id]
      )

      if (docResult.rows.length === 0) {
        logger.warn(`Document not found in database: ${doc.id}`)
        continue
      }

      const content = docResult.rows[0].content
      if (!content) {
        logger.warn(`Document has no content: ${doc.id}`)
        continue
      }

      // Calculate target tokens for this document
      const originalTokens = this.estimateTokenCount(content)
      const targetTokens = Math.ceil(originalTokens * compressionLevel)
      
      logger.info(`Document ${index + 1}: ${originalTokens.toLocaleString()} tokens → target ${targetTokens.toLocaleString()} tokens (${(compressionLevel * 100).toFixed(0)}%)`)

      // Enhanced compression with template context
      const compressionOptions: DocumentCompressionOptions = {
        compressionLevel,
        preserveStructure: true,
        preserveKeywords: true,
        method: compressionMethod as 'truncate' | 'summarize' | 'smart' | 'keyword',
        templateContext: templateContext
      }

      try {
        const compressed = await documentCompressionService.compressDocument(content, compressionOptions)
        
        // Check if compressed document fits in remaining space
        if (usedTokens + compressed.compressedTokens <= availableTokens) {
          compressedDocuments.push({
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
          })
          usedTokens += compressed.compressedTokens
          
          logger.info(`✅ Document ${index + 1} compressed successfully: ${compressed.compressedTokens.toLocaleString()} tokens (${(compressed.compressionRatio * 100).toFixed(1)}% of original)`)
        } else {
          // Try with higher compression to fit in remaining space
          const remainingTokens = availableTokens - usedTokens
          const higherCompression = Math.max(0.1, remainingTokens / originalTokens)
          
          if (higherCompression >= 0.1) {
            logger.info(`Trying higher compression for document ${index + 1}: ${(higherCompression * 100).toFixed(0)}% to fit ${remainingTokens.toLocaleString()} remaining tokens`)
            
            const higherCompressionOptions = {
              ...compressionOptions,
              compressionLevel: higherCompression
            }
            
            const higherCompressed = await documentCompressionService.compressDocument(content, higherCompressionOptions)
            
            compressedDocuments.push({
              document: doc,
              compressedContent: higherCompressed.compressedContent,
              compressedTokens: higherCompressed.compressedTokens,
              compressionDetails: {
                originalTokens,
                compressedTokens: higherCompressed.compressedTokens,
                compressionRatio: higherCompressed.compressionRatio,
                method: higherCompressed.method,
                targetTokens: Math.ceil(originalTokens * higherCompression),
                actualCompression: (higherCompressed.compressedTokens / originalTokens * 100).toFixed(1) + '%',
                note: 'Higher compression applied to fit context window'
              }
            })
            usedTokens += higherCompressed.compressedTokens
            
            logger.info(`✅ Document ${index + 1} compressed with higher compression: ${higherCompressed.compressedTokens.toLocaleString()} tokens (${(higherCompressed.compressionRatio * 100).toFixed(1)}% of original)`)
          } else {
            logger.warn(`❌ Document ${index + 1} too large to fit in remaining context window: ${originalTokens.toLocaleString()} tokens, only ${remainingTokens.toLocaleString()} tokens available`)
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to compress document ${index + 1}: ${error.message}`)
        // Continue with next document
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
      const templateResult = await this.pool.query(
        'SELECT name, description, content, LENGTH(content::text) as content_length FROM templates WHERE id = $1',
        [templateId]
      )
      const projectResult = await this.pool.query(
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
          status: 'pending',
          tokens: 0
        },
        {
          id: 2,
          name: 'Project Information Extraction',
          description: 'Extracting project metadata and context',
          status: 'pending',
          tokens: 0
        },
        ...(config.includeStakeholders ? [{
          id: 2.5,
          name: 'Stakeholder Information Extraction',
          description: 'Extracting project stakeholder information',
          status: 'pending',
          tokens: 0
        }] : []),
        {
          id: 3,
          name: 'Document Prioritization',
          description: 'Prioritizing documents by relevance and importance',
          status: 'pending',
          tokens: 0
        },
        {
          id: 4,
          name: 'AI Document Compression',
          description: `Compressing documents using ${config.compressionMethod} method at ${(config.compressionLevel * 100).toFixed(0)}%`,
          status: 'pending',
          tokens: 0
        },
        {
          id: 5,
          name: 'Context Window Optimization',
          description: 'Optimizing content for 2M+ token context window',
          status: 'pending',
          tokens: 0
        },
        {
          id: 6,
          name: 'Content Injection',
          description: 'Injecting prioritized content into template',
          status: 'pending',
          tokens: 0
        },
        {
          id: 7,
          name: 'AI Document Generation',
          description: 'Generating final document using AI provider',
          status: 'pending',
          tokens: 0
        },
        {
          id: 8,
          name: 'Quality Validation',
          description: 'Validating output quality and completeness',
          status: 'pending',
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
      
      const templateResult = await this.pool.query(
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
      
      const projectResult = await this.pool.query(
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
        
        const stakeholderResult = await this.pool.query(
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
        step3Context += `${index + 1}. ${doc.name || doc.title || `Document ${doc.id}`}\n`
        step3Context += `   - Priority Score: ${(doc.priorityScore * 100).toFixed(1)}%\n`
        step3Context += `   - Estimated Tokens: ${doc.estimatedTokens.toLocaleString()}\n`
        step3Context += `   - Type: ${doc.type || 'Unknown'}\n\n`
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
        stakeholderTokens
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
          step4Context += `**${index + 1}. ${doc.document.name || doc.document.title || `Document ${doc.document.id}`}** ✓\n`
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
          name: doc.document.name || doc.document.title || `Document ${index + 1}`,
          id: doc.document.id,
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
      
      // Generate the actual document using AI
      const aiGeneratedDocument = await this.generateDocumentWithAI(injectedContent, template, config)
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
      
      // Save the final document to the project
      const savedDocument = await this.saveGeneratedDocument(
        aiGeneratedDocument,
        config,
        template,
        project,
        compressedDocuments
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
        currentStep.status = 'failed'
        currentStep.description = `Failed: ${error.message}`
      }
      throw error
    }
  }

  /**
   * Generate document using AI provider with the built context
   */
  private async generateDocumentWithAI(contextContent: string, template: any, config: WorkflowConfiguration): Promise<string> {
    try {
      // Import aiService dynamically to avoid circular dependencies
      const { aiService } = await import('./aiService')
      
      // Get the first available active AI provider with its type
      const activeProviderResult = await this.pool.query(
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
          modelName = 'claude-3-5-sonnet-20241022'
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
        max_tokens: 4000, // Reasonable output length
        system_prompt: template.system_prompt || 'You are an expert document generator. Create a comprehensive, well-structured document based on the provided context and template requirements.'
      }
      
      logger.info(`Generating document using AI provider: ${activeProvider} (${providerType})`)
      logger.info(`Using model: ${modelName}`)
      logger.info(`Context content length: ${contextContent.length} characters`)
      
      // Generate the document
      const response = await aiService.generate(aiRequest)
      
      if (!response.content) {
        throw new Error(`AI generation failed: No content returned`)
      }
      
      logger.info(`AI document generation completed successfully`)
      return response.content
      
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
    compressedDocuments: any[]
  ): Promise<{id: string, name: string}> {
    try {
      // Generate document name based on template and timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const documentName = `${template.name} - Generated ${timestamp}`
      
      // Create document metadata
      const metadata = {
        generatedBy: 'Process Flow Workflow',
        templateId: config.templateId,
        templateName: template.name,
        compressionMethod: config.compressionMethod,
        compressionLevel: config.compressionLevel,
        priorityStrategy: config.priorityStrategy,
        sourceDocuments: compressedDocuments.map(doc => ({
          id: doc.document.documentId,
          name: doc.document.name,
          originalTokens: doc.document.estimatedTokens,
          compressedTokens: doc.compressedTokens
        })),
        generatedAt: new Date().toISOString(),
        totalTokens: Math.ceil(finalContent.length / 4)
      }
      
      // Insert document into database
      const result = await this.pool.query(`
        INSERT INTO documents (
          id, 
          name, 
          content, 
          project_id, 
          template_id, 
          status, 
          framework, 
          metadata,
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
          NOW(), 
          NOW()
        ) RETURNING id, name
      `, [
        documentName,
        finalContent,
        config.projectId,
        config.templateId,
        project.framework || 'ADPA',
        JSON.stringify(metadata)
      ])
      
      const savedDocument = result.rows[0]
      
      logger.info(`Document saved successfully: ${savedDocument.name} (ID: ${savedDocument.id})`)
      
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
    if (daysDiff <= 7) return 0.9 + (Math.random() * 0.1)
    if (daysDiff <= 30) return 0.7 + (Math.random() * 0.2)
    if (daysDiff <= 90) return 0.5 + (Math.random() * 0.2)
    if (daysDiff <= 365) return 0.3 + (Math.random() * 0.2)
    return 0.1 + (Math.random() * 0.2)
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
    score += (Math.random() - 0.5) * 0.15
    
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
