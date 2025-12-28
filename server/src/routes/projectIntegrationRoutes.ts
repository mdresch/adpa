import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import { getByProjectId, upsert, type UpsertInput } from '../database/projectIntegrations'
import { ConfluenceService, type ConfluenceConfig } from '../services/confluenceService'

const router = express.Router()

// GET /api/projects/:id/integrations
// NOTE: This route has been REMOVED and replaced by GET /api/projects/:projectId/integrations in projectSettings.ts
// The new route includes proper access control and returns the enhanced nested structure (confluence/jira objects).

// PUT /api/projects/:id/integrations (upsert)
// NOTE: This route has been REMOVED and replaced by PUT /api/projects/:projectId/integrations in projectSettings.ts
// The new route supports the enhanced per-project integration settings with nested structure (confluence/jira objects).
// If you need the old flat structure, use the new route with the nested format instead.

// POST /api/projects/:id/integrations/test
// Enhanced validation test: validate mapping, DB connectivity, and Confluence space lookup (if credentials available)
router.post(
  '/:id/integrations/test',
  authenticateToken,
  requirePermission('integrations.test'),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const existing = await getByProjectId(id)
      if (!existing) {
        return res.json({ success: false, message: 'No project integrations configured' })
      }

      // Allow test-time overrides from request body without persisting
      const overrideSpaceKey = typeof req.body?.confluence_space_key === 'string' ? (req.body.confluence_space_key as string).trim() : undefined
      const effectiveSpaceKey = overrideSpaceKey || existing.confluence_space_key || undefined

      // minimal sanity checks
      const checks: any = {
        hasConfluenceSpace: !!effectiveSpaceKey,
        hasJiraProject: !!existing.jira_project_key,
      }

      // Optional: simple round-trip to DB
      await pool.query('SELECT 1')

      // If a Confluence space key is configured, try to resolve its display name using any active Confluence integration
      let confluence_space_name: string | undefined
      if (effectiveSpaceKey) {
        try {
          const cfgResult = await pool.query(
            `SELECT configuration, credentials_encrypted FROM integrations WHERE type = 'confluence' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
          )
          if (cfgResult.rows.length > 0) {
            const cfg = cfgResult.rows[0].configuration || {}
            const enc = cfgResult.rows[0].credentials_encrypted
            let credentials: any = {}
            if (enc) {
              try {
                credentials = JSON.parse(Buffer.from(enc, 'base64').toString())
              } catch (e) {
                // ignore decode errors, proceed without external call
              }
            }

            const baseUrl = cfg.base_url
            const hasCreds = !!(credentials.username && credentials.api_token)
            const isValidBase = typeof baseUrl === 'string' && /^https?:\/\//i.test(baseUrl)
            if (!isValidBase) {
              checks.confluenceSpaceResolved = false
              checks.confluenceResolutionReason = 'invalid_base_url'
            } else if (!hasCreds) {
              checks.confluenceSpaceResolved = false
              checks.confluenceResolutionReason = 'missing_credentials'
            } else {
              const service = new ConfluenceService({
                baseUrl,
                username: credentials.username,
                apiToken: credentials.api_token,
                cloudId: cfg.cloud_id,
              } as ConfluenceConfig)
              const space = await service.getSpace(effectiveSpaceKey)
              confluence_space_name = space?.name
              checks.confluenceSpaceResolved = !!confluence_space_name
              if (!checks.confluenceSpaceResolved) {
                checks.confluenceResolutionReason = 'not_found_or_unauthorized'
              }
            }
          } else {
            checks.confluenceSpaceResolved = false
            checks.confluenceResolutionReason = 'no_active_integration'
          }
        } catch (e: any) {
          // resolution failed, keep going
          checks.confluenceSpaceResolved = false
          checks.confluenceResolutionReason = 'api_error'
          ;(log as any).warn?.('Confluence space resolution failed', e?.message || e)
        }
      }

      res.json({ success: true, message: 'Connection test successful', checks, confluence_space_name })
    } catch (error: any) {
      log.error('Project integration test failed', error)
      res.json({ success: false, message: 'Connection test failed', error: error?.message || 'Unknown error' })
    }
  }
)

export default router
