/**
 * Context Extractors
 * 
 * Services for extracting context data from various sources in the ADPA system.
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import {
  ProjectContext,
  DocumentContext,
  TemplateContext,
  UserContext,
  IntegrationContext,
  ExtractionOptions,
  ContextError
} from './types'

export class ProjectContextExtractor {
  /**
   * Extract project context by ID
   */
  static async extractById(projectId: string, userId: string, options: ExtractionOptions = {}): Promise<ProjectContext | null> {
    try {
      const result = await pool.query(`
        SELECT p.*, u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.id = $1::uuid AND (
          p.owner_id = $2::uuid OR 
          $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members)) OR
          EXISTS (SELECT 1 FROM users WHERE id = $2::uuid AND role = 'admin')
        )
      `, [projectId, userId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        framework: row.framework,
        status: row.status,
        priority: row.priority,
        start_date: row.start_date,
        end_date: row.end_date,
        budget: row.budget,
        team_members: Array.isArray(row.team_members) ? row.team_members : [],
        settings: row.settings || {},
        metadata: options.include_metadata ? (row.metadata || {}) : {},
        owner_name: row.owner_name
      }
    } catch (error) {
      logger.error('Failed to extract project context:', error)
      throw new Error(`Project context extraction failed: ${error}`)
    }
  }

  /**
   * Extract multiple projects context for a user
   */
  static async extractForUser(userId: string, options: ExtractionOptions = {}): Promise<ProjectContext[]> {
    try {
      const result = await pool.query(`
        SELECT p.*, u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE (p.owner_id = $1::uuid OR $1::text = ANY(SELECT jsonb_array_elements_text(p.team_members)))
        ORDER BY p.updated_at DESC
        LIMIT 10
      `, [userId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        framework: row.framework,
        status: row.status,
        priority: row.priority,
        start_date: row.start_date,
        end_date: row.end_date,
        budget: row.budget,
        team_members: Array.isArray(row.team_members) ? row.team_members : [],
        settings: row.settings || {},
        metadata: options.include_metadata ? (row.metadata || {}) : {},
        owner_name: row.owner_name
      }))
    } catch (error) {
      logger.error('Failed to extract user projects context:', error)
      throw new Error(`User projects context extraction failed: ${error}`)
    }
  }
}

export class DocumentContextExtractor {
  /**
   * Extract document context by ID
   */
  static async extractById(documentId: string, userId: string, options: ExtractionOptions = {}): Promise<DocumentContext | null> {
    try {
      const result = await pool.query(`
        SELECT d.*
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = $1::uuid AND (
          p.owner_id = $2::uuid OR 
          $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members)) OR
          EXISTS (SELECT 1 FROM users WHERE id = $2::uuid AND role = 'admin')
        )
      `, [documentId, userId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      let content = row.content
      const snapshots = row.context_snapshots

      // Process content based on options and adaptive routing
      if (options.include_content) {
        if (snapshots && options.token_budget) {
          // Adaptive Routing: Pick the best summary based on budget
          // Since it's a single document, we use a percentage of the total context budget
          // dedicated to this specific document request.
          content = this.selectOptimalSnapshot(snapshots, row.content, options.token_budget)
        } else if (content) {
          if (options.content_format === 'summary') {
            content = this.summarizeContent(content, options.max_content_length)
          } else if (options.content_format === 'outline') {
            content = this.extractOutline(content)
          } else if (options.max_content_length) {
            content = this.truncateContent(content, options.max_content_length)
          }
        }
      } else if (!options.include_content) {
        content = undefined
      }

      return {
        id: row.id,
        project_id: row.project_id,
        name: row.name,
        content,
        context_snapshots: snapshots,
        template_id: row.template_id,
        version: row.version,
        status: row.status,
        framework: row.framework,
        metadata: options.include_metadata ? (row.metadata || {}) : {},
        created_by: row.created_by,
        updated_by: row.updated_by,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    } catch (error) {
      logger.error('Failed to extract document context:', error)
      throw new Error(`Document context extraction failed: ${error}`)
    }
  }

  /**
   * Extract multiple documents context for a project
   */
  static async extractForProject(projectId: string, userId: string, options: ExtractionOptions = {}): Promise<DocumentContext[]> {
    try {
      const result = await pool.query(`
        SELECT d.*
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.project_id = $1::uuid AND (
          p.owner_id = $2::uuid OR 
          $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members)) OR
          EXISTS (SELECT 1 FROM users WHERE id = $2::uuid AND role = 'admin')
        )
        ORDER BY d.updated_at DESC
        LIMIT 20
      `, [projectId, userId])

      const rows = result.rows
      const docCount = rows.length
      const perDocBudget = options.token_budget && docCount > 0 
        ? Math.floor(options.token_budget / docCount) 
        : undefined

      return rows.map(row => {
        let content = row.content
        const snapshots = row.context_snapshots

        // Process content based on options and adaptive routing
        if (options.include_content) {
          if (snapshots && perDocBudget) {
            content = this.selectOptimalSnapshot(snapshots, row.content, perDocBudget)
          } else if (content) {
            if (options.content_format === 'summary') {
              content = this.summarizeContent(content, options.max_content_length)
            } else if (options.content_format === 'outline') {
              content = this.extractOutline(content)
            } else if (options.max_content_length) {
              content = this.truncateContent(content, options.max_content_length)
            }
          }
        } else if (!options.include_content) {
          content = undefined
        }

        return {
          id: row.id,
          project_id: row.project_id,
          name: row.name,
          content,
          context_snapshots: snapshots,
          template_id: row.template_id,
          version: row.version,
          status: row.status,
          framework: row.framework,
          metadata: options.include_metadata ? (row.metadata || {}) : {},
          created_by: row.created_by,
          updated_by: row.updated_by,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
      })
    } catch (error) {
      logger.error('Failed to extract project documents context:', error)
      throw new Error(`Project documents context extraction failed: ${error}`)
    }
  }

  /**
   * Extract documents by IDs
   */
  static async extractByIds(documentIds: string[], userId: string, options: ExtractionOptions = {}): Promise<DocumentContext[]> {
    if (documentIds.length === 0) return []

    try {
      const placeholders = documentIds.map((_, i) => `$${i + 2}`).join(', ')
      const result = await pool.query(`
        SELECT d.*
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id IN (${placeholders}) AND (
          p.owner_id = $1::uuid OR 
          $1::text = ANY(SELECT jsonb_array_elements_text(p.team_members)) OR
          EXISTS (SELECT 1 FROM users WHERE id = $1::uuid AND role = 'admin')
        )
        ORDER BY d.updated_at DESC
      `, [userId, ...documentIds])

      const rows = result.rows
      const docCount = rows.length
      const perDocBudget = options.token_budget && docCount > 0 
        ? Math.floor(options.token_budget / docCount) 
        : undefined

      return rows.map(row => {
        let content = row.content
        const snapshots = row.context_snapshots

        // Process content based on options and adaptive routing
        if (options.include_content) {
          if (snapshots && perDocBudget) {
            content = this.selectOptimalSnapshot(snapshots, row.content, perDocBudget)
          } else if (content) {
            if (options.content_format === 'summary') {
              content = this.summarizeContent(content, options.max_content_length)
            } else if (options.content_format === 'outline') {
              content = this.extractOutline(content)
            } else if (options.max_content_length) {
              content = this.truncateContent(content, options.max_content_length)
            }
          }
        } else if (!options.include_content) {
          content = undefined
        }

        return {
          id: row.id,
          project_id: row.project_id,
          name: row.name,
          content,
          context_snapshots: snapshots,
          template_id: row.template_id,
          version: row.version,
          status: row.status,
          framework: row.framework,
          metadata: options.include_metadata ? (row.metadata || {}) : {},
          created_by: row.created_by,
          updated_by: row.updated_by,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
      })
    } catch (error) {
      logger.error('Failed to extract documents context by IDs:', error)
      throw new Error(`Documents context extraction failed: ${error}`)
    }
  }

  /**
   * Adaptive Context Router: Picks the optimal snapshot based on token budget.
   */
  private static selectOptimalSnapshot(snapshots: any, fullContent: string, budget: number): string {
    // Budget tiers for adaptive selection (per-document estimates)
    // Note: These are tuned for per-document budget allocation
    if (budget > 3000 && snapshots.p80) return snapshots.p80.summary || snapshots.p80
    if (budget > 1500 && snapshots.p60) return snapshots.p60.summary || snapshots.p60
    if (budget > 800 && snapshots.p40) return snapshots.p40.summary || snapshots.p40
    if (snapshots.p20) return snapshots.p20.summary || snapshots.p20

    // Fallback: Smart truncation of full content
    const { TokenManager } = require('./token-manager')
    return TokenManager.truncateToTokenLimit(fullContent, budget)
  }

  private static summarizeContent(content: any, maxLength?: number): any {
    if (!content) return content
    
    // If content is a string, truncate it
    if (typeof content === 'string') {
      const summary = content.substring(0, maxLength || 500)
      return summary.length < content.length ? summary + '...' : summary
    }
    
    // If content is an object, extract key fields
    if (typeof content === 'object') {
      const summary: any = {}
      
      // Common fields to include in summary
      const keyFields = ['title', 'summary', 'description', 'overview', 'introduction', 'conclusion']
      
      for (const field of keyFields) {
        if (content[field]) {
          summary[field] = typeof content[field] === 'string' 
            ? content[field].substring(0, maxLength || 200)
            : content[field]
        }
      }
      
      return Object.keys(summary).length > 0 ? summary : content
    }
    
    return content
  }

  private static extractOutline(content: any): any {
    if (!content) return content
    
    if (typeof content === 'string') {
      // Extract headings and first sentences
      const lines = content.split('\n')
      const outline = lines
        .filter(line => line.trim().startsWith('#') || line.trim().length > 0)
        .slice(0, 10)
        .join('\n')
      
      return outline || content.substring(0, 200)
    }
    
    if (typeof content === 'object') {
      const outline: any = {}
      
      // Extract structural elements
      const structuralFields = ['headings', 'sections', 'chapters', 'outline', 'structure']
      
      for (const field of structuralFields) {
        if (content[field]) {
          outline[field] = content[field]
        }
      }
      
      return Object.keys(outline).length > 0 ? outline : this.summarizeContent(content, 200)
    }
    
    return content
  }

  private static truncateContent(content: any, maxLength: number): any {
    if (!content) return content
    
    if (typeof content === 'string') {
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
    }
    
    if (typeof content === 'object') {
      const truncated: any = {}
      
      for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string') {
          truncated[key] = value.length > maxLength ? value.substring(0, maxLength) + '...' : value
        } else {
          truncated[key] = value
        }
      }
      
      return truncated
    }
    
    return content
  }
}

export class TemplateContextExtractor {
  /**
   * Extract template context by ID
   */
  static async extractById(templateId: string, userId: string, options: ExtractionOptions = {}): Promise<TemplateContext | null> {
    try {
      const result = await pool.query(`
        SELECT *
        FROM templates
        WHERE id = $1::uuid AND (is_public = true OR created_by = $2::uuid)
      `, [templateId, userId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        framework: row.framework,
        category: row.category,
        content: options.include_content ? row.content : undefined,
        variables: row.variables || [],
        is_public: row.is_public,
        usage_count: row.usage_count
      }
    } catch (error) {
      logger.error('Failed to extract template context:', error)
      throw new Error(`Template context extraction failed: ${error}`)
    }
  }

  /**
   * Extract templates for a framework
   */
  static async extractForFramework(framework: string, userId: string, options: ExtractionOptions = {}): Promise<TemplateContext[]> {
    try {
      const result = await pool.query(`
        SELECT *
        FROM templates
        WHERE framework = $1 AND (is_public = true OR created_by = $2::uuid)
        ORDER BY usage_count DESC, updated_at DESC
        LIMIT 10
      `, [framework, userId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        framework: row.framework,
        category: row.category,
        content: options.include_content ? row.content : undefined,
        variables: row.variables || [],
        is_public: row.is_public,
        usage_count: row.usage_count
      }))
    } catch (error) {
      logger.error('Failed to extract framework templates context:', error)
      throw new Error(`Framework templates context extraction failed: ${error}`)
    }
  }
}

export class UserContextExtractor {
  /**
   * Extract user context by ID
   */
  static async extractById(userId: string, options: ExtractionOptions = {}): Promise<UserContext | null> {
    try {
      const result = await pool.query(`
        SELECT id, name, email, role, permissions, avatar_url
        FROM users
        WHERE id = $1::uuid
      `, [userId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        permissions: options.include_metadata ? (row.permissions || {}) : {},
        avatar_url: row.avatar_url
      }
    } catch (error) {
      logger.error('Failed to extract user context:', error)
      throw new Error(`User context extraction failed: ${error}`)
    }
  }
}

export class IntegrationContextExtractor {
  /**
   * Extract active integrations context
   */
  static async extractActive(userId: string, options: ExtractionOptions = {}): Promise<IntegrationContext[]> {
    try {
      const result = await pool.query(`
        SELECT id, name, type, configuration, is_active, last_sync, sync_status
        FROM integrations
        WHERE is_active = true AND created_by = $1::uuid
        ORDER BY last_sync DESC
        LIMIT 5
      `, [userId])

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        configuration: options.include_metadata ? (row.configuration || {}) : {},
        is_active: row.is_active,
        last_sync: row.last_sync,
        sync_status: row.sync_status
      }))
    } catch (error) {
      logger.error('Failed to extract integrations context:', error)
      throw new Error(`Integrations context extraction failed: ${error}`)
    }
  }
}