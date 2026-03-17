import { ECSResult } from './ECSTypes'
import { CollaborationGraph } from './CollaborationTypes'
import { ProjectTemporalState } from './TemporalMemoryTypes'
import { ResolvedContext } from '../OrganizationalContext'

/**
 * Unified Evaluation Contract for ADPA
 * This contract defines the strictly typed interface for the final synthesis phase.
 */

export interface EvaluationInput {
  goal: string
  context: ResolvedContext
  rawResults: Record<string, any>
  collaborationGraph: CollaborationGraph
  temporalState: ProjectTemporalState
}

export interface EvaluationOutput {
  summary: string
  finalAnswer: string
  confidenceScore: number
  consensusScore: number
  ecsResult: ECSResult
  metadata: {
    durationMs: number
    passes: number
    policyApplied: boolean
    temporalStabilityApplied: boolean
  }
}

/**
 * Interface for an evaluation provider (e.g. ECSEngine, ConsensusEngine)
 */
export interface EvaluationProvider {
  evaluate(input: EvaluationInput): Promise<EvaluationOutput>
}
