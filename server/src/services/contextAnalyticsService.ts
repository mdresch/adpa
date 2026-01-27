/**
 * Context Analytics Service
 * 
 * Provides analytics and insights for project context items usage.
 * Tracks usage patterns, frequency, and provides data for recommendations.
 * 
 * @module contextAnalyticsService
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'

export interface ContextAnalytics {
  totalItems: number
  itemsByType: Record<string, number>
  activeItems: number
  totalContentSize: number
  mostUsedItems: Array<{
    id: string
    title: string
    type: string
    usageCount: number
  }>
  recentItems: Array<{
    id: string
    title: string
    type: string
    created_at: Date
  }>
  usageOverTime: Array<{
    date: string
    count: number
  }>
}

export interface ContextItemUsage {
  contextItemId: string
  title: string
  type: string
  usageCount: number
  lastUsed?: Date
  projectsUsing: string[]
}

export class ContextAnalyticsService {
  /**
   * Get analytics for a specific project
   */
  async getProjectAnalytics(projectId: string): Promise<ContextAnalytics> {
    try {
      // Get total items
      const totalResult = await pool.query(
        `SELECT COUNT(*) as total FROM project_context_items WHERE project_id = $1`,
        [projectId]
      )
      const totalItems = parseInt(totalResult.rows[0].total, 10)

      // Get items by type
      const typeResult = await pool.query(
        `SELECT type, COUNT(*) as count 
         FROM project_context_items 
         WHERE project_id = $1 
         GROUP BY type`,
        [projectId]
      )
      const itemsByType: Record<string, number> = {}
      typeResult.rows.forEach((row) => {
        itemsByType[row.type] = parseInt(row.count, 10)
      })

      // Get active items count
      const activeResult = await pool.query(
        `SELECT COUNT(*) as count FROM project_context_items WHERE project_id = $1 AND is_active = true`,
        [projectId]
      )
      const activeItems = parseInt(activeResult.rows[0].count, 10)

      // Get total content size
      const sizeResult = await pool.query(
        `SELECT SUM(LENGTH(content)) as total_size FROM project_context_items WHERE project_id = $1`,
        [projectId]
      )
      const totalContentSize = parseInt(sizeResult.rows[0].total_size || '0', 10)

      // Get most used items
      const mostUsedResult = await pool.query(
        `SELECT 
          pci.id, pci.title, pci.type, COUNT(pcul.id) as usage_count
         FROM project_context_items pci
         LEFT JOIN project_context_usage_log pcul ON pci.id = pcul.context_item_id
         WHERE pci.project_id = $1
         GROUP BY pci.id, pci.title, pci.type
         ORDER BY usage_count DESC, pci.created_at DESC
         LIMIT 10`,
        [projectId]
      )

      // Get recent items
      const recentResult = await pool.query(
        `SELECT id, title, type, created_at 
         FROM project_context_items 
         WHERE project_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [projectId]
      )

      // Get usage over time (last 30 days)
      const usageOverTimeResult = await pool.query(
        `SELECT 
          DATE(usage_timestamp) as date,
          COUNT(*) as count
         FROM project_context_usage_log
         WHERE project_id = $1 
           AND usage_timestamp >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(usage_timestamp)
         ORDER BY date ASC`,
        [projectId]
      )

      return {
        totalItems,
        itemsByType,
        activeItems,
        totalContentSize,
        mostUsedItems: mostUsedResult.rows.map((row) => ({
          id: row.id,
          title: row.title,
          type: row.type,
          usageCount: parseInt(row.usage_count, 10),
        })),
        recentItems: recentResult.rows.map((row) => ({
          id: row.id,
          title: row.title,
          type: row.type,
          created_at: row.created_at,
        })),
        usageOverTime: usageOverTimeResult.rows.map((row) => ({
          date: row.date.toISOString().split('T')[0],
          count: parseInt(row.count, 10),
        })),
      }
    } catch (error: any) {
      logger.error('Failed to get project context analytics', {
        projectId,
        error: error.message,
      })
      throw new Error(`Failed to get context analytics: ${error.message}`)
    }
  }

  /**
   * Get context items usage across multiple projects (for recommendations)
   */
  async getCrossProjectUsage(
    contextItemTitle?: string,
    contextItemType?: string
  ): Promise<ContextItemUsage[]> {
    try {
      let query = `
        SELECT 
          pci.id,
          pci.title,
          pci.type,
          COUNT(DISTINCT pcul.id) as usage_count,
          MAX(pcul.usage_timestamp) as last_used,
          ARRAY_AGG(DISTINCT pci.project_id) as projects_using
        FROM project_context_items pci
        LEFT JOIN project_context_usage_log pcul ON pci.id = pcul.context_item_id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      if (contextItemTitle) {
        paramCount++
        query += ` AND pci.title ILIKE $${paramCount}`
        params.push(`%${contextItemTitle}%`)
      }

      if (contextItemType) {
        paramCount++
        query += ` AND pci.type = $${paramCount}`
        params.push(contextItemType)
      }

      query += `
        GROUP BY pci.id, pci.title, pci.type
        HAVING COUNT(DISTINCT pci.project_id) > 1
        ORDER BY usage_count DESC, COUNT(DISTINCT pci.project_id) DESC
        LIMIT 50
      `

      const result = await pool.query(query, params)

      return result.rows.map((row) => ({
        contextItemId: row.id,
        title: row.title,
        type: row.type,
        usageCount: parseInt(row.usage_count, 10),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        projectsUsing: row.projects_using || [],
      }))
    } catch (error: any) {
      logger.error('Failed to get cross-project usage', {
        error: error.message,
      })
      throw new Error(`Failed to get cross-project usage: ${error.message}`)
    }
  }

  /**
   * Get context items used in a specific number of projects
   */
  async getItemsUsedInProjects(minProjects: number = 3): Promise<ContextItemUsage[]> {
    try {
      const result = await pool.query(
        `SELECT 
          pci.id,
          pci.title,
          pci.type,
          COUNT(DISTINCT pci.project_id) as project_count,
          COUNT(DISTINCT pcul.id) as usage_count,
          MAX(pcul.usage_timestamp) as last_used,
          ARRAY_AGG(DISTINCT pci.project_id) as projects_using
         FROM project_context_items pci
         LEFT JOIN project_context_usage_log pcul ON pci.id = pcul.context_item_id
         GROUP BY pci.id, pci.title, pci.type
         HAVING COUNT(DISTINCT pci.project_id) >= $1
         ORDER BY project_count DESC, usage_count DESC
         LIMIT 100`,
        [minProjects]
      )

      return result.rows.map((row) => ({
        contextItemId: row.id,
        title: row.title,
        type: row.type,
        usageCount: parseInt(row.usage_count, 10),
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        projectsUsing: row.projects_using || [],
      }))
    } catch (error: any) {
      logger.error('Failed to get items used in multiple projects', {
        minProjects,
        error: error.message,
      })
      throw new Error(`Failed to get cross-project items: ${error.message}`)
    }
  }
}

// Export singleton instance
export const contextAnalyticsService = new ContextAnalyticsService()
