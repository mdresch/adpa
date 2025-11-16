/**
 * PMBOK 6th Edition Routes
 * API endpoints for accessing PMBOK 6th Edition Process Groups, Knowledge Areas, and Processes
 * 
 * Endpoints:
 * Process Groups:
 * - GET /api/pmbok6/process-groups - List all process groups
 * - GET /api/pmbok6/process-groups/:id - Get process group by ID
 * 
 * Knowledge Areas:
 * - GET /api/pmbok6/knowledge-areas - List all knowledge areas
 * - GET /api/pmbok6/knowledge-areas/:id - Get knowledge area by ID
 * 
 * Processes:
 * - GET /api/pmbok6/processes - List all processes (with filters)
 * - GET /api/pmbok6/processes/:id - Get process by ID
 * - GET /api/pmbok6/processes/by-group/:groupId - Get processes by process group
 * - GET /api/pmbok6/processes/by-knowledge-area/:kaId - Get processes by knowledge area
 */

import express from 'express'
import Joi from 'joi'
import { authenticateToken } from '../middleware/auth'
import { validate, validateParams } from '../middleware/validation'
import { childLogger } from '../utils/logger'
import { pool } from '../database/connection'
import { schemas } from '../middleware/validation'

const router = express.Router()

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listProcessesSchema = Joi.object({
  process_group_id: schemas.uuid.optional(),
  knowledge_area_id: schemas.uuid.optional(),
  search: Joi.string().max(200).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
})

// ============================================================================
// PROCESS GROUPS
// ============================================================================

/**
 * GET /api/pmbok6/process-groups
 * List all PMBOK 6th Edition Process Groups
 */
router.get(
  '/process-groups',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          display_order,
          created_at,
          updated_at
        FROM pmbok6_process_groups
        ORDER BY display_order ASC
      `)

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch process groups:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch process groups',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pmbok6/process-groups/:id
 * Get process group by ID
 */
router.get(
  '/process-groups/:id',
  authenticateToken,
  validateParams(Joi.object({
    id: schemas.uuid.required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { id } = req.params

      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          display_order,
          created_at,
          updated_at
        FROM pmbok6_process_groups
        WHERE id = $1
      `, [id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Process group not found'
        })
      }

      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch process group:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch process group',
        message: error.message
      })
    }
  }
)

// ============================================================================
// KNOWLEDGE AREAS
// ============================================================================

/**
 * GET /api/pmbok6/knowledge-areas
 * List all PMBOK 6th Edition Knowledge Areas
 */
router.get(
  '/knowledge-areas',
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          display_order,
          created_at,
          updated_at
        FROM pmbok6_knowledge_areas
        ORDER BY display_order ASC
      `)

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch knowledge areas:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch knowledge areas',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pmbok6/knowledge-areas/:id
 * Get knowledge area by ID
 */
router.get(
  '/knowledge-areas/:id',
  authenticateToken,
  validateParams(Joi.object({
    id: schemas.uuid.required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { id } = req.params

      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          display_order,
          created_at,
          updated_at
        FROM pmbok6_knowledge_areas
        WHERE id = $1
      `, [id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Knowledge area not found'
        })
      }

      res.json({
        success: true,
        data: result.rows[0]
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch knowledge area:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch knowledge area',
        message: error.message
      })
    }
  }
)

// ============================================================================
// PROCESSES
// ============================================================================

/**
 * GET /api/pmbok6/processes
 * List all PMBOK 6th Edition Processes (with optional filters)
 */
router.get(
  '/processes',
  authenticateToken,
  validate(listProcessesSchema, 'query'),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const {
        process_group_id,
        knowledge_area_id,
        search,
        limit = 50,
        offset = 0
      } = req.query

      let query = `
        SELECT 
          p.id,
          p.code,
          p.name,
          p.description,
          p.inputs,
          p.tools_and_techniques,
          p.outputs,
          p.pmbok_section,
          p.display_order,
          p.is_core_process,
          p.created_at,
          p.updated_at,
          pg.id as process_group_id,
          pg.code as process_group_code,
          pg.name as process_group_name,
          ka.id as knowledge_area_id,
          ka.code as knowledge_area_code,
          ka.name as knowledge_area_name
        FROM pmbok6_processes p
        INNER JOIN pmbok6_process_groups pg ON p.process_group_id = pg.id
        INNER JOIN pmbok6_knowledge_areas ka ON p.knowledge_area_id = ka.id
        WHERE 1=1
      `

      const params: any[] = []
      let paramCount = 0

      if (process_group_id) {
        paramCount++
        query += ` AND p.process_group_id = $${paramCount}`
        params.push(process_group_id)
      }

      if (knowledge_area_id) {
        paramCount++
        query += ` AND p.knowledge_area_id = $${paramCount}`
        params.push(knowledge_area_id)
      }

      if (search) {
        paramCount++
        query += ` AND (
          p.name ILIKE $${paramCount} 
          OR p.description ILIKE $${paramCount}
          OR p.code ILIKE $${paramCount}
        )`
        params.push(`%${search}%`)
      }

      query += ` ORDER BY p.display_order ASC`
      
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(limit)
      
      paramCount++
      query += ` OFFSET $${paramCount}`
      params.push(offset)

      const result = await pool.query(query, params)

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM pmbok6_processes p
        WHERE 1=1
      `
      const countParams: any[] = []
      let countParamCount = 0

      if (process_group_id) {
        countParamCount++
        countQuery += ` AND p.process_group_id = $${countParamCount}`
        countParams.push(process_group_id)
      }

      if (knowledge_area_id) {
        countParamCount++
        countQuery += ` AND p.knowledge_area_id = $${countParamCount}`
        countParams.push(knowledge_area_id)
      }

      if (search) {
        countParamCount++
        countQuery += ` AND (
          p.name ILIKE $${countParamCount} 
          OR p.description ILIKE $${countParamCount}
          OR p.code ILIKE $${countParamCount}
        )`
        countParams.push(`%${search}%`)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total, 10)

      // Transform results to include nested objects
      const processes = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        inputs: row.inputs,
        tools_and_techniques: row.tools_and_techniques,
        outputs: row.outputs,
        pmbok_section: row.pmbok_section,
        display_order: row.display_order,
        is_core_process: row.is_core_process,
        created_at: row.created_at,
        updated_at: row.updated_at,
        process_group: {
          id: row.process_group_id,
          code: row.process_group_code,
          name: row.process_group_name
        },
        knowledge_area: {
          id: row.knowledge_area_id,
          code: row.knowledge_area_code,
          name: row.knowledge_area_name
        }
      }))

      res.json({
        success: true,
        data: processes,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
          hasMore: (parseInt(offset as string, 10) + parseInt(limit as string, 10)) < total
        }
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch processes:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch processes',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pmbok6/processes/:id
 * Get process by ID
 */
router.get(
  '/processes/:id',
  authenticateToken,
  validateParams(Joi.object({
    id: schemas.uuid.required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { id } = req.params

      const result = await pool.query(`
        SELECT 
          p.id,
          p.code,
          p.name,
          p.description,
          p.inputs,
          p.tools_and_techniques,
          p.outputs,
          p.pmbok_section,
          p.display_order,
          p.is_core_process,
          p.created_at,
          p.updated_at,
          pg.id as process_group_id,
          pg.code as process_group_code,
          pg.name as process_group_name,
          pg.description as process_group_description,
          ka.id as knowledge_area_id,
          ka.code as knowledge_area_code,
          ka.name as knowledge_area_name,
          ka.description as knowledge_area_description
        FROM pmbok6_processes p
        INNER JOIN pmbok6_process_groups pg ON p.process_group_id = pg.id
        INNER JOIN pmbok6_knowledge_areas ka ON p.knowledge_area_id = ka.id
        WHERE p.id = $1
      `, [id])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Process not found'
        })
      }

      const row = result.rows[0]
      const process = {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        inputs: row.inputs,
        tools_and_techniques: row.tools_and_techniques,
        outputs: row.outputs,
        pmbok_section: row.pmbok_section,
        display_order: row.display_order,
        is_core_process: row.is_core_process,
        created_at: row.created_at,
        updated_at: row.updated_at,
        process_group: {
          id: row.process_group_id,
          code: row.process_group_code,
          name: row.process_group_name,
          description: row.process_group_description
        },
        knowledge_area: {
          id: row.knowledge_area_id,
          code: row.knowledge_area_code,
          name: row.knowledge_area_name,
          description: row.knowledge_area_description
        }
      }

      res.json({
        success: true,
        data: process
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch process:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch process',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pmbok6/processes/by-group/:groupId
 * Get processes by process group ID
 */
router.get(
  '/processes/by-group/:groupId',
  authenticateToken,
  validateParams(Joi.object({
    groupId: schemas.uuid.required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { groupId } = req.params

      const result = await pool.query(`
        SELECT 
          p.id,
          p.code,
          p.name,
          p.description,
          p.inputs,
          p.tools_and_techniques,
          p.outputs,
          p.pmbok_section,
          p.display_order,
          p.is_core_process,
          ka.id as knowledge_area_id,
          ka.code as knowledge_area_code,
          ka.name as knowledge_area_name
        FROM pmbok6_processes p
        INNER JOIN pmbok6_knowledge_areas ka ON p.knowledge_area_id = ka.id
        WHERE p.process_group_id = $1
        ORDER BY p.display_order ASC
      `, [groupId])

      const processes = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        inputs: row.inputs,
        tools_and_techniques: row.tools_and_techniques,
        outputs: row.outputs,
        pmbok_section: row.pmbok_section,
        display_order: row.display_order,
        is_core_process: row.is_core_process,
        knowledge_area: {
          id: row.knowledge_area_id,
          code: row.knowledge_area_code,
          name: row.knowledge_area_name
        }
      }))

      res.json({
        success: true,
        data: processes,
        count: processes.length
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch processes by group:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch processes by group',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/pmbok6/processes/by-knowledge-area/:kaId
 * Get processes by knowledge area ID
 */
router.get(
  '/processes/by-knowledge-area/:kaId',
  authenticateToken,
  validateParams(Joi.object({
    kaId: schemas.uuid.required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { kaId } = req.params

      const result = await pool.query(`
        SELECT 
          p.id,
          p.code,
          p.name,
          p.description,
          p.inputs,
          p.tools_and_techniques,
          p.outputs,
          p.pmbok_section,
          p.display_order,
          p.is_core_process,
          pg.id as process_group_id,
          pg.code as process_group_code,
          pg.name as process_group_name
        FROM pmbok6_processes p
        INNER JOIN pmbok6_process_groups pg ON p.process_group_id = pg.id
        WHERE p.knowledge_area_id = $1
        ORDER BY p.display_order ASC
      `, [kaId])

      const processes = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        inputs: row.inputs,
        tools_and_techniques: row.tools_and_techniques,
        outputs: row.outputs,
        pmbok_section: row.pmbok_section,
        display_order: row.display_order,
        is_core_process: row.is_core_process,
        process_group: {
          id: row.process_group_id,
          code: row.process_group_code,
          name: row.process_group_name
        }
      }))

      res.json({
        success: true,
        data: processes,
        count: processes.length
      })
    } catch (error: any) {
      log.error('[PMBOK6] Failed to fetch processes by knowledge area:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch processes by knowledge area',
        message: error.message
      })
    }
  }
)

export default router

