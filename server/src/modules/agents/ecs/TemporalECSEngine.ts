import { ProjectTemporalState, TemporalEvidenceRecord, TemporalECSOptions } from './TemporalMemoryTypes'
import { EvidenceNode, ECSResult } from './ECSTypes'
import { logger } from '../../../utils/logger'

/**
 * Temporal ECS Engine
 * Enhances standard ECS reasoning with temporal decay and historical reinforcement.
 */
export class TemporalECSEngine {
  private options: TemporalECSOptions = {
    decayHalfLifeDays: 30,
    reinforcementBonus: 0.1,
    conflictPenalty: 0.15
  }

  constructor(options?: Partial<TemporalECSOptions>) {
    this.options = { ...this.options, ...options }
  }

  /**
   * Adjusts evidence weights based on temporal state.
   */
  async refineWeights(
    currentEvidence: EvidenceNode[], 
    history: ProjectTemporalState
  ): Promise<EvidenceNode[]> {
    logger.info(`Refining ${currentEvidence.length} evidence nodes with temporal context for project: ${history.projectId}`)

    return currentEvidence.map(node => {
      let temporalWeight = node.weight

      // 1. Recency Decay (if we were pulling old evidence forward, which we might do in future phases)
      // For current run evidence, decay is 0 (it's new).
      
      // 2. Historical Reinforcement
      // If past consensus results for the same/similar goal had high scores, we boost current confidence.
      const highConfidencePast = history.consensusHistory.filter(c => c.consensusScore > 0.8).length
      if (highConfidencePast > 0) {
        temporalWeight += Math.log1p(highConfidencePast) * this.options.reinforcementBonus
      }

      // 3. Conflict Persistence
      // If this domain has historically high conflict density, we penalize current weight.
      // (Simplified logic for scaffolding)
      
      return {
        ...node,
        weight: Math.max(0, Math.min(1.0, temporalWeight))
      }
    })
  }

  /**
   * Computes a temporally-aware confidence score.
   */
  computeTemporalConfidence(currentScore: number, history: ProjectTemporalState): number {
    // If the project understanding has been stable over many runs, increase confidence.
    const stabilityFactor = Math.min(0.2, history.consensusHistory.length * 0.02)
    return Math.min(100, currentScore * (1 + stabilityFactor))
  }
}
