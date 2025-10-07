/**
 * Context Repository
 * Main orchestrator for context data management across all stores
 */

import { logger } from '../../utils/logger'
import { ProjectContextStore } from './stores/projectContextStore'
import { UserProfileStore } from './stores/userProfileStore'
import { DocumentHistoryStore } from './stores/documentHistoryStore'
import type {
  ContextRepository as IContextRepository,
  ProjectContext,
  UserProfile,
  DocumentHistory,
  ProjectFilters,
  UserFilters,
  DocumentFilters
} from './types'

export class ContextRepository implements IContextRepository {
  public projectContext: ProjectContextStore
  public userProfiles: UserProfileStore
  public documentHistory: DocumentHistoryStore

  constructor() {
    this.projectContext = new ProjectContextStore()
    this.userProfiles = new UserProfileStore()
    this.documentHistory = new DocumentHistoryStore()
  }

  /**
   * Get comprehensive context for document generation
   */
  async getDocumentGenerationContext(params: {
    projectId?: string
    userId: string
    templateId: string
    framework?: string
    category?: string
  }): Promise<{
    project?: ProjectContext
    user: UserProfile
    similarDocuments: DocumentHistory[]
    patterns: any[]
    bestPractices: any[]
  }> {
    try {
      logger.debug('Getting document generation context', params)

      const { projectId, userId, templateId, framework, category } = params

      // Fetch all context data in parallel
      const [
        project,
        user,
        similarDocuments,
        patterns,
        bestPractices
      ] = await Promise.all([
        projectId ? this.projectContext.getProject(projectId) : Promise.resolve(null),
        this.userProfiles.getUserProfile(userId),
        this.documentHistory.getSimilarDocuments(templateId, projectId, 10),
        framework ? this.documentHistory.getDocumentPatterns(framework, category) : Promise.resolve([]),
        framework ? this.documentHistory.getBestPractices(framework, category) : Promise.resolve([])
      ])

      if (!user) {
        throw new Error(`User profile not found for user ID: ${userId}`)
      }

      const context = {
        project: project || undefined,
        user,
        similarDocuments,
        patterns,
        bestPractices
      }

      logger.info('Document generation context retrieved successfully', {
        project_id: projectId,
        user_id: userId,
        template_id: templateId,
        has_project: !!project,
        similar_documents_count: similarDocuments.length,
        patterns_count: patterns.length,
        best_practices_count: bestPractices.length
      })

      return context

    } catch (error) {
      logger.error('Failed to get document generation context', {
        params,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get context for AI prompt enhancement
   */
  async getPromptEnhancementContext(params: {
    userId: string
    framework: string
    category?: string
    projectId?: string
  }): Promise<{
    userExpertise: any
    userWritingStyle: any
    userPreferences: any
    frameworkPatterns: any[]
    frameworkBestPractices: any[]
    projectContext?: ProjectContext
  }> {
    try {
      logger.debug('Getting prompt enhancement context', params)

      const { userId, framework, category, projectId } = params

      // Fetch user-specific context
      const [
        userProfile,
        project
      ] = await Promise.all([
        this.userProfiles.getUserProfile(userId),
        projectId ? this.projectContext.getProject(projectId) : Promise.resolve(null)
      ])

      if (!userProfile) {
        throw new Error(`User profile not found for user ID: ${userId}`)
      }

      // Fetch framework-specific context
      const [
        frameworkPatterns,
        frameworkBestPractices
      ] = await Promise.all([
        this.documentHistory.getDocumentPatterns(framework, category),
        this.documentHistory.getBestPractices(framework, category)
      ])

      const context = {
        userExpertise: userProfile.expertise,
        userWritingStyle: userProfile.writing_style,
        userPreferences: userProfile.preferences,
        frameworkPatterns,
        frameworkBestPractices,
        projectContext: project || undefined
      }

      logger.info('Prompt enhancement context retrieved successfully', {
        user_id: userId,
        framework,
        category,
        project_id: projectId,
        has_project: !!project,
        patterns_count: frameworkPatterns.length,
        best_practices_count: frameworkBestPractices.length
      })

      return context

    } catch (error) {
      logger.error('Failed to get prompt enhancement context', {
        params,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get context for quality assessment
   */
  async getQualityAssessmentContext(params: {
    documentId: string
    framework: string
    category?: string
  }): Promise<{
    documentHistory: DocumentHistory
    similarDocuments: DocumentHistory[]
    qualityTrends: any[]
    bestPractices: any[]
  }> {
    try {
      logger.debug('Getting quality assessment context', params)

      const { documentId, framework, category } = params

      // Fetch document and related context
      const [
        documentHistory,
        similarDocuments,
        qualityTrends,
        bestPractices
      ] = await Promise.all([
        this.documentHistory.getDocumentHistory(documentId),
        this.documentHistory.getSimilarDocuments(documentHistory?.template_id || '', undefined, 5),
        this.documentHistory.getQualityTrends('monthly'),
        this.documentHistory.getBestPractices(framework, category)
      ])

      if (!documentHistory) {
        throw new Error(`Document history not found for document ID: ${documentId}`)
      }

      const context = {
        documentHistory,
        similarDocuments,
        qualityTrends,
        bestPractices
      }

      logger.info('Quality assessment context retrieved successfully', {
        document_id: documentId,
        framework,
        category,
        similar_documents_count: similarDocuments.length,
        quality_trends_count: qualityTrends.length,
        best_practices_count: bestPractices.length
      })

      return context

    } catch (error) {
      logger.error('Failed to get quality assessment context', {
        params,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Search across all context stores
   */
  async searchContext(query: string, filters?: {
    projects?: ProjectFilters
    users?: UserFilters
    documents?: DocumentFilters
  }): Promise<{
    projects: ProjectContext[]
    users: UserProfile[]
    documents: DocumentHistory[]
  }> {
    try {
      logger.debug('Searching context across all stores', { query, filters })

      const [
        projects,
        users,
        documents
      ] = await Promise.all([
        this.projectContext.searchProjects(query, filters?.projects),
        this.userProfiles.searchUsers(query, filters?.users),
        this.documentHistory.searchDocuments(query, filters?.documents)
      ])

      const results = {
        projects,
        users,
        documents
      }

      logger.info('Context search completed successfully', {
        query,
        projects_count: projects.length,
        users_count: users.length,
        documents_count: documents.length
      })

      return results

    } catch (error) {
      logger.error('Failed to search context', {
        query,
        filters,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get context recommendations for a user
   */
  async getContextRecommendations(userId: string): Promise<{
    recommendedProjects: ProjectContext[]
    recommendedUsers: UserProfile[]
    recommendedDocuments: DocumentHistory[]
    expertiseGaps: string[]
    improvementAreas: string[]
  }> {
    try {
      logger.debug('Getting context recommendations', { user_id: userId })

      const userProfile = await this.userProfiles.getUserProfile(userId)
      if (!userProfile) {
        throw new Error(`User profile not found for user ID: ${userId}`)
      }

      // Get user's recent documents to understand their work patterns
      const recentDocuments = await this.documentHistory.getDocumentsByUser(userId, 10)

      // Analyze user's expertise and find gaps
      const expertiseGaps = this.analyzeExpertiseGaps(userProfile.expertise)
      const improvementAreas = this.analyzeImprovementAreas(recentDocuments)

      // Get recommendations based on user's profile and work patterns
      const [
        recommendedProjects,
        recommendedUsers,
        recommendedDocuments
      ] = await Promise.all([
        this.getRecommendedProjects(userProfile, recentDocuments),
        this.getRecommendedUsers(userProfile),
        this.getRecommendedDocuments(userProfile, recentDocuments)
      ])

      const recommendations = {
        recommendedProjects,
        recommendedUsers,
        recommendedDocuments,
        expertiseGaps,
        improvementAreas
      }

      logger.info('Context recommendations generated successfully', {
        user_id: userId,
        recommended_projects_count: recommendedProjects.length,
        recommended_users_count: recommendedUsers.length,
        recommended_documents_count: recommendedDocuments.length,
        expertise_gaps_count: expertiseGaps.length,
        improvement_areas_count: improvementAreas.length
      })

      return recommendations

    } catch (error) {
      logger.error('Failed to get context recommendations', {
        user_id: userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get context statistics and metrics
   */
  async getContextMetrics(): Promise<{
    totalProjects: number
    totalUsers: number
    totalDocuments: number
    frameworkDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
    qualityTrends: any[]
    activeUsers: number
    recentActivity: any[]
  }> {
    try {
      logger.debug('Getting context metrics')

      // This would typically involve more complex queries and aggregations
      // For now, we'll return basic metrics
      const metrics = {
        totalProjects: 0,
        totalUsers: 0,
        totalDocuments: 0,
        frameworkDistribution: {},
        categoryDistribution: {},
        qualityTrends: [],
        activeUsers: 0,
        recentActivity: []
      }

      logger.info('Context metrics retrieved successfully', metrics)

      return metrics

    } catch (error) {
      logger.error('Failed to get context metrics', {
        error: error.message
      })
      throw error
    }
  }

  private analyzeExpertiseGaps(expertise: any): string[] {
    // Analyze user's expertise and identify potential gaps
    const gaps: string[] = []

    if (expertise.experience_years < 2) {
      gaps.push('Consider gaining more hands-on experience in your domain')
    }

    if (expertise.certifications.length === 0) {
      gaps.push('Consider obtaining relevant certifications')
    }

    if (expertise.methodologies.length < 2) {
      gaps.push('Explore additional methodologies to broaden your approach')
    }

    return gaps
  }

  private analyzeImprovementAreas(documents: DocumentHistory[]): string[] {
    // Analyze document quality and identify improvement areas
    const areas: string[] = []

    const avgQualityScore = documents.reduce((sum, doc) => {
      return sum + (doc.quality_score || 0)
    }, 0) / documents.length

    if (avgQualityScore < 7) {
      areas.push('Focus on improving document quality and clarity')
    }

    if (documents.length < 5) {
      areas.push('Create more documents to build experience and patterns')
    }

    return areas
  }

  private async getRecommendedProjects(userProfile: any, recentDocuments: DocumentHistory[]): Promise<ProjectContext[]> {
    // Get projects that match user's expertise and recent work
    const frameworks = recentDocuments.map(doc => doc.framework).filter(Boolean)
    const uniqueFrameworks = [...new Set(frameworks)]

    if (uniqueFrameworks.length === 0) {
      return []
    }

    // Search for projects using the most common framework
    const mostCommonFramework = uniqueFrameworks[0]
    return this.projectContext.searchProjects('', { framework: [mostCommonFramework] })
  }

  private async getRecommendedUsers(userProfile: any): Promise<UserProfile[]> {
    // Get users with similar expertise or complementary skills
    if (userProfile.expertise.domains.length === 0) {
      return []
    }

    const primaryDomain = userProfile.expertise.domains[0]
    return this.userProfiles.getUsersByExpertise(primaryDomain, 'senior')
  }

  private async getRecommendedDocuments(userProfile: any, recentDocuments: DocumentHistory[]): Promise<DocumentHistory[]> {
    // Get documents that could help improve user's work
    const frameworks = recentDocuments.map(doc => doc.framework).filter(Boolean)
    const uniqueFrameworks = [...new Set(frameworks)]

    if (uniqueFrameworks.length === 0) {
      return []
    }

    const recommendedDocs: DocumentHistory[] = []
    for (const framework of uniqueFrameworks) {
      const docs = await this.documentHistory.getDocumentsByFramework(framework, 5)
      recommendedDocs.push(...docs)
    }

    return recommendedDocs.slice(0, 10) // Limit to 10 recommendations
  }
}
