import { EvidenceNode, ReasoningStep, ECSResult } from './ECSTypes'
import { AIService } from '../../../services/aiService'
import { logger } from '../../../utils/logger'

/**
 * ECS Component: Synthesis Engine
 * Combines weighted, filtered evidence into a structured final conclusion.
 */
export class SynthesisEngine {
  private aiService: AIService

  constructor(aiService?: AIService) {
    this.aiService = aiService || new AIService()
  }

  /**
   * Main synthesis: Use an LLM to generate the final justified answer.
   */
  async synthesize(goal: string, evidence: EvidenceNode[], globalContext: any): Promise<ECSResult> {
    const totalStartTime = Date.now()
    logger.info(`Synthesizing final result for goal: ${goal} with ${evidence.length} evidence nodes`)

    // 1. Construct reasoning prompt with evidence provenance
    const evidenceText = evidence.map((e, idx) => 
      `Evidence [${idx+1}] (Source: ${e.sourceId}, Domain: ${e.domain}, Weight: ${e.weight.toFixed(2)}): ${e.content}`
    ).join('\n\n')

    const prompt = `
      You are the ADPA (Agentic Discovery and Project Automation) Reasoning Layer.
      Your task is to synthesize multiple pieces of evidence into a final, highly reliable conclusion.

      User Goal: ${goal}
      Context: ${JSON.stringify(globalContext)}

      EVIDENCE PROVIDED:
      ${evidenceText}

      RULES:
      1. Weight your synthesis toward higher-authority (higher weight) evidence.
      2. If evidence conflicts, explain how you resolved it.
      3. Provide a justification for your conclusion and a final confidence score (0-100).

      Return a JSON result with this structure:
      {
        "finalConclusion": "The synthesis result...",
        "confidenceScore": 85,
        "justification": "Why this conclusion was reached...",
        "reasoningSteps": [
          { "type": "aggregation", "justification": "...", "authorityScore": 0.9 }
        ]
      }
    `

    try {
      const response = await this.aiService.generateWithFallback({
        provider: globalContext.provider,
        model: globalContext.model,
        prompt: prompt,
        system_prompt: 'You are a professional synthesizer. Respond ONLY with valid JSON.'
      })

      const parsed = JSON.parse(response.content)

      return {
        finalConclusion: parsed.finalConclusion,
        confidenceScore: parsed.confidenceScore,
        evidenceGraph: evidence,
        reasoningChain: (parsed.reasoningSteps || []).map((step: any, idx: number) => ({
          id: `step_${idx}`,
          ...step
        })),
        conflicts: [], // ConflictResolver would populate this
        metadata: {
          modelUsed: response.model,
          durationMs: Date.now() - totalStartTime,
          evidenceCount: evidence.length
        }
      }
    } catch (e: any) {
      logger.error('Failed to synthesize final result', e)
      return {
        finalConclusion: `Synthesis failed: ${e.message}`,
        confidenceScore: 0,
        evidenceGraph: evidence,
        reasoningChain: [],
        conflicts: [],
        metadata: {
          modelUsed: 'none',
          durationMs: Date.now() - totalStartTime,
          evidenceCount: evidence.length
        }
      }
    }
  }
}
