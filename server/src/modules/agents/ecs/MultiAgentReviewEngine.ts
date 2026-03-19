import { AgentReview, ReviewType } from './CollaborationTypes'
import { SubGoalExecutionResult } from '../OrchestrationTypes'
import { AIService } from '../../../services/aiService'
import { AgentRegistry, AgentDomain } from '../AgentRegistry'
import { logger } from '../../../utils/logger'

/**
 * Multi-Agent Review Engine
 * Orchestrates cross-agent evaluation and refinement passes.
 */
export class MultiAgentReviewEngine {
  private aiService: AIService

  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService()
  }

  /**
   * Generates reviews for a set of results by other specialized agents.
   */
  async runReviewPass(results: Record<string, SubGoalExecutionResult>, globalContext: any): Promise<AgentReview[]> {
    const reviews: AgentReview[] = []
    const resultList = Object.values(results)

    logger.info(`Starting Multi-Agent Review Pass for ${resultList.length} results`)

    for (const target of resultList) {
      // Pick a reviewer agent that is DIFFERENT from the target agent's domain
      // In a real scenario, we might pick based on relevant cross-domain expertise
      const possibleReviewers: AgentDomain[] = ['pmbok', 'discovery', 'general']
      const reviewerDomain = possibleReviewers.find(d => d !== target.domain) || 'general'
      
      try {
        const reviewerAgent = AgentRegistry.getAgent(reviewerDomain)
        const review = await this.generateReview(reviewerAgent.constructor.name, target, globalContext)
        if (review) reviews.push(review)
      } catch (e: any) {
        logger.error(`Review failed for target ${target.goalId}: ${e.message}`)
      }
    }

    return reviews
  }

  /**
   * Internal LLM-driven review generation
   */
  private async generateReview(reviewerId: string, target: SubGoalExecutionResult, context: any): Promise<AgentReview | null> {
    const prompt = `
      You are an expert peer reviewer (${reviewerId}) in the ADPA system.
      Your task is to critically evaluate the following output from another agent.

      TARGET GOAL: ${target.goalId}
      TARGET OUTPUT: ${target.finalAnswer}
      CONTEXT: ${JSON.stringify(context)}

      EVALUATION CRITERIA:
      1. Accuracy: Is the output factually correct based on context?
      2. Completeness: Does it fully address the goal?
      3. Consistency: Does it conflict with known project data?

      Respond with a JSON review:
      {
        "type": "agreement" | "contradiction" | "refinement" | "supplement",
        "content": "Specific feedback...",
        "confidenceAdjustment": 0.1, // -1.0 to 1.0 (how much to trust/distrust target)
        "justification": "Why you chose this type and adjustment"
      }
    `

    try {
      const response = await this.aiService.generateWithFallback({
        provider: context.provider,
        model: context.model,
        prompt: prompt,
        system_prompt: 'You are a critical peer reviewer. Respond ONLY with valid JSON.'
      })

      const parsed = JSON.parse(response.content)
      return {
        reviewerId,
        targetId: target.goalId,
        ...parsed
      }
    } catch (e) {
      logger.error(`Failed to parse review JSON: ${reviewerId}`, e)
      return null
    }
  }
}
