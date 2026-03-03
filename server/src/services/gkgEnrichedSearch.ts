/**
 * GKG-Enriched Search Service
 * 
 * Integrates Graph Knowledge Graph (Neo4j) with semantic search to provide
 * relationship-aware, context-enriched search results.
 * 
 * Features:
 * - Automatically enriches search results with related entities from GKG
 * - Traverses entity relationships (dependencies, impacts, references)
 * - Includes knowledge base recommendations for context
 * - Provides source attribution and confidence scores
 */

import { logger } from '../utils/logger'
import { getNeo4jDriver, isNeo4jConfigured } from '../utils/neo4j'
import type { SearchResult } from './searchService'
import { pool } from '../database/connection'
import { safeQuery } from '../database/helpers'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GKGEnrichedSearchRequest {
  query: string
  types?: string[]
  frameworks?: string[]
  authors?: string[]
  tags?: string[]
  dateRange?: { start?: string; end?: string }
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'title'
  
  // GKG-specific options
  includeRelationships?: boolean        // Include related entities from graph
  relationshipDepth?: number             // How many hops to traverse (1-3)
  relationshipTypes?: string[]           // Filter specific relationships (e.g., "depends_on", "impacts")
  excludeGKGTypes?: string[]             // Entity types to exclude from enrichment
  includeKnowledgeBase?: boolean        // Include knowledge base recommendations
  allowAIClustering?: boolean            // Allow AI to suggest result groupings
}

export interface GKGRelationship {
  type: string                           // "depends_on", "impacts", "owns", "references", etc.
  targetId: string
  targetTitle: string
  targetType: string                     // "Project", "Document", "Task", "Team", etc.
  distance: number                       // Relationship depth (1, 2, 3)
  attributes?: Record<string, any>       // Additional relationship metadata
}

export interface KnowledgeBaseRecommendation {
  entryId: string
  title: string
  entryType: string
  category: string
  description: string
  businessValueScore?: number
  applicabilityScore: number             // 0-1 how applicable to current context
  relevanceReasoning: string             // Why was this recommended
}

export interface GKGMetadata {
  entityType: string                     // Entity type from GKG
  graphId?: string                       // Neo4j node ID
  relationships: GKGRelationship[]
  relatedEntities: SearchResult[]
  knowledgeRecommendations?: KnowledgeBaseRecommendation[]
  aiInsight?: string                     // Optional AI-generated summary
  confidenceScore?: number               // 0-1
}

export interface GKGEnrichedResult extends SearchResult {
  gkgMetadata?: GKGMetadata
}

// ============================================================================
// GKG QUERY BUILDER
// ============================================================================

class GKGQueryBuilder {
  /**
   * Build a Neo4j query to find related entities for a document
   */
  static buildDocumentRelationshipsQuery(documentId: string, depth: number = 2): string {
    return `
      MATCH (doc:Document {id: $documentId})
      MATCH p=(doc)-[rel:*1..${depth}]-(related)
      WHERE type(rel) IN ['REFERENCES', 'REFERENCED_BY', 'RELATED_TO', 'IN_PROJECT', 'CONTAINS']
      RETURN 
        related as entity,
        [r in rel | type(r)] as relationshipPath,
        length(p) as distance
      LIMIT 20
    `
  }

  /**
   * Build a query to find projects impacted by a task change
   */
  static buildImpactChainQuery(taskId: string, depth: number = 3): string {
    return `
      MATCH (task:Task {id: $taskId})
      MATCH p=(task)-[rel:IMPACTS*1..${depth}]-(affected)
      RETURN 
        affected as entity,
        length(p) as distance,
        [r in rel | {type: type(r), impact: r.impact_type}] as relationshipPath
      ORDER BY distance ASC
      LIMIT 20
    `
  }

  /**
   * Find all entities of a specific type related to query entity
   */
  static buildEntityTypeRelationshipsQuery(entityId: string, targetType: string, depth: number = 2): string {
    return `
      MATCH (source)-[*1..${depth}]-(target:${targetType})
      WHERE source.id = $entityId
      RETURN 
        target as entity,
        target.id as entityId,
        target.title as title,
        distance(source, target) as distance
      LIMIT 20
    `
  }

  /**
   * Find all knowledge base entries applicable to an entity
   */
  static buildKnowledgeBaseQueryForEntity(entityType: string, projectId?: string): string {
    const frameworkJoin = projectId 
      ? `MATCH (proj:Project {id: $projectId})-[:USES_FRAMEWORK]->(f:Framework)`
      : `MATCH (entity)-[:RELATED_TO_FRAMEWORK]->(f:Framework)`

    return `
      MATCH (entity:${entityType} {id: $entityId})
      ${frameworkJoin}
      MATCH (kb:KnowledgeEntry)-[:APPLICABLE_TO_FRAMEWORK]->(f)
      WHERE kb.business_value_score >= 70
      RETURN 
        kb as entry,
        kb.title as title,
        kb.description as description
      ORDER BY kb.business_value_score DESC
      LIMIT 10
    `
  }
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

export class GKGEnrichedSearchService {
  /**
   * Enrich search results with GKG relationships and knowledge base insights
   */
  static async enrichResults(
    searchResults: SearchResult[],
    request: GKGEnrichedSearchRequest,
    userId: string
  ): Promise<GKGEnrichedResult[]> {
    // Skip enrichment if Neo4j not available
    if (!isNeo4jConfigured()) {
      logger.debug('[GKG-SEARCH] Neo4j not configured, returning results without enrichment')
      return searchResults.map(r => ({ ...r, gkgMetadata: undefined }))
    }

    if (!request.includeRelationships) {
      return searchResults.map(r => ({ ...r, gkgMetadata: undefined }))
    }

    const driver = getNeo4jDriver()
    const depth = Math.min(request.relationshipDepth || 2, 3) // Cap at depth 3

    // Graceful degradation: if Neo4j unavailable, return unenriched results
    if (!driver) {
      logger.warn('[GKG-SEARCH] Neo4j unavailable; graph enrichment disabled')
      return searchResults.map(r => ({ ...r, gkgMetadata: undefined }))
    }

    try {
      logger.info('[GKG-SEARCH] Enriching results with graph relationships', {
        resultCount: searchResults.length,
        depth,
        includeKB: request.includeKnowledgeBase
      })

      return Promise.all(
        searchResults.map(result => 
          this.enrichSingleResult(result, driver, depth, request)
        )
      )
    } catch (error: any) {
      logger.error('[GKG-SEARCH] Enrichment failed, returning unenriched results', {
        error: error.message
      })
      return searchResults.map(r => ({ ...r, gkgMetadata: undefined }))
    }
  }

  /**
   * Enrich a single search result with GKG context
   */
  private static async enrichSingleResult(
    result: SearchResult,
    driver: any,
    depth: number,
    request: GKGEnrichedSearchRequest
  ): Promise<GKGEnrichedResult> {
    try {
      const gkgMetadata: GKGMetadata = {
        entityType: result.type.toUpperCase(),
        relationships: [],
        relatedEntities: []
      }

      // Query Neo4j for related entities
      let cypherQuery: string
      let params: any = { entityId: result.id }

      if (result.type === 'document') {
        cypherQuery = GKGQueryBuilder.buildDocumentRelationshipsQuery(result.id, depth)
      } else if (result.type === 'task') {
        cypherQuery = GKGQueryBuilder.buildImpactChainQuery(result.id, depth)
      } else if (result.type === 'project') {
        // For projects, find related documents, tasks, and programs
        cypherQuery = `
          MATCH (proj:Project {id: $entityId})
          MATCH p=(proj)-[rel*1..${depth}]-(related)
          RETURN 
            related as entity,
            length(p) as distance,
            [r in rel | type(r)] as relationshipPath
          LIMIT 20
        `
      } else {
        // Generic fallback
        cypherQuery = `
          MATCH (entity {id: $entityId})
          MATCH p=(entity)-[rel*1..${depth}]-(related)
          RETURN 
            related as entity,
            length(p) as distance
          LIMIT 15
        `
      }

      try {
        const session = driver.session()
        const queryResult = await session.run(cypherQuery, params)

        // Process relationship results
        for (const record of queryResult.records) {
          const relatedEntity = record.get('entity')
          const distance = record.get('distance') || 1

          if (relatedEntity) {
            const relationship: GKGRelationship = {
              type: 'related_to', // Simplified; could parse from relationshipPath
              targetId: relatedEntity.properties.id,
              targetTitle: relatedEntity.properties.title || relatedEntity.properties.name,
              targetType: relatedEntity.labels?.[0] || 'Unknown',
              distance
            }

            gkgMetadata.relationships.push(relationship)

            // Add to related entities (convert Neo4j node to SearchResult)
            gkgMetadata.relatedEntities.push({
              id: relatedEntity.properties.id,
              type: relatedEntity.labels?.[0]?.toLowerCase() || 'unknown',
              title: relatedEntity.properties.title || relatedEntity.properties.name,
              description: relatedEntity.properties.description || '',
              content_preview: '',
              author: relatedEntity.properties.created_by || 'Unknown',
              author_id: '',
              created_at: relatedEntity.properties.created_at || new Date().toISOString(),
              updated_at: relatedEntity.properties.updated_at || new Date().toISOString(),
              tags: relatedEntity.properties.tags || [],
              relevance_score: (3 - distance) / 3 // Closer relationships = higher score
            })
          }
        }

        await session.close()
      } catch (neo4jError: any) {
        logger.warn('[GKG-SEARCH] Neo4j query failed for entity', {
          entityId: result.id,
          error: neo4jError.message
        })
        // Continue without Neo4j data
      }

      // Fetch knowledge base recommendations if enabled
      if (request.includeKnowledgeBase) {
        gkgMetadata.knowledgeRecommendations = await this.getKnowledgeRecommendations(
          result.id,
          result.type,
          result.project_id
        )
      }

      return {
        ...result,
        gkgMetadata: gkgMetadata.relationships.length > 0 ? gkgMetadata : undefined
      }
    } catch (error: any) {
      logger.debug('[GKG-SEARCH] Could not enrich individual result', {
        resultId: result.id,
        error: error.message
      })
      return { ...result, gkgMetadata: undefined }
    }
  }

  /**
   * Get knowledge base recommendations for an entity
   */
  private static async getKnowledgeRecommendations(
    entityId: string,
    entityType: string,
    projectId?: string
  ): Promise<KnowledgeBaseRecommendation[]> {
    try {
      // Query knowledge base for applicable entries
      // Skip applicable_contexts filter for now (NULL parameter causes type inference issues)
      const result = await safeQuery<any>(`
        SELECT 
          kb.id,
          kb.title,
          kb.entry_type,
          kb.category,
          kb.description,
          kb.replication_potential,
          0.85 as applicability_score   -- TODO: Calculate real applicability
        FROM knowledge_base_entries kb
        WHERE kb.status = 'published'
          AND kb.replication_potential >= 0.7
        ORDER BY kb.replication_potential DESC
        LIMIT 5
      `, [])

      return result.rows.map((row: any) => ({
        entryId: row.id,
        title: row.title,
        entryType: row.entry_type,
        category: row.category,
        description: row.description,
        businessValueScore: Math.round((row.replication_potential || 0) * 100),
        applicabilityScore: row.applicability_score,
        relevanceReasoning: `Applicable to ${entityType} based on replication potential`
      }))
    } catch (error: any) {
      logger.debug('[GKG-SEARCH] Could not fetch knowledge recommendations', {
        error: error.message
      })
      return []
    }
  }

  /**
   * Get related entities for an entity via GKG traversal
   * Useful for "show me related documents" or "find dependencies"
   */
  static async getRelatedEntities(
    entityId: string,
    entityType: string,
    relationshipTypes?: string[],
    depth: number = 2
  ): Promise<SearchResult[]> {
    if (!isNeo4jConfigured()) {
      return []
    }

    try {
      const driver = getNeo4jDriver()
      
      // Graceful degradation: if Neo4j unavailable, return empty array
      if (!driver) {
        logger.warn('[GKG-SEARCH] Neo4j unavailable for getRelatedEntitiesByType; returning empty results')
        return []
      }

      const session = driver.session()

      // Build relationship filter for Neo4j variable-length pattern
      const relationshipFilter = relationshipTypes?.length
        ? relationshipTypes.join('|')  // e.g., "DEPENDS_ON|CONTAINS"
        : ''  // No filter - match all relationship types
      
      const relationshipPart = relationshipFilter ? `:${relationshipFilter}` : ''

      const query = `
        MATCH (entity {id: $entityId})
        MATCH p=(entity)-[rel${relationshipPart}*1..${Math.min(depth, 3)}]-(related)
        RETURN DISTINCT
          related.id as id,
          COALESCE(related.labels[0], 'document') as type,
          related.title as title,
          related.description as description,
          related.created_by as author,
          related.created_at as created_at,
          length(p) as distance
        ORDER BY distance ASC
        LIMIT 20
      `

      const queryResult = await session.run(query, { entityId })
      
      // Process records before closing session
      const results = queryResult.records.map(r => ({
        id: r.get('id'),
        type: (r.get('type') || 'document') as 'portfolio' | 'program' | 'project' | 'document' | 'task' | 'checklist_item' | 'todo' | 'template' | 'user',
        title: r.get('title') || 'Untitled',
        description: r.get('description') || '',
        content_preview: '',
        author: r.get('author') || 'Unknown',
        author_id: '',
        created_at: r.get('created_at')?.toString() || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        relevance_score: 1 - ((r.get('distance') - 1) / 3)
      }))
      
      await session.close()
      return results
    } catch (error: any) {
      logger.error('[GKG-SEARCH] Failed to get related entities', {
        entityId,
        error: error.message
      })
      return []
    }
  }

  /**
   * Get suggestion for follow-up searches based on entity relationships
   */
  static async getSuggestedFollowUps(
    currentEntityId: string,
    entityType: string
  ): Promise<string[]> {
    try {
      // Get related entities and generate natural language suggestions
      const related = await this.getRelatedEntities(currentEntityId, entityType, undefined, 1)
      
      return related
        .slice(0, 3)
        .map(e => `Learn more: ${e.title}`)
    } catch (error: any) {
      logger.debug('[GKG-SEARCH] Could not generate follow-up suggestions', {
        error: error.message
      })
      return []
    }
  }
}

export default GKGEnrichedSearchService
