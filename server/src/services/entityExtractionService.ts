/**
 * Enhanced Entity Extraction Service
 * Extracts and stores entities in the new entity_extractions table
 * Supports all 10 core entity types with confidence scoring and relationships
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { aiCacheService } from './aiCacheService'
import { v4 as uuidv4 } from 'uuid'

export type EntityType = string

export interface ExtractedEntity {
  id?: string
  entity_type: EntityType
  entity_name: string
  entity_data: Record<string, any>
  extraction_confidence?: number
  related_entity_ids?: string[]
  source_document_id?: string
  extraction_method?: 'ai' | 'manual' | 'import'
  ai_provider?: string
  ai_model?: string
  source_documents?: Array<{ id: string; title: string }>
  status?: string // 'active', 'pending_review', 'deleted', etc.
}

export interface ExtractionOptions {
  aiProvider?: string
  aiModel?: string
  includeRelationships?: boolean
  minConfidence?: number
  documentIds?: string[]
}

export interface ExtractionResult {
  entities: ExtractedEntity[]
  totalExtracted: number
  byType: Record<EntityType, number>
  averageConfidence: number
  extractionJobId?: string
}

export class EntityExtractionService {
  /**
   * Extract entities from a document
   */
  async extractFromDocument(
    documentId: string,
    projectId: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    try {
      logger.info('🔍 Starting entity extraction from document', { documentId, projectId })

      // Get document content
      const docResult = await pool.query(
        `SELECT id, name, content, project_id FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
      )

      if (docResult.rows.length === 0) {
        throw new Error(`Document not found: ${documentId}`)
      }

      const document = docResult.rows[0]

      // Extract entities using AI
      const extractedEntities = await this.extractEntitiesWithAI(
        document.content,
        documentId,
        projectId,
        options
      )

      // Store entities in database
      const storedEntities = await this.storeEntities(
        extractedEntities,
        projectId,
        documentId,
        options
      )

      // Extract relationships
      // await this.extractRelationships(storedEntities, projectId)

      const result: ExtractionResult = {
        entities: storedEntities,
        totalExtracted: storedEntities.length,
        byType: this.countByType(storedEntities),
        averageConfidence: this.calculateAverageConfidence(storedEntities)
      }

      logger.info('✅ Entity extraction completed', {
        documentId,
        totalEntities: result.totalExtracted,
        byType: result.byType
      })

      return result
    } catch (error: any) {
      logger.error('❌ Entity extraction failed', {
        documentId,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  /**
   * Extract entities from multiple documents in a project
   */
  async extractFromProject(
    projectId: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    try {
      logger.info('🔍 Starting entity extraction from project', { projectId })

      // Get all documents for the project
      let query = `
        SELECT id, name, content 
        FROM documents 
        WHERE project_id = $1 AND deleted_at IS NULL AND parent_document_id IS NULL
      `
      const params: any[] = [projectId]

      if (options.documentIds && options.documentIds.length > 0) {
        query += ` AND id = ANY($2::uuid[])`
        params.push(options.documentIds)
      }

      const docResult = await pool.query(query, params)
      const documents = docResult.rows

      if (documents.length === 0) {
        logger.warn('⚠️ No documents found for project', { projectId })
        return {
          entities: [],
          totalExtracted: 0,
          byType: {} as Record<EntityType, number>,
          averageConfidence: 0
        }
      }

      // Extract entities from all documents
      const allEntities: ExtractedEntity[] = []
      
      for (const document of documents) {
        try {
          const result = await this.extractFromDocument(document.id, projectId, options)
          allEntities.push(...result.entities)
        } catch (error: any) {
          logger.warn('⚠️ Failed to extract from document', {
            documentId: document.id,
            error: error.message
          })
          // Continue with other documents
        }
      }

      return {
        entities: allEntities,
        totalExtracted: allEntities.length,
        byType: this.countByType(allEntities),
        averageConfidence: this.calculateAverageConfidence(allEntities)
      }
    } catch (error: any) {
      logger.error('❌ Project entity extraction failed', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get the best available AI provider for extraction
   * Uses built-in provider selection with fallback logic
   */
  private async getBestAIProviderAndModel(
    requestedProvider?: string,
    requestedModel?: string
  ): Promise<{ provider: string; model?: string }> {
    try {
      // If provider is explicitly requested, use it (model will be validated by AI service)
      if (requestedProvider) {
        logger.info(`[ENTITY-EXTRACTION] Using requested provider: ${requestedProvider}`, {
          requestedModel: requestedModel || 'auto-select'
        })
        return { provider: requestedProvider, model: requestedModel }
      }
      
      // No provider specified - use AI service's centralized fallback mechanism
      // Get available providers (includes is_active flag)
      const availableProviders = await aiService.getAvailableProviders()
      const activeProviders = availableProviders.filter(p => p.is_active)
      
      if (activeProviders.length === 0) {
        logger.warn('[ENTITY-EXTRACTION] No active AI providers configured in database, using local fallback provider', {
          fallbackProvider: 'ollama'
        })
        return { provider: 'ollama', model: requestedModel }
      }
      
      // Use first active provider - let AI service handle model selection
      const selectedProvider = activeProviders[0]
      logger.info(`[ENTITY-EXTRACTION] Auto-selected provider: ${selectedProvider.type}`, {
        providerName: selectedProvider.name,
        defaultModel: selectedProvider.default_model || 'auto-select',
        note: 'Model selection/validation handled by AI service fallback mechanism'
      })
      
      // Pass default_model if available, otherwise let AI service select
      return { 
        provider: selectedProvider.type, 
        model: selectedProvider.default_model || requestedModel 
      }
    } catch (error) {
      logger.error('[ENTITY-EXTRACTION] Error selecting AI provider:', error)
      // Fallback to local provider if selection fails
      return { provider: 'ollama', model: requestedModel }
    }
  }

  /**
   * Extract entities using AI
   */
  private async extractEntitiesWithAI(
    content: string,
    documentId: string,
    projectId: string,
    options: ExtractionOptions
  ): Promise<ExtractedEntity[]> {
    const prompt = this.buildExtractionPrompt(content)
    
    try {
      // Get best available provider with fallback support
      const { provider: selectedProvider, model: selectedModel } = await this.getBestAIProviderAndModel(
        options.aiProvider,
        options.aiModel
      )

      // Check cache first (use selected provider/model for cache key)
      const cached = await aiCacheService.get(
        projectId,
        content,
        'entity_extraction',
        selectedProvider,
        selectedModel
      )
      
      if (cached) {
        logger.info('📦 Using cached entity extraction', { documentId, projectId, provider: selectedProvider })
        return cached as ExtractedEntity[]
      }

      // Use generateWithFallback for automatic provider failover
      // This will try the selected provider first, then fall back to other active providers
      const response = await aiService.generateWithFallback({
        prompt,
        provider: selectedProvider,
        model: selectedModel,
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 4000
      })

      // Use the provider that was actually used (may differ from selected if fallback occurred)
      const providerUsed = response.providerUsed || selectedProvider
      const modelUsed = selectedModel // Model is validated by AI service

      // Parse AI response
      const entities = this.parseAIResponse(response.content, documentId, options)

      // Cache the result using the provider/model that was actually used
      await aiCacheService.set(
        projectId,
        content,
        'entity_extraction',
        entities,
        providerUsed,
        modelUsed,
        undefined, // correlationId
        3600 * 24 // Cache for 24 hours
      )

      logger.info('✅ Entity extraction completed', {
        documentId,
        projectId,
        providerUsed,
        entityCount: entities.length
      })

      return entities
    } catch (error: any) {
      logger.error('❌ AI extraction failed', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Normalize entity type to lowercase and handle common variations
   */
  private normalizeEntityType(type: string): EntityType | null {
    if (!type) return null
    
    const normalized = type.toLowerCase().trim()
    
    // Singularize plural form for consistency
    const map: Record<string, string> = {
      'stakeholders': 'stakeholder',
      'deliverables': 'deliverable',
      'milestones': 'milestone',
      'risks': 'risk',
      'requirements': 'requirement',
      'activities': 'activity',
      'assumptions': 'assumption',
      'constraints': 'constraint',
      'dependencies': 'dependency',
      'resources': 'resource',
      'scope_items': 'scope_item',
      'success_criteria': 'success_criteria',
      'opportunities': 'opportunity',
      'work_items': 'work_item'
    }
    
    if (map[normalized]) {
      return map[normalized]
    }
    
    // Generic fallback: if it ends with 's' and is not 'success_criteria' or already handled, strip trailing 's'
    if (normalized.endsWith('s') && normalized !== 'success_criteria' && normalized !== 'business_case_details') {
      return normalized.slice(0, -1)
    }
    
    return normalized
  }

  /**
   * Build extraction prompt for AI
   */
  private buildExtractionPrompt(content: string): string {
    return `Extract all project entities from the following document. Return a JSON array with entities of these types (use lowercase for entity_type):

1. **stakeholder** (use lowercase): People or organizations involved in the project
   - name, role, organization, influence (high/medium/low), interest (high/medium/low), responsibilities, contact_info

2. **deliverable** (use lowercase): Tangible outputs of the project
   - name, description, due_date, owner, status, dependencies, acceptance_criteria

3. **milestone** (use lowercase): Key project milestones
   - name, description, due_date, status, deliverables, dependencies

4. **risk** (use lowercase): Potential problems or threats
   - description, category, probability (high/medium/low), impact (high/medium/low), mitigation_strategy, owner

5. **requirement** (use lowercase): Project requirements
   - title, description, type (functional/non-functional/business/technical), priority, status, acceptance_criteria

6. **activity** (use lowercase): Tasks or work items
   - description, duration, resources, dependencies, start_date, end_date

7. **assumption** (use lowercase): Project assumptions
   - assumption, validation_status, impact_if_wrong

8. **constraint** (use lowercase): Project limitations
   - title, description, type (scope/time/cost/quality/resource/technical/regulatory), severity

9. **dependency** (use lowercase): Internal and external dependencies
   - description, type (internal/external), dependency_on, criticality

10. **resource** (use lowercase): Team members, skills, allocation
    - name, role, skills, allocation_percentage, availability

For each entity, provide:
- entity_type: one of the 10 types above (MUST be lowercase: stakeholder, deliverable, milestone, risk, requirement, activity, assumption, constraint, dependency, resource)
- entity_name: a short name/identifier
- entity_data: full entity details as JSON object
- confidence: your confidence in the extraction (0-100)

Return ONLY valid JSON array, no markdown, no explanations.

Document content:
${content.substring(0, 15000)}` // Limit content to avoid token limits
  }

  /**
   * Parse AI response into entities
   */
  private parseAIResponse(
    aiContent: string,
    documentId: string,
    options: ExtractionOptions
  ): ExtractedEntity[] {
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleaned = aiContent.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }

      const parsed = JSON.parse(cleaned)
      
      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array')
      }

      const entities: ExtractedEntity[] = []

      for (const item of parsed) {
        if (!item.entity_type || !item.entity_name || !item.entity_data) {
          logger.warn('⚠️ Skipping invalid entity', { item })
          continue
        }

        // Normalize entity type to lowercase and handle common variations
        const normalizedType = this.normalizeEntityType(item.entity_type)
        
        if (!normalizedType) {
          logger.warn('⚠️ Invalid entity type', { type: item.entity_type })
          continue
        }



        // Filter by minimum confidence if specified
        const confidence = item.confidence || item.extraction_confidence || 50
        if (options.minConfidence && confidence < options.minConfidence) {
          continue
        }

        entities.push({
          entity_type: normalizedType,
          entity_name: item.entity_name,
          entity_data: item.entity_data,
          extraction_confidence: confidence,
          source_document_id: documentId,
          extraction_method: 'ai',
          related_entity_ids: item.related_entity_ids || []
        })
      }

      return entities
    } catch (error: any) {
      logger.error('❌ Failed to parse AI response', {
        error: error.message,
        content: aiContent.substring(0, 500)
      })
      throw new Error(`Failed to parse AI extraction response: ${error.message}`)
    }
  }

  /**
   * Determine if entity should be auto-verified based on confidence score
   */
  private shouldAutoVerify(confidence: number): boolean {
    // Auto-verify entities with high confidence (>= 80)
    return confidence >= 80
  }

  /**
   * Determine if entity requires confirmation before verification
   */
  private requiresConfirmation(confidence: number): boolean {
    // Require confirmation for low/very low confidence (< 50)
    return confidence < 50
  }

  /**
   * Store extracted entities in database
   */
  public async storeEntities(
    entities: ExtractedEntity[],
    projectId: string,
    documentId: string,
    options: ExtractionOptions
  ): Promise<ExtractedEntity[]> {
    const storedEntities: ExtractedEntity[] = []

    for (const entity of entities) {
      try {
        const confidence = entity.extraction_confidence || 50
        const isVerified = this.shouldAutoVerify(confidence)
        const entityName = entity.entity_name ? entity.entity_name.trim() : 'Unnamed Entity'
        const entityType = entity.entity_type


        
        // Aggressive normalization for deduplication (matches what we tell the LLM)
        const normalizedInputName = entityName
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Check if entity with same type and name already exists in project
        // We use a flexible SQL check for common variations
        const existingResult = await pool.query(
          `SELECT id, entity_name, entity_data, extraction_confidence, document_id, is_verified 
           FROM entity_extractions 
           WHERE project_id = $1 
           AND entity_type = $2 
           AND status != 'deleted'
           AND (
             LOWER(entity_name) = LOWER($3)
             OR regexp_replace(LOWER(entity_name), '[^\\w\\s]', '', 'g') = $4
           )
           LIMIT 1`,
          [projectId, entityType, entityName, normalizedInputName]
        )


        let entityId: string
        
        if (existingResult.rows.length > 0) {
          // Entity exists - deduplicate and merge
          const existingRow = existingResult.rows[0]
          entityId = existingRow.id
          
          const existingData = typeof existingRow.entity_data === 'string'
            ? JSON.parse(existingRow.entity_data)
            : existingRow.entity_data || {}
            
          // Merge entity_data properties
          const mergedData = {
            ...existingData,
            ...entity.entity_data
          }
          
          // Deduplicate and merge source_document_ids
          const existingDocIds = existingData.source_document_ids || 
            (existingRow.document_id ? [existingRow.document_id] : [])
          
          const sourceDocumentIds = Array.from(new Set([...existingDocIds, documentId]))
          mergedData.source_document_ids = sourceDocumentIds
          
          // Keep max confidence
          const mergedConfidence = Math.max(
            existingRow.extraction_confidence || 50,
            confidence
          )
          
          // Kept verified if either was verified
          const mergedVerified = existingRow.is_verified || isVerified
          
          await pool.query(
            `UPDATE entity_extractions 
             SET entity_data = $1, 
                 extraction_confidence = $2, 
                 is_verified = $3, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
              JSON.stringify(mergedData),
              mergedConfidence,
              mergedVerified,
              entityId
            ]
          )
          
          logger.info('🔄 Merged duplicate entity', {
            entityId,
            entityName,
            entityType,
            sourceDocumentsCount: sourceDocumentIds.length
          })
        } else {
          // New entity - insert it
          entityId = uuidv4()
          
          // Add source_document_ids array to entity_data
          const entityData = {
            ...entity.entity_data,
            source_document_ids: [documentId]
          }
          
          const result = await pool.query(
            `INSERT INTO entity_extractions (
              id, project_id, document_id, entity_type, entity_data, entity_name,
              extraction_confidence, extraction_method, ai_provider, ai_model,
              related_entity_ids, status, is_verified, verified_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
            RETURNING id, entity_type, entity_name, extraction_confidence, created_at`,
            [
              entityId,
              projectId,
              documentId,
              entityType,
              JSON.stringify(entityData),
              entityName,
              confidence,
              entity.extraction_method || 'ai',
              options.aiProvider || 'openai',
              options.aiModel || 'gpt-4',
              entity.related_entity_ids || [],
              entity.status || 'active',
              isVerified,
              isVerified ? new Date() : null
            ]
          )
          
          if (isVerified) {
            logger.info('✅ Auto-verified high confidence entity', {
              entityId,
              entityName,
              confidence
            })
          }
        }

        storedEntities.push({
          ...entity,
          id: entityId
        })
      } catch (error: any) {
        logger.error('❌ Failed to store entity', {
          entity_type: entity.entity_type,
          entity_name: entity.entity_name,
          error: error.message
        })
      }
    }

    // Recompute document entity counts and update template profile
    if (documentId && storedEntities.length > 0) {
      try {
        const { default: DocumentPurposeService } = await import('./documentPurposeService')
        const { default: TemplateAnalyticsService } = await import('./templateAnalyticsService')
        const { documentTemplateService } = await import('../modules/documentTemplates/service')

        // 1. Rebuild all document entity counts & inferred domains in the project
        logger.info(`[ENTITY-EXTRACTION] Rebuilding document purposes for project ${projectId}`)
        await DocumentPurposeService.rebuildForProject(projectId)

        // 2. If the document has a template, update template stats and profile
        const docRes = await pool.query(
          `SELECT template_id FROM documents WHERE id = $1 AND deleted_at IS NULL`,
          [documentId]
        )
        const templateId = docRes.rows[0]?.template_id

        if (templateId) {
          // Get the newly calculated entity_counts for this document from the database
          const updatedDocRes = await pool.query(
            `SELECT entity_counts FROM documents WHERE id = $1`,
            [documentId]
          )
          const docCounts = updatedDocRes.rows[0]?.entity_counts || {}

          // Remove 'total' field from stats map
          const statsCounts = { ...docCounts }
          delete statsCounts.total

          logger.info(`[ENTITY-EXTRACTION] Updating template feedback loop stats for template ${templateId}`, { statsCounts })
          await documentTemplateService.updateTemplateEntityStats(templateId, statsCounts)

          logger.info(`[ENTITY-EXTRACTION] Updating template entity profile for template ${templateId}`)
          await TemplateAnalyticsService.updateTemplateEntityProfile(templateId)
        }
      } catch (err: any) {
        logger.error('[ENTITY-EXTRACTION] Failed to update template entity profile / document purpose:', {
          error: err.message,
          stack: err.stack
        })
      }
    }

    return storedEntities
  }

  /**
   * Get entities for a project
   */
  async getProjectEntities(
    projectId: string,
    filters?: {
      entityType?: EntityType
      documentId?: string
      minConfidence?: number
      status?: 'active' | 'superseded' | 'deleted'
    }
  ): Promise<ExtractedEntity[]> {
    try {
      let query = `
        SELECT 
          id, project_id, document_id, entity_type, entity_data, entity_name,
          extraction_confidence, extraction_method, ai_provider, ai_model,
          related_entity_ids, status, created_at, updated_at
        FROM entity_extractions
        WHERE project_id = $1
      `
      const params: any[] = [projectId]

      if (filters?.entityType) {
        query += ` AND entity_type = $${params.length + 1}`
        params.push(filters.entityType)
      }

      if (filters?.documentId) {
        query += ` AND document_id = $${params.length + 1}`
        params.push(filters.documentId)
      }

      if (filters?.minConfidence) {
        query += ` AND extraction_confidence >= $${params.length + 1}`
        params.push(filters.minConfidence)
      }

      if (filters?.status) {
        query += ` AND status = $${params.length + 1}`
        params.push(filters.status)
      } else {
        query += ` AND status != 'deleted'`
      }

      query += ` ORDER BY created_at DESC`

      const result = await pool.query(query, params)

      return result.rows.map(row => ({
        id: row.id,
        entity_type: row.entity_type,
        entity_name: row.entity_name,
        entity_data: typeof row.entity_data === 'string' 
          ? JSON.parse(row.entity_data) 
          : row.entity_data,
        extraction_confidence: row.extraction_confidence,
        extraction_method: row.extraction_method,
        ai_provider: row.ai_provider,
        ai_model: row.ai_model,
        related_entity_ids: row.related_entity_ids || [],
        source_document_id: row.document_id
      }))
    } catch (error: any) {
      logger.error('❌ Failed to get project entities', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  async getEntityById(entityId: string): Promise<ExtractedEntity | null> {
    try {
      const result = await pool.query(
        `SELECT 
          id, project_id, document_id, entity_type, entity_data, entity_name,
          extraction_confidence, extraction_method, ai_provider, ai_model,
          related_entity_ids, status, created_at, updated_at
        FROM entity_extractions
        WHERE id = $1 AND status != 'deleted'
        `,
        [entityId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      const entityData = typeof row.entity_data === 'string' 
        ? JSON.parse(row.entity_data) 
        : row.entity_data || {}

      // Resolve multiple source documents
      let sourceDocuments: Array<{ id: string; title: string }> = []
      const sourceDocumentIds = entityData.source_document_ids || 
        (row.document_id ? [row.document_id] : [])

      if (sourceDocumentIds && sourceDocumentIds.length > 0) {
        try {
          const docsResult = await pool.query(
            `SELECT id, name as title FROM documents WHERE id = ANY($1::uuid[])`,
            [sourceDocumentIds]
          )
          sourceDocuments = docsResult.rows
        } catch (docError) {
          logger.warn(`Failed to fetch source documents for entity ${entityId}:`, docError)
        }
      }

      return {
        id: row.id,
        entity_type: row.entity_type,
        entity_name: row.entity_name,
        entity_data: entityData,
        extraction_confidence: row.extraction_confidence,
        extraction_method: row.extraction_method,
        ai_provider: row.ai_provider,
        ai_model: row.ai_model,
        related_entity_ids: row.related_entity_ids || [],
        source_document_id: row.document_id,
        source_documents: sourceDocuments as any
      }
    } catch (error: any) {
      logger.error('❌ Failed to get entity', {
        entityId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update entity verification status
   */
  async verifyEntity(entityId: string, userId: string, verified: boolean = true): Promise<void> {
    try {
      await pool.query(
        `UPDATE entity_extractions 
         SET is_verified = $1, verified_at = CURRENT_TIMESTAMP, verified_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
        `,
        [verified, userId, entityId]
      )

      logger.info('✅ Entity verification updated', { entityId, verified, userId })
    } catch (error: any) {
      logger.error('❌ Failed to verify entity', {
        entityId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Delete entity (soft delete)
   */
  async deleteEntity(entityId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE entity_extractions 
         SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
        `,
        [entityId]
      )

      logger.info('✅ Entity deleted', { entityId })
    } catch (error: any) {
      logger.error('❌ Failed to delete entity', {
        entityId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Helper: Count entities by type
   */
  private countByType(entities: ExtractedEntity[]): Record<EntityType, number> {
    const counts: Record<string, number> = {}
    
    for (const entity of entities) {
      counts[entity.entity_type] = (counts[entity.entity_type] || 0) + 1
    }

    return counts as Record<EntityType, number>
  }

  /**
   * Helper: Calculate average confidence
   */
  private calculateAverageConfidence(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0

    const total = entities.reduce((sum, e) => sum + (e.extraction_confidence || 50), 0)
    return Math.round(total / entities.length)
  }

  /**
   * Helper: Hash content for cache key
   */
  private hashContent(content: string): string {
    // Simple hash function
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

export const entityExtractionService = new EntityExtractionService()

