import { SubGoal } from './OrchestrationTypes'
import { logger } from '../../utils/logger'

/**
 * Utility for resolving subgoal dependency graphs
 */
export class SubGoalResolver {
  /**
   * Sort subgoals into batches that can be executed in parallel.
   * Each batch contains subgoals whose dependencies are satisfied by previous batches.
   */
  static resolveBatches(subGoals: SubGoal[]): SubGoal[][] {
    const batches: SubGoal[][] = []
    const completed = new Set<string>()
    const remaining = [...subGoals]

    while (remaining.length > 0) {
      const currentBatch: SubGoal[] = []
      const nextRemaining: SubGoal[] = []

      for (const subGoal of remaining) {
        const dependencies = subGoal.dependsOn || []
        const canExecute = dependencies.every(dep => completed.has(dep))

        if (canExecute) {
          currentBatch.push(subGoal)
        } else {
          nextRemaining.push(subGoal)
        }
      }

      if (currentBatch.length === 0) {
        logger.error(`Cycle detected in subgoal dependencies: ${remaining.map(sg => sg.id).join(', ')}`)
        // Break the cycle by taking one remaining subgoal anyway, or throw
        // For robustness, we'll take the first remaining one
        const fallback = nextRemaining.shift()
        if (fallback) {
          currentBatch.push(fallback)
        } else {
          break
        }
      }

      batches.push(currentBatch)
      currentBatch.forEach(sg => completed.add(sg.id))
      remaining.length = 0
      remaining.push(...nextRemaining)
    }

    return batches
  }

  /**
   * Simple linear sort satisfying dependencies
   */
  static resolveSerial(subGoals: SubGoal[]): SubGoal[] {
    const batches = this.resolveBatches(subGoals)
    return batches.flat()
  }
}
