import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Get all stakeholders for a project
router.get("/project/:projectId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    // Verify project exists and user has access
    const projectResult = await pool.query(
      "SELECT id FROM projects WHERE id = $1",
      [projectId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    const result = await pool.query(
      `
      SELECT s.*, u1.name as created_by_name, u2.name as updated_by_name
      FROM stakeholders s
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      WHERE s.project_id = $1
      ORDER BY s.created_at DESC
      `,
      [projectId]
    )

    res.json({
      stakeholders: result.rows,
      count: result.rows.length
    })
  } catch (error) {
    log.error("Get stakeholders error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get stakeholder by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT s.*, u1.name as created_by_name, u2.name as updated_by_name
      FROM stakeholders s
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      WHERE s.id = $1
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" })
    }

    res.json({ stakeholder: result.rows[0] })
  } catch (error) {
    log.error("Get stakeholder error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create new stakeholder
router.post("/", authenticateToken, requirePermission("stakeholders.create"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const {
      project_id,
      name,
      role,
      department,
      email,
      phone,
      interest_level,
      influence_level,
      engagement_approach,
      communication_frequency,
      stakeholder_type,
      stakeholder_category,
      expectations,
      potential_impact,
      is_team_member
    } = req.body

    // Validate required fields
    if (!project_id || !role || !email) {
      return res.status(400).json({ 
        error: "Missing required fields: project_id, role, email" 
      })
    }

    // Validate: Only internal stakeholders can be team members
    if (is_team_member && stakeholder_type !== 'internal') {
      return res.status(400).json({ 
        error: "Only internal stakeholders can be marked as team members" 
      })
    }

    // Verify project exists
    const projectResult = await pool.query(
      "SELECT id FROM projects WHERE id = $1",
      [project_id]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    const id = uuidv4()
    const userId = req.user?.id

    const result = await pool.query(
      `
      INSERT INTO stakeholders (
        id, project_id, name, role, department, email, phone,
        interest_level, influence_level, engagement_approach, communication_frequency,
        stakeholder_type, stakeholder_category, expectations, potential_impact,
        is_team_member, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
      `,
      [
        id, project_id, name, role, department, email, phone,
        interest_level, influence_level, engagement_approach, communication_frequency,
        stakeholder_type, stakeholder_category, expectations, potential_impact,
        is_team_member || false, userId, userId
      ]
    )

    log.info(`Stakeholder created: ${name} for project ${project_id} by ${req.user?.email}`)

    res.status(201).json({
      message: "Stakeholder created successfully",
      stakeholder: result.rows[0]
    })
  } catch (error) {
    log.error("Create stakeholder error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Update stakeholder
router.put("/:id", authenticateToken, requirePermission("stakeholders.update"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const {
      name,
      role,
      department,
      email,
      phone,
      interest_level,
      influence_level,
      engagement_approach,
      communication_frequency,
      stakeholder_type,
      stakeholder_category,
      expectations,
      potential_impact,
      is_team_member
    } = req.body

    // Validate: Only internal stakeholders can be team members
    if (is_team_member && stakeholder_type !== 'internal') {
      return res.status(400).json({ 
        error: "Only internal stakeholders can be marked as team members" 
      })
    }

    const userId = req.user?.id

    const result = await pool.query(
      `
      UPDATE stakeholders 
      SET name = $1, role = $2, department = $3, email = $4, phone = $5,
          interest_level = $6, influence_level = $7, engagement_approach = $8, 
          communication_frequency = $9, stakeholder_type = $10, stakeholder_category = $11,
          expectations = $12, potential_impact = $13, is_team_member = $14, updated_by = $15,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
      `,
      [
        name, role, department, email, phone,
        interest_level, influence_level, engagement_approach,
        communication_frequency, stakeholder_type, stakeholder_category,
        expectations, potential_impact, is_team_member || false, userId, id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" })
    }

    log.info(`Stakeholder updated: ${id} by ${req.user?.email}`)

    res.json({
      message: "Stakeholder updated successfully",
      stakeholder: result.rows[0]
    })
  } catch (error) {
    log.error("Update stakeholder error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete stakeholder
router.delete("/:id", authenticateToken, requirePermission("stakeholders.delete"), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params

    const result = await pool.query(
      "DELETE FROM stakeholders WHERE id = $1 RETURNING name, project_id",
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stakeholder not found" })
    }

    log.info(`Stakeholder deleted: ${id} (${result.rows[0].name}) by ${req.user?.email}`)

    res.json({ 
      message: "Stakeholder deleted successfully",
      deleted_stakeholder: result.rows[0]
    })
  } catch (error) {
    log.error("Delete stakeholder error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get stakeholder engagement matrix (PMBOK analysis)
router.get("/project/:projectId/engagement-matrix", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { projectId } = req.params

    // Verify project exists
    const projectResult = await pool.query(
      "SELECT id FROM projects WHERE id = $1",
      [projectId]
    )

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" })
    }

    const result = await pool.query(
      `
      SELECT 
        name, role, interest_level, influence_level, engagement_approach,
        stakeholder_type, stakeholder_category
      FROM stakeholders 
      WHERE project_id = $1
      ORDER BY 
        CASE interest_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
        CASE influence_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
      `,
      [projectId]
    )

    // Group by engagement approach for analysis
    const engagementMatrix = {
      manage_closely: result.rows.filter(s => s.engagement_approach === 'manage_closely'),
      keep_satisfied: result.rows.filter(s => s.engagement_approach === 'keep_satisfied'),
      keep_informed: result.rows.filter(s => s.engagement_approach === 'keep_informed'),
      monitor: result.rows.filter(s => s.engagement_approach === 'monitor')
    }

    res.json({
      stakeholders: result.rows,
      engagement_matrix: engagementMatrix,
      summary: {
        total: result.rows.length,
        high_interest_high_influence: result.rows.filter(s => s.interest_level === 'high' && s.influence_level === 'high').length,
        high_interest_low_influence: result.rows.filter(s => s.interest_level === 'high' && s.influence_level === 'low').length,
        low_interest_high_influence: result.rows.filter(s => s.interest_level === 'low' && s.influence_level === 'high').length,
        low_interest_low_influence: result.rows.filter(s => s.interest_level === 'low' && s.influence_level === 'low').length,
        internal: result.rows.filter(s => s.stakeholder_type === 'internal').length,
        external: result.rows.filter(s => s.stakeholder_type === 'external').length,
        primary: result.rows.filter(s => s.stakeholder_category === 'primary').length,
        secondary: result.rows.filter(s => s.stakeholder_category === 'secondary').length
      }
    })
  } catch (error) {
    log.error("Get engagement matrix error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
