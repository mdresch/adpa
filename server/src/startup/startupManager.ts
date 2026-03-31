import { DependencyGraph } from "./dependencyGraph"
import {
  databaseDependency,
  redisDependency,
  neo4jDependency,
  rabbitmqDependency,
  aiProvidersDependency,
  workersDependency,
  mongodbDependency,
  pineconeDependency,
  langfuseDependency,
  securityValidationDependency,
  upstashDependency,
  morphicDbDependency,
} from "./dependencies"
import { logger } from "../utils/logger"

/**
 * Manages the complete server startup process using the dependency graph.
 * This ensures all dependencies are initialized in the correct order
 * and provides clear feedback on what failed.
 */
export class StartupManager {
  private graph: DependencyGraph

  constructor() {
    this.graph = new DependencyGraph()
    this.registerDependencies()
  }

  private registerDependencies(): void {
    // Register all dependencies in order of criticality
    this.graph.register(securityValidationDependency) // Security check MUST be first
    this.graph.register(databaseDependency)
    this.graph.register(azureBackendDependency)      // Azure availability check
    this.graph.register(firebaseAuthDependency)      // Firebase handshake check
    this.graph.register(redisDependency)
    this.graph.register(neo4jDependency)
    this.graph.register(rabbitmqDependency)
    this.graph.register(aiProvidersDependency)
    this.graph.register(workersDependency)
    this.graph.register(mongodbDependency)
    this.graph.register(pineconeDependency)
    this.graph.register(langfuseDependency)
    this.graph.register(upstashDependency)
    this.graph.register(morphicDbDependency)
  }


  async initialize(): Promise<void> {
    logger.info("🚀 Starting server initialization with dependency graph...")

    try {
      await this.graph.initialize()

      // Print startup summary
      console.log(this.graph.getSummary())

      // Check if system is healthy (all critical deps ready)
      if (!this.graph.isHealthy()) {
        const failures = this.graph.getCriticalFailures()
        throw new Error(
          `Server startup failed: Critical dependencies failed: ${failures
            .map((f) => f.name)
            .join(", ")}`
        )
      }

      logger.info("✅ All dependencies initialized successfully")
    } catch (error) {
      logger.error("❌ Startup initialization failed:", error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    logger.info("🛑 Shutting down dependencies...")
    await this.graph.shutdown()
    logger.info("✅ All dependencies shut down successfully")
  }

  getGraph(): DependencyGraph {
    return this.graph
  }

  /**
   * Get list of all registered dependency names for health tracking
   * Used by health endpoints to initialize dependency monitoring
   */
  getDependencyNames(): string[] {
    return Array.from(this.graph.getStatuses().keys())
  }
}
