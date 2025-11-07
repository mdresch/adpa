/**
 * Knowledge Base Service
 * Core business logic for knowledge base entries, applications, and reviews
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import type {
  KnowledgeBaseEntry,
  CreateKnowledgeBaseEntryRequest,
  UpdateKnowledgeBaseEntryRequest,
  KnowledgeBaseApplication,
  CreateKnowledgeBaseApplicationRequest,
  UpdateKnowledgeBaseApplicationRequest,
  KnowledgeBaseReview,
  CreateKnowledgeBaseReviewRequest,
  KnowledgeBaseSearchFilters,
  KnowledgeBaseStats,
  EntryStatus
} from './types'

export class KnowledgeBaseService {
  /**
   * Create a new knowledge base entry
   */
  async createEntry(
    data: CreateKnowledgeBaseEntryRequest,
    userId: string
  ): Promise<KnowledgeBaseEntry> {
    const client = await pool.connect()
    
    try {
      const query = `
        INSERT INTO knowledge_base_entries (
          project_id, baseline_id, drift_detection_id, innovation_opportunity_id,
          entry_type, category, title, description,
          baseline_approach, improved_approach, value_metrics, replication_guide,
          applicable_contexts, similar_project_ids, tags, keywords,
          created_by, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING *
      `
      
      const values = [
        data.project_id,
        data.baseline_id || null,
        data.drift_detection_id || null,
        data.innovation_opportunity_id || null,
        data.entry_type,
        data.category,
        data.title,
        data.description,
        JSON.stringify(data.baseline_approach || null),
        JSON.stringify(data.improved_approach),
        JSON.stringify(data.value_metrics || null),
        JSON.stringify(data.replication_guide),
        JSON.stringify(data.applicable_contexts || null),
        JSON.stringify(data.similar_project_ids || []),
        data.tags || [],
        data.keywords || [],
        userId,
        data.notes || null
      ]
      
      const result = await client.query(query, values)
      
      logger.info(`Knowledge base entry created: ${result.rows[0].id}`)
      
      return this.mapRowToEntry(result.rows[0])
    } catch (error) {
      logger.error('Error creating knowledge base entry:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get a knowledge base entry by ID
   */
  async getEntryById(entryId: string): Promise<KnowledgeBaseEntry | null> {
    const client = await pool.connect()
    
    try {
      // Increment view count
      await client.query(
        'UPDATE knowledge_base_entries SET view_count = view_count + 1 WHERE id = $1',
        [entryId]
      )
      
      const query = 'SELECT * FROM knowledge_base_entries WHERE id = $1'
      const result = await client.query(query, [entryId])
      
      if (result.rows.length === 0) {
        return null
      }
      
      return this.mapRowToEntry(result.rows[0])
    } catch (error) {
      logger.error(`Error fetching knowledge base entry ${entryId}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Search and filter knowledge base entries
   */
  async searchEntries(
    filters: KnowledgeBaseSearchFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ entries: KnowledgeBaseEntry[], total: number }> {
    const client = await pool.connect()
    
    try {
      const conditions: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if (filters.entry_type) {
        if (Array.isArray(filters.entry_type)) {
          conditions.push(`entry_type = ANY($${paramIndex})`)
          values.push(filters.entry_type)
        } else {
          conditions.push(`entry_type = $${paramIndex}`)
          values.push(filters.entry_type)
        }
        paramIndex++
      }
      
      if (filters.category) {
        if (Array.isArray(filters.category)) {
          conditions.push(`category = ANY($${paramIndex})`)
          values.push(filters.category)
        } else {
          conditions.push(`category = $${paramIndex}`)
          values.push(filters.category)
        }
        paramIndex++
      }
      
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          conditions.push(`status = ANY($${paramIndex})`)
          values.push(filters.status)
        } else {
          conditions.push(`status = $${paramIndex}`)
          values.push(filters.status)
        }
        paramIndex++
      }
      
      if (filters.project_id) {
        conditions.push(`project_id = $${paramIndex}`)
        values.push(filters.project_id)
        paramIndex++
      }
      
      if (filters.tags && filters.tags.length > 0) {
        conditions.push(`tags && $${paramIndex}`)
        values.push(filters.tags)
        paramIndex++
      }
      
      if (filters.search_query) {
        conditions.push(`
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
          @@ plainto_tsquery('english', $${paramIndex})
        `)
        values.push(filters.search_query)
        paramIndex++
      }
      
      if (filters.min_novelty_score !== undefined) {
        conditions.push(`novelty_score >= $${paramIndex}`)
        values.push(filters.min_novelty_score)
        paramIndex++
      }
      
      if (filters.min_replication_potential !== undefined) {
        conditions.push(`replication_potential >= $${paramIndex}`)
        values.push(filters.min_replication_potential)
        paramIndex++
      }
      
      if (filters.created_after) {
        conditions.push(`created_at >= $${paramIndex}`)
        values.push(filters.created_after)
        paramIndex++
      }
      
      if (filters.created_before) {
        conditions.push(`created_at <= $${paramIndex}`)
        values.push(filters.created_before)
        paramIndex++
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM knowledge_base_entries ${whereClause}`
      const countResult = await client.query(countQuery, values)
      const total = parseInt(countResult.rows[0].count, 10)
      
      // Get entries
      const query = `
        SELECT * FROM knowledge_base_entries
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      values.push(limit, offset)
      
      const result = await client.query(query, values)
      const entries = result.rows.map(row => this.mapRowToEntry(row))
      
      return { entries, total }
    } catch (error) {
      logger.error('Error searching knowledge base entries:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update a knowledge base entry
   */
  async updateEntry(
    entryId: string,
    data: UpdateKnowledgeBaseEntryRequest
  ): Promise<KnowledgeBaseEntry> {
    const client = await pool.connect()
    
    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if (data.entry_type) {
        updates.push(`entry_type = $${paramIndex}`)
        values.push(data.entry_type)
        paramIndex++
      }
      
      if (data.category) {
        updates.push(`category = $${paramIndex}`)
        values.push(data.category)
        paramIndex++
      }
      
      if (data.title) {
        updates.push(`title = $${paramIndex}`)
        values.push(data.title)
        paramIndex++
      }
      
      if (data.description) {
        updates.push(`description = $${paramIndex}`)
        values.push(data.description)
        paramIndex++
      }
      
      if (data.baseline_approach) {
        updates.push(`baseline_approach = $${paramIndex}`)
        values.push(JSON.stringify(data.baseline_approach))
        paramIndex++
      }
      
      if (data.improved_approach) {
        updates.push(`improved_approach = $${paramIndex}`)
        values.push(JSON.stringify(data.improved_approach))
        paramIndex++
      }
      
      if (data.value_metrics) {
        updates.push(`value_metrics = $${paramIndex}`)
        values.push(JSON.stringify(data.value_metrics))
        paramIndex++
      }
      
      if (data.replication_guide) {
        updates.push(`replication_guide = $${paramIndex}`)
        values.push(JSON.stringify(data.replication_guide))
        paramIndex++
      }
      
      if (data.applicable_contexts) {
        updates.push(`applicable_contexts = $${paramIndex}`)
        values.push(JSON.stringify(data.applicable_contexts))
        paramIndex++
      }
      
      if (data.similar_project_ids) {
        updates.push(`similar_project_ids = $${paramIndex}`)
        values.push(JSON.stringify(data.similar_project_ids))
        paramIndex++
      }
      
      if (data.tags) {
        updates.push(`tags = $${paramIndex}`)
        values.push(data.tags)
        paramIndex++
      }
      
      if (data.keywords) {
        updates.push(`keywords = $${paramIndex}`)
        values.push(data.keywords)
        paramIndex++
      }
      
      if (data.status) {
        updates.push(`status = $${paramIndex}`)
        values.push(data.status)
        paramIndex++
        
        // Update published_at if status is being set to published
        if (data.status === 'published') {
          updates.push(`published_at = NOW()`)
        }
      }
      
      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`)
        values.push(data.notes)
        paramIndex++
      }
      
      updates.push('updated_at = NOW()')
      
      if (updates.length === 1) {
        throw new Error('No fields to update')
      }
      
      values.push(entryId)
      
      const query = `
        UPDATE knowledge_base_entries
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `
      
      const result = await client.query(query, values)
      
      if (result.rows.length === 0) {
        throw new Error('Entry not found')
      }
      
      logger.info(`Knowledge base entry updated: ${entryId}`)
      
      return this.mapRowToEntry(result.rows[0])
    } catch (error) {
      logger.error(`Error updating knowledge base entry ${entryId}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Delete a knowledge base entry (soft delete by archiving)
   */
  async deleteEntry(entryId: string): Promise<void> {
    const client = await pool.connect()
    
    try {
      const query = `
        UPDATE knowledge_base_entries
        SET status = 'archived', updated_at = NOW()
        WHERE id = $1
      `
      
      await client.query(query, [entryId])
      
      logger.info(`Knowledge base entry archived: ${entryId}`)
    } catch (error) {
      logger.error(`Error archiving knowledge base entry ${entryId}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Create a knowledge base application
   */
  async createApplication(
    data: CreateKnowledgeBaseApplicationRequest,
    userId: string
  ): Promise<KnowledgeBaseApplication> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Insert application
      const query = `
        INSERT INTO knowledge_base_applications (
          knowledge_base_entry_id, target_project_id, applied_by,
          implementation_notes, adaptation_required, adaptations, expected_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      
      const values = [
        data.knowledge_base_entry_id,
        data.target_project_id,
        userId,
        data.implementation_notes || null,
        data.adaptation_required || false,
        JSON.stringify(data.adaptations || null),
        JSON.stringify(data.expected_value || null)
      ]
      
      const result = await client.query(query, values)
      
      // Increment application count
      await client.query(
        'UPDATE knowledge_base_entries SET application_count = application_count + 1 WHERE id = $1',
        [data.knowledge_base_entry_id]
      )
      
      await client.query('COMMIT')
      
      logger.info(`Knowledge base application created: ${result.rows[0].id}`)
      
      return this.mapRowToApplication(result.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error creating knowledge base application:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update a knowledge base application
   */
  async updateApplication(
    applicationId: string,
    data: UpdateKnowledgeBaseApplicationRequest
  ): Promise<KnowledgeBaseApplication> {
    const client = await pool.connect()
    
    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if (data.implementation_notes !== undefined) {
        updates.push(`implementation_notes = $${paramIndex}`)
        values.push(data.implementation_notes)
        paramIndex++
      }
      
      if (data.adaptation_required !== undefined) {
        updates.push(`adaptation_required = $${paramIndex}`)
        values.push(data.adaptation_required)
        paramIndex++
      }
      
      if (data.adaptations) {
        updates.push(`adaptations = $${paramIndex}`)
        values.push(JSON.stringify(data.adaptations))
        paramIndex++
      }
      
      if (data.status) {
        updates.push(`status = $${paramIndex}`)
        values.push(data.status)
        paramIndex++
        
        if (data.status === 'completed') {
          updates.push('completed_at = NOW()')
        }
      }
      
      if (data.outcome) {
        updates.push(`outcome = $${paramIndex}`)
        values.push(data.outcome)
        paramIndex++
      }
      
      if (data.actual_value) {
        updates.push(`actual_value = $${paramIndex}`)
        values.push(JSON.stringify(data.actual_value))
        paramIndex++
      }
      
      if (data.variance_analysis) {
        updates.push(`variance_analysis = $${paramIndex}`)
        values.push(JSON.stringify(data.variance_analysis))
        paramIndex++
      }
      
      if (data.feedback !== undefined) {
        updates.push(`feedback = $${paramIndex}`)
        values.push(data.feedback)
        paramIndex++
      }
      
      if (data.lessons_learned !== undefined) {
        updates.push(`lessons_learned = $${paramIndex}`)
        values.push(data.lessons_learned)
        paramIndex++
      }
      
      updates.push('updated_at = NOW()')
      
      if (updates.length === 1) {
        throw new Error('No fields to update')
      }
      
      values.push(applicationId)
      
      const query = `
        UPDATE knowledge_base_applications
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `
      
      const result = await client.query(query, values)
      
      if (result.rows.length === 0) {
        throw new Error('Application not found')
      }
      
      logger.info(`Knowledge base application updated: ${applicationId}`)
      
      return this.mapRowToApplication(result.rows[0])
    } catch (error) {
      logger.error(`Error updating knowledge base application ${applicationId}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get applications for an entry
   */
  async getApplicationsByEntry(entryId: string): Promise<KnowledgeBaseApplication[]> {
    const client = await pool.connect()
    
    try {
      const query = `
        SELECT * FROM knowledge_base_applications
        WHERE knowledge_base_entry_id = $1
        ORDER BY applied_at DESC
      `
      
      const result = await client.query(query, [entryId])
      
      return result.rows.map(row => this.mapRowToApplication(row))
    } catch (error) {
      logger.error(`Error fetching applications for entry ${entryId}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Create a review for a knowledge base entry
   */
  async createReview(
    data: CreateKnowledgeBaseReviewRequest,
    userId: string
  ): Promise<KnowledgeBaseReview> {
    const client = await pool.connect()
    
    try {
      const query = `
        INSERT INTO knowledge_base_reviews (
          knowledge_base_entry_id, reviewer_id, rating, review_text,
          review_type, recommendation, suggested_changes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      
      const values = [
        data.knowledge_base_entry_id,
        userId,
        data.rating || null,
        data.review_text || null,
        data.review_type,
        data.recommendation || null,
        JSON.stringify(data.suggested_changes || null)
      ]
      
      const result = await client.query(query, values)
      
      logger.info(`Knowledge base review created: ${result.rows[0].id}`)
      
      return this.mapRowToReview(result.rows[0])
    } catch (error) {
      logger.error('Error creating knowledge base review:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get reviews for an entry
   */
  async getReviewsByEntry(entryId: string): Promise<KnowledgeBaseReview[]> {
    const client = await pool.connect()
    
    try {
      const query = `
        SELECT * FROM knowledge_base_reviews
        WHERE knowledge_base_entry_id = $1
        ORDER BY reviewed_at DESC
      `
      
      const result = await client.query(query, [entryId])
      
      return result.rows.map(row => this.mapRowToReview(row))
    } catch (error) {
      logger.error(`Error fetching reviews for entry ${entryId}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getStats(): Promise<KnowledgeBaseStats> {
    const client = await pool.connect()
    
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_entries,
          json_object_agg(entry_type, count) FILTER (WHERE entry_type IS NOT NULL) as entries_by_type,
          json_object_agg(category, count) FILTER (WHERE category IS NOT NULL) as entries_by_category,
          json_object_agg(status, count) FILTER (WHERE status IS NOT NULL) as entries_by_status,
          SUM(application_count) as total_applications,
          AVG(success_rate) as average_success_rate
        FROM (
          SELECT
            entry_type,
            category,
            status,
            application_count,
            success_rate,
            COUNT(*) OVER (PARTITION BY entry_type) as count
          FROM knowledge_base_entries
        ) subq
      `
      
      const result = await client.query(statsQuery)
      const row = result.rows[0]
      
      // Calculate total cost savings and time saved
      const metricsQuery = `
        SELECT
          SUM((value_metrics->>'cost_savings')::numeric) as total_cost_savings,
          SUM((value_metrics->>'time_saved')::numeric) as total_time_saved
        FROM knowledge_base_entries
        WHERE value_metrics IS NOT NULL
      `
      
      const metricsResult = await client.query(metricsQuery)
      const metrics = metricsResult.rows[0]
      
      // Count successful applications
      const appsQuery = `
        SELECT COUNT(*) as successful_applications
        FROM knowledge_base_applications
        WHERE outcome = 'successful'
      `
      
      const appsResult = await client.query(appsQuery)
      
      return {
        total_entries: parseInt(row.total_entries, 10),
        entries_by_type: row.entries_by_type || {},
        entries_by_category: row.entries_by_category || {},
        entries_by_status: row.entries_by_status || {},
        total_applications: parseInt(row.total_applications || '0', 10),
        successful_applications: parseInt(appsResult.rows[0].successful_applications || '0', 10),
        average_success_rate: parseFloat(row.average_success_rate || '0'),
        total_cost_savings: parseFloat(metrics.total_cost_savings || '0'),
        total_time_saved: parseFloat(metrics.total_time_saved || '0')
      }
    } catch (error) {
      logger.error('Error fetching knowledge base stats:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Map database row to KnowledgeBaseEntry
   */
  private mapRowToEntry(row: any): KnowledgeBaseEntry {
    return {
      id: row.id,
      project_id: row.project_id,
      baseline_id: row.baseline_id,
      drift_detection_id: row.drift_detection_id,
      innovation_opportunity_id: row.innovation_opportunity_id,
      entry_type: row.entry_type,
      category: row.category,
      title: row.title,
      description: row.description,
      baseline_approach: row.baseline_approach,
      improved_approach: row.improved_approach,
      value_metrics: row.value_metrics,
      replication_guide: row.replication_guide,
      applicable_contexts: row.applicable_contexts,
      similar_project_ids: row.similar_project_ids || [],
      ai_confidence: parseFloat(row.ai_confidence),
      novelty_score: parseFloat(row.novelty_score),
      replication_potential: parseFloat(row.replication_potential),
      ai_processing_metadata: row.ai_processing_metadata,
      tags: row.tags || [],
      keywords: row.keywords || [],
      status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      published_at: row.published_at,
      superseded_by: row.superseded_by,
      superseded_at: row.superseded_at,
      view_count: row.view_count,
      application_count: row.application_count,
      success_rate: parseFloat(row.success_rate),
      updated_at: row.updated_at,
      notes: row.notes
    }
  }

  /**
   * Map database row to KnowledgeBaseApplication
   */
  private mapRowToApplication(row: any): KnowledgeBaseApplication {
    return {
      id: row.id,
      knowledge_base_entry_id: row.knowledge_base_entry_id,
      target_project_id: row.target_project_id,
      applied_by: row.applied_by,
      applied_at: row.applied_at,
      implementation_notes: row.implementation_notes,
      adaptation_required: row.adaptation_required,
      adaptations: row.adaptations,
      status: row.status,
      outcome: row.outcome,
      expected_value: row.expected_value,
      actual_value: row.actual_value,
      variance_analysis: row.variance_analysis,
      feedback: row.feedback,
      lessons_learned: row.lessons_learned,
      completed_at: row.completed_at,
      updated_at: row.updated_at
    }
  }

  /**
   * Map database row to KnowledgeBaseReview
   */
  private mapRowToReview(row: any): KnowledgeBaseReview {
    return {
      id: row.id,
      knowledge_base_entry_id: row.knowledge_base_entry_id,
      reviewer_id: row.reviewer_id,
      reviewed_at: row.reviewed_at,
      rating: row.rating,
      review_text: row.review_text,
      review_type: row.review_type,
      recommendation: row.recommendation,
      suggested_changes: row.suggested_changes,
      updated_at: row.updated_at
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService()
