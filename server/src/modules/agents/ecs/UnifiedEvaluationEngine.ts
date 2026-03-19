import { EvaluationInput, EvaluationOutput, EvaluationProvider } from './EvaluationContract'
import { ECSEngine } from './ECSEngine'
import { ConsensusEngine } from './ConsensusEngine'
import { TemporalECSEngine } from './TemporalECSEngine'
import { AIService } from '../../../services/aiService'
import { logger } from '../../../utils/logger'

/**
 * Unified Evaluation Engine (Phase 10)
 * Consolidates ECS, Consensus, and Temporal logic into a single high-integrity contract.
 */
export class UnifiedEvaluationEngine implements EvaluationProvider {
  private ecsEngine: ECSEngine
  private consensusEngine: ConsensusEngine
  private temporalEngine: TemporalECSEngine

  constructor(aiService: AIService) {
    this.ecsEngine = new ECSEngine(aiService)
    this.consensusEngine = new ConsensusEngine(aiService)
    this.temporalEngine = new TemporalECSEngine()
  }

  /**
   * Performs the unified evaluation pass.
   */
  async evaluate(input: EvaluationInput): Promise<EvaluationOutput> {
    const startTime = Date.now()
    logger.info(`[UNIFIED-EVAL] Starting high-integrity evaluation for goal: ${input.goal}`)

    // 1. ECS Evaluation (Authority & Evidence)
    const ecsResult = await this.ecsEngine.evaluate(input.goal, input.rawResults, input.context)

    // 2. Consensus Logic (Inter-Agent Agreement)
    // (Consensus was already computed in Orchestrator for Phase 8, 
    // but here we align it with the contract)
    const consensusScore = input.collaborationGraph.consensusScore

    // 3. Temporal Refinement (Cross-Session Stability)
    const refinedConfidence = this.temporalEngine.computeTemporalConfidence(
      ecsResult.confidenceScore, 
      input.temporalState
    )

    // 4. Final Synthesis Selection
    // When consensus is high (>70%), the inter-agent agreement gives strong confidence.
    // When low, we rely purely on the ECS authoritative conclusion.
    // TODO: In a future phase, low-consensus cases could trigger a re-synthesis pass.
    const finalAnswer = consensusScore > 0.7
      ? `[High Consensus: ${(consensusScore * 100).toFixed(0)}%] ${ecsResult.finalConclusion}`
      : ecsResult.finalConclusion

    return {
      summary: finalAnswer,
      finalAnswer,
      confidenceScore: refinedConfidence,
      consensusScore,
      ecsResult: {
        ...ecsResult,
        confidenceScore: refinedConfidence
      },
      metadata: {
        durationMs: Date.now() - startTime,
        passes: 4,
        policyApplied: !!input.context.policies.length,
        temporalStabilityApplied: input.temporalState.consensusHistory.length > 0
      }
    }
  }
}
