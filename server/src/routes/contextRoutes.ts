import express from 'express'
import Joi from 'joi'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { validate, validateQuery } from '../middleware/validation'
import { getProviderAdapter } from '../contexts/providerRegistry'
import { AuditService } from '../services/auditService'
import { logger } from '../utils/logger'

const router = express.Router()

const providerSchema = Joi.string().valid('confluence','jira').required()

router.get(
  '/',
  authenticateToken,
  requirePermission('contexts.read'),
  validateQuery(Joi.object({
    provider: providerSchema,
    query: Joi.string().min(1).required(),
    projectId: Joi.string().uuid().optional(),
    fresh: Joi.boolean().optional(),
  })),
  async (req, res, next) => {
    const { provider } = req.query as any
    // Check provider-specific permission
    const providerPermission = `${provider}.read`
    const user = (req as any).user
    const permissions = user?.permissions || []
    
    if (!permissions.includes(providerPermission)) {
      return res.status(403).json({ 
        error: 'forbidden', 
        reason: `missing_${provider}_read_permission`,
        message: `Permission '${providerPermission}' required` 
      })
    }
    next()
  },
  async (req, res) => {
    const { provider, query, projectId } = req.query as any
    const fresh = req.query.fresh === 'true'
    const userId = (req as any).user?.id
    const requestId = (req as any).requestId
    
    if (fresh) {
      // additional permission required to force refresh
      const permissions = (req as any).user?.permissions || []
      if (!permissions.includes('contexts.refresh')) {
        return res.status(403).json({ error: 'forbidden', reason: 'missing_contexts_refresh' })
      }
    }
    
    try {
      // Audit log: context search request
      await AuditService.log({
        table: 'context_requests',
        action: 'read',
        newValues: {
          provider,
          query,
          projectId: projectId || null,
          fresh,
          type: 'search'
        },
        ctx: {
          userId,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          requestId
        }
      }).catch(err => logger.warn('Failed to log context search audit:', err))
      
      const adapter = getProviderAdapter(provider)
      const results = await adapter.search({ query, projectId, fresh })
      
      res.json({ results })
    } catch (e: any) {
      // Map errors to reason codes
      let reason = 'api_error'
      let statusCode = 500
      
      if (e.message?.includes('circuit breaker')) {
        reason = 'service_unavailable'
        statusCode = 503
      } else if (e.message?.includes('Rate limit')) {
        reason = 'quota_exceeded'
        statusCode = 429
      } else if (e.message?.includes('No active') || e.message?.includes('integration')) {
        reason = 'not_found'
        statusCode = 404
      } else if (e.response?.status === 401 || e.response?.status === 403) {
        reason = 'unauthorized'
        statusCode = e.response.status
      } else if (e.response?.status === 429) {
        reason = 'quota_exceeded'
        statusCode = 429
      }
      
      logger.error(`Context search failed: ${provider}`, { error: e.message, reason })
      res.status(statusCode).json({ error: reason, details: e?.message || 'Unknown error' })
    }
  }
)

router.get(
  '/:provider/:id',
  authenticateToken,
  requirePermission('contexts.read'),
  validateQuery(Joi.object({ projectId: Joi.string().uuid().optional(), fresh: Joi.boolean().optional() })),
  async (req, res, next) => {
    const { provider } = req.params as any
    if (!['confluence','jira'].includes(provider)) {
      return res.status(400).json({ error: 'invalid_provider', reason: 'unsupported_provider' })
    }
    
    // Check provider-specific permission
    const providerPermission = `${provider}.read`
    const user = (req as any).user
    const permissions = user?.permissions || []
    
    if (!permissions.includes(providerPermission)) {
      return res.status(403).json({ 
        error: 'forbidden', 
        reason: `missing_${provider}_read_permission`,
        message: `Permission '${providerPermission}' required` 
      })
    }
    next()
  },
  async (req, res) => {
    const { provider, id } = req.params as any
    const fresh = req.query.fresh === 'true'
    const userId = (req as any).user?.id
    const requestId = (req as any).requestId
    const projectId = (req.query as any).projectId
    
    if (fresh) {
      const permissions = (req as any).user?.permissions || []
      if (!permissions.includes('contexts.refresh')) {
        return res.status(403).json({ error: 'forbidden', reason: 'missing_contexts_refresh' })
      }
    }
    
    try {
      // Audit log: context fetch by ID
      await AuditService.log({
        table: 'context_requests',
        action: 'read',
        rowId: id,
        newValues: {
          provider,
          resourceId: id,
          projectId: projectId || null,
          fresh,
          type: 'fetchById'
        },
        ctx: {
          userId,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          requestId
        }
      }).catch(err => logger.warn('Failed to log context fetch audit:', err))
      
      const adapter = getProviderAdapter(provider as any)
      const item = await adapter.fetchById({ id, projectId, fresh })
      
      if (!item) {
        return res.status(404).json({ error: 'not_found', reason: 'resource_not_found' })
      }
      
      res.json({ item })
    } catch (e: any) {
      // Map errors to reason codes
      let reason = 'api_error'
      let statusCode = 500
      
      if (e.message?.includes('circuit breaker')) {
        reason = 'service_unavailable'
        statusCode = 503
      } else if (e.message?.includes('Rate limit')) {
        reason = 'quota_exceeded'
        statusCode = 429
      } else if (e.message?.includes('No active') || e.message?.includes('integration')) {
        reason = 'not_found'
        statusCode = 404
      } else if (e.response?.status === 401 || e.response?.status === 403) {
        reason = 'unauthorized'
        statusCode = e.response.status
      } else if (e.response?.status === 429) {
        reason = 'quota_exceeded'
        statusCode = 429
      } else if (e.message?.includes('Unknown provider')) {
        reason = 'invalid_provider'
        statusCode = 400
      }
      
      logger.error(`Context fetchById failed: ${provider}/${id}`, { error: e.message, reason })
      res.status(statusCode).json({ error: reason, details: e?.message || 'Unknown error' })
    }
  }
)

export default router
