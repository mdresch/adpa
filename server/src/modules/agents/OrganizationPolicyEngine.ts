import { OrganizationPolicy, ResolvedContext } from './OrganizationalContext'
import { ToolCapability } from './ToolContract'

/**
 * Policy Engine to evaluate and merge organizational rules.
 */
export class OrganizationPolicyEngine {
  /**
   * Evaluates if a specific tool is allowed under the current context.
   */
  static isToolAllowed(toolName: string, context: ResolvedContext): boolean {
    if (!context.policies || context.policies.length === 0) return true

    // Iterate through policies, with project-level taking precedence (assuming they come later in the array)
    for (const policy of [...context.policies].reverse()) {
      if (policy.rules.restrictedTools?.includes(toolName)) return false
      if (policy.rules.allowedTools?.includes(toolName)) return true
    }

    return true // Default allow if not explicitly restricted
  }

  /**
   * Evaluates if a capability is allowed.
   */
  static isCapabilityAllowed(capability: ToolCapability, context: ResolvedContext): boolean {
    if (!context.policies || context.policies.length === 0) return true

    for (const policy of [...context.policies].reverse()) {
      if (policy.rules.allowedCapabilities && !policy.rules.allowedCapabilities.includes(capability)) {
        return false
      }
    }

    return true
  }

  /**
   * Gets the merged risk level.
   */
  static getRiskLevel(context: ResolvedContext): 'low' | 'medium' | 'high' {
    for (const policy of [...context.policies].reverse()) {
      if (policy.rules.riskLevel) return policy.rules.riskLevel
    }
    return 'medium'
  }

  /**
   * Gets weight overrides for ECS synthesis.
   */
  static getWeightOverrides(context: ResolvedContext): Record<string, number> {
    let overrides: Record<string, number> = {}
    for (const policy of context.policies) {
      if (policy.rules.ecsWeightOverrides) {
        overrides = { ...overrides, ...policy.rules.ecsWeightOverrides }
      }
    }
    return overrides
  }

  /**
   * Gets preferred AI providers.
   */
  static getPreferredProviders(context: ResolvedContext): string[] {
    for (const policy of [...context.policies].reverse()) {
      if (policy.rules.preferredProviders) return policy.rules.preferredProviders
    }
    return []
  }
}
