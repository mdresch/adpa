import { logger } from "../utils/logger"

/**
 * Represents a single dependency with initialization, validation, and failure handling logic.
 */
export interface Dependency {
  name: string
  critical: boolean
  timeout: number // milliseconds
  init: () => Promise<void>
  validate: () => Promise<boolean>
  shutdown?: () => Promise<void>
}

/**
 * Tracks the status of a dependency during initialization.
 */
export interface DependencyStatus {
  name: string
  critical: boolean
  status: "pending" | "initializing" | "ready" | "failed"
  error?: string
  duration: number // milliseconds
  timestamp: string
}

/**
 * Manages the startup dependency graph with fail-fast mode support.
 */
export class DependencyGraph {
  private dependencies: Map<string, Dependency> = new Map()
  private statuses: Map<string, DependencyStatus> = new Map()
  private failFastMode: boolean

  constructor(failFastMode: boolean = false) {
    this.failFastMode = failFastMode || process.env.FAIL_FAST_MODE === "true"
  }

  /**
   * Register a dependency with the graph.
   */
  register(dependency: Dependency): void {
    this.dependencies.set(dependency.name, dependency)
    this.statuses.set(dependency.name, {
      name: dependency.name,
      critical: dependency.critical,
      status: "pending",
      duration: 0,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Initialize all dependencies in parallel with timeout handling.
   * If fail-fast mode is enabled, stops on first critical failure.
   */
  async initialize(): Promise<Map<string, DependencyStatus>> {
    const initPromises: Promise<void>[] = []

    for (const [name, dependency] of this.dependencies.entries()) {
      initPromises.push(this.initializeDependency(dependency))
    }

    // Run all initialization in parallel but wait for all to complete
    await Promise.all(initPromises)

    // Check for critical failures
    const criticalFailures = Array.from(this.statuses.values()).filter(
      (s) => s.critical && s.status === "failed"
    )

    if (criticalFailures.length > 0 && this.failFastMode) {
      throw new Error(
        `Fail-fast mode: Critical dependency failed: ${criticalFailures.map((s) => s.name).join(", ")}`
      )
    }

    return this.statuses
  }

  /**
   * Initialize a single dependency with timeout and error handling.
   */
  private async initializeDependency(dependency: Dependency): Promise<void> {
    const status = this.statuses.get(dependency.name)!
    const startTime = Date.now()

    try {
      status.status = "initializing"

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${dependency.timeout}ms`)),
          dependency.timeout
        )
      )

      // Race between initialization and timeout
      await Promise.race([dependency.init(), timeoutPromise])

      // Validate the dependency
      const isValid = await dependency.validate()
      if (!isValid) {
        throw new Error("Validation failed")
      }

      status.status = "ready"
      status.duration = Date.now() - startTime
      status.timestamp = new Date().toISOString()

      logger.info(`✅ ${dependency.name} initialized successfully (${status.duration}ms)`)
    } catch (error: any) {
      const duration = Date.now() - startTime
      status.status = "failed"
      status.error = error?.message || "Unknown error"
      status.duration = duration

      const logMessage = `❌ ${dependency.name} failed: ${status.error} (${duration}ms)`
      if (dependency.critical) {
        logger.error(logMessage)
      } else {
        logger.warn(logMessage)
      }
    }
  }

  /**
   * Get all dependency statuses.
   */
  getStatuses(): Map<string, DependencyStatus> {
    return this.statuses
  }

  /**
   * Get a summary of the startup process.
   */
  getSummary(): string {
    const statuses = Array.from(this.statuses.values())
    const ready = statuses.filter((s) => s.status === "ready").length
    const failed = statuses.filter((s) => s.status === "failed").length
    const totalDuration = statuses.reduce((sum, s) => sum + s.duration, 0)

    let summary = "\n"
    summary += "╔════════════════════════════════════════════════════════════════╗\n"
    summary += "║                 STARTUP DEPENDENCY SUMMARY                     ║\n"
    summary += "╠════════════════════════════════════════════════════════════════╣\n"

    for (const status of statuses) {
      const statusIcon = status.status === "ready" ? "✅" : status.status === "failed" ? "❌" : "⏳"
      const criticality = status.critical ? "[CRITICAL]" : "[OPTIONAL]"
      summary += `║ ${statusIcon} ${status.name.padEnd(30)} ${criticality.padEnd(12)} ${status.duration
        .toString()
        .padEnd(6)}ms ║\n`
    }

    summary += "╠════════════════════════════════════════════════════════════════╣\n"
    summary += `║ Ready: ${ready}/${statuses.length} | Failed: ${failed} | Total: ${totalDuration}ms ${" ".repeat(
      38 - String(totalDuration).length
    )}║\n`
    summary += "╚════════════════════════════════════════════════════════════════╝\n"

    return summary
  }

  /**
   * Check if all critical dependencies are ready.
   */
  isHealthy(): boolean {
    for (const status of this.statuses.values()) {
      if (status.critical && status.status !== "ready") {
        return false
      }
    }
    return true
  }

  /**
   * Get critical failures.
   */
  getCriticalFailures(): DependencyStatus[] {
    return Array.from(this.statuses.values()).filter(
      (s) => s.critical && s.status === "failed"
    )
  }

  /**
   * Shutdown all dependencies.
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = []

    for (const [, dependency] of this.dependencies.entries()) {
      if (dependency.shutdown) {
        shutdownPromises.push(
          dependency.shutdown().catch((err) => {
            logger.warn(`Failed to shutdown ${dependency.name}:`, err)
          })
        )
      }
    }

    await Promise.all(shutdownPromises)
  }
}
