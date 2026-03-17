/**
 * Tool Registry for ADPA Agents
 * Standardizes the interface for agent tool calls (MCP compatible).
 * Version 3.0: Reputation-Aware (Phase 6)
 */

import { logger } from '../../utils/logger'
import { ToolContract, ToolCapability, ToolExecutionMetadata } from './ToolContract'
import { globalToolReputationService } from './ecs/ToolReputationService'
import { OrganizationPolicyEngine } from './OrganizationPolicyEngine'
import { ResolvedContext } from './OrganizationalContext'

export interface ToolDefinition {
  name: string
  description: string
  parameters: any // JSON Schema
  execute: (args: any) => Promise<any>
}

/**
 * Base Tool Class
 * Provides a standard structure for ADPA tools with built-in error handling
 * and contract-driven validation.
 */
export abstract class BaseTool implements ToolDefinition {
  abstract name: string
  abstract description: string
  abstract parameters: any
  
  // Phase 4: Optional contract
  public contract?: ToolContract

  /**
   * Internal execution logic to be implemented by concrete tools
   */
  abstract execute(args: any): Promise<any>

  /**
   * Safe execution wrapper with logging, validation, and error boundaries
   */
  async call(args: any): Promise<{ success: boolean; data?: any; error?: string; metadata?: ToolExecutionMetadata }> {
    const startTime = Date.now()
    const startTimestamp = new Date().toISOString()
    
    try {
      // 1. Contract-Driven Input Validation
      let validatedArgs = args
      if (this.contract?.validateInput) {
        validatedArgs = this.contract.validateInput(args)
      }

      logger.info(`[TOOL-CALL] Executing ${this.name}`, { args: validatedArgs })
      
      // 2. Execution
      let result = await this.execute(validatedArgs)

      // 3. Contract-Driven Output Transformation
      if (this.contract?.transformOutput) {
        result = this.contract.transformOutput(result)
      }

      const durationMs = Date.now() - startTime
      
      // Phase 6: Record success in reputation service
      await globalToolReputationService.recordUsage({
        toolName: this.name,
        success: true,
        durationMs,
        timestamp: startTimestamp
      })

      return { 
        success: true, 
        data: result,
        metadata: {
          toolName: this.name,
          durationMs,
          success: true,
          evidenceWeight: (this.contract?.reliabilityScore || 0.7) * globalToolReputationService.getScore(this.name)
        }
      }
    } catch (error: any) {
      logger.error(`[TOOL-ERROR] Failed to execute ${this.name}`, { error: error.message, args })
      const durationMs = Date.now() - startTime
      
      // Phase 6: Record failure in reputation service
      await globalToolReputationService.recordUsage({
        toolName: this.name,
        success: false,
        durationMs,
        timestamp: startTimestamp,
        error: error.message
      })

      return { 
        success: false, 
        error: error.message,
        metadata: {
          toolName: this.name,
          durationMs,
          success: false,
          error: error.message,
          evidenceWeight: 0.1 // Minimum weight for failed tool evidence
        }
      }
    }
  }
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition | BaseTool> = new Map()

  registerTool(tool: ToolDefinition | BaseTool) {
    this.tools.set(tool.name, tool)
  }

  getTool(name: string): ToolDefinition | BaseTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Capability-based tool lookup (Phase 7: Policy-Aware)
   * Finds the best allowed tool for a capability by multiplying reliability * reputation.
   */
  getToolByCapability(capability: ToolCapability, context?: ResolvedContext): BaseTool | undefined {
    const candidateTools = Array.from(this.tools.values())
      .filter((t): t is BaseTool => {
        if (!(t instanceof BaseTool) || t.contract?.capability !== capability) return false
        
        // Phase 7 Policy Checks
        if (context) {
          if (!OrganizationPolicyEngine.isCapabilityAllowed(capability, context)) return false
          if (!OrganizationPolicyEngine.isToolAllowed(t.name, context)) return false
        }
        
        return true
      })
      .sort((a, b) => {
        const scoreA = (a.contract?.reliabilityScore || 0.7) * globalToolReputationService.getScore(a.name)
        const scoreB = (b.contract?.reliabilityScore || 0.7) * globalToolReputationService.getScore(b.name)
        return scoreB - scoreA
      })

    return candidateTools[0]
  }

  getAllTools(): (ToolDefinition | BaseTool)[] {
    return Array.from(this.tools.values())
  }

  getToolSchemas(): any[] {
    return this.getAllTools().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }))
  }
}

export const globalToolRegistry = new ToolRegistry()
