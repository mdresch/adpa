import express from 'express'
import Joi from 'joi'
import { pool } from '../database/connection'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams, validateQuery } from '../middleware/validation'
import { logger, childLogger } from '../utils/logger'

const router = express.Router()

// Get project integration settings
router.get(
  '/:projectId/integrations',
  authenticateToken,
  requirePermission('projects.read'),
  validateParams(Joi.object({ projectId: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const userId = req.user?.id

      // Check if user has access to project
      const projectCheck = await pool.query(
        `SELECT id, owner_id, created_by, team_members, company_id 
         FROM projects 
         WHERE id = $1`,
        [projectId]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' })
      }

      const project = projectCheck.rows[0]
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      // Check access
      let hasAccess = false
      if (isSuperAdmin) {
        hasAccess = true
      } else if (isAdmin) {
        // Admin can access projects in their company
        if (project.company_id) {
          const userCompany = await pool.query(
            'SELECT company_id FROM users WHERE id = $1',
            [userId]
          )
          hasAccess = userCompany.rows[0]?.company_id === project.company_id
        } else {
          hasAccess = true // If no company_id, allow
        }
      } else {
        // Regular user: owner, creator, or team member
        let isTeamMember = false
        if (project.team_members) {
          if (Array.isArray(project.team_members)) {
            isTeamMember = project.team_members.includes(userId)
          } else {
            try {
              const members = JSON.parse(project.team_members || '[]')
              isTeamMember = Array.isArray(members) && members.includes(userId)
            } catch {
              isTeamMember = false
            }
          }
        }
        hasAccess = 
          project.owner_id === userId ||
          project.created_by === userId ||
          isTeamMember
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Get integration settings
      const settingsResult = await pool.query(
        `SELECT 
          confluence_enabled,
          confluence_space_key_override,
          confluence_parent_page_id_override,
          confluence_auto_publish,
          jira_enabled,
          jira_project_key_override,
          jira_issue_type_override,
          jira_priority_override,
          jira_auto_create,
          integration_settings,
          confluence_space_key,
          confluence_parent_page_id,
          jira_project_key,
          jira_issue_type_default
         FROM project_integrations 
         WHERE project_id = $1`,
        [projectId]
      )

      if (settingsResult.rows.length === 0) {
        // Return defaults
        return res.json({
          confluence: {
            enabled: false,
            spaceKey: null,
            parentPageId: null,
            autoPublish: false
          },
          jira: {
            enabled: false,
            projectKey: null,
            issueType: null,
            priority: null,
            autoCreate: false
          },
          settings: {}
        })
      }

      const row = settingsResult.rows[0]
      res.json({
        confluence: {
          enabled: row.confluence_enabled || false,
          spaceKey: row.confluence_space_key_override || row.confluence_space_key || null,
          parentPageId: row.confluence_parent_page_id_override || row.confluence_parent_page_id || null,
          autoPublish: row.confluence_auto_publish || false
        },
        jira: {
          enabled: row.jira_enabled || false,
          projectKey: row.jira_project_key_override || row.jira_project_key || null,
          issueType: row.jira_issue_type_override || row.jira_issue_type_default || null,
          priority: row.jira_priority_override || null,
          autoCreate: row.jira_auto_create || false
        },
        settings: row.integration_settings || {}
      })
    } catch (error) {
      log.error('Failed to get project integration settings:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Update project integration settings
router.put(
  '/:projectId/integrations',
  authenticateToken,
  requirePermission('projects.update'),
  validateParams(Joi.object({ projectId: Joi.string().uuid().required() })),
  validate(Joi.object({
    confluence: Joi.object({
      enabled: Joi.boolean().optional(),
      spaceKey: Joi.string().allow(null, '').optional(),
      parentPageId: Joi.string().allow(null, '').optional(),
      autoPublish: Joi.boolean().optional()
    }).optional().unknown(true),
    jira: Joi.object({
      enabled: Joi.boolean().optional(),
      projectKey: Joi.string().allow(null, '').optional(),
      issueType: Joi.string().allow(null, '').optional(),
      priority: Joi.string().allow(null, '').optional(),
      autoCreate: Joi.boolean().optional()
    }).optional().unknown(true),
    settings: Joi.object().optional().unknown(true)
  }).unknown(true)),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const { confluence, jira, settings } = req.body
      const userId = req.user?.id

      // Check if user has access to project (same logic as GET)
      const projectCheck = await pool.query(
        `SELECT id, owner_id, created_by, team_members, company_id 
         FROM projects 
         WHERE id = $1`,
        [projectId]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' })
      }

      const project = projectCheck.rows[0]
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      let hasAccess = false
      if (isSuperAdmin) {
        hasAccess = true
      } else if (isAdmin) {
        if (project.company_id) {
          const userCompany = await pool.query(
            'SELECT company_id FROM users WHERE id = $1',
            [userId]
          )
          hasAccess = userCompany.rows[0]?.company_id === project.company_id
        } else {
          hasAccess = true
        }
      } else {
        let isTeamMember = false
        if (project.team_members) {
          if (Array.isArray(project.team_members)) {
            isTeamMember = project.team_members.includes(userId)
          } else {
            try {
              const members = JSON.parse(project.team_members || '[]')
              isTeamMember = Array.isArray(members) && members.includes(userId)
            } catch {
              isTeamMember = false
            }
          }
        }
        hasAccess = 
          project.owner_id === userId ||
          project.created_by === userId ||
          isTeamMember
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Determine values to use (provided values or defaults)
      const confluenceEnabled = confluence?.enabled ?? false
      const confluenceSpaceKey = confluence?.spaceKey || null
      const confluenceParentPageId = confluence?.parentPageId || null
      const confluenceAutoPublish = confluence?.autoPublish ?? false
      const jiraEnabled = jira?.enabled ?? false
      const jiraProjectKey = jira?.projectKey || null
      const jiraIssueType = jira?.issueType || null
      const jiraPriority = jira?.priority || null
      const jiraAutoCreate = jira?.autoCreate ?? false
      const integrationSettings = JSON.stringify(settings || {})

      // Build UPDATE clause for fields that were explicitly provided
      // Parameter numbers start at $12 (after INSERT params $1-$11)
      const updateFields: string[] = []
      const updateValues: any[] = []
      let updateParamCount = 12

      if (confluence !== undefined) {
        if (confluence.enabled !== undefined) {
          updateFields.push(`confluence_enabled = $${updateParamCount++}`)
          updateValues.push(confluence.enabled)
        }
        if (confluence.spaceKey !== undefined) {
          updateFields.push(`confluence_space_key_override = $${updateParamCount++}`)
          updateValues.push(confluence.spaceKey || null)
        }
        if (confluence.parentPageId !== undefined) {
          updateFields.push(`confluence_parent_page_id_override = $${updateParamCount++}`)
          updateValues.push(confluence.parentPageId || null)
        }
        if (confluence.autoPublish !== undefined) {
          updateFields.push(`confluence_auto_publish = $${updateParamCount++}`)
          updateValues.push(confluence.autoPublish)
        }
      }

      if (jira !== undefined) {
        if (jira.enabled !== undefined) {
          updateFields.push(`jira_enabled = $${updateParamCount++}`)
          updateValues.push(jira.enabled)
        }
        if (jira.projectKey !== undefined) {
          updateFields.push(`jira_project_key_override = $${updateParamCount++}`)
          updateValues.push(jira.projectKey || null)
        }
        if (jira.issueType !== undefined) {
          updateFields.push(`jira_issue_type_override = $${updateParamCount++}`)
          updateValues.push(jira.issueType || null)
        }
        if (jira.priority !== undefined) {
          updateFields.push(`jira_priority_override = $${updateParamCount++}`)
          updateValues.push(jira.priority || null)
        }
        if (jira.autoCreate !== undefined) {
          updateFields.push(`jira_auto_create = $${updateParamCount++}`)
          updateValues.push(jira.autoCreate)
        }
      }

      if (settings !== undefined) {
        updateFields.push(`integration_settings = $${updateParamCount++}`)
        updateValues.push(JSON.stringify(settings))
      }

      // Always update updated_at
      updateFields.push(`updated_at = NOW()`)

      // Use UPSERT: INSERT ... ON CONFLICT DO UPDATE
      // This handles both insert and update in a single atomic operation
      const insertValues = [
        projectId,
        confluenceEnabled,
        confluenceSpaceKey,
        confluenceParentPageId,
        confluenceAutoPublish,
        jiraEnabled,
        jiraProjectKey,
        jiraIssueType,
        jiraPriority,
        jiraAutoCreate,
        integrationSettings
      ]

      await pool.query(
        `INSERT INTO project_integrations (
          project_id,
          confluence_enabled,
          confluence_space_key_override,
          confluence_parent_page_id_override,
          confluence_auto_publish,
          jira_enabled,
          jira_project_key_override,
          jira_issue_type_override,
          jira_priority_override,
          jira_auto_create,
          integration_settings,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (project_id) DO UPDATE SET
          ${updateFields.length > 0 ? updateFields.join(', ') : 'updated_at = NOW()'}`,
        updateFields.length > 0 ? [...insertValues, ...updateValues] : insertValues
      )

      log.info(`Updated integration settings for project ${projectId} by user ${userId}`)
      res.json({ message: 'Integration settings updated successfully' })
    } catch (error: any) {
      log.error('Failed to update project integration settings:', error)
      
      // Provide more detailed error information
      let errorMessage = 'Internal server error'
      if (error?.code === '23505') {
        errorMessage = 'A record for this project already exists'
      } else if (error?.code === '23503') {
        errorMessage = 'Project not found'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      res.status(500).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      })
    }
  }
)

export default router

