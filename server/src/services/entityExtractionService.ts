/**
 * Enhanced Entity Extraction Service
 * Extracts and stores entities in the new entity_extractions table
 * Supports all 10 core entity types with confidence scoring and relationships
 * Phase 1-3: Immutable audit trail with cryptographic signing integrated
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { aiCacheService } from './aiCacheService'
import { entityAuditService } from './entityAuditService'
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

    // Fetch matching context
    let contextEntities: any[] = [];
    try {
      const activeRes = await pool.query(
        `SELECT id, entity_name, entity_type, entity_data, extraction_confidence, status, document_id
         FROM entity_extractions
         WHERE project_id = $1 AND status = 'active'`,
        [projectId]
      );
      
      const docMetaRes = await pool.query(
        `SELECT generation_metadata FROM documents WHERE id = $1 AND deleted_at IS NULL`,
        [documentId]
      );
      const genMeta = docMetaRes.rows[0]?.generation_metadata;
      const genMetaObj = typeof genMeta === 'string' ? JSON.parse(genMeta) : (genMeta || {});
      const sourceDocs = genMetaObj.source_documents || [];
      const sourceDocIds = new Set<string>(
        sourceDocs.map((d: any) => typeof d === 'string' ? d : d.id).filter(Boolean)
      );

      if (sourceDocIds.size > 0) {
        contextEntities = activeRes.rows.filter(row => {
          const entityData = typeof row.entity_data === 'string' ? JSON.parse(row.entity_data) : (row.entity_data || {});
          const docIds = entityData.source_document_ids || (row.document_id ? [row.document_id] : []);
          return docIds.some((id: string) => sourceDocIds.has(id));
        });
      } else {
        contextEntities = activeRes.rows.filter(row => {
          const entityData = typeof row.entity_data === 'string' ? JSON.parse(row.entity_data) : (row.entity_data || {});
          const docIds = entityData.source_document_ids || (row.document_id ? [row.document_id] : []);
          return !docIds.includes(documentId);
        });
      }
    } catch (err: any) {
      logger.warn('⚠️ Failed to load matching context for entities', { error: err.message });
    }

    for (const entity of entities) {
      try {
        const confidence = entity.extraction_confidence || 50
        const isVerified = this.shouldAutoVerify(confidence)
        const entityName = entity.entity_name ? entity.entity_name.trim() : 'Unnamed Entity'
        const entityType = entity.entity_type

        // Find best fuzzy match in context
        let bestMatch: any = { isMatch: false, score: 0, method: 'none' };
        let bestMatchEntity: any = null;

        const sameTypeContext = contextEntities.filter(e => e.entity_type === entityType);
        for (const contextEnt of sameTypeContext) {
          const matchResult = areEntitiesFuzzyMatch(entityName, contextEnt.entity_name);
          if (matchResult.isMatch && matchResult.score > bestMatch.score) {
            bestMatch = matchResult;
            bestMatchEntity = contextEnt;
          }
        }

        const contextMatch = {
          is_match: bestMatch.isMatch,
          score: bestMatch.score,
          method: bestMatch.method,
          matched_context_entity: bestMatchEntity ? {
            id: bestMatchEntity.id,
            name: bestMatchEntity.entity_name
          } : null
        };
        
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
          
          // Load full row for audit trail snapshot (existingResult selects only a subset)
          const fullRowRes = await pool.query(`SELECT * FROM entity_extractions WHERE id = $1`, [existingRow.id])
          const fullRow = fullRowRes.rows[0] || existingRow
          
          const existingData = typeof fullRow.entity_data === 'string'
            ? JSON.parse(fullRow.entity_data)
            : fullRow.entity_data || {}
          
          // Get current state for audit trail
          const existingFullState = {
            id: fullRow.id,
            project_id: fullRow.project_id,
            document_id: fullRow.document_id,
            entity_type: fullRow.entity_type,
            entity_data: existingData,
            entity_name: fullRow.entity_name,
            extraction_confidence: fullRow.extraction_confidence || 50,
            extraction_method: fullRow.extraction_method,
            ai_provider: fullRow.ai_provider,
            ai_model: fullRow.ai_model,
            related_entity_ids: fullRow.related_entity_ids || [],
            status: fullRow.status || 'active',
            is_verified: fullRow.is_verified || false,
            verified_at: fullRow.verified_at,
            created_at: fullRow.created_at
          };
            
          // Merge entity_data properties
          const mergedData = {
            ...existingData,
            ...entity.entity_data,
            context_match: contextMatch
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
          
          // Build new state for audit trail
          const newFullState = {
            ...existingFullState,
            entity_data: mergedData,
            extraction_confidence: mergedConfidence,
            is_verified: mergedVerified,
            updated_at: new Date().toISOString()
          };
          
          // Record update in audit trail BEFORE applying changes
          try {
            await entityAuditService.recordUpdate(
              entityId,
              existingFullState,
              newFullState,
              'system'
            );
            logger.info('📝 Recorded entity update in audit trail', { entityId });
          } catch (auditErr: any) {
            logger.error('⚠️ Failed to record update audit for entity', {
              entityId,
              error: auditErr.message
            });
          }
          
          // Reactivate if retired and regaining references
          const shouldReactivate = existingRow.status === 'retired' && 
            (existingDocIds.length === 0 || existingRow.document_id === null);
          
          const statusToSet = shouldReactivate ? 'active' : existingRow.status;
          
          await pool.query(
            `UPDATE entity_extractions 
             SET entity_data = $1, 
                 extraction_confidence = $2, 
                 is_verified = $3,
                 status = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [
              JSON.stringify(mergedData),
              mergedConfidence,
              mergedVerified,
              statusToSet,
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
          
          // Add source_document_ids array and context_match to entity_data
          const entityData = {
            ...entity.entity_data,
            source_document_ids: [documentId],
            context_match: contextMatch
          }
          
          // Create full entity object for audit trail
          const fullEntityForAudit = {
            id: entityId,
            project_id: projectId,
            document_id: documentId,
            entity_type: entityType,
            entity_data: entityData,
            entity_name: entityName,
            extraction_confidence: confidence,
            extraction_method: entity.extraction_method || 'ai',
            ai_provider: options.aiProvider || 'openai',
            ai_model: options.aiModel || 'gpt-4',
            related_entity_ids: entity.related_entity_ids || [],
            status: entity.status || 'active',
            is_verified: isVerified,
            verified_at: isVerified ? new Date().toISOString() : null,
            created_at: new Date().toISOString()
          };
          
          const result = await pool.query(
            `INSERT INTO entity_extractions (
               id, project_id, document_id, entity_type, entity_data, entity_name,
               extraction_confidence, extraction_method, ai_provider, ai_model,
               related_entity_ids, status, is_verified, verified_at, created_at,
               current_version, audit_chain_hash
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, 1, NULL)
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
          
          // Record creation in audit trail
          try {
            await entityAuditService.recordCreation(
              entityId,
              fullEntityForAudit,
              'system' // or get from context
            );
            logger.info('📝 Recorded entity creation in audit trail', { entityId });
          } catch (auditErr: any) {
            logger.error('⚠️ Failed to record creation audit for entity', {
              entityId,
              error: auditErr.message
            });
            // Continue - don't fail entity creation due to audit issue
          }
          
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

    // Retirement Loop: Remove documentId from entities previously referencing it but not in storedEntities
    try {
      const storedEntityIds = storedEntities.map(e => e.id).filter(Boolean);
      
      const legacyRes = await pool.query(
        `SELECT id, entity_name, entity_data 
         FROM entity_extractions 
         WHERE project_id = $1 
         AND status = 'active'
         AND (document_id = $2 OR entity_data->'source_document_ids' ? $2)
         AND NOT (id = ANY($3::uuid[]))`,
        [projectId, documentId, storedEntityIds.length > 0 ? storedEntityIds : ['00000000-0000-0000-0000-000000000000']]
      );

      for (const row of legacyRes.rows) {
        const entityData = typeof row.entity_data === 'string' ? JSON.parse(row.entity_data) : (row.entity_data || {});
        let sourceDocIds: string[] = entityData.source_document_ids || [];
        
        // Get current state for audit trail
        const entityId = row.id;
        const currentState = {
          id: entityId,
          entity_name: row.entity_name,
          entity_data: entityData,
          status: 'active'
        };
        
        sourceDocIds = sourceDocIds.filter(id => id !== documentId);
        
        if (sourceDocIds.length === 0) {
          // Record retirement in audit trail BEFORE applying changes
          try {
            await entityAuditService.recordRetirement(
              entityId,
              currentState,
              'system'
            );
            logger.info(`📝 Recorded retirement audit for entity "${row.entity_name}"`, { entityId });
          } catch (auditErr: any) {
            logger.error('⚠️ Failed to record retirement audit', {
              entityId,
              error: auditErr.message
            });
          }
          
          await pool.query(
            `UPDATE entity_extractions 
             SET status = 'retired', 
                 extraction_confidence = 0,
                 entity_data = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [JSON.stringify({ ...entityData, source_document_ids: [] }), row.id]
          );
          logger.info(`📇 Retired entity "${row.entity_name}" (references dropped to 0)`, { entityId: row.id });
        } else {
          // Record reference removal in audit trail
          try {
            const newState = {
              ...currentState,
              entity_data: { ...entityData, source_document_ids: sourceDocIds }
            };
            await entityAuditService.recordUpdate(
              entityId,
              currentState,
              newState,
              'system'
            );
            logger.info(`📝 Recorded reference removal audit for entity "${row.entity_name}"`, { entityId });
          } catch (auditErr: any) {
            logger.error('⚠️ Failed to record reference removal audit', {
              entityId,
              error: auditErr.message
            });
          }
          
          await pool.query(
            `UPDATE entity_extractions 
             SET entity_data = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [JSON.stringify({ ...entityData, source_document_ids: sourceDocIds }), row.id]
          );
          logger.info(`📎 Removed document reference from entity "${row.entity_name}"`, { entityId: row.id, remainingRefs: sourceDocIds.length });
        }
      }
    } catch (retireErr: any) {
      logger.error('❌ Error in entity retirement loop:', retireErr);
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
   * Handle document deletion by updating document references in entities
   */
  async handleDocumentDeletion(documentId: string, projectId: string): Promise<void> {
    try {
      logger.info('🗑️ Starting entity clean-up for deleted document', { documentId, projectId })
      
      const legacyRes = await pool.query(
        `SELECT id, entity_name, entity_data 
         FROM entity_extractions 
         WHERE project_id = $1 
         AND status = 'active'
         AND (document_id = $2 OR entity_data->'source_document_ids' ? $2)`,
        [projectId, documentId]
      );

      for (const row of legacyRes.rows) {
        const entityData = typeof row.entity_data === 'string' ? JSON.parse(row.entity_data) : (row.entity_data || {});
        let sourceDocIds: string[] = entityData.source_document_ids || [];
        
        // Get current state for audit trail
        const entityId = row.id;
        const currentState = {
          id: entityId,
          entity_name: row.entity_name,
          entity_data: entityData,
          status: 'active'
        };
        
        sourceDocIds = sourceDocIds.filter(id => id !== documentId);
        
        if (sourceDocIds.length === 0) {
          // Record retirement in audit trail BEFORE applying changes
          try {
            await entityAuditService.recordRetirement(
              entityId,
              currentState,
              'system'
            );
            logger.info(`📝 Recorded retirement audit for entity "${row.entity_name}" (document deleted)`, { entityId });
          } catch (auditErr: any) {
            logger.error('⚠️ Failed to record retirement audit on document deletion', {
              entityId,
              error: auditErr.message
            });
          }
          
          await pool.query(
            `UPDATE entity_extractions 
             SET status = 'retired', 
                 extraction_confidence = 0,
                 entity_data = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [JSON.stringify({ ...entityData, source_document_ids: [] }), row.id]
          );
          logger.info(`📇 Retired entity "${row.entity_name}" (document deleted, references dropped to 0)`, { entityId: row.id });
        } else {
          // Record reference removal in audit trail
          try {
            const newState = {
              ...currentState,
              entity_data: { ...entityData, source_document_ids: sourceDocIds }
            };
            await entityAuditService.recordUpdate(
              entityId,
              currentState,
              newState,
              'system'
            );
            logger.info(`📝 Recorded reference removal audit for entity "${row.entity_name}" (document deleted)`, { entityId });
          } catch (auditErr: any) {
            logger.error('⚠️ Failed to record reference removal audit on document deletion', {
              entityId,
              error: auditErr.message
            });
          }
          
          await pool.query(
            `UPDATE entity_extractions 
             SET entity_data = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [JSON.stringify({ ...entityData, source_document_ids: sourceDocIds }), row.id]
          );
          logger.info(`📎 Removed document reference from entity "${row.entity_name}" (document deleted)`, { entityId: row.id, remainingRefs: sourceDocIds.length });
        }
      }
      
      logger.info('✅ Entity clean-up completed for deleted document', { documentId, projectId })
    } catch (error: any) {
      logger.error('❌ Failed to clean up entities for deleted document', {
        documentId,
        projectId,
        error: error.message
      })
      throw error
    }
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

/**
 * Calculate the Jaro-Winkler distance between two strings.
 * Returns a score between 0.0 and 1.0.
 */
export function calculateJaroWinkler(s1: string, s2: string): number {
  s1 = s1.trim().toLowerCase();
  s2 = s2.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(len2 - 1, i + matchWindow);
    
    for (let j = start; j <= end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }
  
  if (matches === 0) return 0.0;
  
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) {
      prefix++;
    } else {
      break;
    }
  }
  
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Perform cascading fuzzy matching between two entity names.
 */
export function areEntitiesFuzzyMatch(
  name1: string,
  name2: string
): { isMatch: boolean; score: number; method: 'exact' | 'normalized' | 'substring' | 'token_overlap' | 'jaro_winkler' | 'none' } {
  const n1 = name1.trim().toLowerCase();
  const n2 = name2.trim().toLowerCase();
  if (!n1 || !n2) {
    return { isMatch: false, score: 0, method: 'none' };
  }

  // 1. Exact Match
  if (n1 === n2) {
    return { isMatch: true, score: 1.0, method: 'exact' };
  }

  // 2. Normalized Match
  const norm1 = n1.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const norm2 = n2.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  if (norm1 === norm2) {
    return { isMatch: true, score: 0.98, method: 'normalized' };
  }

  // 3. Substring Match
  if (norm1.length > 2 && norm2.length > 2) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const shorterLen = Math.min(norm1.length, norm2.length);
      const longerLen = Math.max(norm1.length, norm2.length);
      const score = 0.80 + 0.10 * (shorterLen / longerLen);
      return { isMatch: true, score, method: 'substring' };
    }
  }

  // 4. Token Overlap Match
  const stopWords = new Set(['the', 'of', 'a', 'an', 'for', 'and', 'or', 'in', 'on', 'at', 'to', 'with', 'by', 'about', 'as']);
  const tokens1 = norm1.split(/\s+/).filter(t => t && !stopWords.has(t));
  const tokens2 = norm2.split(/\s+/).filter(t => t && !stopWords.has(t));
  if (tokens1.length > 0 && tokens2.length > 0) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const isSubset1 = tokens1.every(t => set2.has(t));
    const isSubset2 = tokens2.every(t => set1.has(t));
    if (isSubset1 || isSubset2) {
      return { isMatch: true, score: 0.85, method: 'token_overlap' };
    }
  }

  // 5. Jaro-Winkler Typographical Match
  const jwScore = calculateJaroWinkler(norm1, norm2);
  if (jwScore >= 0.82) {
    return { isMatch: true, score: jwScore, method: 'jaro_winkler' };
  }

  return { isMatch: false, score: 0, method: 'none' };
}


