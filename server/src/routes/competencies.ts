import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import Joi from "joi"
import * as competenciesService from "../services/competenciesManagementService"

const router = express.Router()

// Get all competencies
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const category = req.query.category as string | undefined
    const competencies = await competenciesService.getAllCompetencies(category)

    res.json({
      success: true,
      data: competencies,
      count: competencies.length
    })
  } catch (error) {
    log.error("Get competencies error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get competency by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const competency = await competenciesService.getCompetencyById(id)

    if (!competency) {
      return res.status(404).json({ error: "Competency not found" })
    }

    res.json({
      success: true,
      data: competency
    })
  } catch (error) {
    log.error("Get competency error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create competency
router.post(
  "/",
  authenticateToken,
  requirePermission("competencies.create"),
  validate(Joi.object({
    name: Joi.string().required().max(255),
    description: Joi.string().optional(),
    category: Joi.string().optional().max(100)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const competency = await competenciesService.createCompetency(req.body, (req as any).user?.id)

      log.info(`Competency created: ${competency.name} by ${(req as any).user?.email}`)

      res.status(201).json({
        success: true,
        data: competency
      })
    } catch (error: any) {
      log.error("Create competency error:", error)
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update competency
router.put(
  "/:id",
  authenticateToken,
  requirePermission("competencies.update"),
  validate(Joi.object({
    name: Joi.string().optional().max(255),
    description: Joi.string().optional().allow(null),
    category: Joi.string().optional().max(100).allow(null)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const competency = await competenciesService.updateCompetency(id, req.body)

      if (!competency) {
        return res.status(404).json({ error: "Competency not found" })
      }

      log.info(`Competency updated: ${id} by ${(req as any).user?.email}`)

      res.json({
        success: true,
        data: competency
      })
    } catch (error: any) {
      log.error("Update competency error:", error)
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete competency
router.delete(
  "/:id",
  authenticateToken,
  requirePermission("competencies.delete"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const deleted = await competenciesService.deleteCompetency(id)

      if (!deleted) {
        return res.status(404).json({ error: "Competency not found" })
      }

      log.info(`Competency deleted: ${id} by ${(req as any).user?.email}`)

      res.json({
        success: true,
        message: "Competency deleted successfully"
      })
    } catch (error: any) {
      log.error("Delete competency error:", error)
      if (error.message?.includes("assigned")) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Assign competency to role
router.post(
  "/:id/assign-to-role",
  authenticateToken,
  requirePermission("competencies.assign"),
  validate(Joi.object({
    roleId: Joi.string().uuid().required(),
    requiredLevel: Joi.string().optional(),
    isRequired: Joi.boolean().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: competencyId } = req.params
      const { roleId, requiredLevel, isRequired } = req.body

      const roleCompetency = await competenciesService.assignCompetencyToRole(
        roleId,
        competencyId,
        requiredLevel || "intermediate",
        isRequired !== undefined ? isRequired : true
      )

      log.info(`Competency ${competencyId} assigned to role ${roleId}`)

      res.status(201).json({
        success: true,
        data: roleCompetency
      })
    } catch (error) {
      log.error("Assign competency to role error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Assign competency to stakeholder
router.post(
  "/:id/assign-to-stakeholder",
  authenticateToken,
  requirePermission("competencies.assign"),
  validate(Joi.object({
    stakeholderId: Joi.string().uuid().required(),
    proficiencyLevel: Joi.string().optional(),
    verified: Joi.boolean().optional(),
    notes: Joi.string().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: competencyId } = req.params
      const { stakeholderId, proficiencyLevel, verified, notes } = req.body

      const stakeholderCompetency = await competenciesService.assignCompetencyToStakeholder(
        stakeholderId,
        competencyId,
        proficiencyLevel || "intermediate",
        {
          verified,
          verifiedBy: verified ? (req as any).user?.id : undefined,
          notes
        }
      )

      log.info(`Competency ${competencyId} assigned to stakeholder ${stakeholderId}`)

      res.status(201).json({
        success: true,
        data: stakeholderCompetency
      })
    } catch (error) {
      log.error("Assign competency to stakeholder error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get competencies for a role
router.get("/role/:roleId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { roleId } = req.params
    const roleCompetencies = await competenciesService.getRoleCompetencies(roleId)

    res.json({
      success: true,
      data: roleCompetencies,
      count: roleCompetencies.length
    })
  } catch (error) {
    log.error("Get role competencies error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get competencies for a stakeholder
router.get("/stakeholder/:stakeholderId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { stakeholderId } = req.params
    const stakeholderCompetencies = await competenciesService.getStakeholderCompetencies(stakeholderId)

    res.json({
      success: true,
      data: stakeholderCompetencies,
      count: stakeholderCompetencies.length
    })
  } catch (error) {
    log.error("Get stakeholder competencies error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Remove competency from role
router.delete(
  "/:id/role/:roleId",
  authenticateToken,
  requirePermission("competencies.assign"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: competencyId, roleId } = req.params
      const removed = await competenciesService.removeCompetencyFromRole(roleId, competencyId)

      if (!removed) {
        return res.status(404).json({ error: "Competency assignment not found" })
      }

      log.info(`Competency ${competencyId} removed from role ${roleId}`)

      res.json({
        success: true,
        message: "Competency removed from role successfully"
      })
    } catch (error) {
      log.error("Remove competency from role error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Remove competency from stakeholder
router.delete(
  "/:id/stakeholder/:stakeholderId",
  authenticateToken,
  requirePermission("competencies.assign"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: competencyId, stakeholderId } = req.params
      const removed = await competenciesService.removeCompetencyFromStakeholder(stakeholderId, competencyId)

      if (!removed) {
        return res.status(404).json({ error: "Competency assignment not found" })
      }

      log.info(`Competency ${competencyId} removed from stakeholder ${stakeholderId}`)

      res.json({
        success: true,
        message: "Competency removed from stakeholder successfully"
      })
    } catch (error) {
      log.error("Remove competency from stakeholder error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router

