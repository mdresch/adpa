import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../../database/connection'
import { childLogger } from '../../utils/logger'
import { ProjectRepository } from './ProjectRepository'
import { contextAnalyticsService } from '../../services/contextAnalyticsService'
import { contextRecommendationService } from '../../services/contextRecommendationService'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const log = childLogger({ component: 'ProjectContextItemsController' })

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

function teamIncludes(teamMembers: unknown, userId: string): boolean {
  if (Array.isArray(teamMembers)) return teamMembers.includes(userId)
  if (typeof teamMembers === 'string') {
    try {
      const parsed = JSON.parse(teamMembers)
      return Array.isArray(parsed) && parsed.includes(userId)
    } catch {
      return false
    }
  }
  return false
}

export function projectContextItemsUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.is('multipart/form-data')) {
    return upload.single('file')(req, res, next)
  }
  next()
}

export class ProjectContextItemsController {
  private static _repo: ProjectRepository
  private static get repo() {
    if (!this._repo) this._repo = new ProjectRepository()
    return this._repo
  }

  private static async requireProjectAccess(
    projectId: string,
    req: Request,
    res: Response
  ): Promise<Record<string, any> | null> {
    if (!projectId || !UUID_RE.test(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' })
      return null
    }
    const userId = (req as any).user?.id
    const userRole = (req as any).user?.role
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return null
    }
    const result = await ProjectContextItemsController.repo.findById(projectId)
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' })
      return null
    }
    const project = result.rows[0]
    const hasAccess =
      userRole === 'super_admin' ||
      userRole === 'admin' ||
      project.owner_id === userId ||
      teamIncludes(project.team_members, userId)
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' })
      return null
    }
    return project
  }

  static list = async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return

      const { type, is_active, integration_type } = req.query
      const conditions: string[] = ['project_id = $1']
      const params: any[] = [projectId]
      let i = 2
      if (typeof type === 'string' && type) {
        conditions.push(`type = $${i++}`)
        params.push(type)
      }
      if (typeof is_active === 'string' && is_active !== '') {
        conditions.push(`is_active = $${i++}`)
        params.push(is_active === 'true')
      }
      if (typeof integration_type === 'string' && integration_type) {
        conditions.push(`integration_type = $${i++}`)
        params.push(integration_type)
      }
      const q = `
        SELECT * FROM project_context_items
        WHERE ${conditions.join(' AND ')}
        ORDER BY priority DESC, created_at ASC
      `
      const result = await pool.query(q, params)
      res.json({ success: true, items: result.rows })
    } catch (e: any) {
      log.error('list failed', e)
      res.status(500).json({ error: 'Failed to list context items' })
    }
  }

  static create = async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return

      const userId = (req as any).user?.id
      let type: string
      let title: string
      let content: string
      let source_url: string | undefined
      let integration_type: string | undefined
      let integration_page_id: string | undefined
      let priority = 0
      let original_filename: string | undefined
      let file_type: string | undefined

      if (req.file) {
        type = (req.body?.type as string) || 'reference_document'
        title = (req.body?.title as string) || req.file.originalname || 'Uploaded file'
        priority = req.body?.priority ? parseInt(String(req.body.priority), 10) || 0 : 0
        original_filename = req.file.originalname
        file_type = req.file.mimetype
        try {
          content = req.file.buffer.toString('utf8')
        } catch {
          content = ''
        }
        if (!content && req.file.buffer?.length) {
          content = `[Binary file: ${req.file.originalname} (${req.file.mimetype})]`
        }
      } else {
        const body = req.body || {}
        type = body.type
        title = body.title
        content = body.content ?? ''
        source_url = body.source_url
        integration_type = body.integration_type
        integration_page_id = body.integration_page_id
        priority = body.priority != null ? Number(body.priority) : 0
        if (!type || !title) {
          return res.status(400).json({ error: 'type and title are required' })
        }
      }

      const itemId = uuidv4()
      const insert = await pool.query(
        `INSERT INTO project_context_items (
          id, project_id, type, title, content, source_url, original_filename, file_type,
          integration_type, integration_page_id, is_active, priority, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12)
        RETURNING *`,
        [
          itemId,
          projectId,
          type,
          title,
          content,
          source_url || null,
          original_filename || null,
          file_type || null,
          integration_type || null,
          integration_page_id || null,
          priority,
          userId || null,
        ]
      )
      res.status(201).json({ success: true, item: insert.rows[0] })
    } catch (e: any) {
      log.error('create failed', e)
      res.status(500).json({ error: 'Failed to create context item' })
    }
  }

  static update = async (req: Request, res: Response) => {
    try {
      const { id: projectId, itemId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return
      if (!itemId || !UUID_RE.test(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID' })
      }

      const existing = await pool.query(
        `SELECT * FROM project_context_items WHERE id = $1 AND project_id = $2`,
        [itemId, projectId]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Context item not found' })
      }

      const { title, content, is_active, priority } = req.body || {}
      const fields: string[] = []
      const values: any[] = []
      let idx = 1
      if (title !== undefined) {
        fields.push(`title = $${idx++}`)
        values.push(title)
      }
      if (content !== undefined) {
        fields.push(`content = $${idx++}`)
        values.push(content)
      }
      if (is_active !== undefined) {
        fields.push(`is_active = $${idx++}`)
        values.push(!!is_active)
      }
      if (priority !== undefined) {
        fields.push(`priority = $${idx++}`)
        values.push(Number(priority))
      }
      if (fields.length === 0) {
        return res.json({ success: true, item: existing.rows[0] })
      }
      fields.push('updated_at = CURRENT_TIMESTAMP')
      const idParam = idx
      const projParam = idx + 1
      values.push(itemId, projectId)
      const r = await pool.query(
        `UPDATE project_context_items SET ${fields.join(', ')}
         WHERE id = $${idParam} AND project_id = $${projParam}
         RETURNING *`,
        values
      )
      res.json({ success: true, item: r.rows[0] })
    } catch (e: any) {
      log.error('update failed', e)
      res.status(500).json({ error: 'Failed to update context item' })
    }
  }

  static remove = async (req: Request, res: Response) => {
    try {
      const { id: projectId, itemId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return
      if (!itemId || !UUID_RE.test(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID' })
      }
      const r = await pool.query(
        `DELETE FROM project_context_items WHERE id = $1 AND project_id = $2 RETURNING id`,
        [itemId, projectId]
      )
      if (r.rowCount === 0) {
        return res.status(404).json({ error: 'Context item not found' })
      }
      res.json({ success: true, message: 'Deleted' })
    } catch (e: any) {
      log.error('delete failed', e)
      res.status(500).json({ error: 'Failed to delete context item' })
    }
  }

  static fetchUrl = async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return

      const url = String((req.body || {}).url || '').trim()
      if (!url) {
        return res.status(400).json({ error: 'url is required' })
      }
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return res.status(400).json({ error: 'Invalid URL' })
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'Only http(s) URLs are allowed' })
      }

      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), 15000)
      const resp = await fetch(parsed.toString(), {
        signal: ac.signal,
        headers: { 'User-Agent': 'ADPA-ContextFetch/1.0' },
      })
      clearTimeout(t)
      if (!resp.ok) {
        return res.status(502).json({ error: `Fetch failed: HTTP ${resp.status}` })
      }
      const buf = await resp.arrayBuffer()
      const max = 2 * 1024 * 1024
      if (buf.byteLength > max) {
        return res.status(413).json({ error: 'Response too large' })
      }
      const text = new TextDecoder('utf8', { fatal: false }).decode(buf)
      const title = parsed.hostname + parsed.pathname
      res.json({
        success: true,
        content: text,
        title,
        metadata: { finalUrl: resp.url, contentType: resp.headers.get('content-type') },
      })
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return res.status(504).json({ error: 'Fetch timed out' })
      }
      log.error('fetchUrl failed', e)
      res.status(500).json({ error: 'Failed to fetch URL' })
    }
  }

  static integrationPages = async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return

      const integrationType = req.query.integration_type as string
      if (integrationType !== 'jira' && integrationType !== 'confluence') {
        return res.status(400).json({ error: 'integration_type must be jira or confluence' })
      }
      res.json({ success: true, pages: [] })
    } catch (e: any) {
      log.error('integrationPages failed', e)
      res.status(500).json({ error: 'Failed to list integration pages' })
    }
  }

  static analytics = async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return

      const data = await contextAnalyticsService.getProjectAnalytics(projectId)
      res.json({ success: true, ...data })
    } catch (e: any) {
      log.error('analytics failed', e)
      res.status(500).json({ error: 'Failed to load analytics' })
    }
  }

  static recommendations = async (req: Request, res: Response) => {
    try {
      const { id: projectId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return

      const [allRecs, templateSuggestions] = await Promise.all([
        contextRecommendationService.getRecommendations(projectId),
        contextRecommendationService.suggestTemplates(projectId),
      ])
      const recommendations = allRecs.filter((r) => r.type !== 'template')
      res.json({ success: true, recommendations, templateSuggestions })
    } catch (e: any) {
      log.error('recommendations failed', e)
      res.status(500).json({ error: 'Failed to load recommendations' })
    }
  }

  static logUsage = async (req: Request, res: Response) => {
    try {
      const { id: projectId, itemId } = req.params
      const project = await ProjectContextItemsController.requireProjectAccess(projectId, req, res)
      if (!project) return
      if (!itemId || !UUID_RE.test(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID' })
      }

      const row = await pool.query(
        `SELECT id FROM project_context_items WHERE id = $1 AND project_id = $2`,
        [itemId, projectId]
      )
      if (row.rows.length === 0) {
        return res.status(404).json({ error: 'Context item not found' })
      }

      const { document_id, usage_type } = (req.body || {}) as {
        document_id?: string
        usage_type?: string
      }
      const ut = usage_type || 'document_generation'
      await pool.query(
        `INSERT INTO project_context_usage_log (project_id, context_item_id, document_id, usage_type, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, itemId, document_id || null, ut, JSON.stringify({})]
      )
      res.json({ success: true, message: 'Logged' })
    } catch (e: any) {
      log.error('logUsage failed', e)
      res.status(500).json({ error: 'Failed to log usage' })
    }
  }
}
