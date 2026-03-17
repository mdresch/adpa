/**
 * Base Agent Class for ADPA
 * Implements Plan-Act-Observe loop (ReAct pattern)
 */

import { AIService } from '../../services/aiService'
import { logger } from '../../utils/logger'
import { ToolRegistry, globalToolRegistry, BaseTool } from './ToolRegistry'
import { AgentCapabilityProfile, AGENT_CAPABILITY_PROFILES } from './AgentCapabilities'

export interface AgentObservation {
  type: 'action' | 'observation' | 'thought' | 'error'
  content: string
  metadata?: any
}

export interface AgentResult {
  success: boolean
  finalAnswer: string
  history: AgentObservation[]
  metadata?: {
    provider: string
    model: string
    capabilityProfile?: AgentCapabilityProfile
  }
}

export abstract class BaseAgent {
  protected aiService: AIService
  protected toolRegistry: ToolRegistry
  protected maxIterations: number = 10
  protected history: AgentObservation[] = []
  protected systemPrompt: string = `You are an ADPA Agent. Use the available tools to achieve the user's goal.
          Follow the Thought-Action-Observation loop.
          If you have the final answer, prefix it with "Final Answer:".`
  
  // Phase 5: Capability Profile
  public capabilityProfile: AgentCapabilityProfile = AGENT_CAPABILITY_PROFILES['general']

  constructor(
    toolRegistry: ToolRegistry = globalToolRegistry,
    maxIterations: number = 10,
    aiService?: AIService
  ) {
    this.aiService = aiService || new AIService()
    this.toolRegistry = toolRegistry
    this.maxIterations = maxIterations
  }

  /**
   * Main execution loop
   */
  async run(goal: string, context: any = {}): Promise<AgentResult> {
    this.history = []
    let currentIteration = 0
    let finalAnswer = ""
    let success = false
    let provider = ""
    let model = ""

    logger.info(`Agent starting run for goal: ${goal}`)

    try {
      while (currentIteration < this.maxIterations) {
        currentIteration++
        
        // 1. Plan/Thought
        const prompt = this.constructPrompt(goal, context, this.history)
        const response = await this.aiService.generateWithFallback({
          provider: context.provider || 'openai',
          model: context.model || 'gpt-4o',
          prompt: prompt,
          system_prompt: this.systemPrompt
        })

        provider = response.provider
        model = response.model
        const content = response.content
        this.history.push({ type: 'thought', content })

        // Check for completion
        if (content.includes("Final Answer:")) {
          finalAnswer = content.split("Final Answer:")[1].trim()
          success = true
          break
        }

        // 2. Act
        const actionResult = await this.parseAndExecuteAction(content)
        if (actionResult) {
          this.history.push({ 
            type: 'action', 
            content: `Tool: ${actionResult.tool}, Args: ${JSON.stringify(actionResult.args)}`,
            metadata: actionResult.metadata
          })
          
          // 3. Observe
          if (actionResult.error) {
            this.history.push({ type: 'error', content: actionResult.error })
          } else {
            this.history.push({ type: 'observation', content: actionResult.result || "" })
          }
        } else {
          // If no action found and no final answer, ask for clarification or try again
          this.history.push({ type: 'error', content: "No action or final answer detected in response." })
        }
      }

      if (!success) {
        finalAnswer = "Failed to reach a conclusion within maximum iterations."
      }

      return { 
        success, 
        finalAnswer, 
        history: this.history,
        metadata: {
          provider,
          model,
          capabilityProfile: this.capabilityProfile
        }
      }

    } catch (error: any) {
      logger.error(`Agent execution error: ${error.message}`, { error })
      return { 
        success: false, 
        finalAnswer: `Error: ${error.message}`, 
        history: this.history,
        metadata: { provider, model, capabilityProfile: this.capabilityProfile }
      }
    }
  }

  protected abstract constructPrompt(goal: string, context: any, history: AgentObservation[]): string

  private async parseAndExecuteAction(content: string): Promise<{ tool: string, args: any, result?: string, error?: string, metadata?: any } | null> {
    // Regex to find Action: ToolName(args)
    const actionMatch = content.match(/Action:\s*(\w+)\((.*)\)/)
    if (!actionMatch) return null

    const toolName = actionMatch[1]
    const argsString = actionMatch[2]
    
    try {
      let args = {}
      if (argsString.trim()) {
        // Simple heuristic for JSON args
        try {
          args = JSON.parse(argsString.startsWith('{') ? argsString : `{${argsString}}`)
        } catch (e) {
          return { tool: toolName, args: argsString, error: `Invalid JSON arguments: ${argsString}` }
        }
      }

      const tool = this.toolRegistry.getTool(toolName)
      if (!tool) return { tool: toolName, args, error: `Error: Tool ${toolName} not found.` }

      if (tool instanceof BaseTool) {
        const callResult = await tool.call(args)
        if (callResult.success) {
          return { 
            tool: toolName, 
            args, 
            result: JSON.stringify(callResult.data),
            metadata: callResult.metadata
          }
        } else {
          return { 
            tool: toolName, 
            args, 
            error: callResult.error,
            metadata: callResult.metadata
          }
        }
      } else {
        const result = await tool.execute(args)
        return { tool: toolName, args, result: JSON.stringify(result) }
      }
    } catch (e: any) {
      return { tool: toolName, args: argsString, error: `Error executing tool: ${e.message}` }
    }
  }

  /**
   * Returns the execution trace for this agent's recent run
   */
  public getHistory(): AgentObservation[] {
    return this.history
  }
}
