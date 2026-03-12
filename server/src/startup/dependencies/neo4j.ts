import { Dependency } from "../dependencyGraph"
import { connectNeo4j, isNeo4jConfigured, getNeo4jDriver } from "../../utils/neo4j"
import { logger } from "../../utils/logger"

export const neo4jDependency: Dependency = {
  name: "Neo4j",
  critical: false,
  timeout: 10000, // 10 seconds
  init: async () => {
    if (!isNeo4jConfigured()) {
      logger.debug("Neo4j not configured, skipping initialization")
      return
    }
    await connectNeo4j()
  },
  validate: async () => {
    try {
      if (!isNeo4jConfigured()) return true // Skip validation if not configured
      const driver = getNeo4jDriver()
      if (!driver) return false
      const result = await driver.executeQuery("RETURN 1")
      return result.records.length >= 0
    } catch (error) {
      logger.warn("Neo4j validation failed:", error)
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
