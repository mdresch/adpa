import express from "express"
import { authenticateToken } from "../middleware/auth"
import { logger, childLogger } from "../utils/logger"
import * as programMetricsService from "../services/programMetricsService"

const router = express.Router()

/**
 * GET /api/programs/:id/metrics
 * Get aggregated metrics for a program
 */
router.get("/:id/metrics", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  
  try {
    const { id } = req.params

    log.info(`Fetching metrics for program: ${id}`)

    const metrics = await programMetricsService.calculateMetrics(id)

    res.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    log.error("Error fetching program metrics:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch program metrics"
    })
  }
})

export default router
