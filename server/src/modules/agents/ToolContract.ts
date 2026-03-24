/**
 * Tool Contract & Capability Types for ADPA
 * Enables typed, validated, and ECS-integrated tool operations.
 */

export type ToolCapability = 
  | 'search_documents'
  | 'create_tasks'
  | 'decompose_tasks'
  | 'fetch_project_data'
  | 'analyze_risks'
  | 'sync_external_system'
  | 'generate_report'
  | 'general_utility'
  | 'manage_jira'
  | 'manage_confluence'
  | 'rovo_search'
  | 'code_implementation'
  | 'repository_automation'

export interface ToolContract<I = any, O = any> {
  capability: ToolCapability
  domain: 'pmbok' | 'discovery' | 'integration' | 'general'
  reliabilityScore: number // 0.0 to 1.0 (historical or expected)
  
  // Validation logic
  validateInput?: (input: any) => I
  transformOutput?: (output: any) => O
}

export interface ToolExecutionMetadata {
  toolName: string
  durationMs: number
  success: boolean
  error?: string
  evidenceWeight: number // Base weight for ECS
}
