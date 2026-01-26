/**
 * Context Recommendation Service
 * 
 * Analyzes context usage patterns and provides recommendations for:
 * - Template creation from frequently used context
 * - Project standards documents
 * - Portfolio/program-level standardization
 * 
 * @module contextRecommendationService
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { contextAnalyticsService } from './contextAnalyticsService'

export interface ContextPattern {
  contextItemId: string
  title: string
  type: string
  usageCount: number
  projects: string[]
  similarityScore: number
  recommendationType: 'template' | 'standard' | 'portfolio_standard'
}

export interface TemplateSuggestion {
  suggestedTemplateName: string
  basedOnContextItems: string[]
  estimatedUsage: number
  templateStructure?: any
  action: 'create_template' | 'create_standards_doc' | 'create_portfolio_standard'
  priority: 'high' | 'medium' | 'low'
}

export interface ContextRecommendation {
  id: string
  type: 'template' | 'standard' | 'portfolio_standard' | 'missing_context'
  title: string
  message: string
  action: string
  priority: 'high' | 'medium' | 'low'
  metadata?: any
}

export interface PortfolioContextInsights {
  sharedContextItems: Array<{
    title: string
    type: string
    projectCount: number
    projects: string[]
  }>
  recommendations: ContextRecommendation[]
  templateSuggestions: TemplateSuggestion[]
  standardsRecommendations: Array<{
    title: string
    description: string
    estimatedImpact: number
  }>
}

export class ContextRecommendationService {
  /**
   * Analyze context patterns across projects
   */
  async analyzeContextPatterns(portfolioId?: string): Promise<{
    patterns: ContextPattern[]
    recommendations: ContextRecommendation[]
  }> {
    try {
      // Get items used in 3+ projects
      const crossProjectItems = await contextAnalyticsService.getItemsUsedInProjects(3)

      const patterns: ContextPattern[] = crossProjectItems.map((item) => {
        const projectCount = item.projectsUsing.length
        let recommendationType: 'template' | 'standard' | 'portfolio_standard'

        if (projectCount >= 10) {
          recommendationType = 'portfolio_standard'
        } else if (projectCount >= 5) {
          recommendationType = 'standard'
        } else {
          recommendationType = 'template'
        }

        return {
          contextItemId: item.contextItemId,
          title: item.title,
          type: item.type,
          usageCount: item.usageCount,
          projects: item.projectsUsing,
          similarityScore: projectCount / 10, // Normalized score
          recommendationType,
        }
      })

      // Generate recommendations
      const recommendations: ContextRecommendation[] = patterns.map((pattern) => {
        const projectCount = pattern.projects.length
        let message = ''
        let action = ''

        if (pattern.recommendationType === 'template') {
          message = `This ${pattern.type} is used in ${projectCount} projects. Consider creating a template.`
          action = 'create_template'
        } else if (pattern.recommendationType === 'standard') {
          message = `This ${pattern.type} is used in ${projectCount} projects. Consider creating a project standards document.`
          action = 'create_standards_doc'
        } else {
          message = `This ${pattern.type} is used in ${projectCount} projects. Consider creating a portfolio standard.`
          action = 'create_portfolio_standard'
        }

        return {
          id: pattern.contextItemId,
          type: pattern.recommendationType,
          title: pattern.title,
          message,
          action,
          priority: projectCount >= 10 ? 'high' : projectCount >= 5 ? 'medium' : 'low',
          metadata: {
            projectCount,
            projects: pattern.projects,
            usageCount: pattern.usageCount,
          },
        }
      })

      return { patterns, recommendations }
    } catch (error: any) {
      logger.error('Failed to analyze context patterns', {
        portfolioId,
        error: error.message,
      })
      throw new Error(`Failed to analyze context patterns: ${error.message}`)
    }
  }

  /**
   * Get recommendations for a specific project
   */
  async getRecommendations(projectId: string): Promise<ContextRecommendation[]> {
    try {
      const recommendations: ContextRecommendation[] = []

      // Get cross-project patterns
      const crossProjectItems = await contextAnalyticsService.getItemsUsedInProjects(3)

      // Find items used in similar projects
      const projectContextItems = await pool.query(
        `SELECT id, title, type FROM project_context_items WHERE project_id = $1`,
        [projectId]
      )

      // Check for missing context that similar projects use
      for (const crossItem of crossProjectItems.slice(0, 10)) {
        // Check if this project already has this context
        const hasItem = projectContextItems.rows.some(
          (item) => item.title.toLowerCase() === crossItem.title.toLowerCase()
        )

        if (!hasItem) {
          recommendations.push({
            id: `missing-${crossItem.contextItemId}`,
            type: 'missing_context',
            title: crossItem.title,
            message: `Similar projects use "${crossItem.title}". Consider adding it to this project.`,
            action: 'add_context',
            priority: crossItem.projectsUsing.length >= 5 ? 'high' : 'medium',
            metadata: {
              contextItemId: crossItem.contextItemId,
              type: crossItem.type,
              projectCount: crossItem.projectsUsing.length,
            },
          })
        }
      }

      // Get template suggestions
      const templateSuggestions = await this.suggestTemplates(projectId)
      recommendations.push(
        ...templateSuggestions.map((suggestion) => ({
          id: `template-${suggestion.suggestedTemplateName}`,
          type: 'template' as const,
          title: suggestion.suggestedTemplateName,
          message: `Create template "${suggestion.suggestedTemplateName}" based on frequently used context?`,
          action: suggestion.action,
          priority: suggestion.priority,
          metadata: {
            estimatedUsage: suggestion.estimatedUsage,
            basedOnContextItems: suggestion.basedOnContextItems,
          },
        }))
      )

      return recommendations
    } catch (error: any) {
      logger.error('Failed to get recommendations', {
        projectId,
        error: error.message,
      })
      throw new Error(`Failed to get recommendations: ${error.message}`)
    }
  }

  /**
   * Suggest templates based on context patterns
   */
  async suggestTemplates(projectId: string): Promise<TemplateSuggestion[]> {
    try {
      const suggestions: TemplateSuggestion[] = []

      // Get items used in multiple projects
      const crossProjectItems = await contextAnalyticsService.getItemsUsedInProjects(3)

      // Group by type and find common patterns
      const itemsByType: Record<string, typeof crossProjectItems> = {}
      crossProjectItems.forEach((item) => {
        if (!itemsByType[item.type]) {
          itemsByType[item.type] = []
        }
        itemsByType[item.type].push(item)
      })

      // Generate suggestions for each type with 3+ items
      for (const [type, items] of Object.entries(itemsByType)) {
        if (items.length >= 3) {
          const projectCount = Math.max(...items.map((i) => i.projectsUsing.length))
          let action: 'create_template' | 'create_standards_doc' | 'create_portfolio_standard'
          let priority: 'high' | 'medium' | 'low'

          if (projectCount >= 10) {
            action = 'create_portfolio_standard'
            priority = 'high'
          } else if (projectCount >= 5) {
            action = 'create_standards_doc'
            priority = 'medium'
          } else {
            action = 'create_template'
            priority = 'low'
          }

          suggestions.push({
            suggestedTemplateName: `${type.charAt(0).toUpperCase() + type.slice(1)} Reference Template`,
            basedOnContextItems: items.map((i) => i.contextItemId),
            estimatedUsage: projectCount,
            action,
            priority,
          })
        }
      }

      return suggestions
    } catch (error: any) {
      logger.error('Failed to suggest templates', {
        projectId,
        error: error.message,
      })
      throw new Error(`Failed to suggest templates: ${error.message}`)
    }
  }

  /**
   * Get portfolio/program-level insights
   */
  async getPortfolioInsights(portfolioId: string): Promise<PortfolioContextInsights> {
    try {
      // Get all projects in portfolio
      const projectsResult = await pool.query(
        `SELECT id FROM projects WHERE program_id IN (
          SELECT id FROM programs WHERE portfolio_id = $1
        ) OR id IN (
          SELECT project_id FROM program_projects WHERE program_id IN (
            SELECT id FROM programs WHERE portfolio_id = $1
          )
        )`,
        [portfolioId]
      )

      const projectIds = projectsResult.rows.map((row) => row.id)

      if (projectIds.length === 0) {
        return {
          sharedContextItems: [],
          recommendations: [],
          templateSuggestions: [],
          standardsRecommendations: [],
        }
      }

      // Get shared context items across projects
      const sharedResult = await pool.query(
        `SELECT 
          pci.title,
          pci.type,
          COUNT(DISTINCT pci.project_id) as project_count,
          ARRAY_AGG(DISTINCT pci.project_id) as projects
         FROM project_context_items pci
         WHERE pci.project_id = ANY($1)
         GROUP BY pci.title, pci.type
         HAVING COUNT(DISTINCT pci.project_id) >= 3
         ORDER BY project_count DESC`,
        [projectIds]
      )

      const sharedContextItems = sharedResult.rows.map((row) => ({
        title: row.title,
        type: row.type,
        projectCount: parseInt(row.project_count, 10),
        projects: row.projects || [],
      }))

      // Get recommendations
      const { recommendations } = await this.analyzeContextPatterns(portfolioId)

      // Get template suggestions
      const templateSuggestions: TemplateSuggestion[] = []
      for (const shared of sharedContextItems.slice(0, 10)) {
        if (shared.projectCount >= 10) {
          templateSuggestions.push({
            suggestedTemplateName: `Portfolio Standard: ${shared.title}`,
            basedOnContextItems: [],
            estimatedUsage: shared.projectCount,
            action: 'create_portfolio_standard',
            priority: 'high',
          })
        } else if (shared.projectCount >= 5) {
          templateSuggestions.push({
            suggestedTemplateName: `Program Standard: ${shared.title}`,
            basedOnContextItems: [],
            estimatedUsage: shared.projectCount,
            action: 'create_standards_doc',
            priority: 'medium',
          })
        }
      }

      // Standards recommendations
      const standardsRecommendations = sharedContextItems
        .filter((item) => item.projectCount >= 5)
        .map((item) => ({
          title: item.title,
          description: `Used in ${item.projectCount} projects across the portfolio`,
          estimatedImpact: item.projectCount,
        }))

      return {
        sharedContextItems,
        recommendations: recommendations.slice(0, 20),
        templateSuggestions,
        standardsRecommendations,
      }
    } catch (error: any) {
      logger.error('Failed to get portfolio insights', {
        portfolioId,
        error: error.message,
      })
      throw new Error(`Failed to get portfolio insights: ${error.message}`)
    }
  }
}

// Export singleton instance
export const contextRecommendationService = new ContextRecommendationService()
