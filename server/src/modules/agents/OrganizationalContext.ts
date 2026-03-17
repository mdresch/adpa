import { ToolCapability } from './ToolContract'

/**
 * Organizational Context & Policies for ADPA
 * Enables alignment with enterprise governance, compliance, and project-specific rules.
 */

export interface OrganizationPolicy {
  id: string
  companyId?: string
  projectId?: string
  rules: {
    allowedTools?: string[]          // Explicit allowlist of tool names
    restrictedTools?: string[]       // Explicit denylist of tool names
    allowedCapabilities?: ToolCapability[]
    preferredProviders?: string[]    // e.g. ['azure', 'openai']
    riskLevel?: 'low' | 'medium' | 'high'
    complianceStandards?: string[]   // e.g. ['ISO27001', 'SOC2']
    ecsWeightOverrides?: Record<string, number> // Domain-specific weight multipliers
  }
}

export interface ResolvedContext {
  companyId?: string
  projectId?: string
  companyName?: string
  projectName?: string
  framework?: string
  policies: OrganizationPolicy[]
  metadata: Record<string, any>
}
