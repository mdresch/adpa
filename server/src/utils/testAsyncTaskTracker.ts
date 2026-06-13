import { logger } from './logger'

export class TestAsyncTaskTracker {
  private static pendingPromises = new Set<Promise<any>>()
  private static isShuttingDown = false

  /**
   * Track a promise to ensure it can be awaited during test teardown.
   */
  public static track<T>(promise: Promise<T>): Promise<T> {
    if (this.isShuttingDown) {
      logger.warn('[AsyncTaskTracker] Task registered during shutdown/teardown. Bypassing execution.')
      return Promise.resolve(null as any)
    }

    this.pendingPromises.add(promise)
    promise.finally(() => {
      this.pendingPromises.delete(promise)
    })
    return promise
  }

  /**
   * Helper to execute an async callback wrapped in a tracked Promise.
   */
  public static runTracked(name: string, fn: () => Promise<any>): void {
    if (this.isShuttingDown) {
      logger.warn(`[AsyncTaskTracker] Task "${name}" bypassed during shutdown/teardown.`)
      return
    }
    const promise = fn().catch((err) => {
      logger.error(`[AsyncTaskTracker] Tracked background task "${name}" failed`, err)
    })
    this.track(promise)
  }

  /**
   * Defer and execute an async callback using setImmediate, wrapped in a tracked Promise.
   */
  public static runTrackedDeferred(name: string, fn: () => Promise<any>): void {
    if (this.isShuttingDown) {
      logger.warn(`[AsyncTaskTracker] Task "${name}" bypassed during shutdown/teardown.`)
      return
    }
    const promise = new Promise<void>((resolve) => {
      setImmediate(async () => {
        try {
          await fn()
        } catch (err) {
          logger.error(`[AsyncTaskTracker] Tracked background task "${name}" failed`, err)
        } finally {
          resolve()
        }
      })
    })
    this.track(promise)
  }

  /**
   * Await all currently pending promises to be resolved or rejected.
   */
  public static async awaitAllPending(): Promise<void> {
    let iterations = 0
    const maxIterations = 5 // Prevent infinite loops
    
    while (this.pendingPromises.size > 0 && iterations < maxIterations) {
      const currentBatch = Array.from(this.pendingPromises)
      logger.info(`[AsyncTaskTracker] Awaiting ${currentBatch.length} pending background tasks (iteration ${iterations + 1})...`)
      await Promise.all(currentBatch)
      iterations++
    }
    
    this.pendingPromises.clear()
    this.isShuttingDown = true // Stop accepting new tasks after cleanup finishes
  }

  /**
   * Reset the tracker state.
   */
  public static reset(): void {
    this.pendingPromises.clear()
    this.isShuttingDown = false
  }

  /**
   * Get count of pending background tasks.
   */
  public static getPendingCount(): number {
    return this.pendingPromises.size
  }
}
