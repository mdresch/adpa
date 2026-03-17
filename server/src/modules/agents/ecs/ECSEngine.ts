import { EvidenceNode, ECSResult } from './ECSTypes'
import { AuthorityScoring } from './AuthorityScoring'
import { ConflictResolver } from './ConflictResolver'
import { SynthesisEngine } from './SynthesisEngine'
import { SubGoalExecutionResult } from '../OrchestrationTypes'
import { logger } from '../../../utils/logger'

/**
 * ECS Entry Point: Evaluative Contextual Synthesis Engine
 * Orchestrates the reasoning process for ADPA.
 */
export class ECSEngine {
  private synthesisEngine: SynthesisEngine

  constructor(aiService?: AIService) {
    this.synthesisEngine = new SynthesisEngine(aiService)
  }

  /**
   * Evaluates a set of execution results and produces a synthesized result.
   */
  async evaluate(goal: string, results: Record<string, SubGoalExecutionResult>, globalContext: any = {}): Promise<ECSResult> {
    logger.info(`Starting ECS evaluation for goal: ${goal}`)

    // 1. Evidence Extraction
    const rawNodes: EvidenceNode[] = Object.values(results).map(r => {
      // Extract domain from subgoals if available via plan mapping or metadata
      // For now, we'll try to find the subgoal in the context if plan is provided
      const domain = (r as any).domain || 'general'
      
      return {
        id: `ev_${r.goalId}`,
        sourceId: r.goalId,
        sourceType: 'agent',
        domain,
        weight: 0.5,
        confidence: 1.0,
        timestamp: r.endTime || new Date().toISOString(),
        content: r.finalAnswer,
        metadata: {
          agentProfile: (r as any).metadata?.capabilityProfile
        }
      }
    })

    // 2. Authority Scoring
    const weightedNodes = rawNodes.map(node => ({
      ...node,
      weight: AuthorityScoring.calculateWeight(node, globalContext)
    }))

    // 3. Conflict Resolution
    const conflicts = ConflictResolver.identifyConflicts(weightedNodes)
    let filteredNodes = [...weightedNodes]
    for (const conflict of conflicts) {
      filteredNodes = ConflictResolver.resolve(filteredNodes, conflict)
    }

    // 4. Synthesis
    const result = await this.synthesisEngine.synthesize(goal, filteredNodes, globalContext)
    
    // Attach identified conflicts if any
    result.conflicts = conflicts

    return result
  }
}
