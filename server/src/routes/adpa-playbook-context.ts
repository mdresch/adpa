/**
 * ADPA Playbook Context API Routes
 * Provides access to semantic context from the ADPA Playbook Development project
 */

import express from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { getContextForStrategy } from "../services/gkg/gkgContextService"
import { logger } from "../utils/logger"

const router = express.Router()

const ADPA_PLAYBOOK_PROJECT_ID = "840ee5df-aa50-4412-b513-5472fbe3ea9e"

/**
 * GET /api/adpa-playbook-context
 * Retrieve comprehensive context from ADPA Playbook project
 */
router.get(
  "/",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const strategy = {
        profile: 'governance_full' as const,
        scope: 'same_project' as const,
        maxUnits: 100,
        maxDocuments: 20,
        traceableOnly: true,
        documentStatusFilter: 'approved_published_only' as const,
      }

      const context = await getContextForStrategy(ADPA_PLAYBOOK_PROJECT_ID, strategy)
      
      const response = {
        projectId: ADPA_PLAYBOOK_PROJECT_ID,
        projectName: "ADPA Playbook Development",
        context: context.markdown,
        metadata: {
          unitsCount: context.unitsCount,
          documentsCount: context.documentsCount,
          entityTypes: context.entityTypes,
        }
      }

      logger.info('[ADPA Playbook Context] Retrieved comprehensive context', {
        projectId: ADPA_PLAYBOOK_PROJECT_ID,
        unitsCount: context.unitsCount,
        documentsCount: context.documentsCount
      })

      res.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[ADPA Playbook Context] Failed to retrieve context', { error: message })
      res.status(500).json({
        error: "Failed to retrieve ADPA Playbook context",
        details: message
      })
    }
  }
)

/**
 * GET /api/adpa-playbook-context/entities/:entityType
 * Retrieve specific entity types from ADPA Playbook project
 */
router.get(
  "/entities/:entityType",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const { entityType } = req.params
      const validEntityTypes = ['Requirement', 'Risk', 'Stakeholder', 'Milestone', 'Constraint', 'Deliverable']
      
      if (!validEntityTypes.includes(entityType)) {
        return res.status(400).json({
          error: "Invalid entity type",
          validTypes: validEntityTypes
        })
      }

      const strategy = {
        profile: 'custom' as const,
        scope: 'same_project' as const,
        entityTypes: [entityType],
        maxUnits: 50,
        traceableOnly: true,
        documentStatusFilter: 'approved_published_only' as const,
      }

      const context = await getContextForStrategy(ADPA_PLAYBOOK_PROJECT_ID, strategy)
      
      const response = {
        projectId: ADPA_PLAYBOOK_PROJECT_ID,
        projectName: "ADPA Playbook Development",
        entityType,
        context: context.markdown,
        metadata: {
          unitsCount: context.unitsCount,
          documentsCount: context.documentsCount,
        }
      }

      logger.info('[ADPA Playbook Context] Retrieved entity context', {
        projectId: ADPA_PLAYBOOK_PROJECT_ID,
        entityType,
        unitsCount: context.unitsCount
      })

      res.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[ADPA Playbook Context] Failed to retrieve entity context', { 
        error: message,
        entityType: req.params.entityType 
      })
      res.status(500).json({
        error: "Failed to retrieve entity context",
        details: message
      })
    }
  }
)

/**
 * GET /api/adpa-playbook-context/summary
 * Get summary of available context in ADPA Playbook project
 */
router.get(
  "/summary",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      // Test different entity types to get availability
      const entityTypes = ['Requirement', 'Risk', 'Stakeholder', 'Milestone', 'Constraint', 'Deliverable']
      const availability: Record<string, number> = {}
      
      for (const entityType of entityTypes) {
        const strategy = {
          profile: 'custom' as const,
          scope: 'same_project' as const,
          entityTypes: [entityType],
          maxUnits: 1, // Just check if any exist
          traceableOnly: true,
        }
        
        try {
          const context = await getContextForStrategy(ADPA_PLAYBOOK_PROJECT_ID, strategy)
          availability[entityType] = context.unitsCount
        } catch (error) {
          availability[entityType] = 0
        }
      }

      const response = {
        projectId: ADPA_PLAYBOOK_PROJECT_ID,
        projectName: "ADPA Playbook Development",
        entityAvailability: availability,
        totalEntities: Object.values(availability).reduce((sum, count) => sum + count, 0),
        availableEntityTypes: Object.entries(availability)
          .filter(([_, count]) => count > 0)
          .map(([type, _]) => type),
        lastUpdated: new Date().toISOString()
      }

      logger.info('[ADPA Playbook Context] Retrieved summary', {
        projectId: ADPA_PLAYBOOK_PROJECT_ID,
        totalEntities: response.totalEntities,
        availableTypes: response.availableEntityTypes.length
      })

      res.json(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('[ADPA Playbook Context] Failed to retrieve summary', { error: message })
      res.status(500).json({
        error: "Failed to retrieve context summary",
        details: message
      })
    }
  }
)

export default router
