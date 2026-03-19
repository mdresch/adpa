/**
 * Orchestrator Agent for ADPA
 * Decomposes high-level goals into subgoals and delegates them to specialized agents.
 */

import { BaseAgent, AgentObservation, AgentResult } from './BaseAgent'
import { AgentRegistry, AgentDomain } from './AgentRegistry'
import { SubGoal, OrchestrationResult, SubGoalExecutionResult, OrchestrationSummary, ExecutionMode } from './OrchestrationTypes'
import { SubGoalResolver } from './SubGoalResolver'
import { ECSEngine } from './ecs/ECSEngine'
import { ProjectContextResolver } from './ProjectContextResolver'
import { OrganizationPolicyEngine } from './OrganizationPolicyEngine'
import { MultiAgentReviewEngine } from './ecs/MultiAgentReviewEngine'
import { ConsensusEngine } from './ecs/ConsensusEngine'
import { TemporalECSEngine } from './ecs/TemporalECSEngine'
import { UnifiedEvaluationEngine } from './ecs/UnifiedEvaluationEngine'
import { globalTemporalMemoryStore } from './ecs/TemporalMemoryStore'
import { logger } from '../../utils/logger'

export class OrchestratorAgent extends BaseAgent {
  /**
   * Main execution: Plan, then execute delegation pipeline
   */
  async orchestrate(goal: string, context: any = {}, mode: ExecutionMode = 'parallel'): Promise<OrchestrationResult> {
    const totalStartTime = Date.now()
    logger.info(`Orchestration starting for goal: ${goal} (Mode: ${mode})`)
    
    // Phase 7: Resolve Organizational Context
    let resolvedContext = context.resolvedContext
    if (!resolvedContext && context.projectId) {
      const resolver = new ProjectContextResolver()
      resolvedContext = await resolver.resolve(context.projectId)
    }
    const fullContext = { ...context, resolvedContext }

    // 1. Plan: Decompose goal into subgoals
    const subGoals = await this.plan(goal, fullContext)
    
    // 2. Execute: Delegate subgoals to agents
    const results: Record<string, SubGoalExecutionResult> = {}
    
    if (mode === 'parallel') {
      // Resolve dependency batches
      const batches = SubGoalResolver.resolveBatches(subGoals)
      logger.info(`Orchestration plan resolved into ${batches.length} sequential batches`)

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        logger.info(`Executing batch ${i + 1}/${batches.length} (${batch.length} tasks)`)
        
        const batchPromises = batch.map(subGoal =>
          this.executeSubGoal(subGoal, fullContext, resolvedContext, context, results)
        )

        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach(r => { results[r.goalId] = r })
      }
    } else {
      // Serial execution
      const orderedSubGoals = SubGoalResolver.resolveSerial(subGoals)
      for (const subGoal of orderedSubGoals) {
        const r = await this.executeSubGoal(subGoal, fullContext, resolvedContext, context, results)
        results[r.goalId] = r
      }
    }
    
    // 3. Review: Multi-Agent Peer Review Pass (Phase 8)
    const reviewEngine = new MultiAgentReviewEngine(this.aiService)
    const reviews = await reviewEngine.runReviewPass(results, fullContext)
    
    // Attach reviews to results for visibility
    reviews.forEach(rev => {
      if (results[rev.targetId]) {
        if (!results[rev.targetId].reviews) results[rev.targetId].reviews = []
        results[rev.targetId].reviews?.push(rev)
      }
    })

    // 4. Consensus: Build Collaboration Graph (Phase 8)
    const consensusEngine = new ConsensusEngine(this.aiService)
    const consensus = await consensusEngine.formConsensus(goal, results, reviews, fullContext)

    // 5. Unified Evaluation Pass (Phase 10)
    // Consolidates ECS, Consensus, and Temporal logic into a single contract.
    const projectState = fullContext.projectId 
      ? await globalTemporalMemoryStore.loadProjectState(fullContext.projectId)
      : { projectId: 'none', evidenceHistory: [], consensusHistory: [], lastUpdated: new Date().toISOString() }

    const evalEngine = new UnifiedEvaluationEngine(this.aiService)
    const evaluation = await evalEngine.evaluate({
      goal,
      context: fullContext.resolvedContext || { policies: [], metadata: {} },
      rawResults: results,
      collaborationGraph: consensus.graph,
      temporalState: projectState
    })

    // 6. Final State Persistence (Phase 9)
    if (fullContext.projectId) {
      await globalTemporalMemoryStore.saveRun(
        fullContext.projectId,
        evaluation.ecsResult.evidenceGraph.map(node => ({
          id: node.id,
          timestamp: node.timestamp,
          agentId: node.sourceId,
          domain: node.domain,
          content: node.content,
          weight: node.weight,
          consensusScore: consensus.consensusScore
        })),
        {
          id: `con_${Date.now()}`,
          goal,
          timestamp: new Date().toISOString(),
          consensusScore: consensus.consensusScore,
          finalAnswer: evaluation.finalAnswer,
          evidenceSnapshot: evaluation.ecsResult.evidenceGraph.map(n => n.id)
        }
      )
    }

    return {
      success: Object.values(results).every(r => r.success),
      plan: subGoals,
      results,
      summary: evaluation.summary,
      ecsResult: evaluation.ecsResult,
      executionStats: {
        totalDurationMs: Date.now() - totalStartTime,
        mode
      }
    }
  }

  /**
   * Shared subgoal execution logic used by both parallel and serial modes.
   * Fetches the appropriate agent, applies policy overrides, runs the agent,
   * and returns a fully populated SubGoalExecutionResult.
   */
  private async executeSubGoal(
    subGoal: SubGoal,
    fullContext: any,
    resolvedContext: any,
    originalContext: any,
    previousResults: Record<string, SubGoalExecutionResult>
  ): Promise<SubGoalExecutionResult> {
    const startTime = Date.now()
    const startTimestamp = new Date().toISOString()

    try {
      const agent = AgentRegistry.getAgent(subGoal.domain as AgentDomain)

      // Phase 7: Apply policy-driven provider overrides
      const preferredProviders = resolvedContext
        ? OrganizationPolicyEngine.getPreferredProviders(resolvedContext)
        : []
      const executionContext = {
        ...fullContext,
        previousResults,
        // Use the policy-preferred provider if available; otherwise let AIService decide
        ...(preferredProviders[0] ? { provider: preferredProviders[0] } : {})
      }

      const executionResult = await agent.run(subGoal.goal, executionContext)

      return {
        goalId: subGoal.id,
        success: executionResult.success,
        finalAnswer: executionResult.finalAnswer,
        history: executionResult.history,
        durationMs: Date.now() - startTime,
        startTime: startTimestamp,
        endTime: new Date().toISOString(),
        domain: subGoal.domain,
        metadata: executionResult.metadata
      }
    } catch (error: any) {
      logger.error(`Subgoal ${subGoal.id} failed with error: ${error.message}`)
      return {
        goalId: subGoal.id,
        success: false,
        finalAnswer: `Error: ${error.message}`,
        history: [],
        durationMs: Date.now() - startTime,
        startTime: startTimestamp,
        endTime: new Date().toISOString()
      }
    }
  }

  /**
   * Decompose goal into subgoals using LLM
   */
  async plan(goal: string, context: any): Promise<SubGoal[]> {
    const prompt = `
      You are an expert Project Orchestrator for ADPA (Agentic Discovery and Project Automation).
      Your task is to decompose a high-level user goal into a set of discrete, actionable subgoals.
      
      User Goal: ${goal}
      Context: ${JSON.stringify(context)}
      
      DOMAINS AVAILABLE:
      - 'pmbok': Best for project management, risk analysis, resource planning, and governance tasks.
      - 'discovery': Best for research, information gathering, and exploring external/internal data sources.
      - 'integration': Best for connecting systems, API operations, and data synchronization.
      - 'general': Best for general reasoning, common knowledge, or tasks that don't fit the above.

      DEPENDENCIES:
      - Use "dependsOn" to specify which task IDs must be completed BEFORE a given task starts.
      - Parallelize tasks where possible by omitting dependencies between independent tasks.

      Return a JSON array of subgoals:
      [
        { 
          "id": "task_1", 
          "goal": "Detailed instruction for the discovery agent", 
          "domain": "discovery",
          "metadata": { "reasoning": "Explain why this domain was chosen" }
        },
        { 
          "id": "task_2", 
          "goal": "Process the discovered info using PMBOK standards", 
          "domain": "pmbok", 
          "dependsOn": ["task_1"] 
        }
      ]
    `
    
    const response = await this.aiService.generateWithFallback({
      provider: context.provider,
      model: context.model,
      prompt: prompt,
      system_prompt: 'You are an orchestration planner. Respond ONLY with valid JSON.'
    })
    
    try {
      const parsed = JSON.parse(response.content)
      return Array.isArray(parsed) ? parsed : (parsed.subgoals || [])
    } catch (e) {
      logger.error('Failed to parse orchestrator plan', e)
      return [{ id: 'fallback', goal: goal, domain: 'general' }]
    }
  }

  // Not strictly needed since we use orchestrate(), but BaseAgent requires it
  protected constructPrompt(goal: string, context: any, history: AgentObservation[]): string {
    return "This agent should use the orchestrate() method."
  }
}
