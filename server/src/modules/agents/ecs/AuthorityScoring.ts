import { EvidenceNode } from './ECSTypes'
import { logger } from '../../../utils/logger'
import { OrganizationPolicyEngine } from '../OrganizationPolicyEngine'

/**
 * ECS Component: Authority Weighting Engine
 * Computes a dynamic weight (0.0 to 1.0) for a given evidence node based on context.
 */
export class AuthorityScoring {
  /**
   * Weights an evidence node using domain matching, recency, and source reliability.
   */
  static calculateWeight(node: EvidenceNode, globalContext: any): number {
    let weight = 0.5 // Default neutral weight

    // 0. Pre-calculated Weight from Tool/Agent (Phase 6)
    if (node.metadata?.evidenceWeight !== undefined) {
      weight = node.metadata.evidenceWeight
    }

    // 1. Domain Match Weighting
    if (globalContext?.primaryDomain === node.domain) {
      weight += 0.2 // Bonus for source domain matching request domain
    }

    // 2. Source-Based Authority
    switch (node.sourceType) {
      case 'agent':
        weight += 0.1 // Agents usually have more synthesized context
        break
      case 'tool':
        weight += 0.05 // Direct tool outputs are reliable but raw
        break
    }

    // 3. Temporal Decay (simplified)
    const ageSeconds = (Date.now() - new Date(node.timestamp).getTime()) / 1000
    if (ageSeconds > 3600) { // Older than 1 hour
      weight -= 0.05
    }

    // 4. Agent Capability Authority (Phase 5)
    const agentProfile = node.metadata?.agentProfile
    if (agentProfile?.authorityMultiplier) {
      weight *= agentProfile.authorityMultiplier
    }

    // Phase 7: Policy Overrides (Final Multiplier)
    const resolvedContext = globalContext?.resolvedContext
    if (resolvedContext) {
      const overrides = OrganizationPolicyEngine.getWeightOverrides(resolvedContext)
      if (overrides[node.domain]) {
        weight *= overrides[node.domain]
      }
    }

    // Ensure within 0.0 - 1.0
    return Math.max(0, Math.min(1.0, weight))
  }

  /**
   * Sort nodes by weight for priority processing
   */
  static sortByAuthority(nodes: EvidenceNode[]): EvidenceNode[] {
    return [...nodes].sort((a, b) => b.weight - a.weight)
  }
}
