import { Dependency } from "../dependencyGraph"
import { connectNeo4j, isNeo4jConfigured, getNeo4jDriver } from "../../utils/neo4j"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const neo4jDependency: Dependency = {
  name: "Neo4j",
  critical: false,
  timeout: 30000, // 30 seconds
  init: async () => {
    const startTime = Date.now()
    try {
      if (!isNeo4jConfigured()) {
        logger.debug("Neo4j not configured, skipping initialization")
        updateDependencyHealth("Neo4j", "healthy", 0, "Not configured")
        return
      }
      await connectNeo4j()
      const latency = Date.now() - startTime
      updateDependencyHealth("Neo4j", "healthy", latency)
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Neo4j", "unhealthy", latency, String(err))
      throw err
    }
  },
  validate: async () => {
    try {
      if (!isNeo4jConfigured()) {
        updateDependencyHealth("Neo4j", "healthy", 0)
        return true
      }
      const driver = getNeo4jDriver()
      if (!driver) {
        updateDependencyHealth("Neo4j", "unhealthy", 0, "Driver not initialized")
        return false
      }
      const startTime = Date.now()
      const result = await driver.executeQuery("RETURN 1")
      const latency = Date.now() - startTime
      updateDependencyHealth("Neo4j", "healthy", latency)
      return result.records.length >= 0
    } catch (error) {
      logger.warn("Neo4j validation failed:", error)
      updateDependencyHealth("Neo4j", "unhealthy", 0, String(error))
      return false
    }
  },
  shutdown: async () => {
    try {
      const driver = getNeo4jDriver()
      if (driver) {
        await driver.close()
      }
    } catch (error) {
      logger.warn("Neo4j shutdown failed:", error)
    }
  },
}
