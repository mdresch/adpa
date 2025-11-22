import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import projectService from "../services/projectService"
import * as programService from "../services/programService"
import { v4 as uuidv4, validate as isUuid } from "uuid"
import { trackActivity } from "../middleware/analyticsMiddleware"
import { extractionQueue } from "../services/queueService"

const router = express.Router()

const normalizeTeamMembers = (rawTeamMembers: any): string[] => {
  if (!rawTeamMembers) {
    return []
  }

  if (Array.isArray(rawTeamMembers)) {
    return rawTeamMembers.filter((value): value is string => typeof value === 'string' && value.length > 0)
  }

  if (typeof rawTeamMembers === 'string') {
    try {
      const parsed = JSON.parse(rawTeamMembers)
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      }
    } catch {
      return rawTeamMembers
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0)
    }
  }

  if (typeof rawTeamMembers === 'object' && rawTeamMembers !== null) {
    return Object.values(rawTeamMembers)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  }

  return []
}

// Get all projects
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { page = 1, limit = 10, status, framework, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let query = `
      SELECT p.*, u.name as owner_name, u.email as owner_email,
             COUNT(d.id) as document_count,
             MAX(d.updated_at) as last_document_activity,
             GREATEST(p.updated_at, MAX(d.updated_at)) as last_activity
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id AND d.parent_document_id IS NULL
      WHERE 1=1
    `

    const params: any[] = []
    let paramCount = 0

    if (status) {
      paramCount++
      query += ` AND p.status = $${paramCount}`
      params.push(status)
    }

    if (framework) {
      paramCount++
      query += ` AND p.framework = $${paramCount}`
      params.push(framework)
    }

    if (search) {
      paramCount++
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    query += ` GROUP BY p.id, u.name, u.email ORDER BY last_activity DESC NULLS LAST, p.name ASC, p.id ASC`

    paramCount++
    query += ` LIMIT $${paramCount}`
    params.push(Number(limit))

    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await pool.query(query, params)

    // Get total count
    let countQuery = "SELECT COUNT(*) FROM projects WHERE 1=1"
    const countParams: any[] = []
    let countParamCount = 0

    if (status) {
      countParamCount++
      countQuery += ` AND status = $${countParamCount}`
      countParams.push(status)
    }

    if (framework) {
      countParamCount++
      countQuery += ` AND framework = $${countParamCount}`
      countParams.push(framework)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    res.json({
      projects: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    log.error("Get projects error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Project Risks Routes (must be before /:id route)

// Get all risks for a project
router.get("/:projectId/risks", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    // Verify project exists
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Project not found" })
    }

    // Check which columns exist in the risks table
    let availableColumns: Set<string> = new Set()
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'risks'
        ORDER BY column_name
      `)
      if (columnCheck.rows && columnCheck.rows.length > 0) {
        availableColumns = new Set(columnCheck.rows.map((row: any) => row.column_name))
        log.info('Available risk columns:', Array.from(availableColumns).sort())
      } else {
        log.warn('No columns found for risks table, using minimal safe query')
        // At minimum, id and title should exist, but be safe
        availableColumns = new Set(['id', 'title', 'project_id'])
      }
    } catch (err: any) {
      log.error('Could not check for risk columns, using minimal safe query', {
        error: err?.message,
        stack: err?.stack
      })
      // Fallback to absolute minimum columns
      availableColumns = new Set(['id', 'title', 'project_id'])
    }

    // Build query based on available columns
    const hasExtractedFromDoc = availableColumns.has('extracted_from_document_id')
    const hasSourceDoc = availableColumns.has('source_document_id')
    const hasRiskOrigin = availableColumns.has('risk_origin')
    const hasRiskLevel = availableColumns.has('risk_level')
    const hasIsCurated = availableColumns.has('is_curated')

    // Build SELECT fields dynamically - only include columns that exist
    const selectFields = ['r.id', 'r.title']
    
    if (availableColumns.has('description')) selectFields.push('r.description')
    if (availableColumns.has('category')) selectFields.push('r.category')
    if (availableColumns.has('probability')) selectFields.push('r.probability')
    if (availableColumns.has('impact')) selectFields.push('r.impact')
    if (availableColumns.has('severity')) {
      selectFields.push('r.severity')
    } else {
      // Calculate severity from probability and impact if they exist
      if (availableColumns.has('probability') && availableColumns.has('impact')) {
        selectFields.push(`(
          CASE 
            WHEN r.probability IN ('very_high', 'high') AND r.impact IN ('very_high', 'high') THEN 'critical'
            WHEN r.probability IN ('very_high', 'high') OR r.impact IN ('very_high', 'high') THEN 'high'
            WHEN r.probability = 'medium' AND r.impact = 'medium' THEN 'medium'
            ELSE 'low'
          END
        ) as severity`)
      } else {
        selectFields.push("'low' as severity")
      }
    }
    
    if (availableColumns.has('status')) {
      selectFields.push("COALESCE(r.status, 'identified') as status")
    } else {
      selectFields.push("'identified' as status")
    }
    
    if (availableColumns.has('mitigation_strategy')) selectFields.push('r.mitigation_strategy')
    if (availableColumns.has('contingency_plan')) selectFields.push('r.contingency_plan')
    if (availableColumns.has('owner')) selectFields.push('r.owner')

    // Add optional fields
    if (hasRiskOrigin) {
      selectFields.push("COALESCE(r.risk_origin, 'project-extraction') as risk_origin")
    } else {
      selectFields.push("'project-extraction' as risk_origin")
    }

    if (hasRiskLevel) {
      selectFields.push("COALESCE(r.risk_level, 'project') as risk_level")
    } else {
      selectFields.push("'project' as risk_level")
    }

    if (hasIsCurated) {
      selectFields.push('COALESCE(r.is_curated, false) as is_curated')
    } else {
      selectFields.push('false as is_curated')
    }

    if (hasExtractedFromDoc) {
      selectFields.push('r.extracted_from_document_id')
    } else {
      selectFields.push('NULL as extracted_from_document_id')
    }

    if (hasSourceDoc) {
      if (hasExtractedFromDoc) {
        selectFields.push('COALESCE(r.source_document_id, r.extracted_from_document_id) as source_document_id')
      } else {
        selectFields.push('r.source_document_id as source_document_id')
      }
    } else if (hasExtractedFromDoc) {
      selectFields.push('r.extracted_from_document_id as source_document_id')
    } else {
      selectFields.push('NULL as source_document_id')
    }

    // Add timestamp fields
    if (availableColumns.has('created_at')) {
      selectFields.push('r.created_at')
    } else {
      selectFields.push('NULL as created_at')
    }
    
    if (availableColumns.has('updated_at')) {
      selectFields.push('r.updated_at')
    } else {
      selectFields.push('NULL as updated_at')
    }
    
    // Add document title if join is possible
    if (hasExtractedFromDoc || hasSourceDoc) {
      selectFields.push('d.title as source_document_title')
    } else {
      selectFields.push('NULL as source_document_title')
    }

    // Build JOIN clause - only join if columns actually exist
    let joinClause = ''
    if (hasExtractedFromDoc && hasSourceDoc) {
      // Both columns exist - use both in join
      joinClause = `LEFT JOIN documents d ON (
        r.extracted_from_document_id = d.id 
        OR (r.source_document_id IS NOT NULL AND r.source_document_id = d.id)
      )`
    } else if (hasExtractedFromDoc) {
      // Only extracted_from_document_id exists
      joinClause = 'LEFT JOIN documents d ON r.extracted_from_document_id = d.id'
    } else if (hasSourceDoc) {
      // Only source_document_id exists
      joinClause = 'LEFT JOIN documents d ON r.source_document_id = d.id'
    } else {
      // Neither column exists - use FALSE to prevent join
      joinClause = 'LEFT JOIN documents d ON FALSE'
    }

    // Build ORDER BY clause - handle severity if it exists or was calculated
    const createdAtField = availableColumns.has('created_at') ? 'r.created_at' : 'r.id'
    let orderByClause = ''
    
    if (availableColumns.has('severity')) {
      orderByClause = `
        ORDER BY 
          CASE COALESCE(r.severity, 'low')
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END,
          ${createdAtField} DESC`
    } else if (availableColumns.has('probability') && availableColumns.has('impact')) {
      // Order by calculated severity
      orderByClause = `
        ORDER BY 
          CASE 
            WHEN r.probability IN ('very_high', 'high') AND r.impact IN ('very_high', 'high') THEN 1
            WHEN r.probability IN ('very_high', 'high') OR r.impact IN ('very_high', 'high') THEN 2
            WHEN r.probability = 'medium' AND r.impact = 'medium' THEN 3
            ELSE 4
          END,
          ${createdAtField} DESC`
    } else {
      const orderField = availableColumns.has('created_at') ? 'r.created_at' : 'r.id'
      orderByClause = `ORDER BY ${orderField} DESC`
    }

    const query = `
      SELECT ${selectFields.join(',\n          ')}
      FROM risks r
      ${joinClause}
      WHERE r.project_id = $1
      ${orderByClause}
    `

    log.info('Constructed query for project risks:', {
      projectId,
      hasExtractedFromDoc,
      hasSourceDoc,
      hasRiskOrigin,
      hasRiskLevel,
      hasIsCurated,
      selectFieldCount: selectFields.length,
      availableColumns: Array.from(availableColumns).sort(),
      queryPreview: query.substring(0, 500) + '...'
    })

    // First, check how many risks exist for this project with a simple query
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM risks WHERE project_id = $1',
      [projectId]
    )
    const riskCount = parseInt(countResult.rows[0]?.count || '0', 10)
    log.info(`Found ${riskCount} total risks in database for project ${projectId}`)

    const result = await pool.query(query, [projectId])

    log.info(`Fetched ${result.rows.length} risks for project ${projectId}`, {
      projectId,
      riskCount: result.rows.length,
      sampleRisk: result.rows.length > 0 ? {
        id: result.rows[0].id,
        title: result.rows[0].title,
        severity: result.rows[0].severity,
        status: result.rows[0].status,
        risk_origin: result.rows[0].risk_origin
      } : null
    })

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    log.error("Get project risks error:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      detail: error?.detail
    })
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error?.message || "Unknown error",
      detail: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    })
  }
})

// Get project team members with user details
router.get("/:projectId/team-members", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const requesterId = req.user?.id
    const requesterRole = req.user?.role

    const projectResult = await pool.query(
      `
      SELECT id, owner_id, team_members
      FROM projects
      WHERE id = $1
      `,
      [projectId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Project not found"
      })
    }

    const projectRow = projectResult.rows[0]
    const teamMembers = normalizeTeamMembers(projectRow.team_members)
    const teamMemberSet = new Set(teamMembers)

    const hasAccess =
      requesterRole === 'admin' ||
      projectRow.owner_id === requesterId ||
      (requesterId && teamMemberSet.has(requesterId))

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: "Access denied"
      })
    }

    const validUserIds = teamMembers.filter(id => isUuid(id))
    let userMap = new Map<string, any>()

    if (validUserIds.length > 0) {
      const usersResult = await pool.query(
        `
        SELECT id, name, email, role, avatar_url
        FROM users
        WHERE id = ANY($1::uuid[])
        `,
        [validUserIds]
      )

      userMap = new Map(usersResult.rows.map(user => [user.id, user]))
    }

    const members = teamMembers.map(id => {
      const user = userMap.get(id)
      return {
        id,
        name: user?.name || null,
        email: user?.email || null,
        role: user?.role || null,
        avatar_url: user?.avatar_url || null
      }
    })

    res.json({
      success: true,
      data: members,
      count: members.length
    })
  } catch (error: any) {
    log.error('[ProjectsAPI] Error fetching project team members', {
      error: error?.message,
      stack: error?.stack,
      projectId: req.params.projectId
    })
    res.status(500).json({
      success: false,
      error: "Failed to load team members",
      message: process.env.NODE_ENV === 'development' ? error?.message : undefined
    })
  }
})

// Create a new risk for a project
router.post("/:projectId/risks", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const {
      title,
      description,
      category,
      probability,
      impact,
      status = 'identified',
      mitigation_strategy,
      contingency_plan,
      owner,
      risk_origin = 'manual-entry',
      is_curated = false
    } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Verify project exists
    const projectCheck = await pool.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Calculate severity from probability and impact
    const probScore = probability === 'very_high' ? 90 : probability === 'high' ? 70 : probability === 'medium' ? 50 : probability === 'low' ? 30 : 10
    const impactScore = impact === 'very_high' ? 5 : impact === 'high' ? 4 : impact === 'medium' ? 3 : impact === 'low' ? 2 : 1
    const score = (probScore / 100) * impactScore
    const severity = score >= 4 ? 'critical' : score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low'

    const riskId = uuidv4()

    // Check if new columns exist (from migration 340)
    let hasNewColumns = false
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'risks' 
        AND column_name IN ('risk_origin', 'risk_level', 'is_curated')
        LIMIT 1
      `)
      hasNewColumns = columnCheck.rows.length > 0
    } catch (err) {
      log.warn('Could not check for new risk columns', err)
    }

    let query: string
    let params: any[]

    if (hasNewColumns) {
      // Use new columns if they exist
      query = `
        INSERT INTO risks (
          id, project_id, title, description, category, probability, impact, severity,
          status, mitigation_strategy, contingency_plan, owner, risk_origin, risk_level,
          is_curated, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING *
      `
      params = [
        riskId,
        projectId,
        title,
        description || null,
        category || null,
        probability,
        impact,
        severity,
        status,
        mitigation_strategy || null,
        contingency_plan || null,
        owner || null,
        risk_origin,
        'project',
        is_curated,
        userId
      ]
    } else {
      // Use base columns only
      query = `
        INSERT INTO risks (
          id, project_id, title, description, category, probability, impact, severity,
          status, mitigation_strategy, contingency_plan, owner, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `
      params = [
        riskId,
        projectId,
        title,
        description || null,
        category || null,
        probability,
        impact,
        severity,
        status,
        mitigation_strategy || null,
        contingency_plan || null,
        owner || null,
        userId
      ]
    }

    const result = await pool.query(query, params)

    log.info(`Risk created for project ${projectId}`, { riskId, title })

    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    log.error("Create project risk error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update a risk
router.put("/:projectId/risks/:riskId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, riskId } = req.params
    const updates = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Verify risk belongs to project
    const riskCheck = await pool.query(
      'SELECT id FROM risks WHERE id = $1 AND project_id = $2',
      [riskId, projectId]
    )

    if (riskCheck.rows.length === 0) {
      return res.status(404).json({ error: "Risk not found" })
    }

    // Recalculate severity if probability or impact changed
    if (updates.probability || updates.impact) {
      const currentRisk = await pool.query(
        'SELECT probability, impact FROM risks WHERE id = $1',
        [riskId]
      )
      const prob = updates.probability || currentRisk.rows[0].probability
      const imp = updates.impact || currentRisk.rows[0].impact
      
      const probScore = prob === 'very_high' ? 90 : prob === 'high' ? 70 : prob === 'medium' ? 50 : prob === 'low' ? 30 : 10
      const impactScore = imp === 'very_high' ? 5 : imp === 'high' ? 4 : imp === 'medium' ? 3 : imp === 'low' ? 2 : 1
      const score = (probScore / 100) * impactScore
      updates.severity = score >= 4 ? 'critical' : score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low'
    }

    // Check which new columns exist individually
    let availableColumns: Set<string> = new Set()
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'risks'
      `)
      if (columnCheck.rows && columnCheck.rows.length > 0) {
        availableColumns = new Set(columnCheck.rows.map((row: any) => row.column_name))
      }
    } catch (err) {
      log.warn('Could not check for risk columns', err)
    }

    // Build update query dynamically - only include fields that exist
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    // Base fields that should exist (but check anyway)
    const baseFields = [
      'title', 'description', 'category', 'probability', 'impact',
      'status', 'mitigation_strategy', 'contingency_plan', 'owner'
    ]
    
    // Optional fields that may not exist
    const optionalFields = ['severity']
    
    // Check each new field individually
    const newFields: string[] = []
    if (availableColumns.has('risk_origin')) newFields.push('risk_origin')
    if (availableColumns.has('risk_level')) newFields.push('risk_level')
    if (availableColumns.has('is_curated')) newFields.push('is_curated')
    
    // Build allowed fields list - only include optional fields if they exist
    const allowedFields = [...baseFields, ...newFields]
    if (availableColumns.has('severity')) {
      allowedFields.push('severity')
    }

    const skippedFields: string[] = []
    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        let fieldValue = updates[field]
        
        // Validate risk_level if being updated
        if (field === 'risk_level' && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          const validLevels = ['project', 'program', 'portfolio', 'systemic']
          if (!validLevels.includes(fieldValue)) {
            log.warn(`Invalid risk_level value: ${fieldValue}, skipping update`)
            skippedFields.push(field)
            continue
          }
        }
        
        // Skip empty strings for optional fields to let trigger handle defaults
        if (newFields.includes(field) && (fieldValue === '' || fieldValue === null || fieldValue === undefined)) {
          log.debug(`Skipping empty/null value for ${field}, letting trigger set default`)
          skippedFields.push(field)
          continue
        }
        
        // Check if column exists - baseFields are assumed to exist, but verify optional fields
        const fieldExists = baseFields.includes(field) || 
                           newFields.includes(field) || 
                           (optionalFields.includes(field) && availableColumns.has(field))
        
        if (fieldExists) {
          updateFields.push(`${field} = $${paramCount}`)
          updateValues.push(fieldValue)
          paramCount++
        } else {
          skippedFields.push(field)
          log.warn(`Skipping field ${field} - column does not exist in database`)
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "No valid fields to update",
        skippedFields: skippedFields.length > 0 ? skippedFields : undefined
      })
    }
    
    // Warn if important fields were skipped
    if (skippedFields.length > 0) {
      log.warn(`Some fields could not be updated (columns don't exist): ${skippedFields.join(', ')}`)
    }

    // Always update updated_at if column exists
    if (availableColumns.has('updated_at')) {
      updateFields.push(`updated_at = NOW()`)
    }
    
    // Add last_updated_by if column exists and we're updating
    if (availableColumns.has('last_updated_by')) {
      updateFields.push(`last_updated_by = $${paramCount}`)
      updateValues.push(userId)
      paramCount++
    }
    
    updateValues.push(riskId, projectId)

    const query = `
      UPDATE risks
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND project_id = $${paramCount + 1}
      RETURNING *
    `

    log.debug('Update risk query:', {
      query,
      updateFields,
      updateValues: updateValues.slice(0, -2), // Don't log the IDs
      paramCount
    })

    const result = await pool.query(query, updateValues)

    log.info(`Risk updated for project ${projectId}`, { riskId, skippedFields })

    const response: any = {
      success: true,
      data: result.rows[0]
    }
    
    // Include warning if fields were skipped
    if (skippedFields.length > 0) {
      response.warning = `Some fields could not be updated (columns don't exist): ${skippedFields.join(', ')}. Please run migration 340 to enable these features.`
    }
    
    res.json(response)
  } catch (error: any) {
    log.error("Update project risk error:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      detail: error?.detail
    })
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      message: error?.message || "Unknown error",
      detail: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    })
  }
})

// Delete a risk
router.delete("/:projectId/risks/:riskId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, riskId } = req.params

    // Verify risk belongs to project
    const riskCheck = await pool.query(
      'SELECT id FROM risks WHERE id = $1 AND project_id = $2',
      [riskId, projectId]
    )

    if (riskCheck.rows.length === 0) {
      return res.status(404).json({ error: "Risk not found" })
    }

    await pool.query(
      'DELETE FROM risks WHERE id = $1 AND project_id = $2',
      [riskId, projectId]
    )

    log.info(`Risk deleted for project ${projectId}`, { riskId })

    res.json({
      success: true,
      message: "Risk deleted successfully"
    })
  } catch (error) {
    log.error("Delete project risk error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get project context for AI generation (must be before /:id route)
router.get("/:id/context", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const userId = req.user?.id

    // Get project details with document count (exclude AI-regenerated versions)
    const projectResult = await pool.query(
      `
      SELECT p.*, 
             u.name as owner_name,
             COUNT(DISTINCT d.id) FILTER (WHERE d.parent_document_id IS NULL) as documents_count,
             MAX(d.updated_at) as last_document_update
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN documents d ON p.id = d.project_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `,
      [id]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Get recent documents (last 10) with title only - exclude AI regenerations
    const documentsResult = await pool.query(
      `
      SELECT id, title, template_id, created_at, updated_at
      FROM documents 
      WHERE project_id = $1 
        AND parent_document_id IS NULL
      ORDER BY updated_at DESC 
      LIMIT 10
    `,
      [id]
    )

    // Get recent changes (last 5 documents created/updated) - exclude AI regenerations
    const recentChangesResult = await pool.query(
      `
      SELECT 
        title, 
        created_at, 
        updated_at,
        CASE 
          WHEN created_at > (updated_at - INTERVAL '1 hour') THEN 'created' 
          ELSE 'updated' 
        END as change_type
      FROM documents 
      WHERE project_id = $1 
        AND parent_document_id IS NULL
      ORDER BY GREATEST(created_at, updated_at) DESC 
      LIMIT 5
    `,
      [id]
    )

    // Get baseline info if exists
    const baselineResult = await pool.query(
      `
      SELECT id, version, status, created_at
      FROM project_baselines 
      WHERE project_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `,
      [id]
    )

    const context = {
      id: projectResult.rows[0].id,
      name: projectResult.rows[0].name,
      description: projectResult.rows[0].description,
      status: projectResult.rows[0].status,
      created_at: projectResult.rows[0].created_at,
      documents_count: parseInt(projectResult.rows[0].documents_count) || 0,
      last_document_update: projectResult.rows[0].last_document_update,
      documents: documentsResult.rows,
      recent_changes: recentChangesResult.rows,
      baseline: baselineResult.rows[0] || null
    }

    log.info(`Project context retrieved for project ${id}`, {
      documentsCount: context.documents_count,
      hasBaseline: !!context.baseline
    })

    res.json(context)
  } catch (error) {
    log.error("Get project context error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get project by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `,
      [id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Get project documents (only original/parent documents, hide AI-regenerated versions)
    const documentsResult = await pool.query(
      `
      SELECT d.*, u.name as created_by_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.project_id = $1 
        AND d.parent_document_id IS NULL
      ORDER BY d.created_at DESC
    `,
      [id],
    )

    const project = {
      ...result.rows[0],
      documents: documentsResult.rows,
    }

    // Track project view
    if (req.user?.id) {
      trackActivity.viewProject(req.user.id, id)
    }

    res.json({ project })
  } catch (error) {
    log.error("Get project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create project
router.post("/", authenticateToken, requirePermission("projects.create"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      name,
      description,
      framework,
      priority = "medium",
      start_date,
      end_date,
      budget,
      team_members = [],
      program_id,
    } = req.body

    const id = uuidv4()

    // Convert empty strings to null for date and numeric fields
    const startDateValue = start_date && start_date.trim() !== '' ? start_date : null
    const endDateValue = end_date && end_date.trim() !== '' ? end_date : null
    const budgetValue = budget && budget !== '' ? parseFloat(budget) : null

    // Validate program_id if provided
    let programIdValue = program_id || null
    if (programIdValue) {
      const programCheck = await pool.query('SELECT id FROM programs WHERE id = $1', [programIdValue])
      if (programCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid program_id: Program not found' })
      }
    }

    const result = await pool.query(
      `
      INSERT INTO projects (id, name, description, framework, priority, start_date, end_date, budget, owner_id, team_members, program_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        id,
        name,
        description,
        framework,
        priority,
        startDateValue,
        endDateValue,
        budgetValue,
        req.user?.id,
        JSON.stringify(team_members),
        programIdValue,
      ],
    )

  log.info(`Project created: ${name} by ${req.user?.email}`)

    // Track project creation
    if (req.user?.id) {
      trackActivity.createProject(
        req.user.id,
        id,
        {
          name,
          framework,
          priority,
          team_members: team_members.length
        }
      )
    }

    res.status(201).json({
      message: "Project created successfully",
      project: result.rows[0],
    })
  } catch (error) {
    log.error("Create project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update project
router.put("/:id", authenticateToken, requirePermission("projects.update"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const { name, description, framework, status, priority, start_date, end_date, budget, team_members, program_id } = req.body

    // Convert empty strings to null for date and numeric fields
    const startDateValue = start_date && start_date.trim() !== '' ? start_date : null
    const endDateValue = end_date && end_date.trim() !== '' ? end_date : null
    const budgetValue = budget && budget !== '' && budget !== null ? parseFloat(budget.toString()) : null

    // Build update payload for service
    const updates: any = {
      name,
      description,
      framework,
      status,
      priority,
      start_date: startDateValue,
      end_date: endDateValue,
      budget: budgetValue,
      team_members: JSON.stringify(team_members),
    }

    // Only include program_id if present in request (allow null to unassign)
    if (Object.prototype.hasOwnProperty.call(req.body, 'program_id')) {
      updates.program_id = program_id
    }

    const project = await projectService.update(id, updates, req.user?.id)
    if (!project) return res.status(404).json({ error: "Project not found" })

    log.info(`Project updated: ${id} by ${req.user?.email}`)

    res.json({ message: "Project updated successfully", project })
  } catch (error) {
    // Convert our service codes to appropriate HTTP responses
    if ((error as any).code === 'PROGRAM_NOT_FOUND') {
      return res.status(404).json({ error: 'Program not found' })
    }

    if ((error as any).code === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    log.error("Update project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Replicate project configuration/documents to similar projects
router.post("/:id/replicate", authenticateToken, requirePermission("projects.replicate"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const { targetProjectIds, matchBy = 'framework', includeDocuments = false } = req.body
    const userId = req.user?.id

    const result = await projectService.replicateToProjects(id, { targetProjectIds, matchBy, includeDocuments }, userId)

    log.info(`Replication requested for project ${id} by ${req.user?.email}`, { matchBy, includeDocuments, targets: result.targets?.length })

    res.json(result)
  } catch (error) {
    log.error('Project replication error', error)
    if ((error as any).code === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Project not found' })
    }
    if ((error as any).code === 'INVALID_OPTIONS') {
      return res.status(400).json({ error: 'Invalid options' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete project
router.delete("/:id", authenticateToken, requirePermission("projects.delete"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM projects WHERE id = $1 RETURNING name", [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

  log.info(`Project deleted: ${id} by ${req.user?.email}`)

    res.json({ message: "Project deleted successfully" })
  } catch (error) {
    log.error("Delete project error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Project Document Routes

// Create a new document in a project
router.post("/:projectId/documents", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const { title, content, template_id, generation_metadata } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Verify user has access to project
    const projectCheck = await pool.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Create document
    const documentId = uuidv4()
    const result = await pool.query(
      `
      INSERT INTO documents 
      (id, project_id, title, content, template_id, generation_metadata, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
      `,
      [
        documentId,
        projectId,
        title,
        content,
        template_id || null,
        generation_metadata ? JSON.stringify(generation_metadata) : null,
        userId
      ]
    )

    log.info(`Document created in project ${projectId}`, {
      documentId,
      title,
      hasTemplate: !!template_id
    })

    // 🚀 Automatic Entity Extraction: Trigger extraction for newly created document
    // This runs asynchronously and doesn't block the response
    if (content && typeof content === 'string' && content.trim().length > 0) {
      try {
        // Create extraction job record
        const extractionJobResult = await pool.query(
          `INSERT INTO jobs (
            type, status, data, created_by, project_id
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [
            'project-data-extraction',
            'pending',
            JSON.stringify({ 
              projectId, 
              documentIds: [documentId], // Extract only from this newly created document
              autoTriggered: true,
              sourceDocumentId: documentId,
              sourceDocumentName: title
            }),
            userId,
            projectId
          ]
        )

        const extractionJobId = extractionJobResult.rows[0].id

        // Enqueue extraction job (non-blocking)
        await extractionQueue.add('extract-project-data', {
          jobId: extractionJobId,
          projectId,
          userId,
          documentIds: [documentId], // Extract entities from this document only
          aiProvider: undefined, // Use default provider
          aiModel: undefined // Use default model
        })

        log.info('🚀 Automatic entity extraction triggered for new document', {
          documentId,
          documentName: title,
          extractionJobId,
          projectId
        })
      } catch (extractionError: any) {
        // Don't fail document creation if extraction trigger fails
        log.warn('⚠️ Failed to trigger automatic entity extraction', {
          documentId,
          error: extractionError.message,
          stack: extractionError.stack
        })
      }
    }

    res.json(result.rows[0])
  } catch (error) {
    log.error("Create document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get a specific document from a project
router.get("/:projectId/documents/:documentId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params

    const query = `
      SELECT 
        d.id,
        COALESCE(d.title, d.name) as title,
        d.content,
        COALESCE(d.author, u.name, 'Unknown') as author,
        d.created_at,
        d.updated_at,
        d.status,
        d.project_id,
        p.name as project_name,
        d.version,
        d.word_count,
        d.character_count,
        d.metadata,
        d.generation_metadata,
        d.template_metadata,
        d.template_id,
        d.framework,
        t.name as template_name
      FROM documents d
      JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.id = $1 AND d.project_id = $2
    `

    const result = await pool.query(query, [documentId, projectId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const document = result.rows[0]
    
    // 🔍 DEBUG: Log what we got from database
    log.info('📊 [GET-PROJECT-DOC] Retrieved document:', {
      id: document.id,
      name: document.title,
      has_generation_metadata: !!document.generation_metadata,
      generation_metadata_type: typeof document.generation_metadata,
      generation_metadata_length: document.generation_metadata ? JSON.stringify(document.generation_metadata).length : 0
    })

    // Parse metadata if it exists and is a string
    if (document.metadata && typeof document.metadata === 'string') {
      try {
        document.metadata = JSON.parse(document.metadata)
      } catch (e) {
        // If parsing fails, keep as is
        document.metadata = {}
      }
    }
    
    // Parse generation_metadata if it exists and is a string
    if (document.generation_metadata && typeof document.generation_metadata === 'string') {
      try {
        log.info('⚠️ [GET-PROJECT-DOC] generation_metadata is STRING, parsing...')
        document.generation_metadata = JSON.parse(document.generation_metadata)
        log.info('✅ [GET-PROJECT-DOC] Parsed successfully. Keys:', Object.keys(document.generation_metadata))
      } catch (e) {
        log.error('❌ [GET-PROJECT-DOC] Failed to parse generation_metadata:', e)
        document.generation_metadata = null
      }
    } else if (document.generation_metadata) {
      log.info('✅ [GET-PROJECT-DOC] generation_metadata is already OBJECT')
    } else {
      log.info('❌ [GET-PROJECT-DOC] No generation_metadata in database')
    }
    
    // Parse template_metadata if it exists and is a string
    if (document.template_metadata && typeof document.template_metadata === 'string') {
      try {
        document.template_metadata = JSON.parse(document.template_metadata)
      } catch (e) {
        log.warn('Failed to parse template_metadata:', e)
        document.template_metadata = null
      }
    }
    
    // 🔍 DEBUG: Log what we're sending
    log.info('📤 [GET-PROJECT-DOC] Sending to frontend:', {
      id: document.id,
      has_generation_metadata: !!document.generation_metadata,
      has_aiProcessing: !!(document.generation_metadata?.aiProcessing),
      has_source_documents: !!(document.generation_metadata?.source_documents)
    })

    res.json(document)
  } catch (error) {
    log.error("Get project document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get document versions (now queries documents table, not document_versions)
router.get("/:projectId/documents/:documentId/versions", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params

    // First verify the document exists and belongs to the project
    const verifyQuery = `
      SELECT id FROM documents 
      WHERE id = $1 AND project_id = $2
    `
    const verifyResult = await pool.query(verifyQuery, [documentId, projectId])
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    // Use the get_document_versions function to get all related documents
    const query = `
      SELECT 
        id,
        name,
        semantic_version as version,
        content,
        created_at,
        updated_at,
        author_name as author,
        word_count,
        is_regeneration,
        generation_metadata as metadata,
        is_current,
        CASE 
          WHEN is_regeneration THEN 'Regenerated with updated project context'
          ELSE name
        END as changes
      FROM get_document_versions($1::UUID)
      ORDER BY created_at DESC
    `

    const result = await pool.query(query, [documentId])
    res.json(result.rows)
  } catch (error) {
    log.error("Get document versions error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update a document
router.put("/:projectId/documents/:documentId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params
    const { content, title, tags } = req.body
    const userId = (req as any).user.id

    // Get the current document with template info
    const documentQuery = `
      SELECT d.*, 
             t.name as template_name,
             t.prompt_version as current_template_version
      FROM documents d 
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.id = $1 AND d.project_id = $2
    `
    const docResult = await pool.query(documentQuery, [documentId, projectId])

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    const currentDoc = docResult.rows[0]
    
    // Calculate next versions (both integer and semantic)
    const currentVersionInt = parseInt(currentDoc.version) || 1
    const nextVersionInt = currentVersionInt + 1
    
    // Parse semantic version (handles "1.0.0", "1", etc.)
    const currentSemantic = currentDoc.semantic_version || currentDoc.version?.toString() || '1.0.0'
    const semParts = currentSemantic.split('.')
    let major = parseInt(semParts[0]) || 1
    let minor = parseInt(semParts[1]) || 0
    let patch = parseInt(semParts[2]) || 0
    
    // Increment patch for manual edits
    patch += 1
    const nextSemanticVersion = `${major}.${minor}.${patch}`

    // Calculate word count
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0
    const characterCount = content ? content.length : 0

    // 📸 STEP 1: Save current version to document_versions table (snapshot)
    await pool.query(
      `INSERT INTO document_versions 
       (id, document_id, version, semantic_version, content, author_id, created_at, change_type, change_description, generation_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
       ON CONFLICT (document_id, version) DO NOTHING`,
      [
        uuidv4(),
        documentId,
        currentDoc.version?.toString() || '1',
        currentSemantic,
        currentDoc.content,
        currentDoc.updated_by || currentDoc.created_by,
        'manual_edit',
        `Manual edit by user - previous version v${currentSemantic}`,
        currentDoc.generation_metadata || null
      ]
    )
    
    log.info(`Saved v${currentSemantic} to version history`)

    // 📝 STEP 2: Update the current document with new content and incremented versions
    const updateResult = await pool.query(
      `UPDATE documents 
       SET content = COALESCE($1, content),
           name = COALESCE($2, name),
           version = $3::integer,
           semantic_version = $4::varchar,
           word_count = $5::integer,
           character_count = $6::integer,
           updated_by = $7::uuid,
           updated_at = NOW(),
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{last_edit}',
             jsonb_build_object(
               'edited_at', NOW(),
               'edited_by', $7::text,
               'previous_version', $8::text,
               'new_version', $4::text,
               'edit_type', 'manual_content_edit'
             )
           )
       WHERE id = $9::uuid AND project_id = $10::uuid
       RETURNING *`,
      [
        content,
        title || currentDoc.name,
        nextVersionInt, // Integer: 1, 2, 3
        nextSemanticVersion, // String: "1.0.1", "1.0.2"
        wordCount,
        characterCount,
        userId,
        currentSemantic, // Previous semantic version
        documentId,
        projectId
      ]
    )

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found or no changes made" })
    }

    const updatedDoc = updateResult.rows[0]

    log.info(`Manual edit saved - version updated from v${currentSemantic} to v${nextSemanticVersion}`, {
      documentId,
      userId,
      wordCount,
      characterCount,
      previousSemanticVersion: currentSemantic,
      newSemanticVersion: nextSemanticVersion,
      previousVersionInt: currentVersionInt,
      newVersionInt: nextVersionInt
    })

    // 🔥 Trigger quality audit after manual content edit
    if (content) {
      try {
        const { qualityAuditService } = await import('../services/qualityAuditService')
        
        log.info('[MANUAL-EDIT] Triggering quality audit after content modification', {
          documentId,
          documentName: updatedDoc.name,
          version: `v${nextSemanticVersion}`,
          wordCount,
          characterCount
        })

        // Enqueue quality audit job (async, non-blocking)
        const { queueService } = await import('../services/queueService')
        const auditJobId = require('uuid').v4()
        
        queueService.addJob('quality-audit', {
          jobId: auditJobId,
          documentId,
          documentContent: content,
          documentType: updatedDoc.type || 'unknown',
          projectContext: { id: projectId, name: 'Project' },
          userId
        }).catch((auditError: any) => {
          log.error('[MANUAL-EDIT] Failed to enqueue quality audit', {
            documentId,
            error: auditError.message
          })
        })
      } catch (importError: any) {
        log.error('[MANUAL-EDIT] Failed to import quality audit service', importError)
      }
    }

    res.json(updatedDoc)
  } catch (error) {
    log.error("Update document error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add a comment to a document
router.post("/:projectId/documents/:documentId/comments", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId, documentId } = req.params
    const { content, author_id } = req.body
    const userId = (req as any).user.id

    // First, verify the document exists and belongs to the project
    const verifyQuery = `
      SELECT id FROM documents 
      WHERE id = $1 AND project_id = $2
    `
    const verifyResult = await pool.query(verifyQuery, [documentId, projectId])

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" })
    }

    // Get user info for the comment
    const userQuery = `SELECT name FROM users WHERE id = $1`
    const userResult = await pool.query(userQuery, [author_id || userId])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    // Create the comment
    const comment = {
      id: uuidv4(),
      author: userResult.rows[0].name,
      content,
      created_at: new Date().toISOString()
    }

    // Update the document's comments array
    const updateQuery = `
      UPDATE documents 
      SET 
        comments = COALESCE(comments, '[]'::jsonb) || $1::jsonb,
        updated_at = NOW()
      WHERE id = $2 AND project_id = $3
      RETURNING comments
    `

    const result = await pool.query(updateQuery, [
      JSON.stringify([comment]),
      documentId,
      projectId
    ])

    res.json(comment)
  } catch (error) {
    log.error("Add comment error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get drift detections for a project
router.get("/:id/drift-detections", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id: projectId } = req.params
    const { severity, status, limit = 100 } = req.query

    let query = `
      SELECT 
        bdd.id,
        bdd.baseline_id,
        bdd.project_id,
        bdd.detection_type,
        bdd.drift_severity,
        bdd.drift_description,
        bdd.drift_impact,
        bdd.detection_date,
        bdd.status,
        bdd.source_document_id,
        bdd.detected_by,
        bdd.ai_processing_metadata->'drift_points' as drift_points,
        d.name as document_name
      FROM baseline_drift_detection bdd
      LEFT JOIN documents d ON bdd.source_document_id = d.id
      WHERE bdd.project_id = $1
    `

    const params: any[] = [projectId]
    let paramCount = 1

    if (severity) {
      paramCount++
      query += ` AND bdd.drift_severity = $${paramCount}`
      params.push(severity)
    }

    if (status) {
      paramCount++
      query += ` AND bdd.status = $${paramCount}`
      params.push(status)
    }

    query += ` ORDER BY 
      CASE bdd.drift_severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      bdd.detection_date DESC
      LIMIT $${paramCount + 1}
    `
    params.push(limit)

    const result = await pool.query(query, params)

    log.info(`Fetched ${result.rows.length} drift detections for project`, { projectId })

    res.json({
      drifts: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    log.error("Error fetching drift detections:", error)
    res.status(500).json({ error: "Failed to fetch drift detections" })
  }
})

// Upgrade project to program (must be before /:id route)
router.post("/:id/upgrade-to-program", authenticateToken, requirePermission("programs.manage"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const projectId = id
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Get project details
    const projectResult = await pool.query(
      `SELECT p.*, u.name as owner_name 
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1`,
      [projectId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    const project = projectResult.rows[0]

    // Check if project is already assigned to a program
    if (project.program_id) {
      return res.status(400).json({ 
        error: "Project is already assigned to a program",
        program_id: project.program_id
      })
    }

    // Map project fields to program fields
    // Convert project dates to DATE format (remove time component)
    const startDate = project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    const endDate = project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 1 year from now

    // Map project status to program RAG status
    const statusMap: Record<string, 'green' | 'amber' | 'red'> = {
      'active': 'green',
      'on-hold': 'amber',
      'at_risk': 'amber',
      'completed': 'green',
      'archived': 'green',
      'planning': 'green'
    }
    const programStatus = statusMap[project.status?.toLowerCase()] || 'green'

    // Create program from project data
    const programData = {
      name: project.name || `Program: ${project.name}`,
      description: project.description || `Program created from project: ${project.name}`,
      budget: project.budget ? parseFloat(project.budget.toString()) : null,
      currency: 'USD', // Default currency
      start_date: startDate,
      end_date: endDate,
      status: programStatus,
      owner_id: project.owner_id || userId,
      created_by: userId
    }

    const newProgram = await programService.createProgram(programData)

    // Link project to the new program
    await programService.assignProject(newProgram.id, projectId)

    log.info(`Project upgraded to program`, { 
      projectId, 
      programId: newProgram.id,
      userId 
    })

    res.json({
      success: true,
      data: {
        program: newProgram,
        project: {
          ...project,
          program_id: newProgram.id
        }
      }
    })
  } catch (error: any) {
    log.error("Failed to upgrade project to program:", error)
    
    if (error.code === 'PROGRAM_NOT_FOUND' || error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message || "Resource not found" })
    }
    
    res.status(500).json({ 
      error: "Failed to upgrade project to program",
      details: error.message 
    })
  }
})

// Get compliance and security data for a project
router.get("/:projectId/compliance-security", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params
    const userId = (req as any).user?.id

    // Verify project exists and user has access
    const projectCheck = await pool.query(
      `SELECT id FROM projects WHERE id = $1`,
      [projectId]
    )

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    // Get compliance security data
    const result = await pool.query(
      `SELECT * FROM compliance_security 
       WHERE project_id = $1 
       ORDER BY created_at DESC`,
      [projectId]
    )

    log.info(`Retrieved compliance security data for project`, {
      projectId,
      userId,
      count: result.rows.length
    })

    res.json({
      success: true,
      data: result.rows
    })
  } catch (error: any) {
    log.error("Get compliance security error:", error)
    res.status(500).json({
      error: "Failed to retrieve compliance security data",
      details: error.message
    })
  }
})

export default router
