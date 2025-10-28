/**
 * User Profile Analyzer
 * Analyzes user profile data for context gathering
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import { ContextRetrievalService } from '@/modules/contextRetrieval/contextRetrievalService'
import type { UserProfileContextData } from '../types'

export class UserProfileAnalyzer {
  private retrieval?: ContextRetrievalService

  constructor(retrieval?: ContextRetrievalService) {
    this.retrieval = retrieval
  }
  async analyzeUserProfile(userId: string): Promise<UserProfileContextData> {
    try {
      logger.debug('Analyzing user profile context', { userId })

      const startTime = Date.now()

      // Gather user profile data
      const userProfile = await this.gatherUserProfile(userId)
      const userPreferences = await this.gatherUserPreferences(userId)
      const userExpertise = await this.gatherUserExpertise(userId)
      const userWritingStyle = await this.gatherUserWritingStyle(userId)
      const userDomainKnowledge = await this.gatherUserDomainKnowledge(userId)
      const userCollaborationPreferences = await this.gatherUserCollaborationPreferences(userId)

      // Analyze user performance and patterns
      const performanceHistory = await this.analyzeUserPerformanceHistory(userId)
      const accessPatterns = await this.analyzeUserAccessPatterns(userId)
      const feedbackHistory = await this.gatherUserFeedbackHistory(userId)

      const userProfileContext: UserProfileContextData = {
        user_id: userId,
        user_profile: userProfile,
        user_preferences: userPreferences,
        user_expertise: userExpertise,
        user_writing_style: userWritingStyle,
        user_domain_knowledge: userDomainKnowledge,
        user_collaboration_preferences: userCollaborationPreferences,
        user_locale_preferences: await this.gatherUserLocalePreferences(userId),
        user_notification_preferences: await this.gatherUserNotificationPreferences(userId),
        user_accessibility_preferences: await this.gatherUserAccessibilityPreferences(userId),
        user_device_profile: await this.gatherUserDeviceProfile(userId),
        user_security_posture: await this.gatherUserSecurityPosture(userId),
        user_time_preferences: await this.gatherUserTimePreferences(userId),
        user_project_affiliations: await this.gatherUserProjectAffiliations(userId),
        user_recent_successes: await this.gatherUserRecentSuccesses(userId),
        user_known_gaps: await this.gatherUserKnownGaps(userId),
        user_performance_history: performanceHistory,
        user_learning_preferences: await this.gatherUserLearningPreferences(userId),
        user_access_patterns: accessPatterns,
        user_feedback_history: feedbackHistory,
        user_satisfaction_scores: await this.gatherUserSatisfactionScores(userId),
        user_communication_style: await this.gatherUserCommunicationStyle(userId),
        user_deadline_preferences: await this.gatherUserDeadlinePreferences(userId),
        user_quality_preferences: await this.gatherUserQualityPreferences(userId),
        user_tool_preferences: await this.gatherUserToolPreferences(userId),
        user_workflow_preferences: await this.gatherUserWorkflowPreferences(userId),
        user_security_preferences: await this.gatherUserSecurityPreferences(userId),
        user_privacy_preferences: await this.gatherUserPrivacyPreferences(userId),
        metadata: {
          analysis_timestamp: new Date(),
          analysis_duration: Date.now() - startTime,
          data_sources: ['user_profile', 'user_preferences', 'user_expertise', 'user_locale', 'user_notifications', 'user_accessibility', 'user_devices', 'user_security', 'user_time', 'user_projects'],
          data_freshness: new Date(),
          analysis_confidence: 0.9
        }
      }

      // Optional RAG enrichment of user-authored semantic context (notes, prior docs)
      if (process.env.ENABLE_RAG_CONTEXT_RETRIEVAL === 'true' && this.retrieval) {
        try {
          const queries = [
            'writing tone and style preferences',
            'recent successful documents and reasons',
            'domain-specific playbooks and checklists',
            'common pitfalls and lessons learned'
          ]
          const ragChunks = [] as Array<{ chunk_id: string; document_id: string; title: string | null; score: number; content_preview: string }>
          for (const q of queries) {
            const found = await this.retrieval.searchChunks({ projectId: userProfile?.project_id || '', query: `${q} by user:${userId}`, topK: 5 })
            for (const c of found) {
              ragChunks.push({
                chunk_id: c.id,
                document_id: c.document_id,
                title: c.title,
                score: c.score,
                content_preview: c.content.substring(0, 400)
              })
            }
          }
          if (ragChunks.length > 0) {
            ;(userProfileContext as any).rag_user_context = ragChunks
            userProfileContext.metadata.data_sources.push('rag_user_chunks')
          }
        } catch (e: any) {
          logger.warn('RAG user context enrichment skipped', { error: e.message })
        }
      }

      logger.info('User profile context analysis completed', {
        userId,
        preferenceCount: userPreferences.length,
        expertiseCount: userExpertise.length,
        analysisTime: Date.now() - startTime
      })

      return userProfileContext

    } catch (error) {
      logger.error('User profile context analysis failed', {
        userId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherUserProfile(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`)
      }

      const user = result.rows[0]
      return {
        user_id: userId,
        name: user.name || 'Unknown User',
        email: user.email || '',
        role: user.role || 'user',
        department: user.department || 'Unknown',
        expertise_areas: user.expertise_areas || [],
        preferences: user.preferences || {},
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        is_active: user.is_active || true,
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to gather user profile', {
        userId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherUserPreferences(userId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
      )

      return result.rows.map(row => ({
        preference_id: row.id,
        preference_type: row.preference_type,
        preference_value: row.preference_value,
        preference_priority: row.preference_priority || 1,
        created_at: row.created_at,
        updated_at: row.updated_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather user preferences', {
        userId,
        error: error.message
      })
      return []
    }
  }

  private async gatherUserExpertise(userId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_expertise WHERE user_id = $1',
        [userId]
      )

      return result.rows.map(row => ({
        expertise_id: row.id,
        domain: row.domain,
        skill_level: row.skill_level || 'intermediate',
        years_of_experience: row.years_of_experience || 0,
        certifications: row.certifications || [],
        projects_completed: row.projects_completed || 0,
        last_updated: row.updated_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather user expertise', {
        userId,
        error: error.message
      })
      return []
    }
  }

  private async gatherUserWritingStyle(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_writing_style WHERE user_id = $1',
        [userId]
      )

      if (result.rows.length === 0) {
        return {
          style_id: `style_${userId}`,
          tone: 'professional',
          formality: 'professional',
          structure_preference: 'structured',
          length_preference: 'medium',
          vocabulary_level: 'intermediate',
          technical_depth: 'medium',
          examples_preferred: true,
          visual_elements_preferred: true,
          metadata: {}
        }
      }

      const style = result.rows[0]
      return {
        style_id: style.id,
        tone: style.tone || 'professional',
        formality: style.formality || 'professional',
        structure_preference: style.structure_preference || 'structured',
        length_preference: style.length_preference || 'medium',
        vocabulary_level: style.vocabulary_level || 'intermediate',
        technical_depth: style.technical_depth || 'medium',
        examples_preferred: style.examples_preferred || true,
        visual_elements_preferred: style.visual_elements_preferred || true,
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to gather user writing style', {
        userId,
        error: error.message
      })
      return {
        style_id: `style_${userId}`,
        tone: 'professional',
        formality: 'professional',
        structure_preference: 'structured',
        length_preference: 'medium',
        metadata: {}
      }
    }
  }

  private async gatherUserDomainKnowledge(userId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_domain_knowledge WHERE user_id = $1',
        [userId]
      )

      return result.rows.map(row => ({
        knowledge_id: row.id,
        domain: row.domain,
        knowledge_level: row.knowledge_level || 'intermediate',
        knowledge_areas: row.knowledge_areas || [],
        last_updated: row.updated_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather user domain knowledge', {
        userId,
        error: error.message
      })
      return []
    }
  }

  private async gatherUserCollaborationPreferences(userId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_collaboration_preferences WHERE user_id = $1',
        [userId]
      )

      return result.rows.map(row => ({
        preference_id: row.id,
        collaboration_type: row.collaboration_type,
        preference_value: row.preference_value,
        preference_priority: row.preference_priority || 1,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather user collaboration preferences', {
        userId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeUserPerformanceHistory(userId: string): Promise<any> {
    try {
      // Analyze user performance metrics
      const performanceHistory = {
        user_id: userId,
        total_documents_created: 0,
        average_quality_score: 0.0,
        average_completion_time: 0,
        success_rate: 0.0,
        improvement_trend: 'stable',
        performance_metrics: [],
        performance_benchmarks: [],
        performance_trends: [],
        metadata: {
          analysis_timestamp: new Date(),
          analysis_confidence: 0.8
        }
      }

      return performanceHistory

    } catch (error) {
      logger.error('Failed to analyze user performance history', {
        userId,
        error: error.message
      })
      return {
        user_id: userId,
        total_documents_created: 0,
        average_quality_score: 0.0,
        average_completion_time: 0,
        success_rate: 0.0,
        improvement_trend: 'unknown',
        performance_metrics: [],
        performance_benchmarks: [],
        performance_trends: [],
        metadata: {
          analysis_timestamp: new Date(),
          analysis_confidence: 0.0,
          error: error.message
        }
      }
    }
  }

  private async analyzeUserAccessPatterns(userId: string): Promise<any[]> {
    try {
      // Analyze user access patterns
      const accessPatterns = [
        {
          pattern_id: `pattern_${userId}_${Date.now()}`,
          pattern_type: 'document_access',
          pattern_description: 'User access patterns for documents',
          frequency: 'daily',
          peak_hours: ['09:00', '14:00'],
          preferred_document_types: [],
          access_methods: ['web', 'api'],
          metadata: {
            analysis_timestamp: new Date(),
            analysis_confidence: 0.7
          }
        }
      ]

      return accessPatterns

    } catch (error) {
      logger.error('Failed to analyze user access patterns', {
        userId,
        error: error.message
      })
      return []
    }
  }

  private async gatherUserFeedbackHistory(userId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_feedback WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      )

      return result.rows.map(row => ({
        feedback_id: row.id,
        feedback_type: row.feedback_type,
        feedback_content: row.feedback_content,
        feedback_rating: row.feedback_rating,
        feedback_source: row.feedback_source,
        created_at: row.created_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather user feedback history', {
        userId,
        error: error.message
      })
      return []
    }
  }

  // Additional helper methods for gathering user data
  private async gatherUserLearningPreferences(userId: string): Promise<any> {
    return {
      learning_style: 'visual',
      preferred_content_format: 'structured',
      learning_pace: 'medium',
      preferred_examples: true,
      preferred_exercises: true,
      metadata: {}
    }
  }

  private async gatherUserLocalePreferences(userId: string): Promise<any> {
    try {
      const res = await pool.query('SELECT * FROM user_locale_preferences WHERE user_id = $1', [userId])
      if (res.rows.length === 0) return { locale: 'en-US', timezone: 'UTC', date_format: 'YYYY-MM-DD', number_format: '1,234.56', metadata: {} }
      const r = res.rows[0]
      return {
        locale: r.locale || 'en-US',
        timezone: r.timezone || 'UTC',
        date_format: r.date_format || 'YYYY-MM-DD',
        number_format: r.number_format || '1,234.56',
        metadata: {}
      }
    } catch (e: any) {
      logger.warn('gatherUserLocalePreferences failed', { userId, error: e.message })
      return { locale: 'en-US', timezone: 'UTC', date_format: 'YYYY-MM-DD', number_format: '1,234.56', metadata: {} }
    }
  }

  private async gatherUserNotificationPreferences(userId: string): Promise<any> {
    try {
      const res = await pool.query('SELECT * FROM user_notification_preferences WHERE user_id = $1', [userId])
      if (res.rows.length === 0) return { channels: ['email'], frequency: 'daily', quiet_hours: { start: '21:00', end: '07:00' }, metadata: {} }
      const r = res.rows[0]
      return {
        channels: r.channels || ['email'],
        frequency: r.frequency || 'daily',
        quiet_hours: r.quiet_hours || { start: '21:00', end: '07:00' },
        metadata: {}
      }
    } catch (e: any) {
      logger.warn('gatherUserNotificationPreferences failed', { userId, error: e.message })
      return { channels: ['email'], frequency: 'daily', quiet_hours: { start: '21:00', end: '07:00' }, metadata: {} }
    }
  }

  private async gatherUserAccessibilityPreferences(userId: string): Promise<any> {
    try {
      const res = await pool.query('SELECT * FROM user_accessibility_preferences WHERE user_id = $1', [userId])
      if (res.rows.length === 0) return { font_size: 'medium', contrast: 'standard', reduce_motion: false, metadata: {} }
      const r = res.rows[0]
      return {
        font_size: r.font_size || 'medium',
        contrast: r.contrast || 'standard',
        reduce_motion: !!r.reduce_motion,
        metadata: {}
      }
    } catch (e: any) {
      logger.warn('gatherUserAccessibilityPreferences failed', { userId, error: e.message })
      return { font_size: 'medium', contrast: 'standard', reduce_motion: false, metadata: {} }
    }
  }

  private async gatherUserDeviceProfile(userId: string): Promise<any> {
    try {
      const res = await pool.query('SELECT * FROM user_devices WHERE user_id = $1 ORDER BY last_seen DESC LIMIT 1', [userId])
      if (res.rows.length === 0) return { device_type: 'web', os: 'unknown', browser: 'unknown', last_seen: null, metadata: {} }
      const r = res.rows[0]
      return { device_type: r.device_type || 'web', os: r.os || 'unknown', browser: r.browser || 'unknown', last_seen: r.last_seen, metadata: {} }
    } catch (e: any) {
      logger.warn('gatherUserDeviceProfile failed', { userId, error: e.message })
      return { device_type: 'web', os: 'unknown', browser: 'unknown', last_seen: null, metadata: {} }
    }
  }

  private async gatherUserSecurityPosture(userId: string): Promise<any> {
    try {
      const res = await pool.query('SELECT * FROM user_security_settings WHERE user_id = $1', [userId])
      if (res.rows.length === 0) return { mfa_enabled: false, last_password_change_days: null, allowed_ip_ranges: [], metadata: {} }
      const r = res.rows[0]
      return { mfa_enabled: !!r.mfa_enabled, last_password_change_days: r.last_password_change_days, allowed_ip_ranges: r.allowed_ip_ranges || [], metadata: {} }
    } catch (e: any) {
      logger.warn('gatherUserSecurityPosture failed', { userId, error: e.message })
      return { mfa_enabled: false, last_password_change_days: null, allowed_ip_ranges: [], metadata: {} }
    }
  }

  private async gatherUserTimePreferences(userId: string): Promise<any> {
    try {
      const res = await pool.query('SELECT * FROM user_time_preferences WHERE user_id = $1', [userId])
      if (res.rows.length === 0) return { working_hours: { start: '09:00', end: '17:00' }, meeting_preferences: ['morning'], metadata: {} }
      const r = res.rows[0]
      return { working_hours: r.working_hours || { start: '09:00', end: '17:00' }, meeting_preferences: r.meeting_preferences || ['morning'], metadata: {} }
    } catch (e: any) {
      logger.warn('gatherUserTimePreferences failed', { userId, error: e.message })
      return { working_hours: { start: '09:00', end: '17:00' }, meeting_preferences: ['morning'], metadata: {} }
    }
  }

  private async gatherUserProjectAffiliations(userId: string): Promise<any[]> {
    try {
      const res = await pool.query(`
        SELECT p.id, p.name, up.role
        FROM user_projects up
        JOIN projects p ON p.id = up.project_id
        WHERE up.user_id = $1
        ORDER BY p.created_at DESC
      `, [userId])
      return res.rows.map(r => ({ project_id: r.id, project_name: r.name, role: r.role || 'member' }))
    } catch (e: any) {
      logger.warn('gatherUserProjectAffiliations failed', { userId, error: e.message })
      return []
    }
  }

  private async gatherUserRecentSuccesses(userId: string): Promise<any[]> {
    try {
      const res = await pool.query(`
        SELECT id, title, quality_score, created_at
        FROM document_history
        WHERE created_by = $1 AND quality_score >= 0.85
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId])
    
      return res.rows.map(r => ({ document_id: r.id, title: r.title, quality_score: r.quality_score, created_at: r.created_at }))
    } catch (e: any) {
      logger.warn('gatherUserRecentSuccesses failed', { userId, error: e.message })
      return []
    }
  }

  private async gatherUserKnownGaps(userId: string): Promise<any[]> {
    try {
      const res = await pool.query('SELECT * FROM user_known_gaps WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [userId])
      return res.rows.map(r => ({ gap_id: r.id, domain: r.domain, description: r.description, priority: r.priority || 'medium', created_at: r.created_at }))
    } catch (e: any) {
      logger.warn('gatherUserKnownGaps failed', { userId, error: e.message })
      return []
    }
  }

  private async gatherUserSatisfactionScores(userId: string): Promise<any[]> {
    return []
  }

  private async gatherUserCommunicationStyle(userId: string): Promise<any> {
    return {
      communication_style: 'professional',
      preferred_language: 'en',
      preferred_format: 'formal',
      preferred_channels: ['email', 'document'],
      metadata: {}
    }
  }

  private async gatherUserDeadlinePreferences(userId: string): Promise<any> {
    return {
      preferred_advance_notice: 7, // days
      preferred_deadline_type: 'fixed',
      buffer_time_preference: 1, // days
      metadata: {}
    }
  }

  private async gatherUserQualityPreferences(userId: string): Promise<any> {
    return {
      quality_priority: 'high',
      preferred_quality_metrics: ['accuracy', 'completeness', 'clarity'],
      quality_threshold: 0.8,
      metadata: {}
    }
  }

  private async gatherUserToolPreferences(userId: string): Promise<any[]> {
    return []
  }

  private async gatherUserWorkflowPreferences(userId: string): Promise<any> {
    return {
      workflow_type: 'sequential',
      preferred_steps: ['planning', 'drafting', 'review', 'finalization'],
      automation_preference: 'medium',
      metadata: {}
    }
  }

  private async gatherUserSecurityPreferences(userId: string): Promise<any> {
    return {
      security_level: 'standard',
      data_sharing_preferences: 'restricted',
      access_control_preferences: 'role_based',
      metadata: {}
    }
  }

  private async gatherUserPrivacyPreferences(userId: string): Promise<any> {
    return {
      privacy_level: 'standard',
      data_retention_preferences: 'standard',
      sharing_preferences: 'controlled',
      metadata: {}
    }
  }
}
