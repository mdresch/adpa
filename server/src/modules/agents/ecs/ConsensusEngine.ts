import { CollaborationGraph, AgentReview, CollaborationNode, CollaborationEdge } from './CollaborationTypes'
import { SubGoalExecutionResult } from '../OrchestrationTypes'
import { AIService } from '../../../services/aiService'
import { logger } from '../../../utils/logger'

/**
 * Consensus Engine
 * Synthesizes a final unified conclusion from multiple agent outputs and reviews.
 */
export class ConsensusEngine {
  private aiService: AIService

  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService()
  }

  /**
   * Main synthesis: Combine results and reviews into a consensus-backed answer.
   */
  async formConsensus(
    goal: string, 
    results: Record<string, SubGoalExecutionResult>, 
    reviews: AgentReview[], 
    context: any
  ): Promise<{ finalAnswer: string, consensusScore: number, graph: CollaborationGraph }> {
    
    // 1. Build Collaboration Graph
    const graph: CollaborationGraph = {
      nodes: Object.values(results).map(r => ({
        id: r.goalId,
        agentId: r.goalId, // Using goalId as simplified node ID
        output: r.finalAnswer,
        metadata: r.metadata
      })),
      edges: reviews.map(rev => ({
        fromId: rev.reviewerId,
        toId: rev.targetId,
        type: rev.type,
        metadata: { confidenceAdjustment: rev.confidenceAdjustment }
      })),
      consensusScore: 0
    }

    // 2. Format evidence for LLM
    const evidenceText = Object.values(results).map(r => 
      `Agent [${r.goalId}]: ${r.finalAnswer}`
    ).join('\n\n')

    const reviewText = reviews.map(rev => 
      `Review [${rev.reviewerId} -> ${rev.targetId}]: Type=${rev.type}, Feedback=${rev.content}`
    ).join('\n')

    const prompt = `
      You are the ADPA Consensus Engine. Your task is to produce a final, unified conclusion based on evidence from multiple agents and their peer reviews.

      ORIGINAL GOAL: ${goal}
      CONTEXT: ${JSON.stringify(context)}

      AGENT OUTPUTS:
      ${evidenceText}

      PEER REVIEWS:
      ${reviewText}

      INSTRUCTIONS:
      1. Synthesize all viewpoints into a single coherent answer.
      2. If there are contradictions, resolve them by weighing agent authority and review feedback.
      3. Assign an overall Consensus Score (0-100) reflecting how much the agents agree.

      Return JSON:
      {
        "finalAnswer": "...",
        "consensusScore": 85,
        "justification": "..."
      }
    `

    try {
      const response = await this.aiService.generateWithFallback({
        provider: context.provider,
        model: context.model,
        prompt: prompt,
        system_prompt: 'You are a consensus synthesizer. Respond ONLY with valid JSON.'
      })

      const parsed = JSON.parse(response.content)
      graph.consensusScore = parsed.consensusScore / 100

      return {
        finalAnswer: parsed.finalAnswer,
        consensusScore: graph.consensusScore,
        graph
      }
    } catch (e: any) {
      logger.error('Consensus formation failed', e)
      return {
        finalAnswer: "Failed to form consensus.",
        consensusScore: 0,
        graph
      }
    }
  }
}
