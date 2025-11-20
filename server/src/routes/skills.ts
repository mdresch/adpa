import express from "express"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validate } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import Joi from "joi"
import * as skillsService from "../services/skillsManagementService"

const router = express.Router()

// Get all skills
router.get("/", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const category = req.query.category as string | undefined
    const skills = await skillsService.getAllSkills(category)

    res.json({
      success: true,
      data: skills,
      count: skills.length
    })
  } catch (error) {
    log.error("Get skills error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get skill by ID
router.get("/:id", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { id } = req.params
    const skill = await skillsService.getSkillById(id)

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" })
    }

    res.json({
      success: true,
      data: skill
    })
  } catch (error) {
    log.error("Get skill error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Create skill
router.post(
  "/",
  authenticateToken,
  requirePermission("skills.create"),
  validate(Joi.object({
    name: Joi.string().required().max(255),
    description: Joi.string().optional(),
    category: Joi.string().optional().max(100),
    proficiencyLevels: Joi.array().items(Joi.string()).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const skill = await skillsService.createSkill(req.body, (req as any).user?.id)

      log.info(`Skill created: ${skill.name} by ${(req as any).user?.email}`)

      res.status(201).json({
        success: true,
        data: skill
      })
    } catch (error: any) {
      log.error("Create skill error:", error)
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update skill
router.put(
  "/:id",
  authenticateToken,
  requirePermission("skills.update"),
  validate(Joi.object({
    name: Joi.string().optional().max(255),
    description: Joi.string().optional().allow(null),
    category: Joi.string().optional().max(100).allow(null),
    proficiencyLevels: Joi.array().items(Joi.string()).optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const skill = await skillsService.updateSkill(id, req.body)

      if (!skill) {
        return res.status(404).json({ error: "Skill not found" })
      }

      log.info(`Skill updated: ${id} by ${(req as any).user?.email}`)

      res.json({
        success: true,
        data: skill
      })
    } catch (error: any) {
      log.error("Update skill error:", error)
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ error: error.message })
      }
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete skill
router.delete(
  "/:id",
  authenticateToken,
  requirePermission("skills.delete"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const deleted = await skillsService.deleteSkill(id)

      if (!deleted) {
        return res.status(404).json({ error: "Skill not found" })
      }

      log.info(`Skill deleted: ${id} by ${(req as any).user?.email}`)

      res.json({
        success: true,
        message: "Skill deleted successfully"
      })
    } catch (error: any) {
      log.error("Delete skill error:", error)
      if (error.message?.includes("assigned")) {
        return res.status(400).json({ error: error.message })
      }
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Assign skill to role
router.post(
  "/:id/assign-to-role",
  authenticateToken,
  requirePermission("skills.assign"),
  validate(Joi.object({
    roleId: Joi.string().uuid().required(),
    requiredProficiency: Joi.string().valid("beginner", "intermediate", "advanced", "expert").optional(),
    isRequired: Joi.boolean().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: skillId } = req.params
      const { roleId, requiredProficiency, isRequired } = req.body

      const roleSkill = await skillsService.assignSkillToRole(
        roleId,
        skillId,
        requiredProficiency || "intermediate",
        isRequired !== undefined ? isRequired : true
      )

      log.info(`Skill ${skillId} assigned to role ${roleId}`)

      res.status(201).json({
        success: true,
        data: roleSkill
      })
    } catch (error) {
      log.error("Assign skill to role error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Assign skill to stakeholder
router.post(
  "/:id/assign-to-stakeholder",
  authenticateToken,
  requirePermission("skills.assign"),
  validate(Joi.object({
    stakeholderId: Joi.string().uuid().required(),
    proficiencyLevel: Joi.string().valid("beginner", "intermediate", "advanced", "expert").optional(),
    yearsOfExperience: Joi.number().integer().min(0).optional(),
    verified: Joi.boolean().optional(),
    notes: Joi.string().optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: skillId } = req.params
      const { stakeholderId, proficiencyLevel, yearsOfExperience, verified, notes } = req.body

      const stakeholderSkill = await skillsService.assignSkillToStakeholder(
        stakeholderId,
        skillId,
        proficiencyLevel || "intermediate",
        {
          yearsOfExperience,
          verified,
          verifiedBy: verified ? (req as any).user?.id : undefined,
          notes
        }
      )

      log.info(`Skill ${skillId} assigned to stakeholder ${stakeholderId}`)

      res.status(201).json({
        success: true,
        data: stakeholderSkill
      })
    } catch (error) {
      log.error("Assign skill to stakeholder error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get skills for a role
router.get("/role/:roleId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { roleId } = req.params
    const roleSkills = await skillsService.getRoleSkills(roleId)

    res.json({
      success: true,
      data: roleSkills,
      count: roleSkills.length
    })
  } catch (error) {
    log.error("Get role skills error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get skills for a stakeholder
router.get("/stakeholder/:stakeholderId", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { stakeholderId } = req.params
    const stakeholderSkills = await skillsService.getStakeholderSkills(stakeholderId)

    res.json({
      success: true,
      data: stakeholderSkills,
      count: stakeholderSkills.length
    })
  } catch (error) {
    log.error("Get stakeholder skills error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Remove skill from role
router.delete(
  "/:id/role/:roleId",
  authenticateToken,
  requirePermission("skills.assign"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: skillId, roleId } = req.params
      const removed = await skillsService.removeSkillFromRole(roleId, skillId)

      if (!removed) {
        return res.status(404).json({ error: "Skill assignment not found" })
      }

      log.info(`Skill ${skillId} removed from role ${roleId}`)

      res.json({
        success: true,
        message: "Skill removed from role successfully"
      })
    } catch (error) {
      log.error("Remove skill from role error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Remove skill from stakeholder
router.delete(
  "/:id/stakeholder/:stakeholderId",
  authenticateToken,
  requirePermission("skills.assign"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id: skillId, stakeholderId } = req.params
      const removed = await skillsService.removeSkillFromStakeholder(stakeholderId, skillId)

      if (!removed) {
        return res.status(404).json({ error: "Skill assignment not found" })
      }

      log.info(`Skill ${skillId} removed from stakeholder ${stakeholderId}`)

      res.json({
        success: true,
        message: "Skill removed from stakeholder successfully"
      })
    } catch (error) {
      log.error("Remove skill from stakeholder error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router

