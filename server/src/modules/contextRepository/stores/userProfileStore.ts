/**
 * User Profile Store
 * Manages user profile and preference data for AI-enhanced document generation
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import type {
  UserProfile,
  UserPreferences,
  UserExpertise,
  WritingStyle,
  DomainKnowledge,
  CollaborationPreferences,
  UserFilters
} from '../types'

export class UserProfileStore {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      logger.debug('Fetching user profile', { user_id: userId })

      const result = await pool.query(
        `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.role,
          u.avatar_url,
          u.is_active,
          u.last_login,
          u.created_at,
          u.updated_at,
          u.metadata
        FROM users u
        WHERE u.id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const userRow = result.rows[0]

      // Fetch related data
      const [
        preferences,
        expertise,
        writingStyle,
        domainKnowledge,
        collaborationPreferences
      ] = await Promise.all([
        this.getUserPreferences(userId),
        this.getUserExpertise(userId),
        this.getUserWritingStyle(userId),
        this.getUserDomainKnowledge(userId),
        this.getUserCollaborationPreferences(userId)
      ])

      const userProfile: UserProfile = {
        user_id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        avatar_url: userRow.avatar_url,
        is_active: userRow.is_active,
        last_login: userRow.last_login,
        created_at: userRow.created_at,
        updated_at: userRow.updated_at,
        preferences: preferences || this.getDefaultPreferences(),
        expertise: expertise || this.getDefaultExpertise(),
        writing_style: writingStyle || this.getDefaultWritingStyle(),
        domain_knowledge: domainKnowledge || this.getDefaultDomainKnowledge(),
        collaboration_preferences: collaborationPreferences || this.getDefaultCollaborationPreferences(),
        metadata: userRow.metadata
      }

      logger.debug('User profile retrieved successfully', {
        user_id: userId,
        has_preferences: !!preferences,
        has_expertise: !!expertise
      })

      return userProfile

    } catch (error) {
      logger.error('Failed to fetch user profile', {
        user_id: userId,
        error: error.message
      })
      throw error
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          up.language,
          up.timezone,
          up.date_format,
          up.number_format,
          up.theme,
          up.notifications,
          up.accessibility,
          up.privacy
        FROM user_preferences up
        WHERE up.user_id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        language: row.language || 'en',
        timezone: row.timezone || 'UTC',
        date_format: row.date_format || 'YYYY-MM-DD',
        number_format: row.number_format || 'en-US',
        theme: row.theme || 'light',
        notifications: row.notifications || this.getDefaultNotificationPreferences(),
        accessibility: row.accessibility || this.getDefaultAccessibilityPreferences(),
        privacy: row.privacy || this.getDefaultPrivacyPreferences()
      }

    } catch (error) {
      logger.error('Failed to fetch user preferences', {
        user_id: userId,
        error: error.message
      })
      return null
    }
  }

  async getUserExpertise(userId: string): Promise<UserExpertise | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          ue.level,
          ue.domains,
          ue.certifications,
          ue.experience_years,
          ue.methodologies,
          ue.tools,
          ue.languages,
          ue.specializations
        FROM user_expertise ue
        WHERE ue.user_id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        level: row.level || 'intermediate',
        domains: row.domains || [],
        certifications: row.certifications || [],
        experience_years: row.experience_years || 0,
        methodologies: row.methodologies || [],
        tools: row.tools || [],
        languages: row.languages || [],
        specializations: row.specializations || []
      }

    } catch (error) {
      logger.error('Failed to fetch user expertise', {
        user_id: userId,
        error: error.message
      })
      return null
    }
  }

  async getUserWritingStyle(userId: string): Promise<WritingStyle | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          uws.tone,
          uws.formality,
          uws.length_preference,
          uws.structure_preference,
          uws.terminology_preference,
          uws.audience_awareness
        FROM user_writing_style uws
        WHERE uws.user_id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        tone: row.tone || 'professional',
        formality: row.formality || 'formal',
        length_preference: row.length_preference || 'detailed',
        structure_preference: row.structure_preference || 'structured',
        terminology_preference: row.terminology_preference || 'standard',
        audience_awareness: row.audience_awareness || 'medium'
      }

    } catch (error) {
      logger.error('Failed to fetch user writing style', {
        user_id: userId,
        error: error.message
      })
      return null
    }
  }

  async getUserDomainKnowledge(userId: string): Promise<DomainKnowledge | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          udk.industries,
          udk.technologies,
          udk.frameworks,
          udk.tools,
          udk.standards,
          udk.regulations,
          udk.best_practices,
          udk.common_patterns
        FROM user_domain_knowledge udk
        WHERE udk.user_id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        industries: row.industries || [],
        technologies: row.technologies || [],
        frameworks: row.frameworks || [],
        tools: row.tools || [],
        standards: row.standards || [],
        regulations: row.regulations || [],
        best_practices: row.best_practices || [],
        common_patterns: row.common_patterns || []
      }

    } catch (error) {
      logger.error('Failed to fetch user domain knowledge', {
        user_id: userId,
        error: error.message
      })
      return null
    }
  }

  async getUserCollaborationPreferences(userId: string): Promise<CollaborationPreferences | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          ucp.communication_style,
          ucp.feedback_preference,
          ucp.meeting_preference,
          ucp.collaboration_tools,
          ucp.availability,
          ucp.working_hours
        FROM user_collaboration_preferences ucp
        WHERE ucp.user_id = $1
        `,
        [userId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        communication_style: row.communication_style || 'collaborative',
        feedback_preference: row.feedback_preference || 'constructive',
        meeting_preference: row.meeting_preference || 'structured',
        collaboration_tools: row.collaboration_tools || [],
        availability: row.availability || this.getDefaultAvailabilitySchedule(),
        working_hours: row.working_hours || this.getDefaultWorkingHours()
      }

    } catch (error) {
      logger.error('Failed to fetch user collaboration preferences', {
        user_id: userId,
        error: error.message
      })
      return null
    }
  }

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      logger.debug('Updating user profile', { user_id: userId })

      // Update basic user information
      if (profile.name || profile.role || profile.avatar_url) {
        await pool.query(
          `
          UPDATE users 
          SET name = COALESCE($1, name),
              role = COALESCE($2, role),
              avatar_url = COALESCE($3, avatar_url),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          `,
          [profile.name, profile.role, profile.avatar_url, userId]
        )
      }

      // Update preferences
      if (profile.preferences) {
        await this.updateUserPreferences(userId, profile.preferences)
      }

      // Update expertise
      if (profile.expertise) {
        await this.updateUserExpertise(userId, profile.expertise)
      }

      // Update writing style
      if (profile.writing_style) {
        await this.updateUserWritingStyle(userId, profile.writing_style)
      }

      // Update domain knowledge
      if (profile.domain_knowledge) {
        await this.updateUserDomainKnowledge(userId, profile.domain_knowledge)
      }

      // Update collaboration preferences
      if (profile.collaboration_preferences) {
        await this.updateUserCollaborationPreferences(userId, profile.collaboration_preferences)
      }

      // Return updated profile
      const updatedProfile = await this.getUserProfile(userId)
      if (!updatedProfile) {
        throw new Error('Failed to retrieve updated user profile')
      }

      logger.info('User profile updated successfully', { user_id: userId })

      return updatedProfile

    } catch (error) {
      logger.error('Failed to update user profile', {
        user_id: userId,
        error: error.message
      })
      throw error
    }
  }

  async searchUsers(query: string, filters?: UserFilters): Promise<UserProfile[]> {
    try {
      let sql = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.role,
          u.avatar_url,
          u.is_active,
          u.last_login,
          u.created_at,
          u.updated_at,
          u.metadata
        FROM users u
        WHERE u.deleted_at IS NULL
      `
      const params: any[] = []
      let paramIndex = 1

      // Add text search
      if (query) {
        sql += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
        params.push(`%${query}%`)
        paramIndex++
      }

      // Add filters
      if (filters) {
        if (filters.role && filters.role.length > 0) {
          sql += ` AND u.role = ANY($${paramIndex})`
          params.push(filters.role)
          paramIndex++
        }

        if (filters.is_active !== undefined) {
          sql += ` AND u.is_active = $${paramIndex}`
          params.push(filters.is_active)
          paramIndex++
        }

        if (filters.last_login_from) {
          sql += ` AND u.last_login >= $${paramIndex}`
          params.push(filters.last_login_from)
          paramIndex++
        }

        if (filters.last_login_to) {
          sql += ` AND u.last_login <= $${paramIndex}`
          params.push(filters.last_login_to)
          paramIndex++
        }
      }

      sql += ` ORDER BY u.updated_at DESC LIMIT 50`

      const result = await pool.query(sql, params)

      // Convert to UserProfile objects (simplified for search results)
      const users: UserProfile[] = []
      for (const row of result.rows) {
        const user: UserProfile = {
          user_id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          avatar_url: row.avatar_url,
          is_active: row.is_active,
          last_login: row.last_login,
          created_at: row.created_at,
          updated_at: row.updated_at,
          preferences: this.getDefaultPreferences(),
          expertise: this.getDefaultExpertise(),
          writing_style: this.getDefaultWritingStyle(),
          domain_knowledge: this.getDefaultDomainKnowledge(),
          collaboration_preferences: this.getDefaultCollaborationPreferences(),
          metadata: row.metadata
        }
        users.push(user)
      }

      return users

    } catch (error) {
      logger.error('Failed to search users', {
        query,
        filters,
        error: error.message
      })
      return []
    }
  }

  async getUsersByExpertise(domain: string, level?: string): Promise<UserProfile[]> {
    try {
      let sql = `
        SELECT DISTINCT
          u.id,
          u.email,
          u.name,
          u.role,
          u.avatar_url,
          u.is_active,
          u.last_login,
          u.created_at,
          u.updated_at,
          u.metadata
        FROM users u
        JOIN user_expertise ue ON u.id = ue.user_id
        WHERE u.deleted_at IS NULL
        AND u.is_active = true
        AND ($1 = ANY(ue.domains) OR $1 = ANY(ue.specializations))
      `
      const params: any[] = [domain]
      let paramIndex = 2

      if (level) {
        sql += ` AND ue.level = $${paramIndex}`
        params.push(level)
        paramIndex++
      }

      sql += ` ORDER BY ue.experience_years DESC, u.name LIMIT 20`

      const result = await pool.query(sql, params)

      // Convert to UserProfile objects (simplified for expertise results)
      const users: UserProfile[] = []
      for (const row of result.rows) {
        const user: UserProfile = {
          user_id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          avatar_url: row.avatar_url,
          is_active: row.is_active,
          last_login: row.last_login,
          created_at: row.created_at,
          updated_at: row.updated_at,
          preferences: this.getDefaultPreferences(),
          expertise: this.getDefaultExpertise(),
          writing_style: this.getDefaultWritingStyle(),
          domain_knowledge: this.getDefaultDomainKnowledge(),
          collaboration_preferences: this.getDefaultCollaborationPreferences(),
          metadata: row.metadata
        }
        users.push(user)
      }

      return users

    } catch (error) {
      logger.error('Failed to get users by expertise', {
        domain,
        level,
        error: error.message
      })
      return []
    }
  }

  private async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    await pool.query(
      `
      INSERT INTO user_preferences (
        user_id, language, timezone, date_format, number_format, theme, 
        notifications, accessibility, privacy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        language = EXCLUDED.language,
        timezone = EXCLUDED.timezone,
        date_format = EXCLUDED.date_format,
        number_format = EXCLUDED.number_format,
        theme = EXCLUDED.theme,
        notifications = EXCLUDED.notifications,
        accessibility = EXCLUDED.accessibility,
        privacy = EXCLUDED.privacy,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        preferences.language,
        preferences.timezone,
        preferences.date_format,
        preferences.number_format,
        preferences.theme,
        JSON.stringify(preferences.notifications),
        JSON.stringify(preferences.accessibility),
        JSON.stringify(preferences.privacy)
      ]
    )
  }

  private async updateUserExpertise(userId: string, expertise: UserExpertise): Promise<void> {
    await pool.query(
      `
      INSERT INTO user_expertise (
        user_id, level, domains, certifications, experience_years, 
        methodologies, tools, languages, specializations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        level = EXCLUDED.level,
        domains = EXCLUDED.domains,
        certifications = EXCLUDED.certifications,
        experience_years = EXCLUDED.experience_years,
        methodologies = EXCLUDED.methodologies,
        tools = EXCLUDED.tools,
        languages = EXCLUDED.languages,
        specializations = EXCLUDED.specializations,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        expertise.level,
        expertise.domains,
        expertise.certifications,
        expertise.experience_years,
        expertise.methodologies,
        expertise.tools,
        expertise.languages,
        expertise.specializations
      ]
    )
  }

  private async updateUserWritingStyle(userId: string, writingStyle: WritingStyle): Promise<void> {
    await pool.query(
      `
      INSERT INTO user_writing_style (
        user_id, tone, formality, length_preference, structure_preference, 
        terminology_preference, audience_awareness
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        tone = EXCLUDED.tone,
        formality = EXCLUDED.formality,
        length_preference = EXCLUDED.length_preference,
        structure_preference = EXCLUDED.structure_preference,
        terminology_preference = EXCLUDED.terminology_preference,
        audience_awareness = EXCLUDED.audience_awareness,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        writingStyle.tone,
        writingStyle.formality,
        writingStyle.length_preference,
        writingStyle.structure_preference,
        writingStyle.terminology_preference,
        writingStyle.audience_awareness
      ]
    )
  }

  private async updateUserDomainKnowledge(userId: string, domainKnowledge: DomainKnowledge): Promise<void> {
    await pool.query(
      `
      INSERT INTO user_domain_knowledge (
        user_id, industries, technologies, frameworks, tools, standards, 
        regulations, best_practices, common_patterns
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        industries = EXCLUDED.industries,
        technologies = EXCLUDED.technologies,
        frameworks = EXCLUDED.frameworks,
        tools = EXCLUDED.tools,
        standards = EXCLUDED.standards,
        regulations = EXCLUDED.regulations,
        best_practices = EXCLUDED.best_practices,
        common_patterns = EXCLUDED.common_patterns,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        domainKnowledge.industries,
        domainKnowledge.technologies,
        domainKnowledge.frameworks,
        domainKnowledge.tools,
        domainKnowledge.standards,
        domainKnowledge.regulations,
        domainKnowledge.best_practices,
        domainKnowledge.common_patterns
      ]
    )
  }

  private async updateUserCollaborationPreferences(userId: string, collaborationPreferences: CollaborationPreferences): Promise<void> {
    await pool.query(
      `
      INSERT INTO user_collaboration_preferences (
        user_id, communication_style, feedback_preference, meeting_preference, 
        collaboration_tools, availability, working_hours
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        communication_style = EXCLUDED.communication_style,
        feedback_preference = EXCLUDED.feedback_preference,
        meeting_preference = EXCLUDED.meeting_preference,
        collaboration_tools = EXCLUDED.collaboration_tools,
        availability = EXCLUDED.availability,
        working_hours = EXCLUDED.working_hours,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        userId,
        collaborationPreferences.communication_style,
        collaborationPreferences.feedback_preference,
        collaborationPreferences.meeting_preference,
        collaborationPreferences.collaboration_tools,
        JSON.stringify(collaborationPreferences.availability),
        JSON.stringify(collaborationPreferences.working_hours)
      ]
    )
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      timezone: 'UTC',
      date_format: 'YYYY-MM-DD',
      number_format: 'en-US',
      theme: 'light',
      notifications: this.getDefaultNotificationPreferences(),
      accessibility: this.getDefaultAccessibilityPreferences(),
      privacy: this.getDefaultPrivacyPreferences()
    }
  }

  private getDefaultExpertise(): UserExpertise {
    return {
      level: 'intermediate',
      domains: [],
      certifications: [],
      experience_years: 0,
      methodologies: [],
      tools: [],
      languages: [],
      specializations: []
    }
  }

  private getDefaultWritingStyle(): WritingStyle {
    return {
      tone: 'professional',
      formality: 'formal',
      length_preference: 'detailed',
      structure_preference: 'structured',
      terminology_preference: 'standard',
      audience_awareness: 'medium'
    }
  }

  private getDefaultDomainKnowledge(): DomainKnowledge {
    return {
      industries: [],
      technologies: [],
      frameworks: [],
      tools: [],
      standards: [],
      regulations: [],
      best_practices: [],
      common_patterns: []
    }
  }

  private getDefaultCollaborationPreferences(): CollaborationPreferences {
    return {
      communication_style: 'collaborative',
      feedback_preference: 'constructive',
      meeting_preference: 'structured',
      collaboration_tools: [],
      availability: this.getDefaultAvailabilitySchedule(),
      working_hours: this.getDefaultWorkingHours()
    }
  }

  private getDefaultNotificationPreferences() {
    return {
      email: true,
      push: false,
      sms: false,
      in_app: true,
      frequency: 'immediate',
      categories: ['system', 'documents', 'collaboration']
    }
  }

  private getDefaultAccessibilityPreferences() {
    return {
      font_size: 'medium',
      color_scheme: 'default',
      screen_reader: false,
      keyboard_navigation: true,
      reduced_motion: false
    }
  }

  private getDefaultPrivacyPreferences() {
    return {
      profile_visibility: 'team',
      data_sharing: true,
      analytics_opt_in: true,
      marketing_opt_in: false,
      third_party_sharing: false
    }
  }

  private getDefaultAvailabilitySchedule() {
    return {
      timezone: 'UTC',
      working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      working_hours: this.getDefaultWorkingHours(),
      holidays: [],
      vacation_dates: [],
      busy_periods: []
    }
  }

  private getDefaultWorkingHours() {
    return {
      start_time: '09:00',
      end_time: '17:00',
      break_start: '12:00',
      break_end: '13:00',
      flexible_hours: false,
      timezone: 'UTC'
    }
  }
}
