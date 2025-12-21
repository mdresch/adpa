/**
 * Knowledge Base Service
 * CR-2026-001 Phase 3: Knowledge Base Integration
 * 
 * Manages lessons learned, efficiency improvements, and best practices
 * from drift detection and project execution
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { v4 as uuidv4 } from 'uuid'

export interface KnowledgeBaseEntry {
  id?: string
  entry_type: 'efficiency_improvement' | 'cost_saving' | 'timeline_acceleration' |
  'innovation' | 'risk_mitigation' | 'quality_improvement' |
  'process_improvement' | 'technical_solution' | 'lesson_learned'
  category: 'positive_drift' | 'negative_drift' | 'innovation' | 'best_practice' | 'anti_pattern'
  title: string
  description: string
  context?: string
  approach: string
  results?: string
  source_project_id?: string
  source_drift_id?: string
  source_baseline_id?: string
  source_document_id?: string
  cost_impact?: number
  time_impact_days?: number
  quality_impact_percentage?: number
  business_value_score?: number
  replicable?: boolean
  replication_difficulty?: 'easy' | 'moderate' | 'difficult'
  replication_instructions?: string
  applicable_contexts?: string[]
  prerequisites?: string[]
  tags?: string[]
  keywords?: string[]
  ai_generated?: boolean
  ai_confidence?: number
  ai_processing_metadata?: any
  created_by?: string
}

export interface KnowledgeBaseApplication {
  id?: string
  knowledge_entry_id: string
  applied_to_project_id: string
  applied_by: string
  application_context?: string
  success?: boolean
  actual_cost_impact?: number
  actual_time_impact_days?: number
  actual_quality_impact_percentage?: number
  notes?: string
}

export interface KnowledgeBaseRecommendation {
  id?: string
  knowledge_entry_id: string
  project_id: string
  relevance_score: number
  reasoning: string
  expected_impact?: string
  ai_model?: string
  ai_confidence?: number
}

export interface KnowledgeSearchParams {
  query?: string
  entry_type?: string
  category?: string
  tags?: string[]
  min_business_value?: number
  replicable_only?: boolean
  limit?: number
  offset?: number
}

export class KnowledgeBaseService {
  /**
   * Create a new knowledge base entry from drift detection
   */
  async createFromDrift(
    driftId: string,
    projectId: string,
    userId: string,
    overrides?: Partial<KnowledgeBaseEntry>
  ): Promise<KnowledgeBaseEntry> {
    try {
      logger.info('[KNOWLEDGE-BASE] Creating entry from drift', { driftId, projectId })

      // 1. Get drift details
      const driftResult = await pool.query(
        `SELECT 
          d.*,
          p.name as project_name,
          b.id as baseline_id
        FROM baseline_drift_detection d
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN project_baselines b ON d.baseline_id = b.id
        WHERE d.id = $1`,
        [driftId]
      )

      if (driftResult.rows.length === 0) {
        throw new Error(`Drift record not found: ${driftId}`)
      }

      const drift = driftResult.rows[0]

      // 2. Determine category and type based on drift metadata
      const category = this.categorizeDrift(drift)
      const entry_type = this.determineEntryType(drift)

      // 3. Generate AI-powered analysis
      const aiAnalysis = await this.generateKnowledgeEntryContent(drift, category)

      // 4. Create knowledge base entry
      const entry: KnowledgeBaseEntry = {
        entry_type,
        category,
        title: overrides?.title || aiAnalysis.title,
        description: overrides?.description || aiAnalysis.description,
        context: overrides?.context || aiAnalysis.context,
        approach: overrides?.approach || aiAnalysis.approach,
        results: overrides?.results || aiAnalysis.results,
        source_project_id: projectId,
        source_drift_id: driftId,
        source_baseline_id: drift.baseline_id,
        source_document_id: drift.source_document_id,
        business_value_score: aiAnalysis.business_value_score,
        replicable: aiAnalysis.replicable !== false,
        replication_difficulty: aiAnalysis.replication_difficulty || 'moderate',
        replication_instructions: aiAnalysis.replication_instructions,
        applicable_contexts: aiAnalysis.applicable_contexts || [],
        prerequisites: aiAnalysis.prerequisites || [],
        tags: aiAnalysis.tags || [],
        keywords: aiAnalysis.keywords || [],
        ai_generated: true,
        ai_confidence: aiAnalysis.confidence || 0.8,
        ai_processing_metadata: {
          model: aiAnalysis.model,
          generated_at: new Date().toISOString(),
          drift_metadata: drift.ai_processing_metadata
        },
        created_by: userId,
        ...overrides
      }

      const result = await this.createEntry(entry)

      logger.info('[KNOWLEDGE-BASE] Entry created from drift', {
        entryId: result.id,
        driftId,
        category,
        entry_type
      })

      return result
    } catch (error) {
      logger.error('[KNOWLEDGE-BASE] Error creating entry from drift', { error, driftId })
      throw error
    }
  }

  /**
   * Create a knowledge base entry
   */
  async createEntry(entry: KnowledgeBaseEntry): Promise<KnowledgeBaseEntry> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `INSERT INTO knowledge_base_entries (
          entry_type, category, title, description, context, approach, results,
          source_project_id, source_drift_id, source_baseline_id, source_document_id,
          cost_impact, time_impact_days, quality_impact_percentage, business_value_score,
          replicable, replication_difficulty, replication_instructions,
          applicable_contexts, prerequisites, tags, keywords,
          ai_generated, ai_confidence, ai_processing_metadata, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        ) RETURNING *`,
        [
          entry.entry_type, entry.category, entry.title, entry.description,
          entry.context, entry.approach, entry.results,
          entry.source_project_id, entry.source_drift_id, entry.source_baseline_id,
          entry.source_document_id, entry.cost_impact, entry.time_impact_days,
          entry.quality_impact_percentage, entry.business_value_score,
          entry.replicable, entry.replication_difficulty, entry.replication_instructions,
          entry.applicable_contexts, entry.prerequisites, entry.tags, entry.keywords,
          entry.ai_generated || false, entry.ai_confidence,
          entry.ai_processing_metadata ? JSON.stringify(entry.ai_processing_metadata) : null,
          entry.created_by
        ]
      )

      await client.query('COMMIT')
      return result.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Search knowledge base entries
   */
  async search(params: KnowledgeSearchParams): Promise<{ entries: any[], total: number }> {
    try {
      const conditions: string[] = ['archived = FALSE']
      const values: any[] = []
      let paramIndex = 1

      if (params.query) {
        conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`)
        values.push(params.query)
        paramIndex++
      }

      if (params.entry_type) {
        conditions.push(`entry_type = $${paramIndex}`)
        values.push(params.entry_type)
        paramIndex++
      }

      if (params.category) {
        conditions.push(`category = $${paramIndex}`)
        values.push(params.category)
        paramIndex++
      }

      if (params.tags && params.tags.length > 0) {
        conditions.push(`tags && $${paramIndex}`)
        values.push(params.tags)
        paramIndex++
      }

      if (params.min_business_value !== undefined) {
        conditions.push(`business_value_score >= $${paramIndex}`)
        values.push(params.min_business_value)
        paramIndex++
      }

      if (params.replicable_only) {
        conditions.push('replicable = TRUE')
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limit = params.limit || 50
      const offset = params.offset || 0

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM knowledge_base_entries ${whereClause}`,
        values
      )

      // Get entries
      const entriesResult = await pool.query(
        `SELECT 
          kb.*,
          p.name as source_project_name,
          u.name as creator_name,
          (SELECT COUNT(*) FROM knowledge_base_applications WHERE knowledge_entry_id = kb.id) as application_count
        FROM knowledge_base_entries kb
        LEFT JOIN projects p ON kb.source_project_id = p.id
        LEFT JOIN users u ON kb.created_by = u.id
        ${whereClause}
        ORDER BY business_value_score DESC NULLS LAST, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, limit, offset]
      )

      return {
        entries: entriesResult.rows,
        total: parseInt(countResult.rows[0].count)
      }
    } catch (error) {
      logger.error('[KNOWLEDGE-BASE] Error searching entries', { error, params })
      throw error
    }
  }

  /**
   * Get recommendations for a project
   */
  async getRecommendationsForProject(projectId: string, limit: number = 10): Promise<any[]> {
    try {
      logger.info('[KNOWLEDGE-BASE] Getting recommendations for project', { projectId })

      // Check if knowledge base tables exist
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'knowledge_base_entries'
        ) as entries_exist,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'knowledge_base_recommendations'
        ) as recs_exist
      `)

      if (!tableCheck.rows[0]?.entries_exist || !tableCheck.rows[0]?.recs_exist) {
        logger.info('[KNOWLEDGE-BASE] Knowledge base tables do not exist yet, returning empty recommendations')
        return []
      }

      // Get project context (without tags - table doesn't exist yet)
      const projectResult = await pool.query(
        `SELECT p.*
        FROM projects p
        WHERE p.id = $1`,
        [projectId]
      )

      if (projectResult.rows.length === 0) {
        throw new Error(`Project not found: ${projectId}`)
      }

      const project = projectResult.rows[0]

      // Get existing recommendations
      const existingRecs = await pool.query(
        `SELECT knowledge_entry_id 
        FROM knowledge_base_recommendations 
        WHERE project_id = $1 AND status != 'rejected'`,
        [projectId]
      )

      const excludeIds = existingRecs.rows.map(r => r.knowledge_entry_id)

      // Find relevant knowledge base entries
      let query = `
        SELECT kb.*, p.name as source_project_name
        FROM knowledge_base_entries kb
        LEFT JOIN projects p ON kb.source_project_id = p.id
        WHERE kb.archived = FALSE 
        AND kb.replicable = TRUE
      `

      if (excludeIds.length > 0) {
        query += ` AND kb.id NOT IN (${excludeIds.map((_, i) => `$${i + 2}`).join(', ')})`
      }

      query += ` ORDER BY kb.business_value_score DESC NULLS LAST
        LIMIT $1`

      const entriesResult = await pool.query(
        query,
        [limit * 2, ...excludeIds]
      )

      // Generate AI recommendations
      const recommendations = await this.generateRecommendations(
        project,
        entriesResult.rows,
        limit
      )

      // Store recommendations
      for (const rec of recommendations) {
        await pool.query(
          `INSERT INTO knowledge_base_recommendations (
            knowledge_entry_id, project_id, relevance_score, reasoning,
            expected_impact, ai_model, ai_confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (knowledge_entry_id, project_id) DO NOTHING`,
          [
            rec.knowledge_entry_id,
            projectId,
            rec.relevance_score,
            rec.reasoning,
            rec.expected_impact,
            rec.ai_model,
            rec.ai_confidence
          ]
        )
      }

      logger.info('[KNOWLEDGE-BASE] Generated recommendations', {
        projectId,
        count: recommendations.length
      })

      return recommendations
    } catch (error) {
      logger.error('[KNOWLEDGE-BASE] Error getting recommendations', { error, projectId })
      throw error
    }
  }

  /**
   * Apply a knowledge base entry to a project
   */
  async applyToProject(
    entryId: string,
    projectId: string,
    userId: string,
    context?: string
  ): Promise<KnowledgeBaseApplication> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Create application record
      const result = await client.query(
        `INSERT INTO knowledge_base_applications (
          knowledge_entry_id, applied_to_project_id, applied_by, application_context
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [entryId, projectId, userId, context]
      )

      // Increment applications count
      await client.query(
        `UPDATE knowledge_base_entries 
        SET applications_count = applications_count + 1
        WHERE id = $1`,
        [entryId]
      )

      // Update recommendation status if exists
      await client.query(
        `UPDATE knowledge_base_recommendations
        SET status = 'applied', reviewed_by = $3, reviewed_at = NOW()
        WHERE knowledge_entry_id = $1 AND project_id = $2`,
        [entryId, projectId, userId]
      )

      await client.query('COMMIT')

      logger.info('[KNOWLEDGE-BASE] Entry applied to project', { entryId, projectId })

      return result.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[KNOWLEDGE-BASE] Error applying entry to project', { error, entryId, projectId })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update application outcome
   */
  async updateApplicationOutcome(
    applicationId: string,
    outcome: {
      success: boolean
      actual_cost_impact?: number
      actual_time_impact_days?: number
      actual_quality_impact_percentage?: number
      notes?: string
    }
  ): Promise<void> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Update application
      await client.query(
        `UPDATE knowledge_base_applications
        SET success = $2, actual_cost_impact = $3, actual_time_impact_days = $4,
            actual_quality_impact_percentage = $5, notes = $6
        WHERE id = $1`,
        [
          applicationId,
          outcome.success,
          outcome.actual_cost_impact,
          outcome.actual_time_impact_days,
          outcome.actual_quality_impact_percentage,
          outcome.notes
        ]
      )

      // Get knowledge entry ID
      const appResult = await client.query(
        'SELECT knowledge_entry_id FROM knowledge_base_applications WHERE id = $1',
        [applicationId]
      )

      if (appResult.rows.length > 0) {
        const entryId = appResult.rows[0].knowledge_entry_id

        // Recalculate success rate
        const statsResult = await client.query(
          `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE success = TRUE) as successes
          FROM knowledge_base_applications
          WHERE knowledge_entry_id = $1 AND success IS NOT NULL`,
          [entryId]
        )

        if (statsResult.rows[0].total > 0) {
          const successRate = statsResult.rows[0].successes / statsResult.rows[0].total

          await client.query(
            'UPDATE knowledge_base_entries SET success_rate = $2 WHERE id = $1',
            [entryId, successRate]
          )
        }
      }

      await client.query('COMMIT')

      logger.info('[KNOWLEDGE-BASE] Application outcome updated', { applicationId, success: outcome.success })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[KNOWLEDGE-BASE] Error updating application outcome', { error, applicationId })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Categorize drift based on severity and type
   */
  private categorizeDrift(drift: any): KnowledgeBaseEntry['category'] {
    // Positive drift indicators
    if (drift.drift_description?.toLowerCase().includes('efficiency') ||
      drift.drift_description?.toLowerCase().includes('improvement') ||
      drift.drift_description?.toLowerCase().includes('cost saving')) {
      return 'positive_drift'
    }

    // Check for innovation markers
    if (drift.ai_processing_metadata?.innovation_markers) {
      return 'innovation'
    }

    // Negative drift
    if (drift.drift_severity === 'high' || drift.drift_severity === 'critical') {
      return 'negative_drift'
    }

    // Default based on resolution status
    return drift.status === 'resolved' ? 'best_practice' : 'negative_drift'
  }

  /**
   * Determine entry type from drift
   */
  private determineEntryType(drift: any): KnowledgeBaseEntry['entry_type'] {
    const description = (drift.drift_description || '').toLowerCase()

    if (description.includes('efficiency')) return 'efficiency_improvement'
    if (description.includes('cost') || description.includes('budget')) return 'cost_saving'
    if (description.includes('timeline') || description.includes('schedule')) return 'timeline_acceleration'
    if (description.includes('innovation') || description.includes('patent')) return 'innovation'
    if (description.includes('risk')) return 'risk_mitigation'
    if (description.includes('quality')) return 'quality_improvement'
    if (description.includes('process')) return 'process_improvement'
    if (description.includes('technical') || description.includes('technology')) return 'technical_solution'

    return 'lesson_learned'
  }

  /**
   * Generate knowledge entry content using AI
   */
  private async generateKnowledgeEntryContent(drift: any, category: string): Promise<any> {
    try {
      const prompt = `Analyze this project drift and create a knowledge base entry:

Project: ${drift.project_name}
Drift Type: ${drift.detection_type}
Severity: ${drift.drift_severity}
Description: ${drift.drift_description}
Impact: ${drift.drift_impact || 'Not specified'}
Category: ${category}

Generate a structured knowledge base entry with:
1. A clear, actionable title (max 100 chars)
2. Detailed description of what happened
3. Context: Why this situation occurred
4. Approach: What was done to address it
5. Results: What were the outcomes
6. Business value score (0-1)
7. Whether this is replicable to other projects
8. Replication difficulty (easy/moderate/difficult)
9. Replication instructions
10. Applicable contexts (where this can be applied)
11. Prerequisites (what's needed before applying)
12. Relevant tags and keywords for searchability

Format as JSON with these exact fields:
{
  "title": "...",
  "description": "...",
  "context": "...",
  "approach": "...",
  "results": "...",
  "business_value_score": 0.0-1.0,
  "replicable": true/false,
  "replication_difficulty": "easy|moderate|difficult",
  "replication_instructions": "...",
  "applicable_contexts": ["..."],
  "prerequisites": ["..."],
  "tags": ["..."],
  "keywords": ["..."],
  "confidence": 0.0-1.0
}`

      const response = await aiService.generate({
        prompt,
        system_prompt: 'You are a project management knowledge extraction expert. Generate structured, actionable knowledge base entries.',
        max_tokens: 2000,
        provider: 'google'
      })

      const parsed = JSON.parse(response.content)
      return {
        ...parsed,
        model: 'ai-service'
      }
    } catch (error) {
      logger.warn('[KNOWLEDGE-BASE] Error generating AI content, using defaults', { error })

      // Fallback to basic extraction
      return {
        title: `${category}: ${drift.detection_type}`,
        description: drift.drift_description,
        context: `Detected in ${drift.project_name}`,
        approach: drift.resolution_notes || 'Resolution approach not documented',
        results: drift.drift_impact || 'Results not yet documented',
        business_value_score: 0.5,
        replicable: false,
        replication_difficulty: 'moderate',
        replication_instructions: 'Requires further analysis',
        applicable_contexts: [],
        prerequisites: [],
        tags: [drift.detection_type, category],
        keywords: [drift.drift_severity],
        confidence: 0.5,
        model: 'fallback'
      }
    }
  }

  /**
   * Generate AI recommendations for knowledge base entries
   */
  private async generateRecommendations(
    project: any,
    entries: any[],
    limit: number
  ): Promise<any[]> {
    try {
      const prompt = `Given this project context, rank the relevance of these knowledge base entries:

Project: ${project.name}
Description: ${project.description || 'Not provided'}
Status: ${project.status}
Tags: ${project.tags ? JSON.stringify(project.tags) : 'None'}

Knowledge Base Entries:
${entries.map((e, i) => `
${i + 1}. ${e.title}
   Type: ${e.entry_type}
   Description: ${e.description}
   Applicable Contexts: ${e.applicable_contexts?.join(', ') || 'Any'}
   Business Value: ${e.business_value_score || 'N/A'}
`).join('\n')}

For each entry, provide:
1. Relevance score (0-1)
2. Reasoning for the score
3. Expected impact if applied

Return JSON array (limit to top ${limit}):
[
  {
    "entry_index": 0,
    "relevance_score": 0.0-1.0,
    "reasoning": "...",
    "expected_impact": "...",
    "confidence": 0.0-1.0
  }
]`

      const response = await aiService.generate({
        prompt,
        system_prompt: 'You are a project management AI that recommends relevant knowledge base entries.',
        max_tokens: 2000,
        provider: 'google'
      })

      const recommendations = JSON.parse(response.content)

      return recommendations
        .filter((r: any) => r.relevance_score >= 0.5)
        .slice(0, limit)
        .map((r: any) => ({
          knowledge_entry_id: entries[r.entry_index]?.id,
          entry: entries[r.entry_index],
          relevance_score: r.relevance_score,
          reasoning: r.reasoning,
          expected_impact: r.expected_impact,
          ai_model: 'ai-service',
          ai_confidence: r.confidence || 0.7
        }))
        .filter((r: any) => r.knowledge_entry_id) // Remove invalid entries
    } catch (error) {
      logger.warn('[KNOWLEDGE-BASE] Error generating AI recommendations, using simple ranking', { error })

      // Fallback to simple business value ranking
      return entries
        .slice(0, limit)
        .map(entry => ({
          knowledge_entry_id: entry.id,
          entry,
          relevance_score: entry.business_value_score || 0.5,
          reasoning: 'Ranked by business value score',
          expected_impact: 'Potential improvement based on historical data',
          ai_model: 'fallback',
          ai_confidence: 0.5
        }))
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService()
