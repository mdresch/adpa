/**
 * ECS (Evaluative Contextual Synthesis) Types
 */

export interface EvidenceNode {
  id: string
  sourceId: string      // The subgoal ID or tool name
  sourceType: 'agent' | 'tool' | 'external'
  domain: string
  weight: number        // 0.0 to 1.0 dynamic authority
  confidence: number    // 0.0 to 1.0 self-reported or assessed
  timestamp: string
  content: any
  metadata?: Record<string, any>
}

export interface ReasoningStep {
  id: string
  type: 'interpretation' | 'conflict_resolution' | 'aggregation' | 'filtering'
  inputIds: string[]    // IDs of EvidenceNodes or previous ReasoningSteps
  output: any           // Intermediate synthesized result
  justification: string // LLM-generated or rule-based reasoning
  authorityScore: number
}

export interface ECSResult {
  finalConclusion: string
  confidenceScore: number // Overall confidence (0-100)
  evidenceGraph: EvidenceNode[]
  reasoningChain: ReasoningStep[]
  conflicts: ConflictRecord[]
  metadata: {
    modelUsed: string
    durationMs: number
    evidenceCount: number
  }
}

export interface ConflictRecord {
  id: string
  description: string
  involvedNodeIds: string[]
  resolutionStrategy: string
  resolvedOutput: any
}
