import { Router, Request, Response } from "express"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import { safeQuery } from "../services/jobs/dbGuards"

const router = Router()

/**
 * Health Endpoints for monitoring and orchestration
 * 
 * Provides multiple health check endpoints for different use cases:
 * - /health: Basic liveness check
 * - /health/ready: Kubernetes readiness probe
 * - /health/live: Kubernetes liveness probe  
 * - /health/dependencies: Detailed dependency status
 * - /health/full: Comprehensive system health
 */

// Type definitions for health responses
interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy" | "live"
  timestamp: string
  uptime: number
}

interface DependencyHealth {
  name: string
  status: "healthy" | "unhealthy" | "unknown"
  latency: number
  lastCheck: string
  error?: string
}

interface FullHealthResponse extends HealthStatus {
  version: string
  environment: string
  dependencies: DependencyHealth[]
  systemMetrics?: {
    memoryUsage: number
    uptime: number
    pid: number
  }
}

// Store dependency health status
const dependencyHealth: Map<string, DependencyHealth> = new Map()

/**
 * Initialize dependency health tracking
 * Called by the startup manager to register dependencies
 */
export function initializeDependencyHealthTracking(dependencies: string[]): void {
  dependencies.forEach(dep => {
    dependencyHealth.set(dep, {
      name: dep,
      status: "unknown",
      latency: 0,
      lastCheck: new Date().toISOString(),
    })
  })
}

/**
 * Update dependency health status
 * Called during startup and by periodic health checks
 */
export function updateDependencyHealth(
  name: string,
  status: "healthy" | "unhealthy",
  latency: number = 0,
  error?: string
): void {
  dependencyHealth.set(name, {
    name,
    status,
    latency,
    lastCheck: new Date().toISOString(),
    error,
  })
}

/**
 * GET /health
 * Basic liveness check - responds with 200 if server is up
 * Used by load balancers and basic monitoring
 */
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  } as HealthStatus)
})

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 only if server is ready to receive traffic (all critical dependencies healthy)
 */
router.get("/health/ready", async (req: Request, res: Response) => {
  try {
    // Check critical dependencies (align with Issue 608 AC: Database, Redis, Neo4j)
    const criticalDeps = ["Database", "Redis", "Neo4j"]
    let allHealthy = true
    const failedDeps: string[] = []

    for (const dep of criticalDeps) {
      const depStatus = dependencyHealth.get(dep)
      if (!depStatus || depStatus.status !== "healthy") {
        // Neo4j might be allowed to be unhealthy if not configured - check that specifically
        if (dep === "Neo4j" && depStatus?.error?.includes("Not configured")) {
          continue
        }
        allHealthy = false
        failedDeps.push(dep)
      }
    }

    // Try a quick database query
    try {
      await safeQuery(pool, "SELECT 1")
    } catch (err) {
      allHealthy = false
      failedDeps.push("database-query")
    }

    if (allHealthy) {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: "Server is ready to receive traffic",
      } as HealthStatus)
    } else {
      logger.warn("Readiness check failed", { failedDeps })
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: "Server is not ready",
        failedDependencies: failedDeps,
      })
    }
  } catch (error) {
    logger.error("Readiness check error:", error)
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "Readiness check failed",
      error: String(error),
    })
  }
})

/**
 * GET /health/live
 * Kubernetes liveness probe
 * Returns 200 if server is still running (not hung/crashed)
 * Less strict than readiness - used to restart hung instances
 */
router.get("/health/live", (req: Request, res: Response) => {
  try {
    // Simple check - if we can respond, we're alive
    res.status(200).json({
      status: "live",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "Server is alive",
    } as HealthStatus)
  } catch (error) {
    logger.error("Liveness check error:", error)
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "Liveness check failed",
    })
  }
})

/**
 * GET /health/dependencies
 * Detailed dependency health status
 * Shows status of all registered dependencies
 */
router.get("/health/dependencies", (req: Request, res: Response) => {
  try {
    const dependencies = Array.from(dependencyHealth.values())
    const healthyCount = dependencies.filter(d => d.status === "healthy").length
    const unhealthyCount = dependencies.filter(d => d.status === "unhealthy").length

    const overallStatus =
      unhealthyCount > 0
        ? "degraded"
        : healthyCount === dependencies.length
          ? "healthy"
          : "unknown"

    res.status(200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      summary: {
        total: dependencies.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        unknown: dependencies.length - healthyCount - unhealthyCount,
      },
      dependencies,
    })
  } catch (error) {
    logger.error("Dependencies health check error:", error)
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "Dependencies health check failed",
      error: String(error),
    })
  }
})

/**
 * GET /health/full
 * Comprehensive system health including metrics
 * Most detailed response, suitable for dashboards
 */
router.get("/health/full", async (req: Request, res: Response) => {
  try {
    const dependencies = Array.from(dependencyHealth.values())
    const unhealthyCount = dependencies.filter(d => d.status === "unhealthy").length

    const overallStatus: "healthy" | "degraded" | "unhealthy" =
      unhealthyCount > 0 ? "degraded" : "healthy"

    // Get memory usage
    const memUsage = process.memoryUsage()

    const response: FullHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      dependencies,
      systemMetrics: {
        memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        uptime: Math.floor(process.uptime()),
        pid: process.pid,
      },
    }

    const statusCode = overallStatus === "healthy" ? 200 : 503
    res.status(statusCode).json(response)
  } catch (error) {
    logger.error("Full health check error:", error)
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      dependencies: Array.from(dependencyHealth.values()),
      error: String(error),
    })
  }
})

export default router
