import { Router, Request, Response } from 'express'
import { getDatabasePool } from '../database/connection'
import { logger } from '../utils/logger'
import Joi from 'joi'

const router = Router()

/**
 * Validation schemas
 */
const createPortfolioSchema = Joi.object({
  company_id: Joi.string().uuid().optional().allow(null),
  portfolio_name: Joi.string().required().max(255),
  description: Joi.string().optional().allow(null, ''),
  owner_id: Joi.string().uuid().optional().allow(null),
  portfolio_lead: Joi.string().uuid().optional().allow(null),
  status: Joi.string().valid('active', 'archived', 'paused').default('active'),
  budget: Joi.number().optional().allow(null),
  budget_currency: Joi.string().max(3).optional().allow(null),
  start_date: Joi.date().optional().allow(null),
  end_date: Joi.date().optional().allow(null),
  last_risk_review_at: Joi.date().optional().allow(null),
  next_risk_review_due: Joi.date().optional().allow(null),
  risk_review_notes: Joi.string().optional().allow(null, ''),
})

const updatePortfolioSchema = Joi.object({
  company_id: Joi.string().uuid().optional().allow(null),
  portfolio_name: Joi.string().optional().max(255),
  description: Joi.string().optional().allow(null, ''),
  owner_id: Joi.string().uuid().optional().allow(null),
  portfolio_lead: Joi.string().uuid().optional().allow(null),
  status: Joi.string().valid('active', 'archived', 'paused').optional(),
  budget: Joi.number().optional().allow(null),
  budget_currency: Joi.string().max(3).optional().allow(null),
  start_date: Joi.date().optional().allow(null),
  end_date: Joi.date().optional().allow(null),
  last_risk_review_at: Joi.date().optional().allow(null),
  next_risk_review_due: Joi.date().optional().allow(null),
  risk_review_notes: Joi.string().optional().allow(null, ''),
})

/**
 * GET /api/portfolios
 * List all portfolios with optional filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  const pool = getDatabasePool()

  try {
    const {
      status,
      limit = '50',
      offset = '0',
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query

    let query = `
      SELECT 
        p.*,
        c.name as company_name,
        u1.name as owner_name,
        u2.name as lead_name,
        u3.name as created_by_name,
        COUNT(DISTINCT pr.id) as risk_count
      FROM portfolio_governance p
      LEFT JOIN companies c ON p.company_id = c.id
      LEFT JOIN users u1 ON p.owner_id = u1.id
      LEFT JOIN users u2 ON p.portfolio_lead = u2.id
      LEFT JOIN users u3 ON p.created_by = u3.id
      LEFT JOIN portfolio_risks pr ON pr.portfolio_id = p.id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (status) {
      query += ` AND p.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    query += ` GROUP BY p.id, u1.name, u2.name, u3.name`

    // Add sorting
    const allowedSortColumns = ['portfolio_name', 'status', 'budget', 'created_at', 'start_date', 'end_date']
    const sortColumn = allowedSortColumns.includes(sort_by as string) ? sort_by : 'created_at'
    const sortOrder = sort_order === 'asc' ? 'ASC' : 'DESC'
    query += ` ORDER BY p.${sortColumn} ${sortOrder}`

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(parseInt(limit as string), parseInt(offset as string))

    const result = await pool.query(query, params)

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM portfolio_governance WHERE 1=1'
    const countParams: any[] = []
    let countParamIndex = 1

    if (status) {
      countQuery += ` AND status = $${countParamIndex}`
      countParams.push(status)
      countParamIndex++
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: total > parseInt(offset as string) + result.rows.length,
      },
    })
  } catch (error) {
    logger.error('Error fetching portfolios:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolios',
    })
  }
})

/**
 * GET /api/portfolios/:id
 * Get a single portfolio by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  const pool = getDatabasePool()
  const { id } = req.params

  try {
    const result = await pool.query(
      `
      SELECT 
        p.*,
        u1.name as owner_name,
        u2.name as lead_name,
        u3.name as created_by_name,
        COUNT(DISTINCT pr.id) as risk_count,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.severity = 'critical') as critical_risk_count,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.severity = 'high') as high_risk_count
      FROM portfolio_governance p
      LEFT JOIN users u1 ON p.owner_id = u1.id
      LEFT JOIN users u2 ON p.portfolio_lead = u2.id
      LEFT JOIN users u3 ON p.created_by = u3.id
      LEFT JOIN portfolio_risks pr ON pr.portfolio_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u1.name, u2.name, u3.name
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      })
    }

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error) {
    logger.error('Error fetching portfolio:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
    })
  }
})

/**
 * POST /api/portfolios
 * Create a new portfolio
 */
router.post('/', async (req: Request, res: Response) => {
  const pool = getDatabasePool()

  try {
    // Validate request body
    const { error, value } = createPortfolioSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      })
    }

    const userId = (req as any).user?.id || null

    const result = await pool.query(
      `
      INSERT INTO portfolio_governance (
        portfolio_name, description, owner_id, portfolio_lead,
        status, budget, budget_currency, start_date, end_date,
        last_risk_review_at, next_risk_review_due, risk_review_notes,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      )
      RETURNING *
      `,
      [
        value.portfolio_name,
        value.description,
        value.owner_id,
        value.portfolio_lead,
        value.status,
        value.budget,
        value.budget_currency,
        value.start_date,
        value.end_date,
        value.last_risk_review_at,
        value.next_risk_review_due,
        value.risk_review_notes,
        userId,
      ]
    )

    logger.info(`Portfolio created: ${result.rows[0].id}`)

    res.status(201).json({
      success: true,
      data: result.rows[0],
    })
  } catch (error: any) {
    logger.error('Error creating portfolio:', error)

    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'A portfolio with this name already exists in the program',
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create portfolio',
    })
  }
})

/**
 * PUT /api/portfolios/:id
 * Update a portfolio
 */
router.put('/:id', async (req: Request, res: Response) => {
  const pool = getDatabasePool()
  const { id } = req.params

  try {
    // Validate request body
    const { error, value } = updatePortfolioSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      })
    }

    // Check if portfolio exists
    const checkResult = await pool.query('SELECT id FROM portfolio_governance WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      })
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        updates.push(`${key} = $${paramIndex}`)
        values.push(val)
        paramIndex++
      }
    })

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      })
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE portfolio_governance
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)

    logger.info(`Portfolio updated: ${id}`)

    res.json({
      success: true,
      data: result.rows[0],
    })
  } catch (error: any) {
    logger.error('Error updating portfolio:', error)

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A portfolio with this name already exists in the program',
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update portfolio',
    })
  }
})

/**
 * DELETE /api/portfolios/:id
 * Delete a portfolio (soft delete by setting status to archived)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const pool = getDatabasePool()
  const { id } = req.params

  try {
    // Check if portfolio exists
    const checkResult = await pool.query('SELECT id FROM portfolio_governance WHERE id = $1', [id])
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      })
    }

    // Soft delete by setting status to archived
    await pool.query(
      `UPDATE portfolio_governance SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [id]
    )

    logger.info(`Portfolio archived: ${id}`)

    res.json({
      success: true,
      message: 'Portfolio archived successfully',
    })
  } catch (error) {
    logger.error('Error deleting portfolio:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete portfolio',
    })
  }
})

/**
 * GET /api/portfolios/:id/risks
 * Get all risks for a portfolio
 */
router.get('/:id/risks', async (req: Request, res: Response) => {
  const pool = getDatabasePool()
  const { id } = req.params

  try {
    const result = await pool.query(
      `
      SELECT 
        pr.*,
        u.name as owner_name
      FROM portfolio_risks pr
      LEFT JOIN users u ON pr.owner_id = u.id
      WHERE pr.portfolio_id = $1
      ORDER BY 
        CASE pr.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        pr.created_at DESC
      `,
      [id]
    )

    res.json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    logger.error('Error fetching portfolio risks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio risks',
    })
  }
})

export default router
